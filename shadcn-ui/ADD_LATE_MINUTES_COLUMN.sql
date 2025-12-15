-- Add late_minutes column to attendance_records table
-- This allows tracking minutes late and deducting from overtime compensation

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN attendance_records.late_minutes IS 'Minutes late - will be deducted from overtime compensation';

