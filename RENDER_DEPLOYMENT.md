# Backend deployment on Render

Run commands from the repository root (`stackfoundry`, the folder containing the
workspace `package-lock.json`). Commit and push these changes before deploying.

## 1. Configure the remote database

Use a transaction-capable MongoDB replica set or sharded cluster, such as Atlas.
Create a database user with read/write and index-creation permissions on the
application database. This is separate from the application's administrator.

Set the same `MONGO_URI` for the bootstrap job, API, and event worker. Include the
database name explicitly:

```text
mongodb+srv://<database-user>:<encoded-password>@<cluster-host>/innovation_hub?retryWrites=true&w=majority
```

Replace placeholders and percent-encode reserved characters in database credentials.
Allow the outbound IPs of Render's service and pre-deploy job in Atlas Network
Access. If running bootstrap locally, temporarily allow that machine's outbound
IP too. See [Atlas connection requirements](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).
Keep real connection strings and credentials out of source control.

## 2. Set environment variables in Render

The API and event worker require:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGO_URI` | Remote connection string with the application database name |
| `CLIENT_URL` | Frontend's public HTTPS origin, without a trailing slash |
| `SERVER_URL` | Backend's public HTTPS origin |
| `JWT_ACCESS_SECRET` | A strong random secret |
| `JWT_REFRESH_SECRET` | A different strong random secret |
| `EMAIL_SMTP_HOST` | SMTP provider hostname |
| `EMAIL_SMTP_PORT` | Provider port; default `587` |
| `EMAIL_SMTP_USER` | SMTP username |
| `EMAIL_SMTP_PASS` | SMTP password |
| `EMAIL_FROM` | Sender on your verified sending domain |

Keep any existing Cloudinary, YouTube, Redis, and cookie settings required by
your deployment. These are separate from database initialization.

Bootstrap additionally uses:

| Variable | Value |
| --- | --- |
| `ADMIN_EMAIL` | Intended system administrator's email at `bothouniversity.com` or `bothouniversity.ac.bw` |
| `ADMIN_PASSWORD` | Unique initial password: at least 16 characters, uppercase, lowercase, and a number; at most 72 UTF-8 bytes |

Supply these through Render secrets/environment settings, never command-line
arguments or source code. `ADMIN_PASSWORD` is required only when the configured
account does not exist. Keep `ADMIN_EMAIL` stable: changing it targets another
account; it does not rename the original administrator.

The bootstrap itself needs only database and admin settings, not SMTP or JWT
settings. The API and worker no longer require either admin setting.

## 3. Configure deployment commands

For a Node web service with a pre-deploy command:

| Setting | Value |
| --- | --- |
| Root Directory | Leave blank (repository root) |
| Build Command | `npm ci --include=dev && npm run build --workspace=backend` |
| Pre-Deploy Command | `npm run bootstrap` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

The root scripts delegate to the backend workspace. Bootstrap runs compiled
JavaScript (`node dist/scripts/bootstrap.js`) and needs no development
dependencies at runtime. A nonzero exit blocks the release.
Do not run bootstrap in the build command: builds should not modify production data.

Render currently provides pre-deploy commands for paid web services, private
services, and background workers. See [Render's deployment documentation](https://render.com/docs/deploys).

If your plan has no pre-deploy command, use this Start Command instead:

```sh
npm run bootstrap && npm start
```

This fallback verifies bootstrap on every restart, and starts the API only after
success. Repeated and concurrent executions for the same email are supported.
Alternatively, run `npm run bootstrap` from a trusted release runner with the
remote environment supplied, after building and before starting the API.

For event job processing, deploy a separate background worker with the same
build command and API environment variables. Its Start Command is
`npm run worker --workspace=backend`. Do not add bootstrap to this worker; let the
API release step initialize the database. The API's `/ready` endpoint checks both
the database and the worker heartbeat.

## 4. Verify and remove the initial password

1. Check the release log for `Bootstrap complete: 5 roles created; administrator created.`
   Counts can be lower if the database was already partially initialized.
2. Sign in using `ADMIN_EMAIL` and the initial password. Verify system-admin access.
3. Remove `ADMIN_PASSWORD` from Render after confirming access. Retain `ADMIN_EMAIL`
   for subsequent bootstrap runs. Keep the current login password in your password
   manager; removing the deployment variable does not change the account password.
4. Redeploy. Expect `0 roles created; administrator already exists (unchanged)`.
5. Check `/health` and `/ready` after the API and worker are running.

## Bootstrap behavior and recovery

- Creates only five application roles (`student`, `member`, `mentor`,
  `system_admin`, `innovation_hub_admin`) and one configured `system_admin` account.
  It does not create a separate innovation-hub administrator or demo content.
- Ensures role and user indexes exist, even with automatic indexing disabled.
  Existing indexes and records are preserved; duplicate records cause failure.
- Uses insert-only role upserts. Reruns preserve role metadata and all existing
  user fields, including password hashes, refresh tokens, and timestamps.
- Refuses to promote an existing non-admin account or reactivate an inactive admin.
  Resolve these conflicts through existing account administration before retrying.
  Bootstrap is not a password-reset or account-recovery command.
- Requires an explicit application database in `MONGO_URI`; there is no localhost
  fallback. It rejects MongoDB's `admin`, `local`, and `config` databases.
- Fails on connection, replica-set, index, or validation errors, closes the
  connection, and prints no URI, password, or raw database error details.
- Partial completion is safe to retry. If the admin has not yet been created,
  provide `ADMIN_PASSWORD` again. If indexes fail, inspect permissions and duplicate
  records through your database tooling; bootstrap does not remove or merge data.

This initializes the target database. Existing local application data is not
copied to the cluster. Plan a separate migration if that data must be retained.

## Development demo data

`npm run seed --workspace=backend` still creates demo users, blogs, events, and
courses. It now requires explicit `NODE_ENV=development` or `NODE_ENV=test` and
must point to a development database. Do not use it to initialize production.
