-- Create storage bucket for lab test files
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-tests', 'lab-tests', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (for lab-tests bucket)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- Create storage policy for public read access
CREATE POLICY "Public Access Lab Tests"
ON storage.objects FOR SELECT
USING (bucket_id = 'lab-tests');

-- Create storage policy for authenticated insert
CREATE POLICY "Authenticated users can upload Lab Tests"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lab-tests');

-- Create storage policy for authenticated update
CREATE POLICY "Authenticated users can update Lab Tests"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lab-tests');

-- Create storage policy for authenticated delete
CREATE POLICY "Authenticated users can delete Lab Tests"
ON storage.objects FOR DELETE
USING (bucket_id = 'lab-tests');

