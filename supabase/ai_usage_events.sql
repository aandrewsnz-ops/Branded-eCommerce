-- AI usage event logging for OpenAI calls in Branded eCommerce.
-- Run in Supabase SQL editor, then: notify pgrst, 'reload schema';

create table if not exists ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  operation text not null,
  source_route text,
  model text,
  status text not null default 'success',
  input_tokens integer default 0,
  output_tokens integer default 0,
  total_tokens integer default 0,
  cached_input_tokens integer default 0,
  estimated_cost_usd numeric(12, 6),
  duration_ms integer,
  prompt_chars integer,
  response_chars integer,
  error_status integer,
  error_code text,
  error_message text,
  openai_request_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists ai_usage_events_project_id_idx
  on ai_usage_events(project_id);

create index if not exists ai_usage_events_operation_idx
  on ai_usage_events(operation);

create index if not exists ai_usage_events_created_at_idx
  on ai_usage_events(created_at desc);

notify pgrst, 'reload schema';
