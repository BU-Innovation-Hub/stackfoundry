/**
 * Email Service
 * Sends transactional emails via SMTP.
 * In non-production without SMTP credentials the email is logged to console
 * (dev fallback). In production, missing SMTP config throws.
 */

import nodemailer, { Transporter } from "nodemailer";
import { getEnv } from "../config/env";

let transporter: Transporter | null = null;

const isSmtpConfigured = (): boolean => {
  const env = getEnv();
  return Boolean(env.EMAIL_SMTP_HOST && env.EMAIL_SMTP_USER && env.EMAIL_SMTP_PASS);
};

const getTransporter = (): Transporter => {
  const env = getEnv();
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_SMTP_HOST,
      port: env.EMAIL_SMTP_PORT,
      secure: env.EMAIL_SMTP_PORT === 465,
      auth: {
        user: env.EMAIL_SMTP_USER,
        pass: env.EMAIL_SMTP_PASS,
      },
    });
  }
  return transporter;
};

interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
}

const sendMail = async ({ to, subject, text }: SendMailOptions): Promise<void> => {
  const env = getEnv();

  if (isSmtpConfigured()) {
    try {
      await getTransporter().sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        text,
      });
      return;
    } catch (err) {
      // In production a send failure must surface; in dev we fall back to console
      if (env.NODE_ENV === "production") {
        throw err;
      }
      console.warn("[email] SMTP send failed, falling back to console log:", (err as Error).message);
    }
  }

  if (env.NODE_ENV === "production" && !isSmtpConfigured()) {
    throw new Error("SMTP is not configured; cannot send email in production");
  }

  // Dev fallback: log the email to console (safe outside production)
  console.log("==========================================");
  console.log("[email:dev-fallback]");
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(text);
  console.log("==========================================");
};

/**
 * Send the 5-digit password reset OTP to a user's email address
 */
export const sendPasswordResetOtp = async (
  to: string,
  name: string,
  otp: string,
  ttlMinutes: number
): Promise<void> => {
  await sendMail({
    to,
    subject: "Your password reset code",
    text: [
      `Hi ${name},`,
      "",
      `Your password reset code is: ${otp}`,
      "",
      `This code expires in ${ttlMinutes} minutes and can only be used once.`,
      "If you did not request this, you can safely ignore this email.",
      "",
      "— StackFoundry",
    ].join("\n"),
  });
};
