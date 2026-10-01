/**
 * Unit tests for the material-change gate that guards "updated"
 * attendee notifications — routine admin edits must not email everyone.
 */

import { materialFieldsChanged } from "../utils/materialFields";

const baseBefore = {
  title: "AI Workshop",
  description: "Learn AI",
  date: "2026-11-05",
  time: "10:00",
  locationType: "physical",
  registrationLink: "",
  eventDate: new Date("2026-11-05T10:00:00.000Z"),
  startDate: new Date("2026-11-05T10:00:00.000Z"),
  endDate: new Date("2026-11-05T12:00:00.000Z"),
  image: "https://example.com/a.png",
  capacity: 50,
  status: "published",
};

const payload = (overrides: Record<string, unknown> = {}) => ({
  title: "AI Workshop",
  description: "Learn AI",
  date: "2026-11-05",
  time: "10:00",
  locationType: "physical",
  registrationLink: "",
  eventDate: new Date("2026-11-05T10:00:00.000Z"),
  startDate: new Date("2026-11-05T10:00:00.000Z"),
  endDate: new Date("2026-11-05T12:00:00.000Z"),
  image: "https://example.com/a.png",
  capacity: 50,
  status: "published",
  ...overrides,
});

describe("materialFieldsChanged", () => {
  it("returns false when nothing material changed", () => {
    expect(materialFieldsChanged(baseBefore, payload())).toBe(false);
  });

  it("returns false when only non-material fields changed (image, capacity, status, description)", () => {
    expect(
      materialFieldsChanged(baseBefore, payload({
        image: "https://example.com/new.png",
        capacity: 100,
        status: "draft",
        description: "Updated description only",
      }))
    ).toBe(false);
  });

  it("returns true when the title changed", () => {
    expect(materialFieldsChanged(baseBefore, payload({ title: "AI Workshop v2" }))).toBe(true);
  });

  it("returns true when date/time changed", () => {
    expect(materialFieldsChanged(baseBefore, payload({ date: "2026-11-06" }))).toBe(true);
    expect(materialFieldsChanged(baseBefore, payload({ time: "14:00" }))).toBe(true);
  });

  it("returns true when schedule dates changed, false for identical instants", () => {
    expect(
      materialFieldsChanged(baseBefore, payload({ startDate: new Date("2026-11-06T10:00:00.000Z") }))
    ).toBe(true);
    expect(
      materialFieldsChanged(baseBefore, payload({ startDate: new Date("2026-11-05T10:00:00.000Z") }))
    ).toBe(false);
  });

  it("returns true when locationType or registrationLink changed", () => {
    expect(materialFieldsChanged(baseBefore, payload({ locationType: "virtual" }))).toBe(true);
    expect(materialFieldsChanged(baseBefore, payload({ registrationLink: "https://forms.example.com/x" }))).toBe(true);
  });

  it("ignores fields that are not part of the update (undefined)", () => {
    expect(
      materialFieldsChanged(baseBefore, { title: "AI Workshop", date: undefined, startDate: undefined })
    ).toBe(false);
  });
});
