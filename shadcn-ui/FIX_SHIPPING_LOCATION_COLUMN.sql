-- =====================================================
-- FIX: Add shipping_location column to app_070c516bb6_qr_codes table
-- =====================================================
-- This script adds the shipping_location column if it doesn't exist
-- Run this in your Supabase SQL Editor to fix the missing column error

-- Step 1: Add the shipping_location column if it doesn't exist
ALTER TABLE app_070c516bb6_qr_codes 
ADD COLUMN IF NOT EXISTS shipping_location VARCHAR(255);

-- Step 2: Add index for better query performance when filtering by shipping location
CREATE INDEX IF NOT EXISTS idx_qr_codes_shipping_location 
ON app_070c516bb6_qr_codes(shipping_location);

-- Step 3: Verify the column exists (optional - just for confirmation)
-- You can run this to check:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'app_070c516bb6_qr_codes' 
-- AND column_name = 'shipping_location';

-- Note: The RLS policies should already allow access to this column
-- since they allow full access to the table. If you encounter permission issues,
-- you may need to refresh the RLS policies.

