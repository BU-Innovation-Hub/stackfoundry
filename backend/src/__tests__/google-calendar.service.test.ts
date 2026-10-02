const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();
jest.mock("googleapis", () => ({ google: {
  auth: { OAuth2: jest.fn(() => ({ setCredentials: jest.fn() })) },
  calendar: jest.fn(() => ({ events: { get: mockGet, patch: mockPatch, insert: mockInsert, delete: mockDelete } })),
} }));
jest.mock("../config/env", () => ({ getEnv: () => ({ GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test", GOOGLE_REFRESH_TOKEN: "test" }) }));
import { Types } from "mongoose";
import { syncEventToGoogle, deleteEventFromGoogle } from "../services/google-calendar.service";
import { IEvent } from "../models/event.model";
const event = { _id: new Types.ObjectId(), title: "Test", description: "Test", eventDate: new Date("2030-01-01"), locationType: "virtual" } as IEvent;
beforeEach(() => { mockGet.mockReset(); mockPatch.mockReset(); mockInsert.mockReset(); mockDelete.mockReset(); });

it("uses a stable external ID and recovers an insert conflict after uncertain creation", async () => {
  mockGet.mockRejectedValueOnce({ code: 404 }).mockResolvedValueOnce({ data: { id: `ih${event._id}`, conferenceData: { entryPoints: [{ entryPointType: "video", uri: "https://meet.google.com/recovered" }] } } });
  mockInsert.mockRejectedValueOnce({ code: 409 });
  const result = await syncEventToGoogle(event);
  expect(mockInsert.mock.calls[0][0].requestBody.id).toBe(`ih${event._id}`);
  expect(result.googleMeetLink).toBe("https://meet.google.com/recovered");
});
it("preserves conference data and a working Meet link during edits", async () => {
  const conferenceData = { entryPoints: [{ entryPointType: "video", uri: "https://meet.google.com/existing" }] };
  mockGet.mockResolvedValue({ data: { id: "existing", conferenceData } });
  mockPatch.mockResolvedValue({ data: { id: "existing" } });
  const result = await syncEventToGoogle({ ...event, googleCalendarEventId: "existing", googleMeetLink: "https://meet.google.com/existing" } as IEvent);
  expect(mockPatch.mock.calls[0][0].requestBody.conferenceData).toEqual(conferenceData);
  expect(result.googleMeetLink).toBe("https://meet.google.com/existing");
});
it("surfaces pending Meet generation for bounded worker retry", async () => {
  mockGet.mockResolvedValue({ data: { id: "existing", conferenceData: { createRequest: { status: { statusCode: "pending" } } } } });
  mockPatch.mockResolvedValue({ data: { id: "existing" } });
  await expect(syncEventToGoogle(event)).rejects.toThrow("generation pending");
});
it.each([404, 410])("deletion is idempotent on %s", async code => {
  mockDelete.mockRejectedValueOnce({ code });
  await expect(deleteEventFromGoogle(event)).resolves.toBeUndefined();
});
