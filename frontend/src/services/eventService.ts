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
export interface EventAttendance { _id: string; event: string; user: string; status: AttendanceStatus; googleMeetLink?: string | null; calendarSyncStatus?: 'disabled' | 'pending' | 'synced' | 'failed'; }

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
