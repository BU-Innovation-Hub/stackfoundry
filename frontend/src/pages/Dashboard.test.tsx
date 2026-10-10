import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { getEventBySlug, getEvents, getMyEvents, getMyEventAttendance } from '../services/eventService';
import { submitCheckIn } from '../services/eventCheckInService';

jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student', name: 'Student', role: 'student' }, logout: jest.fn() }) }));
jest.mock('../services/lmsService', () => ({ lmsGetCourses: async () => [], lmsGetMyEnrollments: async () => [] }));
jest.mock('../services/apiClient', () => ({ api: { get: async () => ({ data: { data: [] } }) } }));
jest.mock('../services/eventService', () => ({ getEventBySlug: jest.fn(), getEvents: jest.fn(), getMyEvents: jest.fn(), getMyEventAttendance: jest.fn() }));
jest.mock('../services/eventCheckInService', () => ({ submitCheckIn: jest.fn() }));
const event = { _id: 'event', slug: 'workshop', title: 'Design workshop', description: 'Build something together.', locationType: 'physical', type: 'workshop', eventDate: new Date(Date.now() - 60000).toISOString(), endDate: new Date(Date.now() + 3600000).toISOString(), image: '/event.jpg' };
beforeEach(() => {
  jest.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  (getEvents as jest.Mock).mockResolvedValue({ data: [event] });
  (getMyEvents as jest.Mock).mockResolvedValue({ data: [event] });
  (getEventBySlug as jest.Mock).mockResolvedValue(event);
  (getMyEventAttendance as jest.Mock).mockResolvedValue({ status: 'approved' });
  (submitCheckIn as jest.Mock).mockResolvedValue({ checkedInAt: new Date().toISOString(), checkInMethod: 'manual' });
});
const openEvent = async () => {
  render(<MemoryRouter initialEntries={[{ pathname: '/dashboard', state: { view: 'events' } }]}><Dashboard /></MemoryRouter>);
  fireEvent.click(await screen.findByText('Design workshop'));
  await screen.findByText('About This Event');
};
it('lets an approved student check in inside the dashboard event', async () => {
  await openEvent();
  expect(screen.getByRole('img', { name: 'Design workshop' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open camera' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Enter code manually' }));
  fireEvent.change(screen.getByLabelText('Three-digit attendance code'), { target: { value: '007' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit code' }));
  expect(await screen.findByText('Attendance confirmed')).toBeInTheDocument();
  expect(submitCheckIn).toHaveBeenCalledWith('event', { code: '007' });
});
it('does not offer check-in before the registration is approved', async () => {
  (getMyEventAttendance as jest.Mock).mockResolvedValue({ status: 'pending' });
  await openEvent();
  expect(screen.queryByRole('button', { name: 'Open camera' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Enter code manually' })).not.toBeInTheDocument();
});
it('expands navigation and closes it after choosing a destination', async () => {
  await openEvent();
  const toggle = screen.getByRole('button', { name: 'Open navigation menu' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveAttribute('aria-controls', 'student-navigation');
  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Close navigation menu' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('navigation', { name: 'Student dashboard' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'My Profile' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Home' }));
  expect(await screen.findByText('Welcome back, Student!')).toBeInTheDocument();
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveFocus();
});
it('dismisses navigation with Escape and returns focus to the hamburger', async () => {
  await openEvent();
  const toggle = screen.getByRole('button', { name: 'Open navigation menu' });
  fireEvent.click(toggle);
  screen.getByRole('button', { name: 'Home' }).focus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveFocus();
});
