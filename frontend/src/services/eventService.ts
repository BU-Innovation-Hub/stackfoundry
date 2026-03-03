import { api } from './apiClient';
import { IEvent } from '../types/event';

interface EventListResponse {
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
