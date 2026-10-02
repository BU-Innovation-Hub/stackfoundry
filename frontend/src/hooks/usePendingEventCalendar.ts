import { useEffect } from 'react';
import { EventAttendance, getMyEventAttendance } from '../services/eventService';

export const usePendingEventCalendar = (eventId: string | undefined, attendance: EventAttendance | null, update: (value: EventAttendance | null) => void) => {
  useEffect(() => {
    if (!eventId || attendance?.status !== 'approved' || attendance.calendarSyncStatus !== 'pending') return;
    let stopped = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await getMyEventAttendance(eventId);
        if (!stopped) update(next);
      } catch { /* Preserve the last known state; a later refresh can recover. */ }
      if (!stopped && ++attempts < 12) timer = setTimeout(poll, 5000);
    };
    timer = setTimeout(poll, 5000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [eventId, attendance?.status, attendance?.calendarSyncStatus, update]);
};
