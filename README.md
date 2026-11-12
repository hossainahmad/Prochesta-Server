# Prochesta API (Server)

Express + TypeScript REST API for the **Prochesta** social development events platform. Backed by **MongoDB (Atlas)** via **Prisma** and protected by **JWT** signed with HS256, delivered as an `httpOnly` cookie.

This is the **server repository** of the submission. The UI lives in a separate Next.js repository (the client).

## Tech Stack

- **Express** (TypeScript)
- **Prisma** (MongoDB connector)
- **JWT** (`jsonwebtoken`) — HS256, 7-day expiry
- **bcryptjs** for password hashing
- **Zod** for validation
- **Google OAuth 2.0** (optional, enabled via env vars)

## Getting Started

```bash
npm install
cp .env.example .env      # then fill in: DATABASE_URL, JWT_SECRET, CLIENT_URL
npm run db:setup          # push schema to MongoDB + seed demo data
npm run dev               # tsx watch — http://localhost:3001
```

Production:

```bash
npm run build             # tsc → dist/
npm start                 # node dist/index.js
```

## Environment Variables

| Variable                                    | Purpose                                                                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                              | MongoDB URI (include `/Prochesta` database name)                                                                              |
| `JWT_SECRET`                                | HS256 signing secret — **must equal `AUTH_TOKEN_SECRET` in the client's .env** so the client middleware can verify the cookie |
| `CLIENT_URL`                                | Origin of the Next.js client (CORS + OAuth redirects)                                                                         |
| `PORT`                                      | Default `3001`                                                                                                                |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional, enables Google login                                                                                                |

## API Reference

| Method | Route                           | Auth        | Description                                                  |
| ------ | ------------------------------- | ----------- | ------------------------------------------------------------ |
| GET    | `/api`                          | —           | Health probe                                                 |
| GET    | `/api/auth/providers`           | —           | Enabled OAuth providers                                      |
| POST   | `/api/auth/register`            | —           | Register (uppercase/lowercase/≥6 password rules)             |
| POST   | `/api/auth/login`               | —           | Login, sets `auth_token` httpOnly cookie                     |
| POST   | `/api/auth/logout`              | —           | Clears the cookie                                            |
| GET    | `/api/auth/me`                  | Cookie      | Current user (fresh profile data)                            |
| GET    | `/api/auth/google`              | —           | Start Google OAuth flow                                      |
| GET    | `/api/auth/google/callback`     | —           | OAuth callback, sets cookie, redirects to client             |
| GET    | `/api/events?limit&type&search` | —           | Future events (`,limit=6` → homepage section), soonest first |
| GET    | `/api/events/:id`               | —           | Event detail incl. viewer context (`joinedByMe`, `isOwner`)  |
| POST   | `/api/events`                   | JWT         | Create event (future-date validated)                         |
| PUT    | `/api/events/:id`               | JWT + Owner | Update event                                                 |
| DELETE | `/api/events/:id`               | JWT + Owner | Delete event (+ its participations)                          |
| POST   | `/api/events/:id/join`          | JWT         | Join event (owner-blocked, duplicate-409)                    |
| GET    | `/api/my-events`                | JWT         | Events I created                                             |
| GET    | `/api/joined-events`            | JWT         | Events I joined, sorted by date                              |
| PUT    | `/api/profile`                  | JWT         | Update name / photoURL                                       |

Authentication is accepted either via the `auth_token` cookie (browser) or an `Authorization: Bearer <token>` header (tests/Postman).

## Testing

The client repo ships an end-to-end suite covering both sides:

```bash
# terminal 1 — client repo:  npm start        (port 3000)
# terminal 1b — this repo:   npm start        (port 3001)
# terminal 2 — client repo:  npm run test
```

## Structure

```
server/
├── prisma/            # schema.prisma (MongoDB) + seed.ts
└── src/
    ├── index.ts       # bootstrap
    ├── app.ts         # express app, CORS, middleware
    ├── lib/           # db (Prisma), jwt, auth guards, zod validations
    └── routes/        # auth, events, profile, my-events, joined-events
```
