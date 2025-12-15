-- Create batch_counter_data table to store real-time data from industrial batch counter
CREATE TABLE IF NOT EXISTS batch_counter_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id VARCHAR(100) NOT NULL,
    batch_count INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    production_rate DECIMAL(10, 2), -- items per hour
    status VARCHAR(50), -- 'running', 'stopped', 'error', etc.
    metadata JSONB, -- Additional data from the machine (flexible JSON structure)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_batch_counter_machine_id ON batch_counter_data(machine_id);
CREATE INDEX IF NOT EXISTS idx_batch_counter_timestamp ON batch_counter_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_batch_counter_machine_timestamp ON batch_counter_data(machine_id, timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE batch_counter_data ENABLE ROW LEVEL SECURITY;

-- Create policies for batch_counter_data table
DROP POLICY IF EXISTS "Allow public read access to batch_counter_data" ON batch_counter_data;
DROP POLICY IF EXISTS "Allow public insert to batch_counter_data" ON batch_counter_data;
DROP POLICY IF EXISTS "Allow public update to batch_counter_data" ON batch_counter_data;
DROP POLICY IF EXISTS "Allow public delete to batch_counter_data" ON batch_counter_data;

CREATE POLICY "Allow public read access to batch_counter_data" ON batch_counter_data FOR SELECT USING (true);
CREATE POLICY "Allow public insert to batch_counter_data" ON batch_counter_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to batch_counter_data" ON batch_counter_data FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to batch_counter_data" ON batch_counter_data FOR DELETE USING (true);

-- Create a view for real-time statistics (last hour)
CREATE OR REPLACE VIEW batch_counter_stats_last_hour AS
SELECT 
    machine_id,
    COUNT(*) as total_readings,
    MAX(batch_count) as max_count,
    MIN(batch_count) as min_count,
    AVG(production_rate) as avg_production_rate,
    MAX(timestamp) as last_update
FROM batch_counter_data
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY machine_id;


