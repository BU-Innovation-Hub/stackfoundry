/**
 * Unit tests for the automatic archive sweep.
 * Events whose date passed more than a day ago must flip to "archived".
 */

jest.mock("../models/event.model");

import Event from "../models/event.model";
import { archiveStaleEvents } from "../services/event.service";

const mockedEvent = Event as jest.Mocked<typeof Event>;

describe("archiveStaleEvents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedEvent.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 3 });
  });

  it("archives non-archived events whose eventDate is older than 24h", async () => {
    const before = Date.now();
    const count = await archiveStaleEvents();
    const after = Date.now();

    expect(count).toBe(3);
    expect(mockedEvent.updateMany).toHaveBeenCalledTimes(1);

    const [filter, update] = (mockedEvent.updateMany as jest.Mock).mock.calls[0];
    expect(filter.status).toEqual({ $ne: "archived" });
    expect(filter.$or[1].eventDate.$ne).toBeNull();
    expect(filter.$or[0].endDate.$ne).toBeNull();
    expect(filter.deletedAt).toBeNull();
    expect(update).toEqual({ $set: { status: "archived" } });

    // cutoff = now - 24h (checked with tolerance for test execution time)
    const cutoff: Date = filter.$or[0].endDate.$lt;
    const expected = before - 24 * 60 * 60 * 1000;
    const expectedMax = after - 24 * 60 * 60 * 1000;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(expected - 50);
    expect(cutoff.getTime()).toBeLessThanOrEqual(expectedMax + 50);
  });

  it("never touches events without an eventDate (null guard in filter)", async () => {
    await archiveStaleEvents();
    const [filter] = (mockedEvent.updateMany as jest.Mock).mock.calls[0];
    // $ne: null excludes both null values and missing fields in MongoDB
    expect(filter.$or[1].eventDate).toHaveProperty("$ne", null);
    expect(filter.$or[1].eventDate).toHaveProperty("$lt");
  });

  it("returns 0 when nothing was modified", async () => {
    (mockedEvent.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });
    await expect(archiveStaleEvents()).resolves.toBe(0);
  });
});
