/**
 * Email Service
 * Sends transactional emails via SMTP.
 * In non-production without SMTP credentials the email is logged to console
 * (dev fallback). In production, missing SMTP config throws.
 */

import nodemailer, { Transporter } from "nodemailer";
import { getEnv } from "../config/env";
import type { CalendarInvite } from "./calendar-invite.service";

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
  html?: string;
  attachments?: { filename: string; content: string; contentType: string }[];
}

const sendMail = async ({ to, subject, text, html, attachments }: SendMailOptions): Promise<void> => {
  const env = getEnv();

  if (isSmtpConfigured()) {
    try {
      await getTransporter().sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        text,
        html,
        attachments,
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
  if (html) {
    console.log("--- html ---");
    console.log(html);
  }
  if (attachments?.length) {
    console.log(`Attachments: ${attachments.map((a) => a.filename).join(", ")}`);
  }
  console.log("==========================================");
};

// ---------------------------------------------------------------------------
// Duplicate-burst guard: an identical event notification (same recipient,
// kind, event and transition) is sent at most once per window. Safety net
// against any retry/race producing a storm of similar emails. The transition
// nonce (see EventNotificationOptions.dedupeNonce) keeps a NEW legitimate
// transition — rejoin, re-approve, second event edit — from being mistaken
// for a duplicate of an earlier one inside the window.
// ---------------------------------------------------------------------------

const EVENT_EMAIL_DEDUPE_MS = 10 * 60 * 1000;
const recentEventEmails = new Map<string, number>();

const suppressDuplicateEventEmail = (key: string): boolean => {
  const now = Date.now();
  for (const [entryKey, sentAt] of recentEventEmails) {
    if (now - sentAt > EVENT_EMAIL_DEDUPE_MS) recentEventEmails.delete(entryKey);
  }
  const lastSentAt = recentEventEmails.get(key);
  if (lastSentAt !== undefined && now - lastSentAt < EVENT_EMAIL_DEDUPE_MS) {
    return true;
  }
  recentEventEmails.set(key, now);
  return false;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export type EventNotificationKind = "joined" | "approved" | "rejected" | "cancelled" | "updated";

interface EventNotificationOptions {
  /** Event id — scopes the duplicate-burst guard per event. */
  dedupeId?: string;
  /**
   * Timestamp of the specific transition that produced this notification
   * (attendance requestedAt/decidedAt, etc.). Truncated to the second: two
   * calls for the SAME transition share a key (burst/race suppression),
   * while a later legitimate transition — e.g. rejoin after cancel — gets a
   * fresh key and is delivered.
   */
  dedupeNonce?: Date;
  /** Calendar payload (Google link + .ics) — renders the "Add to Google Calendar" CTA and attaches the invite. */
  calendar?: CalendarInvite;
  /** Public event page URL — renders the "View Event" CTA. Falls back to `calendar.appUrl`. */
  eventUrl?: string;
}

/** Per-kind copy: subject prefix and body sentence for each event notification. */
const EVENT_NOTIFICATION_COPY: Record<EventNotificationKind, { subject: string; body: (title: string) => string }> = {
  joined: {
    subject: "Your request to join has been received",
    body: title => `Your request to join has been received for ${title}.`,
  },
  approved: {
    subject: "You are approved to attend",
    body: title => `Your request to join ${title} has been approved.`,
  },
  rejected: {
    subject: "Your request to attend was rejected",
    body: title => `Your request to attend ${title} was rejected.`,
  },
  cancelled: {
    subject: "Your attendance was cancelled",
    body: title => `Your attendance for ${title} was cancelled.`,
  },
  updated: {
    subject: "Event details were updated",
    body: title => `The details for ${title} were updated.`,
  },
};

/** Human-readable UTC date, e.g. "Wednesday, 30 September 2026 at 10:01 UTC". */
const formatEventDate = (date: Date): string => {
  if (Number.isNaN(date.getTime())) return date.toISOString();
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
};

const BUTTON_PRIMARY =
  "display: inline-block; background: #1a73e8; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600;";
const BUTTON_SECONDARY =
  "display: inline-block; background: #ffffff; color: #1a73e8; border: 1px solid #1a73e8; padding: 9px 17px; border-radius: 6px; text-decoration: none; font-weight: 600;";

/** Call-to-action payload shared by the HTML and plain-text renderers. */
interface EventNotificationCta {
  calendar?: CalendarInvite;
  viewUrl?: string;
}

const buildEventNotificationHtml = (
  name: string,
  bodyMessage: string,
  dateLabel: string,
  cta: EventNotificationCta
): string => {
  const parts = [
    '<!doctype html><html><body style="font-family: Arial, Helvetica, sans-serif; color: #111; line-height: 1.5;">',
    `<p>Hi ${escapeHtml(name)},</p>`,
    `<p>${escapeHtml(bodyMessage)}</p>`,
    `<p>Event date: ${escapeHtml(dateLabel)}</p>`,
  ];

  const buttons: string[] = [];
  if (cta.calendar) {
    buttons.push(
      `<a href="${escapeHtml(cta.calendar.gcalLink)}" style="${BUTTON_PRIMARY}">Add to Google Calendar</a>`
    );
  }
  if (cta.viewUrl) {
    buttons.push(`<a href="${escapeHtml(cta.viewUrl)}" style="${BUTTON_SECONDARY}">View Event</a>`);
  }
  if (buttons.length) {
    parts.push(`<p style="margin: 20px 0;">${buttons.join("&nbsp;&nbsp;")}</p>`);
  }

  if (cta.calendar) {
    parts.push(
      `<p style="color: #666666; font-size: 12px;">A calendar invite (${escapeHtml(
        cta.calendar.filename
      )}) is attached — it works with Google, Outlook and Apple calendars.</p>`
    );
  }

  parts.push("<p>— StackFoundry</p>", "</body></html>");
  return parts.join("");
};

const buildEventNotificationText = (
  name: string,
  bodyMessage: string,
  dateLabel: string,
  cta: EventNotificationCta
): string => {
  const lines = [`Hi ${name},`, "", bodyMessage, `Event date: ${dateLabel}`];
  const links: string[] = [];
  if (cta.calendar) links.push(`Add to Google Calendar: ${cta.calendar.gcalLink}`);
  if (cta.viewUrl) links.push(`View event: ${cta.viewUrl}`);
  if (links.length) lines.push("", ...links);
  lines.push("", "StackFoundry");
  return lines.join("\n");
};

/** Second-resolution key part for a transition nonce (empty when absent/invalid). */
const dedupeNoncePart = (nonce?: Date): string => {
  const seconds = nonce ? Math.floor(nonce.getTime() / 1000) : NaN;
  return Number.isNaN(seconds) ? "" : `|${seconds}`;
};

export const sendEventNotification = async (
  to: string,
  name: string,
  kind: EventNotificationKind,
  title: string,
  date: Date,
  options: EventNotificationOptions = {}
): Promise<void> => {
  const { calendar } = options;
  const copy = EVENT_NOTIFICATION_COPY[kind];

  const dedupeKey = `${to.toLowerCase()}|${kind}|${options.dedupeId ?? title}${dedupeNoncePart(options.dedupeNonce)}`;
  if (suppressDuplicateEventEmail(dedupeKey)) {
    console.warn(`[email] suppressed duplicate '${kind}' notification to ${to} for "${title}"`);
    return;
  }
  console.log(`[email] sending '${kind}' notification to ${to} for "${title}"`);

  const subject = `${copy.subject}: ${title}`;
  const dateLabel = formatEventDate(date);
  const bodyMessage = copy.body(title);
  const cta: EventNotificationCta = {
    calendar,
    viewUrl: options.eventUrl ?? calendar?.appUrl,
  };

  try {
    await sendMail({
      to,
      subject,
      text: buildEventNotificationText(name, bodyMessage, dateLabel, cta),
      html: buildEventNotificationHtml(name, bodyMessage, dateLabel, cta),
      attachments: calendar
        ? [
            {
              filename: calendar.filename,
              content: calendar.ics,
              contentType: "text/calendar; charset=utf-8; method=PUBLISH",
            },
          ]
        : undefined,
    });
  } catch (error) {
    // A failed send must not keep the key marked — otherwise it would block
    // the next legitimate notification for the same transition.
    recentEventEmails.delete(dedupeKey);
    throw error;
  }
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
