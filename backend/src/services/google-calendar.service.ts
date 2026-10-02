import { google, calendar_v3 } from "googleapis";
import { getEnv } from "../config/env";
import { IEvent } from "../models/event.model";

const getCalendar = () => {
  const env = getEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) return null;
  const auth = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: "v3", auth, timeout: 20000, retry: false });
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
    status: "confirmed",
    summary: event.title,
    description: event.description,
    start: { dateTime: new Date(start).toISOString() },
    end: { dateTime: endDate.toISOString() },
    conferenceData: event.locationType === "virtual" && !event.googleMeetLink ? {
      createRequest: { requestId: `event-${event._id.toString()}` },
    } : undefined,
  };
};

export const syncEventToGoogle = async (event: IEvent): Promise<Partial<IEvent>> => {
  const calendar = getCalendar();
  if (!calendar) return {};
  const env = getEnv();
  const resource = toCalendarEvent(event);
  const eventId = event.googleCalendarEventId || `ih${event._id.toString()}`;
  const calendarId = env.GOOGLE_CALENDAR_ID || "primary";
  let response;
  try {
    response = await calendar.events.get({ calendarId, eventId });
    response = await calendar.events.patch({ calendarId, eventId, requestBody: {
      ...resource,
      // Calendar PATCH uses JSON null to clear a conference; generated types omit null.
      conferenceData: event.locationType === "physical" ? null as unknown as calendar_v3.Schema$ConferenceData : response.data.conferenceData || resource.conferenceData,
    }, conferenceDataVersion: 1 });
  } catch (error) {
    if ((error as { code?: number }).code !== 404) throw error;
    try {
      response = await calendar.events.insert({ calendarId, requestBody: { ...resource, id: eventId }, conferenceDataVersion: 1 });
    } catch (insertError) {
      if ((insertError as { code?: number }).code !== 409) throw insertError;
      response = await calendar.events.get({ calendarId, eventId });
    }
  }
  const conference = response.data.conferenceData?.entryPoints?.find(entry => entry.entryPointType === "video")?.uri;
  if (event.locationType === "virtual" && !conference && !event.googleMeetLink) throw new Error("Google Meet generation pending");
  return { googleCalendarEventId: response.data.id, googleMeetLink: event.locationType === "physical" ? null : conference || event.googleMeetLink || null };
};

export const deleteEventFromGoogle = async (event: IEvent): Promise<void> => {
  const calendar = getCalendar();
  if (!calendar) return;
  const env = getEnv();
  try {
    await calendar.events.delete({ calendarId: env.GOOGLE_CALENDAR_ID || "primary", eventId: event.googleCalendarEventId || `ih${event._id.toString()}` });
  } catch (error) {
    if (![404, 410].includes(Number((error as { code?: number }).code))) throw error;
  }
};
