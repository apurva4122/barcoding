-- =====================================================
-- FIX: Ensure app_070c516bb6_barcode_assignments table exists and is accessible
-- =====================================================
-- This script ensures the barcode_assignments table exists with proper structure and RLS policies
-- Run this in your Supabase SQL Editor to fix assignment saving issues

-- Step 1: Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS app_070c516bb6_barcode_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    barcode_code VARCHAR(255) NOT NULL,
    worker_name VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(barcode_code)
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_barcode_assignments_code ON app_070c516bb6_barcode_assignments(barcode_code);
CREATE INDEX IF NOT EXISTS idx_barcode_assignments_user_id ON app_070c516bb6_barcode_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_barcode_assignments_worker_name ON app_070c516bb6_barcode_assignments(worker_name);

-- Step 3: Enable Row Level Security
ALTER TABLE app_070c516bb6_barcode_assignments ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to barcode_assignments" ON app_070c516bb6_barcode_assignments;
DROP POLICY IF EXISTS "Allow public insert to barcode_assignments" ON app_070c516bb6_barcode_assignments;
DROP POLICY IF EXISTS "Allow public update to barcode_assignments" ON app_070c516bb6_barcode_assignments;
DROP POLICY IF EXISTS "Allow public delete to barcode_assignments" ON app_070c516bb6_barcode_assignments;

-- Step 5: Create RLS policies to allow public access (since we're not using Supabase auth)
CREATE POLICY "Allow public read access to barcode_assignments" 
ON app_070c516bb6_barcode_assignments FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to barcode_assignments" 
ON app_070c516bb6_barcode_assignments FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to barcode_assignments" 
ON app_070c516bb6_barcode_assignments FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete to barcode_assignments" 
ON app_070c516bb6_barcode_assignments FOR DELETE 
USING (true);

-- Step 6: Verify the table structure (optional - for confirmation)
-- You can run this to check:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'app_070c516bb6_barcode_assignments' 
-- ORDER BY ordinal_position;

