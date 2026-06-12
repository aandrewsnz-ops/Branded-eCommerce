-- Top-of-funnel desire concept tables for Branded eCommerce.
-- Run in Supabase SQL editor, then: notify pgrst, 'reload schema';

create table if not exists desire_concept_sets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  mass_desire_id uuid not null references mass_desires(id) on delete cascade,
  source_desire_title text not null default '',
  source_desire_summary text not null default '',
  status text not null default 'generated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mass_desire_id)
);

create table if not exists desire_concepts (
  id uuid primary key default gen_random_uuid(),
  concept_set_id uuid not null references desire_concept_sets(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  mass_desire_id uuid not null references mass_desires(id) on delete cascade,
  concept_number int not null check (concept_number between 1 and 3),
  concept_title text not null default '',
  headline text not null default '',
  support_line text not null default '',
  overlay_recommendation text not null default 'none'
    check (overlay_recommendation in ('none', 'headline_only', 'headline_plus_support_line')),
  visual_strategy text not null default '',
  rationale text not null default '',
  image_prompt text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists desire_concept_sets_project_idx
  on desire_concept_sets (project_id);

create index if not exists desire_concepts_set_idx
  on desire_concepts (concept_set_id);

create index if not exists desire_concepts_desire_idx
  on desire_concepts (mass_desire_id);

notify pgrst, 'reload schema';
