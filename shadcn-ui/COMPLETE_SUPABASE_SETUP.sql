-- =====================================================
-- COMPLETE SUPABASE SETUP SQL
-- Workers and Attendance Records Tables
-- =====================================================
-- Run this entire script in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. CREATE WORKERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    position VARCHAR(255),
    is_packer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- =====================================================
-- 2. CREATE ATTENDANCE_RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
    worker_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'half_day')),
    overtime VARCHAR(10) DEFAULT 'no' CHECK (overtime IN ('yes', 'no')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(worker_id, date)
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Workers table indexes
CREATE INDEX IF NOT EXISTS idx_workers_employee_id ON workers(employee_id);
CREATE INDEX IF NOT EXISTS idx_workers_is_packer ON workers(is_packer);
CREATE INDEX IF NOT EXISTS idx_workers_name ON workers(name);

-- Attendance records table indexes
CREATE INDEX IF NOT EXISTS idx_attendance_worker_id ON attendance_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON attendance_records(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. DROP EXISTING POLICIES (if any)
-- =====================================================
DROP POLICY IF EXISTS "Allow public read access to workers" ON workers;
DROP POLICY IF EXISTS "Allow public insert to workers" ON workers;
DROP POLICY IF EXISTS "Allow public update to workers" ON workers;
DROP POLICY IF EXISTS "Allow public delete to workers" ON workers;

DROP POLICY IF EXISTS "Allow public read access to attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Allow public insert to attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Allow public update to attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Allow public delete to attendance_records" ON attendance_records;

-- =====================================================
-- 6. CREATE RLS POLICIES FOR WORKERS TABLE
-- =====================================================
-- Allow public read access
CREATE POLICY "Allow public read access to workers" 
ON workers FOR SELECT 
USING (true);

-- Allow public insert
CREATE POLICY "Allow public insert to workers" 
ON workers FOR INSERT 
WITH CHECK (true);

-- Allow public update
CREATE POLICY "Allow public update to workers" 
ON workers FOR UPDATE 
USING (true);

-- Allow public delete
CREATE POLICY "Allow public delete to workers" 
ON workers FOR DELETE 
USING (true);

-- =====================================================
-- 7. CREATE RLS POLICIES FOR ATTENDANCE_RECORDS TABLE
-- =====================================================
-- Allow public read access
CREATE POLICY "Allow public read access to attendance_records" 
ON attendance_records FOR SELECT 
USING (true);

-- Allow public insert
CREATE POLICY "Allow public insert to attendance_records" 
ON attendance_records FOR INSERT 
WITH CHECK (true);

-- Allow public update
CREATE POLICY "Allow public update to attendance_records" 
ON attendance_records FOR UPDATE 
USING (true);

-- Allow public delete
CREATE POLICY "Allow public delete to attendance_records" 
ON attendance_records FOR DELETE 
USING (true);

-- =====================================================
-- 8. CREATE UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 9. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_workers_updated_at ON workers;
DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON attendance_records;

-- Create trigger for workers table
CREATE TRIGGER update_workers_updated_at 
BEFORE UPDATE ON workers
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for attendance_records table
CREATE TRIGGER update_attendance_records_updated_at 
BEFORE UPDATE ON attendance_records
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. VERIFICATION QUERIES (Optional - for testing)
-- =====================================================
-- Uncomment these to verify the setup:

-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name IN ('workers', 'attendance_records')
-- ORDER BY table_name, ordinal_position;

-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('workers', 'attendance_records');

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Your tables are now ready to use.
-- 
-- Tables created:
--   - workers (with indexes and RLS policies)
--   - attendance_records (with indexes and RLS policies)
--
-- Features enabled:
--   - Row Level Security (RLS)
--   - Public access policies (read, insert, update, delete)
--   - Auto-updating updated_at timestamps
--   - Foreign key relationship (attendance_records -> workers)
--   - Unique constraint (one attendance record per worker per date)
--
-- Next steps:
--   1. Test by inserting a worker
--   2. Test by inserting an attendance record
--   3. Verify data appears in Supabase Table Editor
-- =====================================================

