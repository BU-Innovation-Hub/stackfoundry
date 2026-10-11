import { buildIcs } from "../services/calendar-invite.service";
it("folds UTF-8 calendar lines without losing text or allowing field injection", () => {
  const title = "Workshop 😀 ".repeat(25);
  const calendar = buildIcs({ _id: "stable", title, description: "First\nATTENDEE:injected", eventDate: "2030-01-01T10:00:00Z" });
  for (const line of calendar.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  const unfolded = calendar.replace(/\r\n /g, "");
  expect(unfolded).toContain(`SUMMARY:${title}`);
  expect(unfolded).not.toContain("\r\nATTENDEE:");
  expect(unfolded).toContain("UID:stable@stackfoundry");
});
