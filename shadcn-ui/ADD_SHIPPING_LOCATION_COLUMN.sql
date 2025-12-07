-- Add shipping_location column to app_070c516bb6_qr_codes table if it doesn't exist
ALTER TABLE app_070c516bb6_qr_codes 
ADD COLUMN IF NOT EXISTS shipping_location VARCHAR(255);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_qr_codes_shipping_location ON app_070c516bb6_qr_codes(shipping_location);

