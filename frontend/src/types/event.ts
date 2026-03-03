// Event types for the frontend
// Mirrored from backend event model

export const EVENT_TYPES = [
    'workshop',
    'hackathon',
    'meetup',
    'conference',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type EventStatus = 'draft' | 'published' | 'archived';

export interface IEvent {
    _id: string;
    title: string;
    slug: string;
    description: string;
    date: string;       // Display date e.g., "Feb 15, 2026"
    time: string;       // Display time e.g., "10:00 AM - 4:00 PM"
    eventDate: string;  // ISO date for sorting
    type: EventType;
    image?: string | null;
    location?: string | null;
    registrationLink?: string | null;
    author: string;
    authorName: string;
    status: EventStatus;
    views: number;
    publishedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}
