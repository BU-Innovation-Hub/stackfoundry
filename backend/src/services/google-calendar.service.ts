import { google } from "googleapis";
import { randomUUID } from "crypto";
import { getEnv } from "../config/env";
import { IEvent } from "../models/event.model";

const getCalendar = () => {
  const env = getEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) return null;
  const auth = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: "v3", auth });
};

const dates = (event: IEvent) => ({
  start: event.startDate || event.eventDate,
  end: event.endDate || event.startDate || event.eventDate,
});

const toCalendarEvent = (event: IEvent) => {
  const { start, end } = dates(event);
  const endDate = new Date(end);
  if (endDate.getTime() <= new Date(start).getTime()) endDate.setTime(new Date(start).getTime() + 60 * 60 * 1000);
  return {
    summary: event.title,
    description: event.description,
    start: { dateTime: new Date(start).toISOString() },
    end: { dateTime: endDate.toISOString() },
    conferenceData: event.locationType === "virtual" ? {
      createRequest: { requestId: `stackfoundry-${event._id.toString()}-${randomUUID()}` },
    } : undefined,
  };
};

export const syncEventToGoogle = async (event: IEvent): Promise<Partial<IEvent>> => {
  const calendar = getCalendar();
  if (!calendar) return {};
  const env = getEnv();
  const resource = toCalendarEvent(event);
  const response = event.googleCalendarEventId
    ? await calendar.events.update({ calendarId: env.GOOGLE_CALENDAR_ID || "primary", eventId: event.googleCalendarEventId, requestBody: resource, conferenceDataVersion: 1 })
    : await calendar.events.insert({ calendarId: env.GOOGLE_CALENDAR_ID || "primary", requestBody: resource, conferenceDataVersion: event.locationType === "virtual" ? 1 : 0 });
  const conference = response.data.conferenceData?.entryPoints?.find(entry => entry.entryPointType === "video")?.uri;
  return { googleCalendarEventId: response.data.id, googleMeetLink: conference || null };
};

export const deleteEventFromGoogle = async (event: IEvent): Promise<void> => {
  const calendar = getCalendar();
  if (!calendar || !event.googleCalendarEventId) return;
  const env = getEnv();
  await calendar.events.delete({ calendarId: env.GOOGLE_CALENDAR_ID || "primary", eventId: event.googleCalendarEventId });
};
