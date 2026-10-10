# Event timing and calendar retirement

Events are Past once their end time is reached, provided the end is later than
the start. Events with missing or invalid end times remain visible for correction
and are not automatically archived. The scheduled archive sweep still waits
24 hours after a valid end.

New events and schedule changes require an end later than the start. An unrelated
edit can still save an older event whose end time is missing or invalid. Correct
the schedule in the organizer event editor to enable check-in and automatic
archiving for that event.

Google Calendar synchronization is retired. The event worker drains old calendar
outbox entries as skipped and does not contact Google or change saved event links.
Remove the unused Google Calendar credentials from deployment configuration.
Existing Google Calendar entries are not modified. Students continue to have a
manual Add to Google Calendar link; `.ics` generation remains available.

Virtual meeting links are entered by an organizer in event details and must use
HTTPS. The API exposes a meeting link only to an organizer or an approved
attendee. Existing insecure links are hidden until replaced with an HTTPS link.

In local development, restart the frontend after replacing the package proxy with
`src/setupProxy.js`. Its API proxy preserves the browser origin, so a backend whose
`CLIENT_URL` is `http://localhost:3000` accepts same-origin check-in controls.

Before deploying, apply the new `{ deletedAt, status, endDate, startDate, _id }`
event index and stop old calendar workers. Then deploy the backend/frontend and
restart workers so historical outbox entries are marked skipped safely.
