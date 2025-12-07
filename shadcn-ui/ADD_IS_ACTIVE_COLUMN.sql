-- Migration script to add is_active column to existing workers table
-- Run this if you already have a workers table without this column

-- Add is_active column if it doesn't exist
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update existing workers to have default value (all active)
UPDATE workers 
SET is_active = TRUE 
WHERE is_active IS NULL;

