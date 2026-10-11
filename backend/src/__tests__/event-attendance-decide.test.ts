import { decideAttendance } from "../services/event-attendance.service";
import { parseEventPage } from "../utils/event-contract";
describe("attendance decision validation", () => {
  it("rejects invalid IDs and unsupported decisions", async () => {
    await expect(decideAttendance("invalid", "invalid", "approved")).rejects.toMatchObject({ statusCode: 400 });
    await expect(decideAttendance("64b000000000000000000001", "64b000000000000000000003", "unknown" as never)).rejects.toMatchObject({ statusCode: 400 });
  });
  it.each([{ page: 0 }, { page: -1 }, { limit: 51 }, { limit: 0 }, { page: "bad" }, { limit: "2.5" }])("rejects malformed pagination: %j", query => {
    expect(() => parseEventPage(query)).toThrow();
  });
  it("uses bounded pagination defaults", () => {
    expect(parseEventPage({})).toEqual({ page: 1, limit: 20 });
  });
});
