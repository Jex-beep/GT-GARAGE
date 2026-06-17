-- Run this in Supabase → SQL Editor

-- SERVICES
create table if not exists services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null,
  price_from  text not null default 'Ask us',
  sort_order  int  not null default 0,
  image_url   text,
  created_at  timestamptz not null default now()
);
alter table services enable row level security;
create policy "Public read" on services for select using (true);
-- writes go through the backend service-role key, so no additional policy needed

-- BOOKINGS
create table if not exists bookings (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  customer_name  text not null,
  phone          text not null,
  email          text not null,
  problem        text not null,
  preferred_date date not null,
  time_slot      text not null,
  status         text not null default 'new' check (status in ('new','confirmed','done'))
);
alter table bookings enable row level security;
create policy "Public insert" on bookings for insert with check (true);
-- reads and updates go through the backend service-role key

-- POSTS
create table if not exists posts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text not null unique,
  excerpt      text not null,
  body         text not null,
  cover_url    text,
  published_at timestamptz,
  created_at   timestamptz not null default now()
);
alter table posts enable row level security;
create policy "Public read published" on posts for select using (published_at is not null);

-- TASKS (admin calendar)
create table if not exists tasks (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  notes      text,
  due_date   date not null,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
alter table tasks enable row level security;
-- no public policies: all access via service-role key from the backend
