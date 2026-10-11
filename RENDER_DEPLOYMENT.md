# Backend deployment on Render

Configure the backend as a Node web service:

| Setting | Value |
| --- | --- |
| Root Directory | Leave blank (repository root) |
| Build Command | `npm ci --include=dev && npm run build --workspace=backend` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

The root `start` script delegates to the backend workspace, which runs
`node dist/server.js` from `backend/`. `npm run start` also works.
Commit the root `package.json` and `package-lock.json` before deploying.

Set the production environment variables required by `backend/src/config/env.ts`
in Render: `NODE_ENV=production`, `CLIENT_URL`, `MONGO_URI`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASS`,
`EMAIL_FROM`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Set `EMAIL_SMTP_PORT` to your
provider's port (the default is 587). `CLIENT_URL` must be the frontend's public
HTTPS origin without a trailing slash. Use a verified sending domain for
`EMAIL_FROM` and a transaction-capable MongoDB replica set. Keep secrets out of
the repository. Setting admin environment variables does not create an account.

For event job processing, deploy a separate background worker with the same
build command and backend environment variables. Its start command is
`npm run worker --workspace=backend`. The API's `/ready` endpoint checks both
the database and the worker heartbeat.
