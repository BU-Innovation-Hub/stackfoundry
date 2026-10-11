import { createGuestSession } from "../services/event-guest.service";

describe("event guest input", () => {
  it("rejects invalid event ids, names, and emails before creating an account", async () => {
    await expect(createGuestSession("invalid", "A Guest", "guest@example.com")).rejects.toMatchObject({ statusCode: 400 });
    await expect(createGuestSession("64b000000000000000000001", "<script>", "guest@example.com")).rejects.toMatchObject({ statusCode: 400 });
    await expect(createGuestSession("64b000000000000000000001", "A Guest", "not-an-email")).rejects.toMatchObject({ statusCode: 400 });
  });
});
