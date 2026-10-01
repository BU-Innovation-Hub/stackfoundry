/**
 * Event update diffing helpers.
 * Pure functions — no model/service imports — so they stay trivially testable.
 */

const normValue = (value: unknown): string => {
    if (value === undefined || value === null) return "";
    if (value instanceof Date) return value.toISOString();
    return String(value).trim();
};

/**
 * True when any attendee-facing field (schedule, venue mode, link) actually
 * changed. Guards the "updated" notification so routine admin edits (image,
 * capacity, status, description…) don't email every attendee.
 */
export const materialFieldsChanged = (
    before: unknown,
    after: Record<string, unknown>
): boolean => {
    const fields = ["title", "date", "time", "locationType", "registrationLink", "eventDate", "startDate", "endDate"] as const;
    return fields.some((field) => {
        const next = after[field];
        if (next === undefined) return false; // field not part of this update
        return normValue((before as Record<string, unknown>)[field]) !== normValue(next);
    });
};
