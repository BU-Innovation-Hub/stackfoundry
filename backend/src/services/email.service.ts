/** Shared transactional email service for authentication flows. */
import nodemailer, { Transporter } from "nodemailer";
import { getEnv } from "../config/env";

let transporter: Transporter | null = null;
const isSmtpConfigured = (): boolean => {
  const env = getEnv();
  return Boolean(env.EMAIL_SMTP_HOST && env.EMAIL_SMTP_USER && env.EMAIL_SMTP_PASS);
};
const getTransporter = (): Transporter => {
  const env = getEnv();
  if (!transporter) transporter = nodemailer.createTransport({
    pool: true, maxConnections: env.EVENT_WORKER_CONCURRENCY,
    rateLimit: env.EMAIL_RATE_PER_SECOND, rateDelta: 1000,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 30000,
    requireTLS: env.NODE_ENV === "production", host: env.EMAIL_SMTP_HOST,
    port: env.EMAIL_SMTP_PORT, secure: env.EMAIL_SMTP_PORT === 465,
    auth: { user: env.EMAIL_SMTP_USER, pass: env.EMAIL_SMTP_PASS },
  });
  return transporter;
};
interface SendMailOptions { to: string; subject: string; text: string; html?: string; strict?: boolean; }
const sendMail = async ({ to, subject, text, html, strict }: SendMailOptions): Promise<void> => {
  const env = getEnv();
  if (isSmtpConfigured()) {
    try {
      const result = await getTransporter().sendMail({ replyTo: env.EMAIL_REPLY_TO, from: env.EMAIL_FROM, to, subject, text, html });
      if (result.rejected?.length) throw Object.assign(new Error("SMTP recipient rejected"), { responseCode: 550 });
      return;
    } catch (err) {
      if (strict || env.NODE_ENV === "production") throw err;
      console.warn("[email] SMTP send failed, falling back to console log:", (err as Error).message);
    }
  }
  if ((strict || env.NODE_ENV === "production") && !isSmtpConfigured()) throw new Error("SMTP is not configured; cannot send email in production");
  console.log("==========================================\n[email:dev-fallback]");
  console.log(`To:      ${to}\nSubject: ${subject}\n${text}`);
  if (html) console.log(html);
  console.log("==========================================");
};
export const closeEmailTransport = () => { transporter?.close(); transporter = null; };

/** Send the password-reset OTP to a user's email address. */
export const sendPasswordResetOtp = async (to: string, name: string, otp: string, ttlMinutes: number): Promise<void> => {
  await sendMail({ to, subject: "Your password reset code", text: [
    `Hi ${name}`, "", `Your password reset code is: ${otp}`, "",
    `This code expires in ${ttlMinutes} minutes and can only be used once.`,
    "If you did not request this, you can safely ignore this email.", "", `— ${getEnv().EMAIL_BRAND}`,
  ].join("\n") });
};
