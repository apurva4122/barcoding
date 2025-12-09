-- Create storage bucket for hygiene photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('hygiene-photos', 'hygiene-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for public read access
CREATE POLICY IF NOT EXISTS "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'hygiene-photos');

-- Create storage policy for authenticated insert
CREATE POLICY IF NOT EXISTS "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'hygiene-photos');

-- Create storage policy for authenticated update
CREATE POLICY IF NOT EXISTS "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'hygiene-photos');

-- Create storage policy for authenticated delete
CREATE POLICY IF NOT EXISTS "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'hygiene-photos');

