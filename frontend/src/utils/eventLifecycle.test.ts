import { isJoinableEvent, isOngoingEvent, isPastEvent } from './eventLifecycle';

const start = Date.parse('2026-10-04T10:00:00Z');
const event = { eventDate: new Date(start).toISOString(), startDate: new Date(start).toISOString(), endDate: '2026-10-04T12:00:00Z' };

it('keeps an event current until its end, then marks it past at the exact boundary', () => {
  expect(isPastEvent(event, start + 60_000)).toBe(false);
  expect(isOngoingEvent(event, start + 60_000)).toBe(true);
  expect(isPastEvent(event, Date.parse(event.endDate))).toBe(true);
  expect(isOngoingEvent(event, Date.parse(event.endDate))).toBe(false);
});

it('does not classify missing, equal, or earlier end times as past', () => {
  const now = start + 48 * 60 * 60 * 1000;
  expect(isPastEvent({ ...event, endDate: undefined }, now)).toBe(false);
  expect(isPastEvent({ ...event, endDate: event.startDate }, now)).toBe(false);
  expect(isPastEvent({ ...event, endDate: '2026-10-04T09:00:00Z' }, now)).toBe(false);
});

it('retains the existing start-time registration deadline', () => {
  expect(isJoinableEvent(event, start - 1)).toBe(true);
  expect(isJoinableEvent(event, start)).toBe(true);
  expect(isJoinableEvent(event, start + 60_000)).toBe(false);
});
