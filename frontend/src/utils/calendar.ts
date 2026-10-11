// Builds a Google Calendar "add event" template link in the browser
// (no backend round-trip — the page origin is always the correct base URL).

import { IEvent } from '../types/event';

const toIcsDate = (date: Date): string =>
    date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const bounds = (event: IEvent): { start: Date; end: Date } => {
    const start = new Date(event.startDate || event.eventDate);
    let end = new Date(event.endDate || event.startDate || event.eventDate);
    if (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
    }
    return { start, end };
};

export const buildGcalLink = (event: IEvent): string => {
    const { start, end } = bounds(event);
    const appUrl = `${window.location.origin}/events/${event.slug}`;
    const details = [event.description || '', `View event: ${appUrl}`]
        .filter(Boolean)
        .join('\n\n');
    const location = event.locationType === 'virtual' ? 'Virtual event' : 'On-site event';
    return (
        'https://calendar.google.com/calendar/render' +
        '?action=TEMPLATE' +
        `&text=${encodeURIComponent(event.title)}` +
        `&dates=${toIcsDate(start)}/${toIcsDate(end)}` +
        `&details=${encodeURIComponent(details)}` +
        `&location=${encodeURIComponent(location)}`
    );
};
