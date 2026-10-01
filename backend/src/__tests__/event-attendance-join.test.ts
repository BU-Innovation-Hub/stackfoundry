/**
 * Unit tests for the join -> cancel -> rejoin notification flow.
 * Regression: a legitimate NEW join transition (rejoin after cancel) must
 * notify again with its own dedupe nonce — it must never be swallowed as a
 * "duplicate" of the earlier join inside the burst window.
 */

jest.mock("../models/event-attendance.model");
jest.mock("../models/event.model");
jest.mock("../models/user.model");
jest.mock("../services/email.service");
jest.mock("../services/calendar-invite.service");

import EventAttendance from "../models/event-attendance.model";
import Event from "../models/event.model";
import User from "../models/user.model";
import { sendEventNotification } from "../services/email.service";
import { cancelAttendance, joinEvent } from "../services/event-attendance.service";

const mockedAttendance = EventAttendance as jest.Mocked<typeof EventAttendance>;
const mockedEvent = Event as jest.Mocked<typeof Event>;
const mockedUser = User as jest.Mocked<typeof User>;
const mockedSend = sendEventNotification as jest.MockedFunction<typeof sendEventNotification>;

const EVENT_ID = "64b000000000000000000001";
const USER_ID = "64b000000000000000000003";

const FIRST_REQUEST = new Date("2026-09-30T10:00:00.000Z");
const REJOIN_REQUEST = new Date("2026-09-30T10:07:00.000Z");

const eventDoc = {
  _id: EVENT_ID,
  title: "AI Workshop",
  slug: "ai-workshop",
  description: "Learn AI",
  startDate: new Date("2026-11-05T10:00:00.000Z"),
  eventDate: new Date("2026-11-05T10:00:00.000Z"),
  endDate: new Date("2026-11-05T12:00:00.000Z"),
  locationType: "virtual",
};

describe("join/cancel/rejoin notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (mockedEvent.findOne as jest.Mock).mockResolvedValue(eventDoc);
    (mockedEvent.findById as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(eventDoc) });
    (mockedEvent.findOneAndUpdate as jest.Mock).mockResolvedValue(eventDoc);
    (mockedEvent.updateOne as jest.Mock).mockResolvedValue({});

    // Call order: join #1 (existing), cancel (active), join #2 (cancelled).
    const findOneQueue: unknown[] = [
      null,
      { status: "approved", save: jest.fn().mockResolvedValue(undefined) },
      { status: "cancelled" },
    ];
    (mockedAttendance.findOne as jest.Mock).mockImplementation(() => Promise.resolve(findOneQueue.shift()));

    // Upserts for join #1 and rejoin: each join sets a fresh requestedAt.
    const upsertQueue: unknown[] = [
      { _id: "64b000000000000000000010", status: "approved", requestedAt: FIRST_REQUEST },
      { _id: "64b000000000000000000010", status: "approved", requestedAt: REJOIN_REQUEST },
    ];
    (mockedAttendance.findOneAndUpdate as jest.Mock).mockImplementation(() => Promise.resolve(upsertQueue.shift()));

    (mockedUser.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({ email: "student@bothouniversity.ac.bw", name: "Test" }),
    });
  });

  it("notifies on first join, on cancel, and again on rejoin with its own nonce", async () => {
    await joinEvent(EVENT_ID, USER_ID);
    await cancelAttendance(EVENT_ID, USER_ID);
    await joinEvent(EVENT_ID, USER_ID);

    expect(mockedSend).toHaveBeenCalledTimes(3);

    expect(mockedSend).toHaveBeenNthCalledWith(
      1,
      "student@bothouniversity.ac.bw",
      "Test",
      "joined",
      "AI Workshop",
      expect.any(Date),
      expect.objectContaining({ dedupeId: EVENT_ID, dedupeNonce: FIRST_REQUEST })
    );

    expect(mockedSend).toHaveBeenNthCalledWith(
      2,
      "student@bothouniversity.ac.bw",
      "Test",
      "cancelled",
      "AI Workshop",
      expect.any(Date),
      expect.objectContaining({ dedupeId: EVENT_ID, dedupeNonce: expect.any(Date) })
    );

    // THE REGRESSION: the rejoin must fire a fresh 'joined' notification whose
    // nonce differs from the first join's — the burst guard must not swallow it.
    expect(mockedSend).toHaveBeenNthCalledWith(
      3,
      "student@bothouniversity.ac.bw",
      "Test",
      "joined",
      "AI Workshop",
      expect.any(Date),
      expect.objectContaining({ dedupeId: EVENT_ID, dedupeNonce: REJOIN_REQUEST })
    );
  });

  it("repeat join while attendance is already active does not notify again (idempotent)", async () => {
    (mockedAttendance.findOne as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve(null))
      .mockImplementationOnce(() => Promise.resolve({ status: "approved" }));

    await joinEvent(EVENT_ID, USER_ID);
    await joinEvent(EVENT_ID, USER_ID);

    expect(mockedSend).toHaveBeenCalledTimes(1);
  });
});
