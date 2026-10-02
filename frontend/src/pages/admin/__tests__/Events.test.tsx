import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Events from '../Events';
import EventWorkspace from '../EventWorkspace';
import { getEvents, updateEvent, deleteEvent } from '../../../services/adminService';
import { api } from '../../../services/apiClient';
jest.mock('../../../services/adminService', () => ({ getEvents: jest.fn(), createEvent: jest.fn(), updateEvent: jest.fn(), deleteEvent: jest.fn() }));
jest.mock('../../../services/apiClient', () => ({ api: { get: jest.fn(), patch: jest.fn(), post: jest.fn() } }));
const event = { _id: 'event', title: 'Workshop', description: 'Build something together.', slug: 'workshop', type: 'workshop', status: 'published', date: 'Jan 1', time: '10:00', eventDate: '2099-01-01T10:00:00Z', requireApproval: true, authorName: 'Organizer', author: { _id: 'mentor' }, attendeeCount: 1, revision: 1, locationType: 'physical', views: 42 };
let currentEvent = { ...event };
let approved = false;
const Location = () => { const location = useLocation(); const navigate = useNavigate(); return <><output data-testid="location">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>History back</button><button onClick={() => navigate('/admin/events/other')}>Other event</button></>; };
const mount = (url = '/admin/events/event') => render(<MemoryRouter initialEntries={[url]}><Location /><Routes><Route path="/admin/events" element={<Events />} /><Route path="/admin/events/:eventId" element={<EventWorkspace />} /></Routes></MemoryRouter>);
const axiosError = (status: number, error: string) => ({ isAxiosError: true, response: { status, data: { error } } });
beforeEach(() => {
  currentEvent = { ...event }; approved = false;
  (getEvents as jest.Mock).mockResolvedValue({ data: [event], pagination: { page: 2, limit: 25, total: 30, pages: 2 } });
  (api.get as jest.Mock).mockImplementation(async (url: string, options?: { params?: { page: number } }) => {
    if (url.endsWith('/insights')) return { data: { data: { views: 42, capacity: null, attendance: { approved: approved ? 2 : 1, pending: approved ? 19 : 20, rejected: 0, cancelled: 0 } } } };
    if (url.endsWith('/attendees')) return { data: { data: [{ _id: 'attendance', status: approved ? 'approved' : 'pending', requestedAt: '2026-10-01', user: { _id: 'student', name: 'Student', surname: 'Test', email: 'student@example.test' } }], pagination: { page: options?.params?.page || 1, limit: 20, total: 21, pages: 2, hasPrev: options?.params?.page === 2 } } };
    return { data: { data: currentEvent } };
  });
  (api.patch as jest.Mock).mockImplementation(async () => { approved = true; return { data: {} }; });
  (updateEvent as jest.Mock).mockResolvedValue(event);
  (deleteEvent as jest.Mock).mockResolvedValue(undefined);
});
afterEach(() => { jest.useRealTimers(); });

it('paginates guests and refreshes event and loaded insights after approval', async () => {
  mount('/admin/events/event?tab=insights');
  await screen.findByText('Registration breakdown');
  fireEvent.click(screen.getByRole('tab', { name: 'Guests' }));
  await screen.findByText('Student Test');
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/events/event/attendees', expect.objectContaining({ params: { page: 2, limit: 20 } })));
  fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/events/event/attendees/attendance', { decision: 'approved' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument());
  await waitFor(() => expect((api.get as jest.Mock).mock.calls.filter(([url]) => url === '/events/event').length).toBe(2));
  await waitFor(() => expect((api.get as jest.Mock).mock.calls.filter(([url]) => url === '/events/event/insights').length).toBe(2));
});
it('makes cards semantic links and preserves list state after opening and returning', async () => {
  mount('/admin/events?status=published&search=workshop&page=2&limit=25');
  const link = await screen.findByRole('link', { name: 'Workshop' });
  expect(link).toHaveAttribute('href', '/admin/events/event?status=published&search=workshop&page=2&limit=25&tab=overview');
  fireEvent.click(link);
  await screen.findByRole('tab', { name: 'Overview' });
  fireEvent.click(screen.getByRole('link', { name: 'Back to Events' }));
  await screen.findByRole('link', { name: 'Workshop' });
  expect(getEvents).toHaveBeenLastCalledWith({ page: 2, limit: 25, search: 'workshop', status: 'published' });
});
it('keeps Edit and Delete independent and routes Manage attendees to Guests', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  mount('/admin/events');
  fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent('/admin/events');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Workshop' }));
  expect(deleteEvent).not.toHaveBeenCalled(); confirm.mockRestore();
  fireEvent.click(screen.getByRole('link', { name: 'Manage attendees' }));
  await screen.findByText('Student Test');
  expect(screen.getByRole('tab', { name: 'Guests' })).toHaveAttribute('aria-selected', 'true');
});
it('supports keyboard tabs, browser history, and exactly three tabs', async () => {
  mount('/admin/events/event?tab=invalid');
  const overview = await screen.findByRole('tab', { name: 'Overview' });
  expect(overview).toHaveAttribute('aria-selected', 'true');
  expect(screen.getAllByRole('tab')).toHaveLength(3);
  fireEvent.keyDown(overview, { key: 'ArrowRight' });
  await screen.findByText('Student Test');
  expect(screen.getByRole('tab', { name: 'Guests' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'History back' }));
  await waitFor(() => expect(overview).toHaveAttribute('aria-selected', 'true'));
  expect((api.get as jest.Mock).mock.calls.some(([url]) => String(url).includes('/slug/'))).toBe(false);
});
it.each(['draft', 'archived', 'published'])('respects %s public sharing rules', async status => {
  currentEvent.status = status;
  mount(); await screen.findByRole('tab', { name: 'Overview' });
  if (status === 'draft') {
    expect(screen.getByRole('button', { name: /Share Event/ })).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'Event Page' })).not.toBeInTheDocument();
  } else expect(screen.getByRole('link', { name: 'Event Page' })).toHaveAttribute('href', '/events/workshop');
});
it('provides a selectable link when copying fails', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn().mockRejectedValue(new Error('denied')) } });
  mount(); fireEvent.click(await screen.findByRole('button', { name: /Share Event/ }));
  expect(await screen.findByLabelText('Copy this event link:')).toHaveValue('http://localhost/events/workshop');
});
it('preserves edits after a revision conflict and explicitly reloads the latest event', async () => {
  (updateEvent as jest.Mock).mockRejectedValueOnce(axiosError(409, 'Event changed.'));
  mount(); fireEvent.click(await screen.findByRole('button', { name: /Edit Event/ }));
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'My unsaved title' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await screen.findByText('Event changed.');
  expect(screen.getByLabelText('Title')).toHaveValue('My unsaved title');
  expect(updateEvent).toHaveBeenCalledWith('event', expect.objectContaining({ revision: 1, title: 'My unsaved title' }));
  currentEvent = { ...event, title: 'Updated by another editor', revision: 2 };
  fireEvent.click(screen.getByRole('button', { name: 'Reload latest event' }));
  await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Updated by another editor'));
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(updateEvent).toHaveBeenLastCalledWith('event', expect.objectContaining({ revision: 2 })));
});
it('surfaces capacity conflicts and refreshes authoritative guests', async () => {
  (api.patch as jest.Mock).mockRejectedValue(axiosError(409, 'Event is at capacity'));
  mount('/admin/events/event?tab=guests');
  fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Event is at capacity');
  await waitFor(() => expect((api.get as jest.Mock).mock.calls.filter(([url]) => url.endsWith('/attendees')).length).toBe(2));
});
it('isolates Insights failure from Overview and editing', async () => {
  const normal = (api.get as jest.Mock).getMockImplementation();
  (api.get as jest.Mock).mockImplementation((url: string, options: unknown) => url.endsWith('/insights') ? Promise.reject(new Error('offline')) : normal?.(url, options));
  mount('/admin/events/event?tab=insights');
  await screen.findByRole('button', { name: 'Retry insights' });
  fireEvent.click(screen.getByRole('tab', { name: 'Overview' }));
  expect(screen.getByText('Venue details not provided.')).toBeVisible();
  expect(screen.getByRole('button', { name: /Edit Event/ })).toBeEnabled();
});
it.each([403, 404])('handles unavailable event (%s) without exposing the workspace', async status => {
  (api.get as jest.Mock).mockRejectedValue(axiosError(status, 'Unavailable'));
  mount(); expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.queryByRole('tab')).not.toBeInTheDocument();
});
it('shows zero/unlimited insights and handles missing guest records', async () => {
  (api.get as jest.Mock).mockImplementation(async (url: string) => ({ data: { data: url.endsWith('/insights') ? { views: 0, capacity: null, attendance: { approved: 0, pending: 0, rejected: 0, cancelled: 0 } } : url.endsWith('/attendees') ? [{ _id: 'missing', user: null, status: 'cancelled' }] : event, pagination: { page: 1, limit: 20, total: 1, pages: 1 } } }));
  mount('/admin/events/event?tab=insights');
  await screen.findByText('Registration breakdown');
  expect(within(screen.getByRole('tabpanel')).getByText('Unlimited capacity')).toBeVisible();
  expect(screen.getByText(/No registrations yet/)).toBeVisible();
  fireEvent.click(screen.getByRole('tab', { name: 'Guests' }));
  expect(await screen.findByText('Unavailable user')).toBeVisible();
});
it('uploads a replacement photo through the shared editor', async () => {
  (api.post as jest.Mock).mockResolvedValue({ data: { data: { url: 'https://images.test/new.png' } } });
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Change Photo' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('Event Image').parentElement).toHaveFocus();
  fireEvent.change(dialog.querySelector('input[type="file"]')!, { target: { files: [new File(['image'], 'cover.png', { type: 'image/png' })] } });
  expect(await screen.findByAltText('Event preview')).toHaveAttribute('src', 'https://images.test/new.png');
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(updateEvent).toHaveBeenCalledWith('event', expect.objectContaining({ image: 'https://images.test/new.png' })));
});
it('limits calendar polling to twelve attempts and cleans up on unmount', async () => {
  jest.useFakeTimers();
  (api.get as jest.Mock).mockResolvedValue({ data: { data: { ...event, calendarSyncStatus: 'pending' } } });
  const view = mount();
  await act(async () => { await Promise.resolve(); });
  for (let i = 0; i < 14; i++) await act(async () => { jest.advanceTimersByTime(5000); });
  expect(api.get).toHaveBeenCalledTimes(13);
  view.unmount();
  await act(async () => { jest.advanceTimersByTime(10000); });
  expect(api.get).toHaveBeenCalledTimes(13);
});

it('ignores an older detail response after navigating to a different event', async () => {
  let resolveOld: (result: unknown) => void = () => {};
  (api.get as jest.Mock).mockImplementation((url: string) => url === '/events/event'
    ? new Promise(resolve => { resolveOld = resolve; })
    : Promise.resolve({ data: { data: { ...event, _id: 'other', title: 'Other workshop' } } }));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Other event' }));
  await screen.findByRole('heading', { level: 1, name: 'Other workshop' });
  await act(async () => { resolveOld({ data: { data: event } }); });
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Other workshop');
});

it('uses legacy schedule data, an image placeholder and calendar failure messaging', async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { data: { ...event, eventDate: '', calendarSyncStatus: 'failed', image: 'https://images.test/broken.png' } } });
  mount();
  fireEvent.error(await screen.findByAltText('Workshop cover'));
  expect(screen.getByText('Ideas meet opportunity.')).toBeVisible();
  expect(screen.getByText('Jan 1')).toBeVisible();
  expect(screen.getByText(/Calendar needs attention/)).toBeVisible();
  expect(screen.getByText(new RegExp(Intl.DateTimeFormat().resolvedOptions().timeZone))).toBeVisible();
});

it('copies a public link and displays confirmation', async () => {
  const copy = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
  mount(); fireEvent.click(await screen.findByRole('button', { name: /Share Event/ }));
  expect(await screen.findByText('Event link copied.')).toBeVisible();
  expect(copy).toHaveBeenCalledWith('http://localhost/events/workshop');
});

it('rejects a guest and prevents duplicate decisions while saving', async () => {
  let finish: () => void = () => {};
  (api.patch as jest.Mock).mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  mount('/admin/events/event?tab=guests');
  fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
  expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Saving/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
  expect(api.patch).toHaveBeenCalledTimes(1);
  expect(api.patch).toHaveBeenCalledWith('/events/event/attendees/attendance', { decision: 'rejected' });
  await act(async () => { finish(); });
});

it('distinguishes guest loading errors from an empty guest list and retries', async () => {
  const normal = (api.get as jest.Mock).getMockImplementation();
  let failed = true;
  (api.get as jest.Mock).mockImplementation((url: string, options: unknown) => url.endsWith('/attendees')
    ? failed ? Promise.reject(new Error('offline')) : Promise.resolve({ data: { data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } } })
    : normal?.(url, options));
  mount('/admin/events/event?tab=guests');
  await screen.findByRole('button', { name: 'Retry guests' });
  expect(screen.queryByText('No guests yet')).not.toBeInTheDocument();
  failed = false;
  fireEvent.click(screen.getByRole('button', { name: 'Retry guests' }));
  expect(await screen.findByText('No guests yet')).toBeVisible();
});

it('traps editor keyboard focus and restores focus after Escape', async () => {
  mount();
  const edit = await screen.findByRole('button', { name: /Edit Event/ });
  edit.focus(); fireEvent.click(edit);
  const close = screen.getByRole('button', { name: 'Close editor' });
  const save = screen.getByRole('button', { name: 'Update' });
  close.focus(); fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
  expect(save).toHaveFocus();
  fireEvent.keyDown(save, { key: 'Tab' });
  expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(edit).toHaveFocus();
});
