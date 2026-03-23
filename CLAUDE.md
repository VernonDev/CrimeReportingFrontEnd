# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

No test runner is configured yet.

## Architecture

This is a **Next.js 14 (App Router) TypeScript** frontend for a community crime reporting application. All pages use `'use client'` — there is no server-side rendering for interactive content.

### Key directories

- `app/` — Next.js App Router pages (dashboard, login, map, moderation, report/[id], report/new, signup)
- `components/` — Reusable components split into `forms/`, `map/`, `reports/`, `ui/`
- `lib/` — API client (`api.ts`), auth helpers (`auth.ts`), custom hooks (`hooks/`)

### API layer (`lib/api.ts`)

Axios instance pointed at `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`). Two interceptors:
1. **Request**: Attaches `Authorization: Bearer <token>` from localStorage
2. **Response**: On 401, clears auth and redirects to `/login`

Backend endpoints: `/auth/*`, `/reports/*`, `/users/me/reports`, `/categories`, `/upload`

### Authentication

JWT token stored in localStorage via helpers in `lib/auth.ts`. The `useAuth` hook wraps login/signup/logout and exposes the current user with their role (`user` | `moderator` | `admin`). Role gates control which UI actions and nav items are visible.

### Map components

Leaflet/react-leaflet is used for the interactive crime map. All map components must be loaded via `dynamic()` with `{ ssr: false }` to avoid server-rendering errors. The main map page (`app/map/`) tracks viewport bounds and passes them as query params to filter reports server-side.

### Report submission

`/report/new` uses a 3-step wizard inside `ReportForm.tsx`:
1. Location picker (map-based, latitude/longitude)
2. Crime details (category, title, description, date, up to 3 photos)
3. Review and submit

Form validation uses **Zod** schemas throughout.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Backend base URL |
| `NEXT_PUBLIC_DEFAULT_MAP_LAT` | `37.7749` | Initial map center |
| `NEXT_PUBLIC_DEFAULT_MAP_LNG` | `-122.4194` | Initial map center |
| `NEXT_PUBLIC_DEFAULT_MAP_ZOOM` | `12` | Initial zoom level |

### Deployment

Multi-stage Dockerfile builds a standalone Next.js output (configured in `next.config.mjs`) on port 3000.
