import express from 'express';
import { Server, get } from 'http';
import { AddressInfo } from 'net';
import { Types } from 'mongoose';
import Event from '../models/event.model';
import EventAttendance from '../models/event-attendance.model';
import eventRoutes from '../routes/v1/event.routes';
import { errorHandler } from '../middleware/errorHandler';
import { getUserById } from '../services/auth.service';
import { verifyAccessToken } from '../utils/jwt';
import { startTestReplica } from './replica-fixture';

// Exercise real HTTP authorization, ownership and aggregation; only identity lookup is stubbed.
jest.mock('../services/auth.service', () => ({ getUserById: jest.fn() }));
jest.mock('../utils/jwt', () => ({ verifyAccessToken: jest.fn() }));
jest.setTimeout(60000);
const owner = new Types.ObjectId();
const stranger = new Types.ObjectId();
let eventId: string;
let server: Server;
let base: string;
let stopReplica: (() => Promise<void>) | undefined;
beforeAll(async () => {
  stopReplica = await startTestReplica();
  const event = await Event.create({ title: 'Insights test', description: 'Test event', date: '2099-01-01', time: '10:00', eventDate: new Date('2099-01-01'), type: 'workshop', author: owner, authorName: 'Organizer', status: 'published', capacity: 100, views: 72 });
  eventId = event._id.toString();
  await EventAttendance.insertMany([
    ...Array.from({ length: 45 }, () => ({ event: event._id, user: new Types.ObjectId(), status: 'approved' })),
    ...Array.from({ length: 6 }, () => ({ event: event._id, user: new Types.ObjectId(), status: 'pending' })),
    { event: event._id, user: new Types.ObjectId(), status: 'cancelled' },
    { event: event._id, user: new Types.ObjectId(), status: 'rejected' },
    { event: new Types.ObjectId(), user: new Types.ObjectId(), status: 'approved' },
  ]);
  const app = express(); app.use('/events', eventRoutes); app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/events`;
});
afterAll(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  await stopReplica?.();
});
beforeEach(() => {
  (verifyAccessToken as jest.Mock).mockReturnValue({ sub: owner.toString() });
  (getUserById as jest.Mock).mockResolvedValue({ id: owner.toString(), role: 'mentor' });
});
const request = (id = eventId, authenticated = true) => new Promise<{ status: number; json: () => unknown }>((resolve, reject) => {
  get(`${base}/${id}/insights`, { agent: false, headers: authenticated ? { Authorization: 'Bearer test' } : {} }, response => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', chunk => { body += chunk; });
    response.on('error', reject);
    response.on('end', () => resolve({ status: response.statusCode || 0, json: () => JSON.parse(body) as unknown }));
  }).on('error', reject);
});

it('counts all registrations beyond a page, excludes other events and leaves views unchanged', async () => {
  const response = await request();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true, data: { views: 72, capacity: 100, attendance: { approved: 45, pending: 6, rejected: 1, cancelled: 1 } } });
  expect((await Event.findById(eventId))?.views).toBe(72);
});
it('allows innovation hub administrators to inspect another organizer event', async () => {
  (getUserById as jest.Mock).mockResolvedValue({ id: stranger.toString(), role: 'innovation_hub_admin' });
  expect((await request()).status).toBe(200);
});
it('denies mentors access to another organizer event', async () => {
  (getUserById as jest.Mock).mockResolvedValue({ id: stranger.toString(), role: 'mentor' });
  expect((await request()).status).toBe(403);
});
it.each(['student', 'member', 'system_admin'])('denies the unsupported %s role', async role => {
  (getUserById as jest.Mock).mockResolvedValue({ id: owner.toString(), role });
  expect((await request()).status).toBe(403);
});
it('requires authentication', async () => { expect((await request(eventId, false)).status).toBe(401); });
it('validates ids and handles missing events', async () => {
  expect((await request('invalid')).status).toBe(400);
  expect((await request(new Types.ObjectId().toString())).status).toBe(404);
});
it('returns zero defaults for an empty unlimited draft', async () => {
  const empty = await Event.create({ title: 'Empty draft', description: 'Empty', date: '2099-01-01', time: '10:00', eventDate: new Date('2099-01-01'), type: 'workshop', author: owner, authorName: 'Organizer' });
  const response = await request(empty._id.toString());
  expect(await response.json()).toEqual({ success: true, data: { views: 0, capacity: null, attendance: { approved: 0, pending: 0, rejected: 0, cancelled: 0 } } });
});
it('excludes soft-deleted events', async () => {
  await Event.updateOne({ _id: eventId }, { $set: { deletedAt: new Date() } });
  expect((await request()).status).toBe(404);
});
