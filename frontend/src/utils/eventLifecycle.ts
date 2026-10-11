import { IEvent } from '../types/event';

export type ScheduledEvent = Pick<IEvent, 'startDate' | 'eventDate' | 'endDate'>;

export const eventStartTime = (event: ScheduledEvent) => new Date(event.startDate || event.eventDate).getTime();
export const eventEndTime = (event: ScheduledEvent) => event.endDate ? new Date(event.endDate).getTime() : NaN;
export const hasValidEventSchedule = (event: ScheduledEvent) => {
  const start = eventStartTime(event);
  const end = eventEndTime(event);
  return Number.isFinite(start) && Number.isFinite(end) && end > start;
};
export const isPastEvent = (event: ScheduledEvent, now = Date.now()) =>
  hasValidEventSchedule(event) && eventEndTime(event) <= now;
export const isOngoingEvent = (event: ScheduledEvent, now = Date.now()) =>
  hasValidEventSchedule(event) && eventStartTime(event) <= now && eventEndTime(event) > now;
export const isJoinableEvent = (event: ScheduledEvent, now = Date.now()) =>
  Number.isFinite(eventStartTime(event)) && eventStartTime(event) >= now;
