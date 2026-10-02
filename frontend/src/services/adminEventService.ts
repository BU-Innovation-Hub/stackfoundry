import axios from 'axios';
import { api } from './apiClient';
import { Event } from '../types/admin';
import { AttendanceStatus } from './eventService';
import { PaginationMeta } from '../components/common/Pagination';

export interface AdminEvent extends Omit<Event, 'author' | 'image' | 'registrationLink' | 'publishedAt'> {
  author: string | { _id: string; name?: string; surname?: string; email?: string } | null;
  image?: string | null;
  registrationLink?: string | null;
  publishedAt?: string | null;
}

export interface EventGuest {
  _id: string;
  status: AttendanceStatus;
  requestedAt?: string;
  user: { _id: string; name?: string; surname?: string; email?: string; studentId?: string } | null;
}

export interface EventInsights {
  views: number;
  capacity: number | null;
  attendance: Record<AttendanceStatus, number>;
}

export const getAdminEvent = async (id: string, signal?: AbortSignal): Promise<AdminEvent> => {
  const response = await api.get<{ data: AdminEvent }>(`/events/${id}`, { signal });
  return response.data.data;
};

export const getEventGuests = async (id: string, page: number, signal?: AbortSignal) => {
  const response = await api.get<{ data: EventGuest[]; pagination: PaginationMeta & { hasPrev?: boolean } }>(
    `/events/${id}/attendees`, { params: { page, limit: 20 }, signal });
  return { data: response.data.data, pagination: { ...response.data.pagination, hasPrevious: response.data.pagination.hasPrev } };
};

export const decideEventGuest = async (id: string, guestId: string, decision: 'approved' | 'rejected') => {
  await api.patch(`/events/${id}/attendees/${guestId}`, { decision });
};

export const getEventInsights = async (id: string, signal?: AbortSignal): Promise<EventInsights> => {
  const response = await api.get<{ data: EventInsights }>(`/events/${id}/insights`, { signal });
  return response.data.data;
};

export const eventErrorStatus = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

export const eventErrorMessage = (error: unknown, fallback: string): string => {
  const status = eventErrorStatus(error);
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to manage this event.';
  if (status === 404) return 'This event or registration is no longer available.';
  if (axios.isAxiosError<{ error?: string }>(error) && typeof error.response?.data?.error === 'string') return error.response.data.error;
  return fallback;
};
