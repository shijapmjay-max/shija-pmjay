# shija-pmjay

Shija Dialysis patient records demo with server-backed login.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run setup-admin` in a terminal. The username is `admin`; enter a password with at least 12 characters when prompted. Password entry is hidden, and only its bcrypt hash is saved in `.env`.
4. Run `npm start` and open `http://localhost:3000`.

The patient page requires a server session. Sessions are stored in the ignored `data/` directory, passwords are checked against a bcrypt hash, and login attempts are rate-limited. For production, set `NODE_ENV=production`, use HTTPS, and configure secrets through the hosting provider rather than committing them.

## Deploy on Render

1. Push this repository, including `render.yaml`, to GitHub.
2. In Render, create a new Blueprint and connect this repository. Render reads `render.yaml` to create the web service.
3. Before the first deploy, generate an admin password locally with `npm run setup-admin`. Copy only the `ADMIN_PASSWORD_HASH` value from the ignored `.env` file into the Render service's `ADMIN_PASSWORD_HASH` environment variable. Render generates `SESSION_SECRET` for you.
4. Open the service's `onrender.com` URL and sign in as `admin` with the password you chose.

The free service can sleep, and its local SQLite session store is not persistent across restarts. This demo keeps records in browser local storage and is not suitable for real patient or health information.

## Important data limitation

This demo stores patient records in browser local storage. The login protects the page route but does not move patient data to a secure server or provide healthcare compliance. Do not enter real patient or health information. GitHub Pages serves static files and cannot enforce this login; disable Pages and deploy the Node server to a suitable HTTPS host before relying on authentication.
