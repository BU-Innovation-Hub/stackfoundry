import { isBothoEmail } from "../utils/validation";

describe("Botho permanent-account email policy", () => {
  it.each([
    "rethabile.lebele@bothouniversity.com",
    "rethabile.lebele@bothouniversity.ac.bw",
    "  RETHABILE.LEBELE@BOTHOUNIVERSITY.COM  ",
  ])("accepts %s", email => expect(isBothoEmail(email)).toBe(true));

  it.each([
    "user@gmail.com",
    "user@sub.bothouniversity.com",
    "user@bothouniversity.com.example",
    "user..name@bothouniversity.com",
    "not-an-email",
  ])("rejects %s", email => expect(isBothoEmail(email)).toBe(false));
});
