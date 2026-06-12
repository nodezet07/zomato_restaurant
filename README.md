# QuickBite Restaurant Portal

React + TypeScript partner panel for restaurant owners.

## Stack

- **Vite** + **React 19**
- **TanStack Query** — server state, polling orders
- **Zustand** — auth + restaurant context (persisted)
- **React Router** — protected routes
- **Tailwind CSS v4**

## Setup

```bash
cd resturant-portal
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:5174**

## Environment

| Variable | Default |
|----------|---------|
| `VITE_API_URL` | `http://localhost:5000/api/v1` |
| `VITE_SOCKET_URL` | `http://localhost:5000` |
| `VITE_DEFAULT_RESTAURANT_ID` | optional MongoDB id |

## Demo login

1. Start backend: `cd clone-backend && npm run dev`
2. Seed data: `npm run seed:phase2` (or `seed:demo`)
3. Login as **owner@foodapp.com** with your owner password

If the seed user has no password, register an owner via API or set a password in MongoDB.

## Features (v0.1)

- Login + JWT refresh
- Auto-detect owner's restaurant
- Dashboard stats
- Orders list + status updates (Confirm → Preparing → Ready)
- Open / close toggle in Settings
- Menu screen placeholder
