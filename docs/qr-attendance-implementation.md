# Implementation prompt: secure physical-event check-in

Extend the existing TypeScript Express/Mongoose and React event system. Reuse
requireAuth/requireRole, ApiError, eventTransaction, API envelopes, Axios refresh,
CSS modules and the organizer event workspace. Keep joining, approval, capacity,
calendar and external registration behavior compatible.

## Agreed behavior and implementation decisions

- Only authenticated, active students with an approved internal registration can
  check in. Members retain joining access but cannot check in.
- Only physical, published, nondeleted events without external registration qualify.
- Use server time: start minus 15 minutes inclusive through end exclusive. Require
  an explicit end later than start; old registrations need no migration or backfill.
- Only innovation_hub_admin and the event's author with mentor role can display or
  operate attendance credentials. A system_admin role alone grants no access.
- Organizer starts/closes check-in within the scheduled window. Closing immediately
  revokes credentials; reopening replaces the secret. Each successful first check-in
  atomically replaces the secret and both credentials. Used credentials cannot admit
  another student; retries from an already-confirmed student do not rotate them again.
  Unused QR/code credentials still refresh every minute, accepting the previous minute
  only for a 15-second scanning/typing grace period within the current secret.
- Use a shared three-digit organizer-displayed manual code. Leading zeros are valid.
  This interprets the unanswered shared-versus-individual choice as a shared code.
- Phone camera opens an application URL. Require a deliberate confirmation POST;
  opening a link or a GET must never record attendance. Preserve the scan through
  login in tab-local sessionStorage; remove the token from the address bar immediately.
- Show check-in timestamp and method in the existing Guests table. Registration
  status/capacity totals keep their existing meaning. Cancellation never erases proof
  of a past check-in; an approved rejoin cannot create a second check-in.

## Storage, endpoints and security

Add optional checkedInAt and checkInMethod to EventAttendance, retaining its unique
(event,user) index. Add separate event_checkin_sessions with a unique event index,
enabled flag, revision, and a cryptographically random 256-bit secret excluded from
default selection. No secrets belong on public Event documents or responses.
Add event_checkin_attempts with unique (event,user), holding the lifetime manual
attempt budget for this event. Do not reset the budget on QR refresh, close/reopen,
server restart or cancellation. Five submitted manual codes maximum; QR remains
available. Atomic MongoDB reservation must hold across processes and concurrent
requests. Never trust TTL deletion or an in-memory limiter for this boundary.

Endpoints under /api/v1/events/:id:
- GET /check-in/session: authorized organizer reads availability and current QR URL,
  code, server time, rotation/expiry, window, and an opaque revision; no writes or caching.
  Optional ?after=<revision> waits up to 25 seconds for a change or timed rotation.
  Reads check shared database state at most once per second while waiting, so separate
  API processes observe successful check-ins. Disconnecting aborts the wait.
- POST /check-in/session {enabled:boolean}: authorized organizer opens/closes.
- POST /check-in {token:string} OR {code:string}: authenticated student submits;
  strict mutually-exclusive body validation; identity comes only from requireAuth.
Use existing GET /attendance and GET /attendees for check-in result/history.

Derive rotating QR HMAC credentials and three digits with distinct purposes, binding
event ID, exact schedule and time bucket to the session secret. Compare fixed-size
credentials in constant time. Use the configured CLIENT_URL, never a request Host,
and put the QR credential in a URL fragment rather than logs/query strings.
Require JSON and validate browser Origin on mutation endpoints, preserving cookie
authentication and its SameSite protection. Reject cross-site requests; no secrets
in logs, audits, errors, student responses or third-party QR services.

Check event, approval, session, credential and server-time eligibility transactionally.
Write-lock the event/session with transaction updates so closing, editing, deleting
or cancelling races serialize with check-in. Update the existing registration only
once, preserving timestamp/method on concurrent QR/manual/retry requests. Already
checked-in approved students receive their original confirmation even if a scan
has expired; no new presence is recorded. Recheck time before the final write.

## Frontend and UX

Add an Attendance tab using existing organizer patterns and client-side QRCodeSVG.
Keep one sequential long-poll request while visible; countdown is local. A successful
check-in reaches the organizer display on the next server check (within about one
second plus network latency). Hide expired credentials immediately; cancel requests
and timers on unmount/tab change, and retry
network failures explicitly. Display manual code and student fallback instructions.
Support loading, ineligible event, missing schedule, early/closed/ended, permission,
offline and close/reopen states. Do not include QR generation on student pages.

Add a student check-in page and a fallback link from approved physical event
registration. Reuse authentication and login return flow. Handle pending/rejected/
cancelled/unregistered, wrong role, expired token, malformed scan, five-code budget,
duplicate and network retry without reporting false success. Show manual entry
even when scanning fails. Fix the event detail's start-time-as-ended rendering
without allowing new joins after the existing joining deadline.

## Verification and operational limits

Run real MongoDB replica-set tests for duplicate races, distributed attempt budgets,
time boundaries, changed schedules, revoked credentials, lifecycle/ownership and
role enforcement, secret non-disclosure, validation and existing joining behavior.
Use React tests for QR visibility/rotation, login continuation, manual submission,
confirmation and failure states. Run relevant existing suites and TypeScript builds;
inspect the UI with the available browser if possible. Do not touch live data.

No background QR worker or image generation API is needed: a few HMACs and a local
SVG once a minute per visible organizer screen. Deploy the new unique indexes before
enabling traffic. MongoDB transactions retain the existing replica-set requirement.
Production CLIENT_URL must be the public HTTPS frontend reachable from students'
phones. Keep server clocks synchronized. Shared codes/QRs can be forwarded and do
not establish physical location; three digits have limited entropy even with strict
attempt budgets. Do not claim stronger presence assurance than this design provides.

References consulted: [Node crypto](https://nodejs.org/api/crypto.html),
[MongoDB transaction considerations](https://www.mongodb.com/docs/v8.0/core/transactions-production-consideration/),
[qrcode.react](https://github.com/zpao/qrcode.react).

## Using the implemented feature

1. Publish a physical event with internal registration and an end time later than
   its start. Students join and receive approval through the existing flow.
2. The owning mentor or innovation-hub admin opens Events, the event workspace,
   then **Attendance**. Within the check-in window, select **Open check-in**.
3. Display that screen at the venue. Students scan with their phone camera, sign
   in if necessary, and select **Confirm attendance**. For manual entry, students
   open the public event page, select **Check in / enter code**, and enter the
   current three digits, including any leading zeros.
4. In **Guests**, select **Refresh attendance** to see check-in timestamps and
   whether each student used QR or manual entry. Registration remains separate.
5. **Close check-in** revokes the credentials immediately. The scheduled end is
   always enforced, even if the organizer leaves the screen open.

### Deployment

- Set backend CLIENT_URL to the frontend's public HTTPS origin. A localhost QR
  cannot be opened on a student's phone. The frontend must serve its SPA for
  /events/:slug/check-in, as it does for existing event routes.
- Install workspace dependencies and restart the backend. Startup creates the
  new session/attempt unique indexes before accepting requests and fails if it
  cannot create them. No existing registration data is rewritten.
- Keep the existing MongoDB replica-set deployment and server clocks synchronized.
- Manual budgets are persistent and not reset by reopening check-in. Once used up,
  the student must use the live QR; no administrative override was introduced.

### Verification

- 60 backend checks passed across QR attendance, joining, approval, insights and
  archive suites, using an isolated real MongoDB replica set for attendance races.
- 49 frontend checks passed across student check-in, organizer QR controls, login,
  event detail and event workspace suites.
- Production frontend compilation passed with CI warning enforcement enabled.
- Backend TypeScript production compilation passed.
- In-app browser verification was attempted but the browser tool could not
  initialize because its runtime sandbox configuration was missing a required
  field. Physical phone scanning and visual browser review remain unverified.

## Responsive student attendance interface

- On small screens the header has a left-aligned hamburger and right-aligned brand.
  Navigation, profile, password and sign-out actions live in the expandable menu.
  Choosing a view or pressing Escape closes it; Escape restores focus to the toggle.
- Keep scan/manual-entry controls below the event overview before check-in. After
  confirmation, place the attendance summary beneath the description beside the
  image on larger screens. Stack the same content on phones without losing state.
