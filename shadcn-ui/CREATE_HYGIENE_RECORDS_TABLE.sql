-- Create hygiene_records table
CREATE TABLE IF NOT EXISTS app_f79f105891_hygiene_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    worker_id VARCHAR(255) NOT NULL,
    worker_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    area VARCHAR(50) NOT NULL,
    photo_url TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hygiene_records_date ON app_f79f105891_hygiene_records(date);
CREATE INDEX IF NOT EXISTS idx_hygiene_records_worker_id ON app_f79f105891_hygiene_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_records_area ON app_f79f105891_hygiene_records(area);
CREATE INDEX IF NOT EXISTS idx_hygiene_records_date_area ON app_f79f105891_hygiene_records(date, area);

-- Enable Row Level Security
ALTER TABLE app_f79f105891_hygiene_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to hygiene_records" ON app_f79f105891_hygiene_records;
DROP POLICY IF EXISTS "Allow public insert to hygiene_records" ON app_f79f105891_hygiene_records;
DROP POLICY IF EXISTS "Allow public update to hygiene_records" ON app_f79f105891_hygiene_records;
DROP POLICY IF EXISTS "Allow public delete to hygiene_records" ON app_f79f105891_hygiene_records;

-- Create RLS policies
CREATE POLICY "Allow public read access to hygiene_records" ON app_f79f105891_hygiene_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert to hygiene_records" ON app_f79f105891_hygiene_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to hygiene_records" ON app_f79f105891_hygiene_records FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to hygiene_records" ON app_f79f105891_hygiene_records FOR DELETE USING (true);

-- Add is_cleaner column to workers table if it doesn't exist
ALTER TABLE app_f79f105891_workers
ADD COLUMN IF NOT EXISTS is_cleaner BOOLEAN DEFAULT false;

-- Create index for cleaner workers
CREATE INDEX IF NOT EXISTS idx_workers_is_cleaner ON app_f79f105891_workers(is_cleaner);



