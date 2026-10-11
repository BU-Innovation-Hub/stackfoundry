import { useEffect, useRef, useState } from 'react';
import { ScheduledEvent, eventStartTime, eventEndTime } from '../utils/eventLifecycle';

/** Update event sections exactly at the nearest start/end and after tab resumes. */
export const useEventClock = (events: readonly ScheduledEvent[]) => {
  const [now, setNow] = useState(Date.now());
  const signature = events.map(event => `${event.startDate || event.eventDate}:${event.endDate || ''}`).join('|');
  const eventsRef = useRef(events);
  eventsRef.current = events;
  useEffect(() => {
    let timer: number | undefined;
    const update = () => setNow(Date.now());
    const schedule = () => {
      window.clearTimeout(timer);
      const current = Date.now();
      const next = eventsRef.current.flatMap(event => [eventStartTime(event), eventEndTime(event)])
        .filter(value => Number.isFinite(value) && value > current)
        .reduce((soonest, value) => Math.min(soonest, value), Infinity);
      if (Number.isFinite(next)) timer = window.setTimeout(update, Math.min(2147483647, Math.max(100, next - current + 25)));
    };
    const resume = () => { if (document.visibilityState === 'visible') update(); };
    schedule();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', update);
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', resume); window.removeEventListener('focus', update); };
  }, [signature, now]);
  return now;
};
