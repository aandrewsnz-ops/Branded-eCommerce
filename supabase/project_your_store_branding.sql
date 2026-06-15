-- Your store branding columns on projects (Branded eCommerce).
-- Run in Supabase SQL editor, then create a public Storage bucket named
-- "store-assets" if it does not exist (for Your store logo uploads).

alter table projects add column if not exists your_store_name text;
alter table projects add column if not exists your_store_url text;
alter table projects add column if not exists your_store_logo_url text;
alter table projects add column if not exists your_store_logo_path text;
alter table projects add column if not exists your_store_logo_filename text;
alter table projects add column if not exists your_store_logo_uploaded_at timestamptz;

notify pgrst, 'reload schema';
