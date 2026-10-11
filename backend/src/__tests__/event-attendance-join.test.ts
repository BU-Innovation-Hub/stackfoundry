// Lifecycle/race regressions run against real MongoDB in event-reliability.integration.test.ts.
import { joinEvent, cancelAttendance, getMyAttendance } from "../services/event-attendance.service";
describe("attendance input validation", () => {
  it.each([joinEvent, cancelAttendance, getMyAttendance])("rejects malformed identifiers before querying MongoDB", async operation => {
    await expect(operation("invalid", "64b000000000000000000003")).rejects.toMatchObject({ statusCode: 400 });
    await expect(operation("64b000000000000000000001", "invalid")).rejects.toMatchObject({ statusCode: 400 });
  });
});
