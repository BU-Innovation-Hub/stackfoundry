import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EventDetail from './EventDetail';
import { getEventBySlug, getMyEventAttendance, joinEvent, cancelEventAttendance } from '../services/eventService';
jest.mock('../components/layout/Navbar', () => () => null);
jest.mock('../components/layout/Footer', () => () => null);
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, user: { name: 'Student', role: 'student' } }) }));
jest.mock('../services/eventService', () => ({ getEventBySlug: jest.fn(), getMyEventAttendance: jest.fn(), joinEvent: jest.fn(), cancelEventAttendance: jest.fn() }));
const event = { _id: 'event', slug: 'workshop', title: 'Workshop', description: 'Learn things', type: 'workshop', date: 'January 1, 2030', time: '10:00', eventDate: '2099-01-01T10:00:00Z', locationType: 'virtual', authorName: 'Organizer' };
let attendance: any;
const mount = () => render(<MemoryRouter initialEntries={['/events/workshop']}><Routes><Route path="/events/:slug" element={<EventDetail />} /></Routes></MemoryRouter>);
beforeEach(() => {
  jest.clearAllMocks(); window.scrollTo = jest.fn(); attendance = null;
  (getEventBySlug as jest.Mock).mockResolvedValue(event);
  (getMyEventAttendance as jest.Mock).mockImplementation(async () => attendance);
  (joinEvent as jest.Mock).mockImplementation(async () => { attendance = { status: 'pending' }; return attendance; });
  (cancelEventAttendance as jest.Mock).mockImplementation(async () => { attendance = { status: 'cancelled' }; return attendance; });
});
it('shows pending approval, refreshes the event, and supports cancellation', async () => {
  mount();
  fireEvent.click(await screen.findByRole('button', { name: /Join Now/i }));
  expect(await screen.findByText('Request Pending')).toBeTruthy();
  expect(screen.queryByRole('link', { name: /Add to Google Calendar/i })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Cancel Request/i }));
  expect(await screen.findByRole('button', { name: /Join Now/i })).toBeTruthy();
  expect(getEventBySlug).toHaveBeenCalledTimes(3);
});
it('removes meeting access after approved attendance is cancelled', async () => {
  attendance = { status: 'approved', googleMeetLink: 'https://meet.google.com/private' };
  mount();
  expect(await screen.findByRole('link', { name: /Join meeting/i })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Cancel Attendance/i }));
  await waitFor(() => expect(screen.queryByRole('link', { name: /Join meeting/i })).toBeNull());
});
it('does not expose a meeting URL accidentally present in the public event payload', async () => {
  (getEventBySlug as jest.Mock).mockResolvedValue({ ...event, googleMeetLink: 'https://meet.google.com/leaked' });
  mount(); await screen.findByRole('button', { name: /Join Now/i });
  expect(screen.queryByRole('link', { name: /Join meeting/i })).toBeNull();
});
it('preserves external registration without creating internal attendance', async () => {
  const open = jest.spyOn(window, 'open').mockImplementation(() => null);
  (getEventBySlug as jest.Mock).mockResolvedValue({ ...event, registrationLink: 'https://registration.test' });
  mount(); fireEvent.click(await screen.findByRole('button', { name: /Join Now/i }));
  expect(open).toHaveBeenCalledWith('https://registration.test', '_blank', 'noopener,noreferrer');
  expect(joinEvent).not.toHaveBeenCalled(); open.mockRestore();
});
it('shows attendance errors instead of presenting them as no prior request', async () => {
  (getMyEventAttendance as jest.Mock).mockRejectedValue(new Error('offline'));
  mount(); expect(await screen.findByRole('alert')).toBeTruthy();
});
