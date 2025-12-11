-- Create lab_tests table
-- IMPORTANT: Run this script in your Supabase SQL Editor to create the table
-- The table name matches what's used in the code: app_f79f105891_lab_tests

CREATE TABLE IF NOT EXISTS app_f79f105891_lab_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    test_type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    month VARCHAR(7) NOT NULL, -- YYYY-MM format
    file_url TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lab_tests_month ON app_f79f105891_lab_tests(month);
CREATE INDEX IF NOT EXISTS idx_lab_tests_test_type ON app_f79f105891_lab_tests(test_type);
CREATE INDEX IF NOT EXISTS idx_lab_tests_category ON app_f79f105891_lab_tests(category);
CREATE INDEX IF NOT EXISTS idx_lab_tests_month_category ON app_f79f105891_lab_tests(month, category);

-- Enable Row Level Security
ALTER TABLE app_f79f105891_lab_tests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to lab_tests" ON app_f79f105891_lab_tests;
DROP POLICY IF EXISTS "Allow public insert to lab_tests" ON app_f79f105891_lab_tests;
DROP POLICY IF EXISTS "Allow public update to lab_tests" ON app_f79f105891_lab_tests;
DROP POLICY IF EXISTS "Allow public delete to lab_tests" ON app_f79f105891_lab_tests;

-- Create RLS policies
CREATE POLICY "Allow public read access to lab_tests" ON app_f79f105891_lab_tests FOR SELECT USING (true);
CREATE POLICY "Allow public insert to lab_tests" ON app_f79f105891_lab_tests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to lab_tests" ON app_f79f105891_lab_tests FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to lab_tests" ON app_f79f105891_lab_tests FOR DELETE USING (true);

