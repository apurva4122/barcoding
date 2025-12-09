-- =====================================================
-- TEST: Check if barcode assignments are being saved
-- =====================================================
-- Run these queries in Supabase SQL Editor to verify

-- 1. Check if the table exists and show its structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'app_070c516bb6_barcode_assignments' 
ORDER BY ordinal_position;

-- 2. Check the RLS policies on the table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'app_070c516bb6_barcode_assignments';

-- 3. Count total assignments
SELECT COUNT(*) as total_assignments FROM app_070c516bb6_barcode_assignments;

-- 4. Show recent assignments (if any)
SELECT * FROM app_070c516bb6_barcode_assignments ORDER BY assigned_at DESC LIMIT 10;

-- 5. Test inserting a row manually (to verify permissions)
INSERT INTO app_070c516bb6_barcode_assignments (user_id, barcode_code, worker_name)
VALUES ('00000000-0000-0000-0000-000000000000', 'TEST_CODE_123', 'Test Worker')
RETURNING *;

-- 6. Delete the test row
DELETE FROM app_070c516bb6_barcode_assignments WHERE barcode_code = 'TEST_CODE_123';

-- If any of these queries fail, the table or policies may need to be set up correctly
-- Run FIX_BARCODE_ASSIGNMENTS_TABLE.sql to fix the issue


