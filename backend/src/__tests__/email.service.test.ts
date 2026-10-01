/**
 * Unit tests for sendEventNotification: HTML body with calendar CTA,
 * .ics attachment, plain-text fallback and duplicate suppression.
 */

jest.mock("nodemailer");
jest.mock("../config/env", () => {
  const env: Record<string, unknown> = {
    NODE_ENV: "test",
    EMAIL_SMTP_HOST: "smtp.test.local",
    EMAIL_SMTP_PORT: 587,
    EMAIL_SMTP_USER: "mailer",
    EMAIL_SMTP_PASS: "secret",
    EMAIL_FROM: "Test Hub <no-reply@test.local>",
    CLIENT_URL: "http://localhost:3000",
  };
  return {
    getEnv: () => env,
    /** Test-only: temporarily patch the env (e.g. NODE_ENV=production). */
    __setEnv: (patch: Record<string, unknown>) => Object.assign(env, patch),
  };
});

import nodemailer from "nodemailer";
import { sendEventNotification } from "../services/email.service";
import type { CalendarInvite } from "../services/calendar-invite.service";

const sendMailMock = jest.fn();
const createTransportMock = nodemailer.createTransport as jest.MockedFunction<typeof nodemailer.createTransport>;

const EVENT_DATE = new Date("2026-09-30T10:01:00.000Z");

const calendar: CalendarInvite = {
  gcalLink: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Python&dates=20260930T100100Z%2F20260930T110100Z",
  ics: "BEGIN:VCALENDAR\r\nEND:VCALENDAR",
  filename: "introduction-to-python.ics",
  appUrl: "http://localhost:3000/events/introduction-to-python",
};

const lastMail = () => {
  const calls = sendMailMock.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0] as {
    to: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: { filename: string; content: string; contentType: string }[];
  };
};

describe("sendEventNotification", () => {
  beforeEach(() => {
    sendMailMock.mockReset().mockResolvedValue(undefined);
    createTransportMock.mockReturnValue({ sendMail: sendMailMock } as never);
  });

  it("joined email contains an Add to Google Calendar button, view link and .ics attachment", async () => {
    await sendEventNotification(
      "student@bothouniversity.ac.bw",
      "Rethabile",
      "joined",
      "Introduction to python",
      EVENT_DATE,
      { dedupeId: "joined-happy-path", calendar }
    );

    const mail = lastMail();
    expect(mail.to).toBe("student@bothouniversity.ac.bw");
    expect(mail.subject).toBe("Your request to join has been received: Introduction to python");
    expect(mail.html).toBeDefined();
    expect(mail.html).toContain("Add to Google Calendar");
    expect(mail.html).toContain(`href="${calendar.gcalLink.replace(/&/g, "&amp;")}"`);
    expect(mail.html).toContain("View Event");
    expect(mail.html).toContain(calendar.appUrl);
    expect(mail.attachments).toEqual([
      {
        filename: calendar.filename,
        content: calendar.ics,
        contentType: "text/calendar; charset=utf-8; method=PUBLISH",
      },
    ]);
  });

  it("renders a human-readable event date instead of a raw ISO string", async () => {
    await sendEventNotification(
      "date-check@bothouniversity.ac.bw",
      "Rethabile",
      "joined",
      "Introduction to python",
      EVENT_DATE,
      { dedupeId: "joined-date-format", calendar }
    );

    const mail = lastMail();
    expect(mail.html).toContain("30 September 2026");
    expect(mail.html).not.toContain("2026-09-30T10:01:00.000Z");
    expect(mail.text).toContain("30 September 2026");
    expect(mail.text).not.toContain("2026-09-30T10:01:00.000Z");
  });

  it("sends calendar links in the plain-text fallback too", async () => {
    await sendEventNotification(
      "text-links@bothouniversity.ac.bw",
      "Rethabile",
      "joined",
      "Introduction to python",
      EVENT_DATE,
      { dedupeId: "joined-text-links", calendar }
    );

    const mail = lastMail();
    expect(mail.text).toContain(`Add to Google Calendar: ${calendar.gcalLink}`);
    expect(mail.text).toContain(`View event: ${calendar.appUrl}`);
    expect(mail.text).toContain("StackFoundry");
  });

  it("joined email without calendar payload still sends HTML but no calendar CTA", async () => {
    await sendEventNotification(
      "no-calendar@bothouniversity.ac.bw",
      "Rethabile",
      "joined",
      "Introduction to python",
      EVENT_DATE,
      { dedupeId: "joined-no-calendar" }
    );

    const mail = lastMail();
    expect(mail.html).toBeDefined();
    expect(mail.html).toContain("Introduction to python");
    expect(mail.html).not.toContain("Add to Google Calendar");
    expect(mail.attachments).toBeUndefined();
  });

  it("approved email keeps its calendar button and attachment", async () => {
    await sendEventNotification(
      "approve@bothouniversity.ac.bw",
      "Rethabile",
      "approved",
      "AI Workshop",
      EVENT_DATE,
      { dedupeId: "approved-path", calendar }
    );

    const mail = lastMail();
    expect(mail.subject).toBe("You are approved to attend: AI Workshop");
    expect(mail.html).toContain("Add to Google Calendar");
    expect(mail.html).toContain("has been approved");
    expect(mail.attachments).toHaveLength(1);
  });

  it("rejected email has HTML but never a calendar invitation", async () => {
    await sendEventNotification(
      "reject@bothouniversity.ac.bw",
      "Rethabile",
      "rejected",
      "AI Workshop",
      EVENT_DATE,
      { dedupeId: "rejected-path" }
    );

    const mail = lastMail();
    expect(mail.subject).toBe("Your request to attend was rejected: AI Workshop");
    expect(mail.html).toBeDefined();
    expect(mail.html).not.toContain("Add to Google Calendar");
    expect(mail.attachments).toBeUndefined();
  });

  it("eventUrl-only notifications show a View Event button but never a calendar invitation", async () => {
    await sendEventNotification(
      "updated@bothouniversity.ac.bw",
      "Rethabile",
      "updated",
      "AI Workshop",
      EVENT_DATE,
      { dedupeId: "updated-path", eventUrl: "http://localhost:3000/events/ai-workshop" }
    );

    const mail = lastMail();
    expect(mail.subject).toBe("Event details were updated: AI Workshop");
    expect(mail.html).toContain("View Event");
    expect(mail.html).toContain('href="http://localhost:3000/events/ai-workshop"');
    expect(mail.html).not.toContain("Add to Google Calendar");
    expect(mail.text).toContain("View event: http://localhost:3000/events/ai-workshop");
    expect(mail.attachments).toBeUndefined();
  });

  it("escapes untrusted values in the HTML body", async () => {
    await sendEventNotification(
      "escape@bothouniversity.ac.bw",
      "<script>alert(1)</script>",
      "joined",
      'Hacked <img src=x onerror="alert(1)">',
      EVENT_DATE,
      { dedupeId: "escape-path" }
    );

    const mail = lastMail();
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).toContain("&lt;img src=x");
  });

  it("suppresses a duplicate notification for the same recipient, kind and event", async () => {
    const args: Parameters<typeof sendEventNotification> = [
      "dupe@bothouniversity.ac.bw",
      "Rethabile",
      "joined",
      "Introduction to python",
      EVENT_DATE,
      { dedupeId: "dupe-event-id", calendar },
    ];

    await sendEventNotification(...args);
    await sendEventNotification(...args);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  it("a new transition (different dedupeNonce) is NOT suppressed inside the window", async () => {
    const base = ["nonce@bothouniversity.ac.bw", "Rethabile", "joined", "Introduction to python", EVENT_DATE] as const;

    // cancel -> rejoin: same recipient/kind/event, a later requestedAt
    await sendEventNotification(...base, { dedupeId: "nonce-event-id", dedupeNonce: new Date("2026-09-30T10:00:00.000Z") });
    await sendEventNotification(...base, { dedupeId: "nonce-event-id", dedupeNonce: new Date("2026-09-30T10:05:00.000Z") });

    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });

  it("the SAME transition within the same second is still suppressed (burst protection)", async () => {
    const base = ["nonce-same-sec@bothouniversity.ac.bw", "Rethabile", "joined", "Introduction to python", EVENT_DATE] as const;

    await sendEventNotification(...base, { dedupeId: "nonce-same-sec-id", dedupeNonce: new Date("2026-09-30T10:00:00.100Z") });
    await sendEventNotification(...base, { dedupeId: "nonce-same-sec-id", dedupeNonce: new Date("2026-09-30T10:00:00.900Z") });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  it("releases the dedupe key when the send fails so a retry can succeed", async () => {
    const { __setEnv } = require("../config/env") as { __setEnv: (patch: Record<string, unknown>) => void };
    const base = ["retry@bothouniversity.ac.bw", "Rethabile", "joined", "Introduction to python", EVENT_DATE] as const;
    const options = { dedupeId: "retry-event-id", dedupeNonce: new Date("2026-09-30T10:00:00.000Z") };

    // Only production rethrows SMTP failures (dev falls back to console).
    __setEnv({ NODE_ENV: "production" });
    try {
      sendMailMock.mockRejectedValueOnce(new Error("SMTP down"));
      await expect(sendEventNotification(...base, options)).rejects.toThrow("SMTP down");
      await sendEventNotification(...base, options);
    } finally {
      __setEnv({ NODE_ENV: "test" });
    }

    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });
});
