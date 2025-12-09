-- Create storage bucket for lab test files
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-tests', 'lab-tests', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for public read access
CREATE POLICY IF NOT EXISTS "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'lab-tests');

-- Create storage policy for authenticated insert
CREATE POLICY IF NOT EXISTS "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lab-tests');

-- Create storage policy for authenticated update
CREATE POLICY IF NOT EXISTS "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lab-tests');

-- Create storage policy for authenticated delete
CREATE POLICY IF NOT EXISTS "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'lab-tests');

