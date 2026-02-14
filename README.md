# Guess Who Game

A multiplayer Guess Who–style game: add friends, customize your board with at least 24 characters, challenge a friend, and play with the same set of cards. When one player ends the game, the other sees it too.

---

## Tools & stack

- **React 18** – UI
- **TypeScript** – types
- **Vite** – build and dev server
- **React Router 7** – routing
- **Supabase** – auth, Postgres (profiles, friends, challenges, gameboards), Storage (avatars, gameboard images), optional Realtime
- **Tailwind CSS** – styling
- **Lucide React** – icons

---

## Prerequisites

- **Node.js** v18+
- **Supabase account** – [supabase.com](https://supabase.com)

---

## How to run

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

Copy the example env and add your Supabase keys:

```bash
cp .env.example .env
```

Edit `.env`:

- `VITE_SUPABASE_PROJECT_ID` – Supabase project Reference ID (Project Settings → General)
- `VITE_SUPABASE_ANON_KEY` – Supabase anon public key (Project Settings → API)

You also need to turn **off** “Confirm email” in Supabase under **Authentication → Providers → Email** so username-only signup works.

### 3. Database and storage

The app needs Supabase tables and storage buckets. **See [DEPLOY.md](./DEPLOY.md)** for the full SQL (profiles, friend_requests, challenges, gameboards, RLS, storage). Run that in the Supabase SQL Editor once. If bucket creation fails, create public buckets `avatars` and `gameboard-images` in Storage, then run the storage policy part of the SQL.

### 4. Start the app

```bash
npm run dev
```

Open the URL shown (e.g. `http://localhost:5173`).

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build → `dist/` |

---

## Project structure (high level)

- `src/app/` – routes, components, lib (Supabase client, profiles, friends, challenges, gameboard, storage, image resize)
- `src/styles/` – global CSS, Tailwind
- `index.html` – entry HTML
- `vite.config.ts` – Vite config (React, Tailwind, path alias `@/`)

---

## Deployment

For deployment steps, environment variables, Supabase setup, and host-specific notes, see **[DEPLOY.md](./DEPLOY.md)**.
