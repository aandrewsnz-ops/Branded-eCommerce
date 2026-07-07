-- Shopify product page template sets (JSONB content per project).
-- Run in Supabase SQL editor, then: notify pgrst, 'reload schema';

create table if not exists product_page_sets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create index if not exists product_page_sets_project_idx
  on product_page_sets (project_id);

notify pgrst, 'reload schema';
