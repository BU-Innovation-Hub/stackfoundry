# Event delivery and rollout

Event mutations require a MongoDB replica set (Atlas is suitable) or mongos.
The API commits attendance, reserved capacity, and calendar outbox work together.
Google Calendar synchronization is eventually consistent and runs in a separate worker;
event attendance and event changes do not send email.
Pending and approved attendance reserve capacity. Existing routes remain;
`/events/mine` and `/:id/attendees` return `data` arrays plus pagination
(`page`, `limit`, `total`, `pages`, `hasNext`, `hasPrev`). Defaults: 20, maximum: 50.
Send the management event's `revision` on PUT to detect stale edits.

## Local MongoDB setup (Windows)

A local single-node replica set supports transactions; a standalone server does
not. Back up existing data before conversion. In Administrator PowerShell, stop
the MongoDB service with `Stop-Service MongoDB`, then open the service's
`mongod.cfg` in an editor (quote paths containing spaces). Preserve its existing
`storage.dbPath` and loopback-only network binding. Add:

```yaml
replication:
  replSetName: rs0
```

Run `Start-Service MongoDB`, then connect directly for initial setup:

```powershell
mongosh "mongodb://127.0.0.1:27017/admin?directConnection=true"
```

Inside the MongoDB shell (not PowerShell), initialize once:

```javascript
rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "localhost:27017" }] })
db.hello().isWritablePrimary
```

Wait until the second command returns `true`. Set the backend `.env` URI to
`mongodb://localhost:27017/innovation_hub?replicaSet=rs0`, then run `npm run dev`
and `npm run worker:dev` in separate backend terminals.

`ReplicaSetNoPrimary` is a topology symptom, not proof of a particular cause.
Connect directly as above and inspect `db.hello()` and `rs.status()`. If MongoDB
reports `no replset config has been received`, replication was enabled but
initialization was omitted. Do not repeat initialization for an existing set,
force a reconfiguration, delete data, or bypass the API's transaction check.
A single-node set has no redundancy and is intended here for local development.

## Configuration

Set these in deployment secrets/config, never in source control:

```text
NODE_ENV=production
MONGO_URI=<replica-set URI>
CLIENT_URL=https://<your-public-website>
EMAIL_SMTP_HOST=<transactional-provider SMTP host>
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=<provider user>
EMAIL_SMTP_PASS=<provider credential>
EMAIL_FROM=Innovation Hub <events@your-verified-domain>
EMAIL_BRAND=Innovation Hub
EMAIL_REPLY_TO=<monitored support address>
EVENT_WORKER_CONCURRENCY=5
```

Keep the existing JWT/admin configuration. Optional Google credentials remain
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, and
`GOOGLE_CALENDAR_ID`. Omit all of them to disable managed Calendar/Meet;
Calendar files and links are available in the event UI; event actions do not send email.

## Spam investigation and sending-domain setup

The screenshot does not establish an SPF/DKIM/DMARC failure. Local Gmail SMTP,
a custom-domain configured From, and the received Gmail sender differ. Verify
the deployed configuration and Gmail Show original: Authentication-Results,
From, Return-Path, SPF, DKIM signing domain, and DMARC alignment. Gmail may
authenticate a Gmail sender successfully and still classify it as spam based
on reputation/content. Do not attribute the verdict to attachments alone.

Use the selected provider's exact SPF and DKIM DNS values. Maintain one SPF
record, authorize every legitimate sender, and configure DMARC reporting on
the owned domain; begin with monitoring and tighten after checking alignment.
Keep From, display name, footer, and linked public site consistent. Configure
provider bounce/complaint suppression and monitor its delivery dashboard.
Do not copy generic DNS records or invent a domain. Verify provider acceptance
and recipient inbox/spam placement separately with authorized test recipients.
Authentication does not guarantee inbox placement.

Reference: https://support.google.com/mail/answer/81126

## Rollout

1. Take and verify a database backup. Pause event mutations and stop old API
   instances before count reconciliation; do not mix old nontransactional writers.
2. Run `npm run events:ops -- audit`. Review count discrepancies, over-capacity
   events, and orphan attendance. Orphans are reported, never automatically deleted.
3. Run `npm run events:ops -- indexes`. This creates indexes without dropping
   existing ones. Resolve any preexisting duplicate attendance before retrying.
4. Run `npm run events:ops -- reconcile --apply --writes-paused` and audit again.
5. Build with `npm run build`; start `npm start` and `npm run worker` as separately
   supervised persistent processes, both pointing to the same database.
6. Deploy the frontend alongside paginated API contracts. Check `/ready`, which
   requires a connected DB and a worker heartbeat from the last 45 seconds.
   `/health` is liveness only. Allow 15 seconds for the first worker heartbeat.
7. Resume writes and verify join, approval, cancellation, event edits, and deletion.
   To roll back, pause writes and workers first. Do not resume an old API against
   tombstoned records without an explicit data-compatible rollback.

## Recovery and monitoring

`npm run events:ops -- metrics` reports states of jobs created in the last 24 hours
and the age of the oldest unfinished job across all history.
Workers log metrics every 15 seconds. Alert on stale heartbeat, failed jobs,
growing oldest-pending age, SMTP rejection rate, request latency, and count drift.
Calendar status is visible to event managers. Structured failures include job
key, type, and attempt; do not put credentials or email bodies into monitoring.

Jobs use two-minute leases renewed every 30 seconds. SMTP timeouts are bounded;
delivery concurrency defaults to five, with a database-shared rate limit across
workers. Fanout commits at most 100 recipients at a time, preserving progress.
Transient failures retry up to eight attempts with exponential backoff/jitter;
permanent SMTP 5xx failures are terminal. Failed jobs do not block later state
notifications. Normal duplicate requests do not enqueue duplicate work.

Inspect a failed job in `event_jobs`, then use:

```text
npm run events:ops -- replay <exact-job-key>
npm run events:ops -- skip <exact-job-key>
```

For uncertain SMTP outcomes, inspect provider logs using the stable Message-ID.
Replay requires `--acknowledge-possible-duplicate`. SMTP acceptance is recorded
as `accepted`, not delivered. Exactly-once SMTP delivery cannot be guaranteed
after connection loss or a crash between provider acceptance and local commit.
Replays recheck current attendance and suppress obsolete invitations.

Deleted events remain as internal tombstones; they disappear from public/admin
queries immediately. Cancellation fanout transitions attendance in resumable
batches. Tombstones and jobs intentionally have no automatic TTL: define a
retention policy before purging records needed for recovery/audit.

## Tests

`npm test -- --runInBand` includes real transaction/race tests. Install `mongod`
on PATH or set `MONGOD_BINARY` to its executable. The fixture creates an isolated
temporary database and replica set, binds only to loopback, and cleans up its
own process/data. It never connects to the configured application database.
No real SMTP or Google requests are sent by tests.
