jest.mock("nodemailer");
jest.mock("../config/env", () => ({ getEnv: () => ({
  NODE_ENV: "test", EMAIL_SMTP_HOST: "smtp.test.local", EMAIL_SMTP_PORT: 587,
  EMAIL_SMTP_USER: "mailer", EMAIL_SMTP_PASS: "secret", EMAIL_FROM: "Innovation Hub <no-reply@test.local>",
  EMAIL_BRAND: "Innovation Hub", EMAIL_RATE_PER_SECOND: 5, EVENT_WORKER_CONCURRENCY: 5,
}) }));
import nodemailer from "nodemailer";
import { sendPasswordResetOtp, closeEmailTransport } from "../services/email.service";

const send = jest.fn();
beforeEach(() => {
  closeEmailTransport();
  send.mockReset().mockResolvedValue({ accepted: ["student@test.local"], rejected: [] });
  (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: send, close: jest.fn() });
});

it("preserves password reset OTP content", async () => {
  await sendPasswordResetOtp("student@test.local", "Student", "12345", 10);
  expect(send.mock.calls[0][0].text).toContain("12345");
  expect(send.mock.calls[0][0].text).toContain("10 minutes");
});
