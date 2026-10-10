/**
 * Calendar invite helpers — Google Calendar template links, RFC 5545
 * .ics payloads and the public event URL embedded in notification emails.
 */

import { getEnv } from "../config/env";

export interface CalendarInvite {
    gcalLink: string;
    ics: string;
    filename: string;
    /** Public app URL for the event (used for "View Event" links in emails). */
    appUrl: string;
}

export interface CalendarEventInput {
    _id: unknown;
    title: string;
    description?: string;
    slug?: string;
    startDate?: Date | string | null;
    eventDate: Date | string;
    endDate?: Date | string | null;
    locationType?: string;
}

const bounds = (event: CalendarEventInput): { start: Date; end: Date } => {
    const start = new Date(event.startDate || event.eventDate);
    let end = new Date(event.endDate || event.startDate || event.eventDate);
    if (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
    }
    return { start, end };
};

/** Basic-format UTC timestamp: 20261105T100000Z */
const toIcsDate = (date: Date): string =>
    date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escapeIcsText = (value: string): string =>
    value
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r\n|\r|\n/g, "\\n");

// RFC 5545 folds at 75 octets without splitting a UTF-8 character.
const foldIcsLine = (value: string): string => {
    const lines: string[] = [];
    let line = "";
    for (const character of value) {
        if (Buffer.byteLength(line + character, "utf8") > 75) { lines.push(line); line = " "; }
        line += character;
    }
    lines.push(line);
    return lines.join("\r\n");
};

export const buildAppUrl = (slug?: string): string => {
    const base = getEnv().CLIENT_URL.replace(/\/$/, "");
    return slug ? `${base}/events/${slug}` : `${base}/events`;
};

export const buildGcalLink = (event: CalendarEventInput): string => {
    const { start, end } = bounds(event);
    const appUrl = buildAppUrl(event.slug);
    const details = [event.description || "", `View event: ${appUrl}`]
        .filter(Boolean)
        .join("\n\n");
    const location = event.locationType === "virtual" ? "Virtual event" : "On-site event";
    return (
        "https://calendar.google.com/calendar/render" +
        "?action=TEMPLATE" +
        `&text=${encodeURIComponent(event.title)}` +
        `&dates=${toIcsDate(start)}/${toIcsDate(end)}` +
        `&details=${encodeURIComponent(details)}` +
        `&location=${encodeURIComponent(location)}`
    );
};

export const buildIcs = (event: CalendarEventInput): string => {
    const { start, end } = bounds(event);
    const appUrl = buildAppUrl(event.slug);
    const description = [event.description || "", appUrl].filter(Boolean).join("\n\n");
    return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//StackFoundry//Events//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${String(event._id)}@stackfoundry`,
        `DTSTAMP:${toIcsDate(new Date())}`,
        `DTSTART:${toIcsDate(start)}`,
        `DTEND:${toIcsDate(end)}`,
        `SUMMARY:${escapeIcsText(event.title)}`,
        `DESCRIPTION:${escapeIcsText(description)}`,
        `URL:${appUrl}`,
        "END:VEVENT",
        "END:VCALENDAR",
    ].map(foldIcsLine).join("\r\n") + "\r\n";
};

export const buildCalendarInvite = (event: CalendarEventInput): CalendarInvite => ({
    gcalLink: buildGcalLink(event),
    ics: buildIcs(event),
    filename: `${event.slug || "event"}.ics`,
    appUrl: buildAppUrl(event.slug),
});
