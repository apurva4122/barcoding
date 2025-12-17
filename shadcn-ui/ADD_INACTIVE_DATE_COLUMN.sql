-- Add inactive_date column to workers table
-- This tracks when a worker was marked inactive to stop salary calculations from that date

ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS inactive_date DATE;

-- Add comment to explain the column
COMMENT ON COLUMN workers.inactive_date IS 'Date when worker was marked inactive - salary calculations stop from this date';

