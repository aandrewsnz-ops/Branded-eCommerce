-- Add uploaded image metadata to TOF desire_concepts rows.
-- Run in Supabase SQL editor, then: notify pgrst, 'reload schema';

alter table desire_concepts
  add column if not exists image_url text,
  add column if not exists image_path text,
  add column if not exists image_filename text,
  add column if not exists image_uploaded_at timestamptz,
  add column if not exists image_file_type text;

notify pgrst, 'reload schema';
