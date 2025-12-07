-- Add shipping_location column to app_070c516bb6_qr_codes table if it doesn't exist
-- This column is required for tracking where packages are shipped

ALTER TABLE app_070c516bb6_qr_codes 
ADD COLUMN IF NOT EXISTS shipping_location VARCHAR(255);

-- Add index for better query performance when filtering by shipping location
CREATE INDEX IF NOT EXISTS idx_qr_codes_shipping_location ON app_070c516bb6_qr_codes(shipping_location);

-- Verify the column was added (this will show an error if column already exists, which is fine)
-- You can check the table structure in Supabase dashboard to confirm
