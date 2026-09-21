# Geofence Attendance — Backend

This is the real backend for the prototype: a proper server + database, so
check-ins from different phones all land in the same place instead of being
stuck in one browser's local storage.

## What this is

- **Express** API server
- **SQLite** database (one file, `attendance.db` — created automatically, no
  separate database service to install)
- **JWT** login for lecturers and students
- Every geofence check happens **on the server**, using the coordinates the
  phone sends — a student's phone never gets to decide "I'm in range" on its
  own

## Run it locally

You need [Node.js](https://nodejs.org) installed (v18 or newer).

```bash
npm install
cp .env.example .env
npm start
```

The API will be running at `http://localhost:4000`. Try it:

```bash
curl http://localhost:4000/health
# {"ok":true}
```

## API overview

| Endpoint | Who | What it does |
|---|---|---|
| `POST /auth/register` | anyone | create a lecturer or student account |
| `POST /auth/login` | anyone | log in, get a token |
| `POST /classes` | lecturer | create a class |
| `GET /classes` | lecturer | list your classes |
| `POST /classes/:id/join` | student | join a class |
| `GET /classes/:id/roster` | lecturer | list enrolled students |
| `POST /sessions` | lecturer | start a live session (sets geofence + code) |
| `GET /sessions/:id` | lecturer | poll live session incl. current code |
| `GET /sessions/:id/status` | student | poll session status, code withheld |
| `POST /sessions/:id/end` | lecturer | end a session |
| `POST /attendance/:sessionId/checkin` | student | check in (server verifies distance + code) |
| `GET /attendance/:sessionId/roster` | lecturer | who's checked in, live |
| `GET /attendance/class/:classId/trend` | lecturer | attendance % across past sessions |

All routes except register/login/health need `Authorization: Bearer <token>`.

## Deploying it for real (free options)

1. **Render** or **Railway** — connect this folder as a GitHub repo, they
   auto-detect Node and run `npm start`. Free tier is enough for a pilot.
2. Set the `JWT_SECRET` environment variable to something random and private
   (don't reuse the one in `.env.example`).
3. Once deployed, you'll get a URL like `https://your-app.onrender.com` —
   that's what the mobile app / frontend will call instead of `localhost:4000`.

## What's still missing before a real pilot

- **Frontend that talks to this API** — the HTML prototype currently uses
  localStorage instead of these endpoints; wiring it up is a fetch() rewrite,
  not a redesign.
- **Stronger identity check** — right now "the code" is the second factor.
  A real deployment would swap this for device biometrics (Face ID /
  fingerprint) confirmed against an enrollment step.
- **Rate limiting / abuse protection** on the auth and check-in routes.
- **HTTPS** in production (Render/Railway provide this automatically).
