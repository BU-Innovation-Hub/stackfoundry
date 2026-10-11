import express from 'express';
import { request as httpRequest, Server } from 'http';
import { AddressInfo } from 'net';
import { Types } from 'mongoose';
import Event from '../models/event.model';
import '../models/user.model';
import EventAttendance from '../models/event-attendance.model';
import { EventCheckInAttempt, EventCheckInSession } from '../models/event-checkin.model';
import { checkIn, checkInClock, checkInWindow, getCheckInSession, setCheckInSession, waitForCheckInSession } from '../services/event-checkin.service';
import { cancelAttendance, joinEvent } from '../services/event-attendance.service';
import eventRoutes from '../routes/v1/event.routes';
import { errorHandler } from '../middleware/errorHandler';
import { getUserById } from '../services/auth.service';
import { verifyAccessToken } from '../utils/jwt';
import { startTestReplica } from './replica-fixture';

jest.mock('../services/auth.service', () => ({ getUserById: jest.fn() }));
jest.mock('../utils/jwt', () => ({ verifyAccessToken: jest.fn() }));
jest.setTimeout(90000);
const owner = { id: new Types.ObjectId().toString(), role: 'mentor' };
const student = { id: new Types.ObjectId().toString(), role: 'student' };
const stranger = { id: new Types.ObjectId().toString(), role: 'mentor' };
const now = Math.floor(Date.now() / 60000) * 60000 + 20000;
let clock: jest.SpyInstance;
let eventId: string;
let server: Server;
let base: string;
let stopReplica: (() => Promise<void>) | undefined;
let challenge: Awaited<ReturnType<typeof getCheckInSession>>;
const token = () => new URL(challenge.qrUrl!).hash.slice('#token='.length);

beforeAll(async () => {
  stopReplica = await startTestReplica();
  await Promise.all([Event.init(), EventAttendance.init(), EventCheckInSession.init(), EventCheckInAttempt.init()]);
  const app = express(); app.use(express.json()); app.use('/events', eventRoutes); app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/events`;
});
afterAll(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  await stopReplica?.();
});
beforeEach(async () => {
  clock = jest.spyOn(checkInClock, 'now').mockReturnValue(now);
  await Promise.all([Event.deleteMany({}), EventAttendance.deleteMany({}), EventCheckInSession.deleteMany({}), EventCheckInAttempt.deleteMany({})]);
  const event = await Event.create({ title: 'Physical workshop', description: 'Check-in test', date: 'Today', time: 'Now', eventDate: new Date(now + 300000), endDate: new Date(now + 3600000), type: 'workshop', author: owner.id, authorName: 'Mentor', status: 'published', attendeeCount: 1 });
  eventId = event.id;
  await EventAttendance.create({ event: eventId, user: student.id, status: 'approved' });
  challenge = await setCheckInSession(eventId, owner, true);
  (verifyAccessToken as jest.Mock).mockReturnValue({ sub: student.id });
  (getUserById as jest.Mock).mockResolvedValue(student);
});
afterEach(() => { clock.mockRestore(); });

const request = (path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) => new Promise<{ status: number; data: any; headers: any }>((resolve, reject) => {
  const req = httpRequest(`${base}/${path}`, { method, agent: false, headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json', ...headers } }, response => {
    let content = ''; response.setEncoding('utf8'); response.on('data', chunk => { content += chunk; });
    response.on('error', reject); response.on('end', () => resolve({ status: response.statusCode!, data: JSON.parse(content), headers: response.headers }));
  });
  req.on('error', reject); req.end(body === undefined ? undefined : JSON.stringify(body));
});

it('records exactly one presence under concurrent QR and manual submissions without changing registrations', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, (_, index) => checkIn(eventId, student, index % 2 ? { token: token() } : { code: challenge.code })));
  expect(results.filter(result => !result.alreadyCheckedIn)).toHaveLength(1);
  expect(new Set(results.map(result => result.checkedInAt.toISOString())).size).toBe(1);
  expect(await EventAttendance.countDocuments({ event: eventId, user: student.id })).toBe(1);
  expect((await Event.findById(eventId))?.attendeeCount).toBe(1);
  expect((await EventAttendance.findOne({ event: eventId }))?.status).toBe('approved');
});
it('returns the original confirmation on retries after expiry', async () => {
  const first = await checkIn(eventId, student, { token: token() });
  clock.mockReturnValue(now + 7200000);
  const again = await checkIn(eventId, student, { token: token() });
  expect(again.alreadyCheckedIn).toBe(true);
  expect(again.checkedInAt).toEqual(first.checkedInAt);
});
it.each(['qr', 'manual'])('rotates both credentials after a successful %s check-in and rejects reuse by another student', async method => {
  const nextStudent = { id: new Types.ObjectId().toString(), role: 'student' };
  await EventAttendance.create({ event: eventId, user: nextStudent.id, status: 'approved' });
  const oldToken = token();
  const oldCode = challenge.code!;
  await checkIn(eventId, student, method === 'qr' ? { token: oldToken } : { code: oldCode });
  const next = await getCheckInSession(eventId, owner);
  expect(next.qrUrl).not.toBe(challenge.qrUrl);
  expect(next.code).not.toBe(oldCode);
  expect(next.revision).not.toBe(challenge.revision);
  await expect(checkIn(eventId, nextStudent, { token: oldToken })).rejects.toMatchObject({ statusCode: 400 });
  await expect(checkIn(eventId, nextStudent, { code: oldCode })).rejects.toMatchObject({ statusCode: 400 });
  // A duplicate from the original student must not consume the next student's code.
  await expect(checkIn(eventId, student, { token: oldToken })).resolves.toMatchObject({ alreadyCheckedIn: true });
  expect((await getCheckInSession(eventId, owner)).qrUrl).toBe(next.qrUrl);
  await expect(checkIn(eventId, nextStudent, { code: next.code })).resolves.toMatchObject({ alreadyCheckedIn: false });
});
it('allows only one new student to consume a challenge during concurrent submissions', async () => {
  const actors = Array.from({ length: 4 }, () => ({ id: new Types.ObjectId().toString(), role: 'student' }));
  await EventAttendance.insertMany(actors.map(actor => ({ event: eventId, user: actor.id, status: 'approved' })));
  const results = await Promise.allSettled(actors.map((actor, index) => checkIn(eventId, actor, index % 2 ? { token: token() } : { code: challenge.code })));
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter(result => result.status === 'rejected')).toHaveLength(3);
  expect(await EventAttendance.countDocuments({ event: eventId, checkedInAt: { $exists: true } })).toBe(1);
});
it('does not rotate credentials after a rejected proof or a rolled-back attendance write', async () => {
  await expect(checkIn(eventId, student, { token: `123.${'0'.repeat(64)}` })).rejects.toMatchObject({ statusCode: 400 });
  expect((await getCheckInSession(eventId, owner)).qrUrl).toBe(challenge.qrUrl);
  const save = jest.spyOn(EventAttendance.prototype, 'save').mockRejectedValueOnce(new Error('write failed'));
  try { await expect(checkIn(eventId, student, { token: token() })).rejects.toThrow('write failed'); }
  finally { save.mockRestore(); }
  expect((await getCheckInSession(eventId, owner)).qrUrl).toBe(challenge.qrUrl);
  expect(await EventAttendance.countDocuments({ checkedInAt: { $exists: true } })).toBe(0);
});
it('notifies the organizer of a consumed challenge before its time expiry', async () => {
  const controller = new AbortController();
  const waiting = waitForCheckInSession(eventId, owner, challenge.revision, controller.signal);
  try {
    await checkIn(eventId, student, { token: token() });
    const updated = await waiting;
    expect(updated?.revision).not.toBe(challenge.revision);
    expect(updated?.code).not.toBe(challenge.code);
    expect(updated?.qrUrl).not.toBe(challenge.qrUrl);
    expect(updated?.serverTime).toBe(challenge.serverTime);
  } finally { controller.abort(); }
});
it('stops waiting when the organizer disconnects and validates watch revisions', async () => {
  const controller = new AbortController();
  const waiting = waitForCheckInSession(eventId, owner, challenge.revision, controller.signal);
  controller.abort();
  await expect(waiting).resolves.toBeNull();
  (getUserById as jest.Mock).mockResolvedValue(owner);
  expect((await request(`${eventId}/check-in/session?after=invalid`)).status).toBe(400);
});
it('enforces five manual attempts under concurrent requests and does not reset on reopening', async () => {
  const wrong = challenge.code === '000' ? '001' : '000';
  const results = await Promise.allSettled(Array.from({ length: 12 }, () => checkIn(eventId, student, { code: wrong })));
  expect(results.every(result => result.status === 'rejected')).toBe(true);
  expect((await EventCheckInAttempt.findOne({ event: eventId, user: student.id }))?.attempts).toBe(5);
  await setCheckInSession(eventId, owner, false);
  challenge = await setCheckInSession(eventId, owner, true);
  await expect(checkIn(eventId, student, { code: challenge.code })).rejects.toMatchObject({ statusCode: 429 });
  await expect(checkIn(eventId, student, { token: token() })).resolves.toMatchObject({ checkInMethod: 'qr' });
});
it('rotates credentials, permits only the 15-second grace, and rejects stale QR proofs', async () => {
  const old = token();
  const nextMinute = Math.floor(now / 60000) * 60000 + 60000;
  clock.mockReturnValue(nextMinute + 15000);
  await expect(checkIn(eventId, student, { token: old })).rejects.toMatchObject({ statusCode: 400 });
  challenge = await getCheckInSession(eventId, owner);
  expect(token()).not.toBe(old);
  clock.mockReturnValue(nextMinute + 14999);
  await expect(checkIn(eventId, student, { token: old })).resolves.toMatchObject({ checkInMethod: 'qr' });
});
it('closing and reopening revoke previously issued credentials', async () => {
  const old = token();
  await setCheckInSession(eventId, owner, false);
  await expect(checkIn(eventId, student, { token: old })).rejects.toMatchObject({ statusCode: 409 });
  challenge = await setCheckInSession(eventId, owner, true);
  await expect(checkIn(eventId, student, { token: old })).rejects.toMatchObject({ statusCode: 400 });
  await expect(checkIn(eventId, student, { token: token() })).resolves.toMatchObject({ checkInMethod: 'qr' });
});
it('invalidates credentials when the schedule changes', async () => {
  const old = token();
  await Event.updateOne({ _id: eventId }, { $set: { endDate: new Date(now + 3700000) } });
  await expect(checkIn(eventId, student, { token: old })).rejects.toMatchObject({ statusCode: 400 });
});
it('rejects a QR issued for another event even when the student joined both', async () => {
  const other = await Event.create({ title: 'Other workshop', description: 'Other event', date: 'Today', time: 'Now', eventDate: new Date(now + 300000), endDate: new Date(now + 3600000), type: 'workshop', author: owner.id, authorName: 'Mentor', status: 'published' });
  await EventAttendance.create({ event: other._id, user: student.id, status: 'approved' });
  await setCheckInSession(other.id, owner, true);
  await expect(checkIn(other.id, student, { token: token() })).rejects.toMatchObject({ statusCode: 400 });
});
it.each(['close', 'cancel'])('revalidates a concurrent %s before committing a stale check-in', async action => {
  let resume!: () => void;
  let signal!: () => void;
  const paused = new Promise<void>(resolve => { signal = resolve; });
  const gate = new Promise<void>(resolve => { resume = resolve; });
  const original = Event.updateOne.bind(Event);
  // Pause after credential validation but before the transaction locks the event.
  const write = jest.spyOn(Event, 'updateOne').mockImplementationOnce(((...args: any[]) => {
    signal(); return gate.then(() => (original as any)(...args));
  }) as any);
  const outcome = checkIn(eventId, student, { token: token() }).then(() => 200, error => error.statusCode);
  try {
    await paused;
    if (action === 'close') await setCheckInSession(eventId, owner, false);
    else await cancelAttendance(eventId, student.id);
    resume();
    expect(await outcome).toBe(action === 'close' ? 409 : 403);
    expect((await EventAttendance.findOne({ event: eventId }))?.checkedInAt).toBeUndefined();
  } finally { resume(); write.mockRestore(); }
});
it.each(['pending', 'rejected', 'cancelled'])('rejects %s registrations without consuming a manual attempt', async status => {
  await EventAttendance.updateOne({ event: eventId }, { $set: { status } });
  await expect(checkIn(eventId, student, { code: challenge.code })).rejects.toMatchObject({ statusCode: 403 });
  expect(await EventCheckInAttempt.countDocuments()).toBe(0);
});
it('requires a joined student and rejects forged identity fields', async () => {
  await expect(checkIn(eventId, { ...student, id: new Types.ObjectId().toString() }, { token: token() })).rejects.toMatchObject({ statusCode: 403 });
  const response = await request(`${eventId}/check-in`, 'POST', { token: token(), user: owner.id });
  expect(response.status).toBe(400);
  expect(await EventAttendance.countDocuments({ checkedInAt: { $exists: true } })).toBe(0);
});
it.each(['member', 'mentor', 'innovation_hub_admin', 'system_admin'])('rejects check-in by %s', async role => {
  (getUserById as jest.Mock).mockResolvedValue({ ...student, role });
  expect((await request(`${eventId}/check-in`, 'POST', { token: token() })).status).toBe(403);
});
it('requires authentication and rejects inactive identities', async () => {
  expect((await request(`${eventId}/check-in`, 'POST', { token: token() }, { Authorization: '' })).status).toBe(401);
  (getUserById as jest.Mock).mockResolvedValue(null);
  expect((await request(`${eventId}/check-in`, 'POST', { token: token() })).status).toBe(401);
});
it('enforces organizer roles and mentor ownership on read and write', async () => {
  for (const actor of [student, stranger, { ...owner, role: 'member' }, { ...owner, role: 'system_admin' }]) {
    (getUserById as jest.Mock).mockResolvedValue(actor);
    expect((await request(`${eventId}/check-in/session`)).status).toBe(403);
    expect((await request(`${eventId}/check-in/session`, 'POST', { enabled: false })).status).toBe(403);
  }
  for (const actor of [owner, { ...stranger, role: 'innovation_hub_admin' }]) {
    (getUserById as jest.Mock).mockResolvedValue(actor);
    const response = await request(`${eventId}/check-in/session`);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.data.data.secret).toBeUndefined();
  }
});
it('preserves the browser origin through the organizer mutation and reports ownership distinctly', async () => {
  (getUserById as jest.Mock).mockResolvedValue(owner);
  const allowed = await request(`${eventId}/check-in/session`, 'POST', { enabled: false }, { Origin: 'http://localhost:3000' });
  expect(allowed.status).toBe(200);
  (getUserById as jest.Mock).mockResolvedValue(stranger);
  const denied = await request(`${eventId}/check-in/session`, 'POST', { enabled: false }, { Origin: 'http://localhost:3000' });
  expect(denied.status).toBe(403);
  expect(denied.data.details).toEqual({ code: 'EVENT_MANAGEMENT_FORBIDDEN' });
});
it('does not expose credentials through public events, registrations or default session selection', async () => {
  const event = await Event.findById(eventId);
  const publicResponse = await request(`slug/${event!.slug}`);
  const registration = await request(`${eventId}/attendance`);
  expect(publicResponse.status).toBe(200);
  expect(registration.status).toBe(200);
  for (const data of [publicResponse.data, registration.data]) {
    expect(JSON.stringify(data)).not.toContain(token());
    expect(data.data.secret).toBeUndefined();
    expect(data.data.code).toBeUndefined();
  }
  expect((await EventCheckInSession.findOne({ event: eventId }).lean())?.secret).toBeUndefined();
  expect(new URL(challenge.qrUrl!).search).toBe('');
});
it('rejects cross-origin and non-JSON mutations without recording attendance', async () => {
  expect((await request(`${eventId}/check-in`, 'POST', { token: token() }, { Origin: 'https://attacker.test' })).status).toBe(403);
  expect((await request(`${eventId}/check-in`, 'POST', { token: token() }, { 'Content-Type': 'text/plain' })).status).toBe(415);
  expect(await EventAttendance.countDocuments({ checkedInAt: { $exists: true } })).toBe(0);
});
it.each([{}, { code: 123 }, { code: '12' }, { code: '1234' }, { token: 'bad' }, { token: 'bad', code: '123' }, { code: { $ne: null } }])('rejects malformed proof %j', async body => {
  expect((await request(`${eventId}/check-in`, 'POST', body)).status).toBe(400);
});
it.each([{ locationType: 'virtual' }, { registrationLink: 'https://external.test' }, { status: 'draft' }, { status: 'archived' }, { endDate: new Date(now + 300000) }])('rejects an ineligible event %j', async patch => {
  await Event.updateOne({ _id: eventId }, { $set: patch });
  await expect(checkIn(eventId, student, { token: token() })).rejects.toMatchObject({ statusCode: 409 });
});
it('rejects deleted events and malformed IDs', async () => {
  await expect(checkIn('bad', student, { token: token() })).rejects.toMatchObject({ statusCode: 400 });
  await Event.updateOne({ _id: eventId }, { $set: { deletedAt: new Date() } });
  await expect(checkIn(eventId, student, { token: token() })).rejects.toMatchObject({ statusCode: 404 });
});
it('preserves proof of attendance across existing cancellation and rejoining', async () => {
  const first = await checkIn(eventId, student, { token: token() });
  await cancelAttendance(eventId, student.id);
  await expect(checkIn(eventId, student, { token: token() })).rejects.toMatchObject({ statusCode: 403 });
  await joinEvent(eventId, student.id);
  expect((await checkIn(eventId, student, { token: token() })).checkedInAt).toEqual(first.checkedInAt);
});
it('uses the server window with inclusive opening and exclusive ending', async () => {
  const event = (await Event.findById(eventId))!;
  const opens = new Date(event.startDate!).getTime() - 900000;
  const end = new Date(event.endDate!).getTime();
  expect(checkInWindow(event, opens - 1).available).toBe(false);
  expect(checkInWindow(event, opens).available).toBe(true);
  expect(checkInWindow(event, end - 1).available).toBe(true);
  expect(checkInWindow(event, end).available).toBe(false);
  clock.mockReturnValue(opens - 1);
  await expect(checkIn(eventId, student, { token: token() })).rejects.toMatchObject({ statusCode: 409 });
  clock.mockReturnValue(end);
  await expect(checkIn(eventId, student, { token: token() })).rejects.toMatchObject({ statusCode: 409 });
});
