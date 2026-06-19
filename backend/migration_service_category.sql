-- Run this in Supabase → SQL Editor
-- Adds a "category" to each service: standard | free | package.
-- Existing services default to 'standard' (so your current services are kept).

alter table services
  add column if not exists category text not null default 'standard';

alter table services
  drop constraint if exists services_category_check;

alter table services
  add constraint services_category_check
  check (category in ('standard', 'free', 'package'));
