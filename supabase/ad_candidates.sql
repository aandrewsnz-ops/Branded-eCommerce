-- Ad candidates: selected, publishable ad units (one per marketing angle).
-- Run in Supabase SQL editor, then: notify pgrst, 'reload schema';

create table if not exists ad_candidates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  mass_desire_id uuid references mass_desires(id) on delete set null,
  marketing_angle_id uuid not null references marketing_angles(id) on delete cascade,
  ad_copy_set_id uuid references ad_copy_sets(id) on delete set null,
  creative_prompt_set_id uuid references creative_prompt_sets(id) on delete set null,
  ad_number integer,
  ad_title text not null default '',
  selected_primary_text text not null default '',
  selected_headline text not null default '',
  selected_description text not null default '',
  selected_hook text not null default '',
  selected_callouts jsonb not null default '[]'::jsonb,
  selected_image_prompts jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'needs_revision')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marketing_angle_id)
);

create index if not exists ad_candidates_project_id_idx
  on ad_candidates (project_id);

create index if not exists ad_candidates_marketing_angle_id_idx
  on ad_candidates (marketing_angle_id);

create index if not exists ad_candidates_mass_desire_id_idx
  on ad_candidates (mass_desire_id);

create index if not exists ad_candidates_ad_copy_set_id_idx
  on ad_candidates (ad_copy_set_id);

create index if not exists ad_candidates_creative_prompt_set_id_idx
  on ad_candidates (creative_prompt_set_id);

notify pgrst, 'reload schema';
