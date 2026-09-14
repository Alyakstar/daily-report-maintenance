-- ============================================================
-- MAINTENANCE DAILY REPORT - SUPABASE SETUP
-- Run this once in: Supabase Dashboard > SQL Editor > New query
-- Prototype policy: public read/write for easy internal demo.
-- Tighten RLS / add Auth before production use.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  line text not null check (line in ('Finishing','Melting','Core Making','RCS','Moulding-Sand','Die Press')),
  machine text not null,
  source text not null check (source in ('BM','PM','IMP','CM')),
  team_shift text not null check (team_shift in ('White','Red')),
  work_shift text not null check (work_shift in ('Day Shift','Night Shift')),
  problem text not null,
  line_stop integer not null default 0 check (line_stop >= 0),
  rootcause text not null,
  problem_image_url text,
  problem_image_path text,
  action text not null,
  action_image_url text,
  action_image_path text,
  created_at timestamptz not null default now()
);

alter table public.daily_reports enable row level security;

drop policy if exists "prototype_read_daily_reports" on public.daily_reports;
drop policy if exists "prototype_insert_daily_reports" on public.daily_reports;
drop policy if exists "prototype_delete_daily_reports" on public.daily_reports;

create policy "prototype_read_daily_reports"
on public.daily_reports for select
to anon, authenticated
using (true);

create policy "prototype_insert_daily_reports"
on public.daily_reports for insert
to anon, authenticated
with check (true);

create policy "prototype_delete_daily_reports"
on public.daily_reports for delete
to anon, authenticated
using (true);

grant select, insert, delete on public.daily_reports to anon, authenticated;

-- Public image bucket used by the report preview/PDF.
insert into storage.buckets (id, name, public)
values ('report-images', 'report-images', true)
on conflict (id) do update set public = true;

drop policy if exists "prototype_upload_report_images" on storage.objects;
drop policy if exists "prototype_delete_report_images" on storage.objects;

create policy "prototype_upload_report_images"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'report-images');

create policy "prototype_delete_report_images"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'report-images');
