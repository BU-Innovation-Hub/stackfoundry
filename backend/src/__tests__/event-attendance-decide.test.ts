/**
 * Unit tests for decideAttendance: atomic pending -> decided transition,
 * idempotent repeat decisions, and exactly-once approval notification.
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
import { decideAttendance } from "../services/event-attendance.service";

const mockedAttendance = EventAttendance as jest.Mocked<typeof EventAttendance>;
const mockedEvent = Event as jest.Mocked<typeof Event>;
const mockedUser = User as jest.Mocked<typeof User>;
const mockedSend = sendEventNotification as jest.MockedFunction<typeof sendEventNotification>;

const EVENT_ID = "64b000000000000000000001";
const ATT_ID = "64b000000000000000000002";
const USER_ID = "64b000000000000000000003";

const userRef = { toString: () => USER_ID };
const transitionedApproved = { _id: ATT_ID, event: EVENT_ID, user: userRef, status: "approved" };
const transitionedRejected = { _id: ATT_ID, event: EVENT_ID, user: userRef, status: "rejected" };

/** Wire the lookups notifyApprovedAttendee/notify perform. */
const wireNotifyLookups = () => {
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
  (mockedEvent.findById as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(eventDoc) });
  (mockedEvent.updateOne as jest.Mock).mockResolvedValue({});

  (mockedUser.findById as jest.Mock).mockReturnValue({
    lean: jest.fn().mockResolvedValue({ email: "student@bothouniversity.ac.bw", name: "Test" }),
  });

  (mockedAttendance.findOne as jest.Mock).mockReturnValue({
    populate: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ status: "approved", user: { name: "Test", email: "student@bothouniversity.ac.bw" } }),
    }),
  });
};

describe("decideAttendance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wireNotifyLookups();
  });

  it("approves a pending request atomically and notifies exactly once", async () => {
    (mockedAttendance.findOneAndUpdate as jest.Mock).mockResolvedValue(transitionedApproved);

    const result = await decideAttendance(EVENT_ID, ATT_ID, "approved");

    expect(result.status).toBe("approved");
    expect(mockedAttendance.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: ATT_ID, event: EVENT_ID, status: "pending" },
      { $set: { status: "approved", decidedAt: expect.any(Date) } },
      { new: true }
    );
    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(mockedSend).toHaveBeenCalledWith(
      "student@bothouniversity.ac.bw",
      expect.any(String),
      "approved",
      "AI Workshop",
      expect.any(Date),
      expect.objectContaining({ dedupeId: EVENT_ID })
    );
  });

  it("repeat approval is idempotent: no transition, no second email", async () => {
    (mockedAttendance.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    (mockedAttendance.findOne as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
    // direct (non-populated) lookup used by the idempotency branch
    (mockedAttendance.findOne as jest.Mock).mockImplementation(() =>
      Promise.resolve({ status: "approved" })
    );

    const result = await decideAttendance(EVENT_ID, ATT_ID, "approved");

    expect(result.status).toBe("approved");
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("five concurrent approvals produce exactly one email", async () => {
    (mockedAttendance.findOneAndUpdate as jest.Mock)
      .mockResolvedValueOnce(transitionedApproved)
      .mockResolvedValue(null);
    // must satisfy both call shapes: idempotency branch (await findOne(...))
    // and notifyApprovedAttendee (findOne(...).populate(...).lean())
    (mockedAttendance.findOne as jest.Mock).mockImplementation(() => ({
      status: "approved",
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          status: "approved",
          user: { name: "Test", email: "student@bothouniversity.ac.bw" },
        }),
      }),
    }));

    const results = await Promise.all(
      Array.from({ length: 5 }, () => decideAttendance(EVENT_ID, ATT_ID, "approved"))
    );

    expect(results).toHaveLength(5);
    expect(mockedSend).toHaveBeenCalledTimes(1);
  });

  it("rejection decrements capacity once and notifies once", async () => {
    (mockedAttendance.findOneAndUpdate as jest.Mock).mockResolvedValue(transitionedRejected);

    const result = await decideAttendance(EVENT_ID, ATT_ID, "rejected");

    expect(result.status).toBe("rejected");
    expect(mockedEvent.updateOne).toHaveBeenCalledTimes(1);
    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(mockedSend).toHaveBeenCalledWith(
      "student@bothouniversity.ac.bw",
      expect.any(String),
      "rejected",
      "AI Workshop",
      expect.any(Date),
      expect.objectContaining({ dedupeId: EVENT_ID })
    );
  });

  it("unknown attendance id throws 404", async () => {
    (mockedAttendance.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    (mockedAttendance.findOne as jest.Mock).mockImplementation(() => Promise.resolve(null));

    await expect(decideAttendance(EVENT_ID, ATT_ID, "approved")).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mockedSend).not.toHaveBeenCalled();
  });
});
