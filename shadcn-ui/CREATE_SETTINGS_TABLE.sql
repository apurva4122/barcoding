-- Create settings table for storing user preferences
CREATE TABLE IF NOT EXISTS app_070c516bb6_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_user_key ON app_070c516bb6_settings(user_id, key);

-- Enable Row Level Security
ALTER TABLE app_070c516bb6_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
DROP POLICY IF EXISTS "Allow all operations" ON app_070c516bb6_settings;
CREATE POLICY "Allow all operations" ON app_070c516bb6_settings 
FOR ALL USING (true) WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_settings_updated_at_trigger ON app_070c516bb6_settings;
CREATE TRIGGER update_settings_updated_at_trigger
    BEFORE UPDATE ON app_070c516bb6_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();


