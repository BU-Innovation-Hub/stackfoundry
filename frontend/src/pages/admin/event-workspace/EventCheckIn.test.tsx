import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import EventCheckIn from './EventCheckIn';
import { getCheckInSession, setCheckInSession } from '../../../services/eventCheckInService';
jest.mock('../../../services/eventCheckInService', () => ({ getCheckInSession: jest.fn(), setCheckInSession: jest.fn() }));
const event: any = { _id: 'event', title: 'Workshop', eventDate: new Date(Date.now() - 60000).toISOString(), startDate: new Date(Date.now() - 60000).toISOString(), endDate: new Date(Date.now() + 3600000).toISOString() };
let data: any;
let waiting: Array<{ resolve: (value: any) => void; reject: (error: Error) => void; signal: AbortSignal }>;
beforeEach(() => {
  jest.clearAllMocks(); jest.useFakeTimers(); waiting = [];
  data = { revision: '1:1', available: true, enabled: true, reason: null, serverTime: new Date().toISOString(), opensAt: new Date(Date.now() - 60000).toISOString(), closesAt: new Date(Date.now() + 3600000).toISOString(), refreshAt: new Date(Date.now() + 60000).toISOString(), expiresAt: new Date(Date.now() + 75000).toISOString(), qrUrl: 'https://example.test/events/workshop/check-in#token=abc', code: '007' };
  (getCheckInSession as jest.Mock).mockImplementation((_id, signal, revision) => {
    if (revision === undefined) return Promise.resolve(data);
    return new Promise((resolve, reject) => {
      waiting.push({ resolve, reject, signal });
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  });
});
afterEach(() => jest.useRealTimers());
it('keeps one live request and replaces both codes as soon as attendance is recorded', async () => {
  const view = render(<EventCheckIn event={event} onChanged={jest.fn()} />);
  expect(await screen.findByText('Attendance QR for Workshop')).toBeInTheDocument();
  expect(screen.getByLabelText('Manual attendance code: 007')).toBeInTheDocument();
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(getCheckInSession).toHaveBeenCalledTimes(2);
  data = { ...data, revision: '2:2', code: '891', qrUrl: 'https://example.test/events/workshop/check-in#token=new' };
  await act(async () => { waiting.shift()!.resolve(data); });
  expect(screen.getByLabelText('Manual attendance code: 891')).toBeInTheDocument();
  expect(screen.queryByLabelText('Manual attendance code: 007')).not.toBeInTheDocument();
  expect(getCheckInSession).toHaveBeenLastCalledWith('event', expect.any(AbortSignal), '2:2');
  const active = waiting[0].signal;
  view.unmount();
  expect(active.aborted).toBe(true);
  await act(async () => { jest.advanceTimersByTime(120000); });
  expect(getCheckInSession).toHaveBeenCalledTimes(3);
});
it('opens and closes check-in with explicit organizer controls', async () => {
  const changed = jest.fn();
  data = { ...data, enabled: false, qrUrl: null, code: null, refreshAt: null };
  (setCheckInSession as jest.Mock).mockImplementation(async (_id, enabled) => { data = { ...data, enabled }; return data; });
  render(<EventCheckIn event={event} onChanged={changed} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Open check-in' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Close check-in' }));
  await screen.findByRole('button', { name: 'Open check-in' });
  expect(setCheckInSession).toHaveBeenNthCalledWith(1, 'event', true);
  expect(setCheckInSession).toHaveBeenNthCalledWith(2, 'event', false);
  expect(changed).toHaveBeenCalledTimes(2);
});
it('offers direct navigation to the guest roster', async () => {
  const onGuests = jest.fn();
  render(<EventCheckIn event={event} onChanged={jest.fn()} onGuests={onGuests} />);
  fireEvent.click(await screen.findByRole('button', { name: /View Guests/ }));
  expect(onGuests).toHaveBeenCalledTimes(1);
});
it('removes stale QR and code after a failed refresh', async () => {
  render(<EventCheckIn event={event} onChanged={jest.fn()} />);
  await screen.findByLabelText('Manual attendance code: 007');
  await act(async () => { waiting.shift()!.reject(new Error('offline')); });
  expect(screen.queryByLabelText('Manual attendance code: 007')).not.toBeInTheDocument();
  expect(screen.queryByText('Attendance QR for Workshop')).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to refresh');
});
it('stops after an unsupported API response instead of repeatedly requesting credentials', async () => {
  data = { ...data, revision: undefined };
  render(<EventCheckIn event={event} onChanged={jest.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to refresh attendance');
  expect(getCheckInSession).toHaveBeenCalledTimes(1);
  expect(screen.queryByLabelText('Manual attendance code: 007')).not.toBeInTheDocument();
});

it('hides expired credentials even while a live response is delayed', async () => {
  render(<EventCheckIn event={event} onChanged={jest.fn()} />);
  await screen.findByLabelText('Manual attendance code: 007');
  await act(async () => { jest.advanceTimersByTime(61000); });
  expect(screen.queryByLabelText('Manual attendance code: 007')).not.toBeInTheDocument();
  expect(screen.queryByText('Attendance QR for Workshop')).not.toBeInTheDocument();
});
it('aborts the live request when hidden and reloads on return', async () => {
  const visibility = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  try {
    render(<EventCheckIn event={event} onChanged={jest.fn()} />);
    await screen.findByLabelText('Manual attendance code: 007');
    const active = waiting[0].signal;
    visibility.mockReturnValue('hidden');
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(active.aborted).toBe(true);
    expect(screen.queryByLabelText('Manual attendance code: 007')).not.toBeInTheDocument();
    data = { ...data, revision: '2:2', code: '891' };
    visibility.mockReturnValue('visible');
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(await screen.findByLabelText('Manual attendance code: 891')).toBeInTheDocument();
  } finally { visibility.mockRestore(); }
});
