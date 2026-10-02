import { act, renderHook } from '@testing-library/react';
import { usePendingEventCalendar } from './usePendingEventCalendar';
import { EventAttendance, getMyEventAttendance } from '../services/eventService';
jest.mock('../services/eventService', () => ({ getMyEventAttendance: jest.fn() }));
const pending: EventAttendance = { _id: 'attendance', event: 'event', user: 'student', status: 'approved', calendarSyncStatus: 'pending' };
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); (getMyEventAttendance as jest.Mock).mockResolvedValue(pending); });
afterEach(() => jest.useRealTimers());
it('stops after twelve attempts and cleans up on unmount', async () => {
  const update = jest.fn();
  const { unmount } = renderHook(() => usePendingEventCalendar('event', pending, update));
  for (let n = 0; n < 15; n++) await act(async () => { jest.advanceTimersByTime(5000); });
  expect(getMyEventAttendance).toHaveBeenCalledTimes(12);
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});
it('does not poll pending/rejected/cancelled attendance and stops after cancellation', async () => {
  const update = jest.fn();
  const { rerender } = renderHook(({ attendance }) => usePendingEventCalendar('event', attendance, update), { initialProps: { attendance: pending } });
  rerender({ attendance: { ...pending, status: 'cancelled' } });
  await act(async () => { jest.advanceTimersByTime(60000); });
  expect(getMyEventAttendance).not.toHaveBeenCalled();
});
