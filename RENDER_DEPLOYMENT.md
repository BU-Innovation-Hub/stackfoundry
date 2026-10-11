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
HTTPS origin without a trailing slash. Use a verified sending domain or the
Google SMTP sender described below for `EMAIL_FROM`, and a transaction-capable
MongoDB replica set. Keep secrets out of
the repository. Setting admin environment variables does not create an account.

## Configure production email

The server requires all four mail settings: `EMAIL_SMTP_HOST`, `EMAIL_SMTP_USER`,
`EMAIL_SMTP_PASS`, and `EMAIL_FROM`. Add them to the backend service's Environment
page using the exact names above. Get the host, port, username and password from
your email provider's SMTP configuration. Use a sender on a domain you have
verified with that provider for `EMAIL_FROM`, such as
`Innovation Hub <no-reply@your-owned-domain.org>` (replace this example).
Personal Gmail senders are also supported when using `smtp.gmail.com` and the
sender address exactly matches the authenticated `EMAIL_SMTP_USER` account.
The existing restrictions on personal Outlook and Yahoo senders still apply.

For Google SMTP, set these values on Render (replace the example credentials):

| Variable | Value |
| --- | --- |
| `EMAIL_SMTP_HOST` | `smtp.gmail.com` |
| `EMAIL_SMTP_PORT` | `587` |
| `EMAIL_SMTP_USER` | Your full Google account email address |
| `EMAIL_SMTP_PASS` | A Google App Password for that account |
| `EMAIL_FROM` | `Innovation Hub <your-account@gmail.com>` using the same account |

Enable 2-Step Verification and create an App Password in your Google account.
Use the generated App Password without its display spaces; your regular Google
login password is not the SMTP credential. Account or organization policies can
restrict App Password availability. See
[Google's App Password instructions](https://support.google.com/accounts/answer/185833)
and [Google's SMTP settings](https://support.google.com/a/answer/176600).

Missing variables are now listed together at startup; values and passwords are
not included in that validation message. The application still requires a valid
production configuration before accepting traffic. Do not use development mode
or dummy SMTP values to bypass this check: password-reset emails need delivery.

Render Free web services block outbound SMTP ports 25, 465 and 587. To use the
existing SMTP implementation on those ports, use a paid service instance.
Keeping a Free instance would require a separate integration with your email
provider's HTTPS API, or a provider-supported reachable SMTP port with TLS.
Changing only the port does not work unless the provider supports it.
See [Render's Free service limitations](https://render.com/docs/free).

After saving the real credentials and redeploying, verify password-reset email
delivery to an account you control. Startup validation checks the configuration,
not provider authentication, sender verification or network connectivity.

For event job processing, deploy a separate background worker with the same
build command and backend environment variables. Its start command is
`npm run worker --workspace=backend`. The API's `/ready` endpoint checks both
the database and the worker heartbeat.
