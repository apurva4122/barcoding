-- Create workers table
CREATE TABLE IF NOT EXISTS workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    position VARCHAR(255),
    is_packer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
    worker_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'half_day')),
    overtime VARCHAR(10) DEFAULT 'no' CHECK (overtime IN ('yes', 'no')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(worker_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workers_employee_id ON workers(employee_id);
CREATE INDEX IF NOT EXISTS idx_workers_is_packer ON workers(is_packer);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_id ON attendance_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON attendance_records(worker_id, date);

-- Enable Row Level Security (RLS)
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Create policies for workers table
CREATE POLICY "Allow public read access to workers" ON workers FOR SELECT USING (true);
CREATE POLICY "Allow public insert to workers" ON workers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to workers" ON workers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to workers" ON workers FOR DELETE USING (true);

-- Create policies for attendance_records table
CREATE POLICY "Allow public read access to attendance_records" ON attendance_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert to attendance_records" ON attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to attendance_records" ON attendance_records FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to attendance_records" ON attendance_records FOR DELETE USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();