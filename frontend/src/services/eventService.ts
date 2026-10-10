import { IEvent } from '../types/event';
import { api } from './apiClient';

export interface EventListResponse {
    success: boolean;
    data: IEvent[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

interface EventDetailResponse {
    success: boolean;
    data: IEvent;
}

/**
 * Get featured/upcoming events for homepage
 */
export const getFeaturedEvents = async (limit: number = 4): Promise<IEvent[]> => {
    const response = await api.get<EventListResponse>(`/events/featured?limit=${limit}`);
    return response.data.data;
};

/**
 * Get published events with optional filtering
 */
export const getEvents = async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
    temporal?: 'current' | 'past';
}): Promise<EventListResponse> => {
    const response = await api.get<EventListResponse>('/events', { params });
    return response.data;
};

/**
 * Get a single event by slug
 */
export const getEventBySlug = async (slug: string): Promise<IEvent> => {
    const response = await api.get<EventDetailResponse>(`/events/slug/${slug}`);
    return response.data.data;
};

export type AttendanceStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export interface EventAttendance { _id: string; event: string; user?: string; guest?: string; status: AttendanceStatus; checkedInAt?: string; checkInMethod?: 'qr' | 'manual'; googleMeetLink?: string | null; }
export interface GuestSession { guestId: string; name: string; email: string; expiresAt: string; registrationLink?: string | null; }
export const getGuestSession = async (eventId: string): Promise<{ guest: Omit<GuestSession, 'registrationLink'>; attendance: EventAttendance | null } | null> => {
    const response = await api.get<{ data: { guest: Omit<GuestSession, 'registrationLink'>; attendance: EventAttendance | null } | null }>(`/events/${eventId}/guest/session`);
    return response.data.data;
};
export const createGuestSession = async (eventId: string, data: { name: string; email: string }): Promise<GuestSession> => {
    const response = await api.post<{ data: GuestSession }>(`/events/${eventId}/guest/session`, data);
    return response.data.data;
};
export const joinAsGuest = async (eventId: string): Promise<EventAttendance | { externalUrl: string }> => {
    const response = await api.post<{ data: EventAttendance | { externalUrl: string } }>(`/events/${eventId}/guest/join`);
    return response.data.data;
};
export const cancelGuestAttendance = async (eventId: string): Promise<EventAttendance> => {
    const response = await api.post<{ data: EventAttendance }>(`/events/${eventId}/guest/cancel`);
    return response.data.data;
};

export const getMyEventAttendance = async (eventId: string): Promise<EventAttendance | null> => {
    const response = await api.get<{ data: EventAttendance | null }>(`/events/${eventId}/attendance`);
    return response.data.data;
};
export const joinEvent = async (eventId: string): Promise<EventAttendance> => {
    const response = await api.post<{ data: EventAttendance }>(`/events/${eventId}/join`);
    return response.data.data;
};
export const cancelEventAttendance = async (eventId: string): Promise<EventAttendance> => {
    const response = await api.post<{ data: EventAttendance }>(`/events/${eventId}/cancel`);
    return response.data.data;
};
export const getMyEvents = async (status: 'upcoming' | 'going' | 'past', page = 1, limit = 20, filters?: { search?: string; type?: string }): Promise<EventListResponse> => {
    const response = await api.get<EventListResponse>('/events/mine', { params: { status, page, limit, ...filters } });
    return response.data;
};
