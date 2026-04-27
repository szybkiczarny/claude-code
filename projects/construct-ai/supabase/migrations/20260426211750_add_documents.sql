CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  revision text DEFAULT 'R0',
  file_url text NOT NULL,
  file_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "documents_select" ON documents FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE POLICY "documents_insert" ON documents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE POLICY "documents_delete" ON documents FOR DELETE USING (auth.uid() = uploaded_by);
EXCEPTION WHEN duplicate_object THEN null; END $$;

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT DO NOTHING;
DO $$ BEGIN
  CREATE POLICY "documents_storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE POLICY "documents_storage_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE POLICY "documents_storage_delete" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN null; END $$;
