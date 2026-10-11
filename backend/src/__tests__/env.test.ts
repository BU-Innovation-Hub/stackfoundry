import { loadEnv } from "../config/env";

describe("production environment configuration", () => {
  const originalEnv = process.env;
  const configuredEnv = {
    NODE_ENV: "production",
    JWT_ACCESS_SECRET: "test-access-secret",
    JWT_REFRESH_SECRET: "test-refresh-secret",
    MONGO_URI: "mongodb://database.test/innovation_hub",
    EMAIL_SMTP_HOST: "smtp.mail.test",
    EMAIL_SMTP_USER: "test-mail-user",
    EMAIL_SMTP_PASS: "test-mail-password",
    EMAIL_FROM: "Innovation Hub <no-reply@hub.test>",
    CLIENT_URL: "https://hub.test",
    ADMIN_EMAIL: "admin@hub.test",
    ADMIN_PASSWORD: "test-admin-password",
  };

  beforeEach(() => { process.env = { ...configuredEnv }; });
  afterEach(() => { process.env = originalEnv; });

  it("preserves configured values and production defaults", () => {
    expect(loadEnv()).toMatchObject({
      ...configuredEnv,
      EMAIL_SMTP_PORT: 587,
      COOKIE_SECURE: true,
      COOKIE_DOMAIN: "",
      PORT: 5000,
    });
  });

  it.each(["EMAIL_SMTP_HOST", "EMAIL_SMTP_USER", "EMAIL_SMTP_PASS", "EMAIL_FROM"])(
    "identifies the missing mail setting %s", (key) => {
      delete process.env[key];
      expect(loadEnv).toThrow(`Missing environment variables: ${key}`);
    }
  );

  it.each([
    ["mailer@gmail.com", "mailer@gmail.com"],
    ["Innovation Hub <mailer@gmail.com>", "mailer@gmail.com"],
    ["Innovation Hub <Mailer@GMAIL.com>", "mailer@gmail.com"],
    ["mailer@googlemail.com", "mailer@googlemail.com"],
  ])("allows Google SMTP with its authenticated sender %s", (sender, user) => {
    process.env.EMAIL_SMTP_HOST = "smtp.gmail.com";
    process.env.EMAIL_SMTP_USER = user;
    process.env.EMAIL_FROM = sender;
    expect(loadEnv().EMAIL_FROM).toBe(sender);
  });

  it.each([
    ["smtp.gmail.com", "another@gmail.com", "mailer@gmail.com"],
    ["smtp.other.test", "mailer@gmail.com", "mailer@gmail.com"],
    ["smtp.gmail.com", "mailer@gmail.com", "mailer@gmail.com, another@gmail.com"],
    ["smtp.gmail.com", "mailer@gmail.com", "Innovation Hub <mailer@gmail.com"],
  ])("rejects unapproved Google senders (%s, %s, %s)", (host, user, sender) => {
    process.env.EMAIL_SMTP_HOST = host;
    process.env.EMAIL_SMTP_USER = user;
    process.env.EMAIL_FROM = sender;
    expect(loadEnv).toThrow("Production EMAIL_FROM must use your verified sending domain");
  });

  it.each(["outlook.com", "hotmail.com", "yahoo.com", "example.com", "example.invalid"])(
    "preserves the existing sender restriction for %s", (domain) => {
      process.env.EMAIL_FROM = `sender@${domain}`;
      expect(loadEnv).toThrow("Production EMAIL_FROM must use your verified sending domain");
    }
  );

  it("reports missing settings and invalid URLs/senders in the same error without secrets", () => {
    delete process.env.EMAIL_SMTP_HOST;
    delete process.env.EMAIL_SMTP_USER;
    delete process.env.ADMIN_EMAIL;
    process.env.CLIENT_URL = "http://localhost:3000";
    process.env.EMAIL_FROM = "no-reply@gmail.com";
    let message = "";
    try { loadEnv(); } catch (error) { message = (error as Error).message; }
    expect(message).toContain("Missing environment variables: EMAIL_SMTP_HOST, EMAIL_SMTP_USER, ADMIN_EMAIL");
    expect(message).toContain("Production CLIENT_URL must be a public HTTPS URL");
    expect(message).toContain("Production EMAIL_FROM must use your verified sending domain");
    for (const secret of [configuredEnv.JWT_ACCESS_SECRET, configuredEnv.JWT_REFRESH_SECRET,
      configuredEnv.EMAIL_SMTP_PASS, configuredEnv.ADMIN_PASSWORD, configuredEnv.MONGO_URI]) {
      expect(message).not.toContain(secret);
    }
  });

  it("handles malformed CLIENT_URL without exposing its value", () => {
    process.env.CLIENT_URL = "invalid-private-url-value";
    expect(loadEnv).toThrow("Production CLIENT_URL must be a valid public HTTPS URL");
    try { loadEnv(); } catch (error) {
      expect((error as Error).message).not.toContain(process.env.CLIENT_URL);
    }
  });

  it("lists all required production settings when none are supplied", () => {
    process.env = { NODE_ENV: "production" };
    let message = "";
    try { loadEnv(); } catch (error) { message = (error as Error).message; }
    for (const key of Object.keys(configuredEnv).filter(key => key !== "NODE_ENV")) {
      expect(message).toContain(key);
    }
  });

  it("preserves local development without SMTP configuration", () => {
    process.env = { NODE_ENV: "development" };
    expect(loadEnv()).toMatchObject({
      NODE_ENV: "development",
      CLIENT_URL: "http://localhost:3000",
      COOKIE_SECURE: false,
      EMAIL_SMTP_HOST: undefined,
      EMAIL_FROM: "Innovation Hub <no-reply@example.invalid>",
    });
  });
});
