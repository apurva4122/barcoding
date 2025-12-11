-- Add is_cleaner column to workers table
-- This script adds the is_cleaner column to designate workers as cleaners
-- 
-- NOTE: If your Supabase table has a prefix (e.g., app_070c516bb6_workers),
-- replace 'workers' with your actual table name in the commands below.

-- Add is_cleaner column to workers table if it doesn't exist
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS is_cleaner BOOLEAN DEFAULT false;

-- Create index for cleaner workers for better query performance
CREATE INDEX IF NOT EXISTS idx_workers_is_cleaner ON workers(is_cleaner);

-- Update existing workers to have is_cleaner = false if NULL (for safety)
UPDATE workers
SET is_cleaner = false
WHERE is_cleaner IS NULL;

-- If your table has a prefix, uncomment and use one of these instead:
-- ALTER TABLE app_070c516bb6_workers ADD COLUMN IF NOT EXISTS is_cleaner BOOLEAN DEFAULT false;
-- ALTER TABLE app_f79f105891_workers ADD COLUMN IF NOT EXISTS is_cleaner BOOLEAN DEFAULT false;
-- CREATE INDEX IF NOT EXISTS idx_workers_is_cleaner ON app_070c516bb6_workers(is_cleaner);
-- CREATE INDEX IF NOT EXISTS idx_workers_is_cleaner ON app_f79f105891_workers(is_cleaner);

