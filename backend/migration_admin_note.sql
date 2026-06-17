-- Run this in Supabase → SQL Editor
-- Adds a column to store the admin's confirmation note (shown on the customer's tracking page)
alter table bookings add column if not exists admin_note text;
