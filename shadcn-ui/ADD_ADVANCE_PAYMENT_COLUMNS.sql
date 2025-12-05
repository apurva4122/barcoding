-- Migration script to add advance payment columns to existing workers table
-- Run this if you already have a workers table without these columns

-- Add advance payment columns if they don't exist
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS advance_current_month DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS advance_last_month DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS advance_deduction DECIMAL(10, 2) DEFAULT 0;

-- Update existing workers to have default values
UPDATE workers 
SET advance_current_month = 0 
WHERE advance_current_month IS NULL;

UPDATE workers 
SET advance_last_month = 0 
WHERE advance_last_month IS NULL;

UPDATE workers 
SET advance_deduction = 0 
WHERE advance_deduction IS NULL;

