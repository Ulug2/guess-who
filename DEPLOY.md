# How to Deploy Guess Who Game

This guide covers deploying the app to a static host and setting up Supabase (database, auth, storage).

---

## 1. Build the app

```bash
npm install
npm run build
```

The output is in the `dist/` folder. Deploy that folder to any static host.

---

## 2. Environment variables

The app needs these at **build time** (they are baked into the bundle):

| Variable | Where to get it |
|----------|-----------------|
| `VITE_SUPABASE_PROJECT_ID` | Supabase Dashboard → Project Settings → General → Reference ID |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon public key |

- **Local:** Copy `.env.example` to `.env` and fill these in.
- **Vercel / Netlify / etc.:** Add the same variables in the project’s environment settings. They will be used when the host runs `npm run build`.

---

## 3. Supabase setup

### 3.1 Create a project

Sign up at [supabase.com](https://supabase.com), create a project, and note the **Reference ID** and **anon key** (used above).

### 3.2 Auth: allow signup without email confirmation

- Go to **Authentication → Providers → Email**.
- Turn **off** “Confirm email”.

The app uses username + password with a fake email (`username@guesswho.local`). With confirmation off, users can sign in right after signup.

### 3.3 Database: run the schema

In Supabase Dashboard, open **SQL Editor** and run the following in order.

**Step 1 – Tables, trigger, RLS, storage:**

```sql
-- ============== PROFILES ==============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'user_' || left(new.id::text, 8)));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ============== FRIEND REQUESTS ==============
create type public.friend_request_status as enum ('pending', 'accepted', 'declined');
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz default now(),
  unique(from_user_id, to_user_id),
  check (from_user_id != to_user_id)
);
create index if not exists friend_requests_to_user on public.friend_requests(to_user_id);
create index if not exists friend_requests_from_user on public.friend_requests(from_user_id);

-- ============== CHALLENGES ==============
create type public.challenge_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  challenged_id uuid not null references public.profiles(id) on delete cascade,
  status public.challenge_status not null default 'pending',
  created_at timestamptz default now(),
  ended_at timestamptz default null,
  game_characters jsonb default null,
  check (challenger_id != challenged_id)
);
create index if not exists challenges_challenged on public.challenges(challenged_id);
create index if not exists challenges_challenger on public.challenges(challenger_id);

-- ============== GAMEBOARDS ==============
create table if not exists public.gameboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  characters jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- ============== RLS ==============
alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.challenges enable row level security;
alter table public.gameboards enable row level security;

create policy "Profiles are viewable by everyone" on public.profiles for select to authenticated using (true);
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can view own friend requests" on public.friend_requests for select to authenticated using (auth.uid() = from_user_id or auth.uid() = to_user_id);
create policy "Users can send friend requests" on public.friend_requests for insert to authenticated with check (auth.uid() = from_user_id);
create policy "Receivers can update (accept/decline)" on public.friend_requests for update to authenticated using (auth.uid() = to_user_id) with check (auth.uid() = to_user_id);

create policy "Users can view own challenges" on public.challenges for select to authenticated using (auth.uid() = challenger_id or auth.uid() = challenged_id);
create policy "Users can create challenges" on public.challenges for insert to authenticated with check (auth.uid() = challenger_id);
create policy "Challenged user can update (accept/decline)" on public.challenges for update to authenticated using (auth.uid() = challenged_id) with check (auth.uid() = challenged_id);
create policy "Challenger can update (cancel)" on public.challenges for update to authenticated using (auth.uid() = challenger_id) with check (auth.uid() = challenger_id);

create policy "Users can view own gameboard" on public.gameboards for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own gameboard" on public.gameboards for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own gameboard" on public.gameboards for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============== STORAGE BUCKETS ==============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/gif','image/webp']),
       ('gameboard-images', 'gameboard-images', true, 5242880, array['image/jpeg','image/png','image/gif','image/webp'])
on conflict (id) do nothing;

create policy "Users can upload own avatar" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update own avatar" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete own avatar" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avatar files are publicly readable" on storage.objects for select to public using (bucket_id = 'avatars');

create policy "Users can upload own gameboard images" on storage.objects for insert to authenticated with check (bucket_id = 'gameboard-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update own gameboard images" on storage.objects for update to authenticated using (bucket_id = 'gameboard-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete own gameboard images" on storage.objects for delete to authenticated using (bucket_id = 'gameboard-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Gameboard images are publicly readable" on storage.objects for select to public using (bucket_id = 'gameboard-images');
```

If the storage bucket insert fails, create two **public** buckets in **Storage** named `avatars` and `gameboard-images`, then run only the storage policy blocks above.

### 3.4 Realtime (optional)

For live challenge and friend-request updates:

- **Database → Replication** (or **Realtime**) → add `friend_requests` and `challenges` to the publication.

---

## 4. Where to deploy

| Platform | Build command | Publish directory | Notes |
|----------|----------------|-------------------|--------|
| **Vercel** | `npm run build` | `dist` | Add `VITE_SUPABASE_PROJECT_ID` and `VITE_SUPABASE_ANON_KEY` in project settings. |
| **Netlify** | `npm run build` | `dist` | Same env vars. |
| **Cloudflare Pages** | `npm run build` | `dist` | Set env vars in the dashboard. |
| **GitHub Pages** | `npm run build` | `dist` (e.g. via `gh-pages`) | Set env vars in the workflow. |
| **Firebase Hosting** | `npm run build` | `dist` | Deploy with `firebase deploy`. |

**Important:** The app is a single-page app (React Router). Configure your host so all routes serve `index.html` (e.g. “Single-page app” or a redirect rule for 404 → `/index.html`).

---

## 5. Checklist

- [ ] Supabase project created; env vars set (local and/or host).
- [ ] Auth: “Confirm email” turned off.
- [ ] SQL above run in Supabase (tables, RLS, storage).
- [ ] Storage buckets `avatars` and `gameboard-images` exist (created by SQL or manually).
- [ ] Build: `npm run build` succeeds.
- [ ] Deploy: `dist/` uploaded or connected to your static host.
- [ ] SPA routing: all routes serve `index.html`.
