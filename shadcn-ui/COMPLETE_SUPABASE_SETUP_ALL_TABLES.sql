-- =====================================================
-- COMPLETE SUPABASE SETUP - ALL TABLES WITH RLS POLICIES
-- This script sets up all tables and fixes CORS issues
-- =====================================================

-- =====================================================
-- 1. NEW TABLES (Workers and Attendance)
-- =====================================================

-- Create workers table
CREATE TABLE IF NOT EXISTS workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    position VARCHAR(255),
    is_packer BOOLEAN DEFAULT FALSE,
    gender VARCHAR(10) DEFAULT 'male' CHECK (gender IN ('male', 'female')),
    base_salary DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
    worker_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'half_day')),
    overtime VARCHAR(10) DEFAULT 'no' CHECK (overtime IN ('yes', 'no')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(worker_id, date)
);

-- =====================================================
-- 2. OLD TABLES (QR Codes and Barcode Assignments)
-- =====================================================

-- Create app_070c516bb6_qr_codes table (if not exists)
CREATE TABLE IF NOT EXISTS app_070c516bb6_qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    code VARCHAR(255) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    weight VARCHAR(50),
    packer_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'packed', 'dispatched', 'delivered')),
    qr_code_image TEXT,
    shipping_location VARCHAR(255),
    assigned_worker VARCHAR(255),
    packed_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create app_070c516bb6_workers table (if not exists)
CREATE TABLE IF NOT EXISTS app_070c516bb6_workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create app_070c516bb6_barcode_assignments table (if not exists)
CREATE TABLE IF NOT EXISTS app_070c516bb6_barcode_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    barcode_code VARCHAR(255) NOT NULL,
    worker_name VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(barcode_code)
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for workers table
CREATE INDEX IF NOT EXISTS idx_workers_employee_id ON workers(employee_id);
CREATE INDEX IF NOT EXISTS idx_workers_is_packer ON workers(is_packer);
CREATE INDEX IF NOT EXISTS idx_workers_gender ON workers(gender);

-- Indexes for attendance_records table
CREATE INDEX IF NOT EXISTS idx_attendance_worker_id ON attendance_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON attendance_records(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

-- Indexes for QR codes table
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON app_070c516bb6_qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON app_070c516bb6_qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_created_at ON app_070c516bb6_qr_codes(created_at);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON app_070c516bb6_qr_codes(status);

-- Indexes for old workers table
CREATE INDEX IF NOT EXISTS idx_old_workers_user_id ON app_070c516bb6_workers(user_id);
CREATE INDEX IF NOT EXISTS idx_old_workers_name ON app_070c516bb6_workers(name);

-- Indexes for barcode assignments table
CREATE INDEX IF NOT EXISTS idx_barcode_assignments_code ON app_070c516bb6_barcode_assignments(barcode_code);
CREATE INDEX IF NOT EXISTS idx_barcode_assignments_user_id ON app_070c516bb6_barcode_assignments(user_id);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_070c516bb6_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_070c516bb6_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_070c516bb6_barcode_assignments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE RLS POLICIES FOR WORKERS TABLE
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to workers" ON workers;
DROP POLICY IF EXISTS "Allow public insert to workers" ON workers;
DROP POLICY IF EXISTS "Allow public update to workers" ON workers;
DROP POLICY IF EXISTS "Allow public delete to workers" ON workers;

-- Create new policies
CREATE POLICY "Allow public read access to workers" 
ON workers FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to workers" 
ON workers FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to workers" 
ON workers FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete to workers" 
ON workers FOR DELETE 
USING (true);

-- =====================================================
-- 6. CREATE RLS POLICIES FOR ATTENDANCE_RECORDS TABLE
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Allow public insert to attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Allow public update to attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Allow public delete to attendance_records" ON attendance_records;

-- Create new policies
CREATE POLICY "Allow public read access to attendance_records" 
ON attendance_records FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to attendance_records" 
ON attendance_records FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to attendance_records" 
ON attendance_records FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete to attendance_records" 
ON attendance_records FOR DELETE 
USING (true);

-- =====================================================
-- 7. CREATE RLS POLICIES FOR QR_CODES TABLE
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to qr_codes" ON app_070c516bb6_qr_codes;
DROP POLICY IF EXISTS "Allow public insert to qr_codes" ON app_070c516bb6_qr_codes;
DROP POLICY IF EXISTS "Allow public update to qr_codes" ON app_070c516bb6_qr_codes;
DROP POLICY IF EXISTS "Allow public delete to qr_codes" ON app_070c516bb6_qr_codes;

-- Create new policies
CREATE POLICY "Allow public read access to qr_codes" 
ON app_070c516bb6_qr_codes FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to qr_codes" 
ON app_070c516bb6_qr_codes FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to qr_codes" 
ON app_070c516bb6_qr_codes FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete to qr_codes" 
ON app_070c516bb6_qr_codes FOR DELETE 
USING (true);

-- =====================================================
-- 8. CREATE RLS POLICIES FOR OLD WORKERS TABLE
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to old_workers" ON app_070c516bb6_workers;
DROP POLICY IF EXISTS "Allow public insert to old_workers" ON app_070c516bb6_workers;
DROP POLICY IF EXISTS "Allow public update to old_workers" ON app_070c516bb6_workers;
DROP POLICY IF EXISTS "Allow public delete to old_workers" ON app_070c516bb6_workers;

-- Create new policies
CREATE POLICY "Allow public read access to old_workers" 
ON app_070c516bb6_workers FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to old_workers" 
ON app_070c516bb6_workers FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to old_workers" 
ON app_070c516bb6_workers FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete to old_workers" 
ON app_070c516bb6_workers FOR DELETE 
USING (true);

-- =====================================================
-- 9. CREATE RLS POLICIES FOR BARCODE_ASSIGNMENTS TABLE
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to barcode_assignments" ON app_070c516bb6_barcode_assignments;
DROP POLICY IF EXISTS "Allow public insert to barcode_assignments" ON app_070c516bb6_barcode_assignments;
DROP POLICY IF EXISTS "Allow public update to barcode_assignments" ON app_070c516bb6_barcode_assignments;
DROP POLICY IF EXISTS "Allow public delete to barcode_assignments" ON app_070c516bb6_barcode_assignments;

-- Create new policies
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

-- =====================================================
-- 10. CREATE UPDATED_AT TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 11. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_workers_updated_at ON workers;
DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON attendance_records;
DROP TRIGGER IF EXISTS update_qr_codes_updated_at ON app_070c516bb6_qr_codes;
DROP TRIGGER IF EXISTS update_old_workers_updated_at ON app_070c516bb6_workers;

-- Create triggers
CREATE TRIGGER update_workers_updated_at 
BEFORE UPDATE ON workers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at 
BEFORE UPDATE ON attendance_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qr_codes_updated_at 
BEFORE UPDATE ON app_070c516bb6_qr_codes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_old_workers_updated_at 
BEFORE UPDATE ON app_070c516bb6_workers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 12. VERIFICATION QUERIES
-- =====================================================

-- Verify tables exist
SELECT 
    table_name,
    CASE 
        WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = table_name) THEN 'RLS Enabled'
        ELSE 'RLS Disabled'
    END as rls_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'workers', 
    'attendance_records', 
    'app_070c516bb6_qr_codes', 
    'app_070c516bb6_workers', 
    'app_070c516bb6_barcode_assignments'
)
ORDER BY table_name;

-- Verify policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'workers', 
    'attendance_records', 
    'app_070c516bb6_qr_codes', 
    'app_070c516bb6_workers', 
    'app_070c516bb6_barcode_assignments'
)
ORDER BY tablename, policyname;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- All tables are now configured with:
-- ✅ Tables created (if they didn't exist)
-- ✅ Indexes created for performance
-- ✅ RLS enabled
-- ✅ Public access policies created
-- ✅ Updated_at triggers configured
-- 
-- Your application should now work without CORS errors!
-- =====================================================

