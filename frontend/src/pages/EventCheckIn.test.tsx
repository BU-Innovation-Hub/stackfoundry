import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import EventCheckIn from './EventCheckIn';
import { getEventBySlug, getMyEventAttendance } from '../services/eventService';
import { submitCheckIn } from '../services/eventCheckInService';
jest.mock('../components/layout/Navbar', () => () => null);
jest.mock('../components/layout/Footer', () => () => null);
let mockAuth: any;
jest.mock('../context/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../services/eventService', () => ({ getEventBySlug: jest.fn(), getMyEventAttendance: jest.fn() }));
jest.mock('../services/eventCheckInService', () => ({ submitCheckIn: jest.fn() }));
const token = `12345678.${'a'.repeat(64)}`;
const event = { _id: 'event', slug: 'workshop', title: 'Workshop', locationType: 'physical', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 3600000).toISOString(), status: 'published' };
const Location = () => { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.hash}</output>; };
const mount = (url = '/events/workshop/check-in') => render(<MemoryRouter initialEntries={[url]}><Location /><Routes><Route path="/events/:slug/check-in" element={<EventCheckIn />} /><Route path="/login" element={<p>Login form</p>} /></Routes></MemoryRouter>);
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  mockAuth = { isLoading: false, isAuthenticated: true, user: { id: 'student', role: 'student' } };
  (getEventBySlug as jest.Mock).mockResolvedValue(event);
  (getMyEventAttendance as jest.Mock).mockResolvedValue({ status: 'approved' });
  (submitCheckIn as jest.Mock).mockResolvedValue({ checkedInAt: new Date().toISOString(), checkInMethod: 'manual', alreadyCheckedIn: false });
});
it('removes QR tokens from the address and requires explicit confirmation', async () => {
  mount(`/events/workshop/check-in#token=${token}`);
  const confirm = await screen.findByRole('button', { name: 'Confirm attendance' });
  expect(screen.getByTestId('location')).toHaveTextContent('/events/workshop/check-in');
  expect(screen.getByTestId('location').textContent).not.toContain(token);
  expect(submitCheckIn).not.toHaveBeenCalled();
  fireEvent.click(confirm);
  expect(await screen.findByText('Attendance confirmed')).toBeInTheDocument();
  expect(submitCheckIn).toHaveBeenCalledWith('event', { token });
  expect(sessionStorage.getItem('event-check-in:workshop')).toBeNull();
});
it('preserves a scan and a local return path through sign in', async () => {
  mockAuth = { isLoading: false, isAuthenticated: false, user: null };
  mount(`/events/workshop/check-in#token=${token}`);
  fireEvent.click(await screen.findByRole('button', { name: 'Sign in to check in' }));
  expect(await screen.findByText('Login form')).toBeInTheDocument();
  expect(sessionStorage.getItem('redirectAfterLogin')).toBe('/events/workshop/check-in');
  expect(JSON.parse(sessionStorage.getItem('event-check-in:workshop')!).token).toBe(token);
  expect(submitCheckIn).not.toHaveBeenCalled();
});
it('restores a recent scan after login', async () => {
  sessionStorage.setItem('event-check-in:workshop', JSON.stringify({ token, capturedAt: Date.now() }));
  mount(); expect(await screen.findByRole('button', { name: 'Confirm attendance' })).toBeInTheDocument();
});
it('submits all three digits including leading zero and shows confirmation', async () => {
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Enter code manually' })); fireEvent.change(screen.getByLabelText('Three-digit attendance code'), { target: { value: '007' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit code' }));
  expect(await screen.findByText('Attendance confirmed')).toBeInTheDocument();
  expect(submitCheckIn).toHaveBeenCalledWith('event', { code: '007' });
});
it('shows network errors without falsely confirming attendance and allows retry', async () => {
  (submitCheckIn as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Enter code manually' })); fireEvent.change(screen.getByLabelText('Three-digit attendance code'), { target: { value: '123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit code' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be confirmed');
  expect(screen.queryByText('Attendance confirmed')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Submit code' }));
  expect(await screen.findByText('Attendance confirmed')).toBeInTheDocument();
});
it('locks manual entry after exhaustion but retains the QR path', async () => {
  (submitCheckIn as jest.Mock).mockRejectedValue({ response: { status: 429, data: { error: 'Manual entry limit reached' } } });
  mount(`/events/workshop/check-in#token=${token}`);
  fireEvent.click(await screen.findByRole('button', { name: 'Enter code manually' }));
  fireEvent.change(screen.getByLabelText('Three-digit attendance code'), { target: { value: '123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit code' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Submit code' })).toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Close code entry' }));
  expect(screen.getByRole('button', { name: 'Confirm attendance' })).toBeEnabled();
});
it.each(['pending', 'rejected', 'cancelled'])('prevents submission for %s registration', async status => {
  (getMyEventAttendance as jest.Mock).mockResolvedValue({ status });
  mount(); await screen.findByRole('link', { name: 'View your registration' });
  expect(screen.queryByRole('button', { name: 'Submit code' })).not.toBeInTheDocument();
});
it('shows existing check-in confirmation without a new submission', async () => {
  (getMyEventAttendance as jest.Mock).mockResolvedValue({ status: 'approved', checkedInAt: new Date().toISOString() });
  mount(); expect(await screen.findByText('Attendance confirmed')).toBeInTheDocument();
  expect(submitCheckIn).not.toHaveBeenCalled();
});
it('excludes members and virtual events', async () => {
  mockAuth.user.role = 'member'; const view = mount();
  expect(await screen.findByText('Attendance check-in is available to students only.')).toBeInTheDocument();
  view.unmount(); mockAuth.user.role = 'student';
  (getEventBySlug as jest.Mock).mockResolvedValue({ ...event, locationType: 'virtual' });
  mount(); expect(await screen.findByText('Check-in is only available for physical events with registration through this website.')).toBeInTheDocument();
});
