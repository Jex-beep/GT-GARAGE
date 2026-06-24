-- Adds an optional alt-text column for blog post cover images.
-- Alt text describes the image for screen readers (accessibility) and search engines (SEO).
-- Run this in the Supabase SQL Editor BEFORE deploying the backend that writes `cover_alt`,
-- otherwise creating/updating a post will fail ("column posts.cover_alt does not exist").

alter table public.posts add column if not exists cover_alt text;
