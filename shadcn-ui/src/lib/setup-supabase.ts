import { supabase } from './supabase-client';

/**
 * Initialize Supabase tables for the attendance system
 * This function should be called once to set up the database schema
 */
export async function initializeSupabaseTables(): Promise<boolean> {
  try {
    console.log('Initializing Supabase tables...');

    // Create workers table
    const { error: workersError } = await supabase.rpc('execute_sql', {
      sql: `
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
        DROP POLICY IF EXISTS "Allow public read access to workers" ON workers;
        DROP POLICY IF EXISTS "Allow public insert to workers" ON workers;
        DROP POLICY IF EXISTS "Allow public update to workers" ON workers;
        DROP POLICY IF EXISTS "Allow public delete to workers" ON workers;

        CREATE POLICY "Allow public read access to workers" ON workers FOR SELECT USING (true);
        CREATE POLICY "Allow public insert to workers" ON workers FOR INSERT WITH CHECK (true);
        CREATE POLICY "Allow public update to workers" ON workers FOR UPDATE USING (true);
        CREATE POLICY "Allow public delete to workers" ON workers FOR DELETE USING (true);

        -- Create policies for attendance_records table
        DROP POLICY IF EXISTS "Allow public read access to attendance_records" ON attendance_records;
        DROP POLICY IF EXISTS "Allow public insert to attendance_records" ON attendance_records;
        DROP POLICY IF EXISTS "Allow public update to attendance_records" ON attendance_records;
        DROP POLICY IF EXISTS "Allow public delete to attendance_records" ON attendance_records;

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
        DROP TRIGGER IF EXISTS update_workers_updated_at ON workers;
        DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON attendance_records;

        CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `
    });

    if (workersError) {
      console.error('Error creating tables:', workersError);
      return false;
    }

    console.log('Supabase tables initialized successfully!');
    return true;
  } catch (error) {
    console.error('Error initializing Supabase tables:', error);
    return false;
  }
}

/**
 * Migrate existing localStorage data to Supabase
 */
export async function migrateLocalStorageToSupabase(): Promise<boolean> {
  try {
    console.log('Migrating localStorage data to Supabase...');

    // Get existing data from localStorage
    const workersData = localStorage.getItem('workers');
    const attendanceData = localStorage.getItem('attendance');

    if (workersData) {
      const workers = JSON.parse(workersData);
      console.log(`Found ${workers.length} workers in localStorage`);

      for (const worker of workers) {
        const { error } = await supabase
          .from('workers')
          .upsert({
            id: worker.id,
            employee_id: worker.employeeId,
            name: worker.name,
            department: worker.department || null,
            position: worker.position || null,
            is_packer: worker.isPacker || false,
            created_at: worker.createdAt || new Date().toISOString(),
            updated_at: worker.updatedAt || new Date().toISOString()
          });

        if (error) {
          console.error(`Error migrating worker ${worker.name}:`, error);
        }
      }
    }

    if (attendanceData) {
      const attendance = JSON.parse(attendanceData);
      console.log(`Found ${attendance.length} attendance records in localStorage`);

      for (const record of attendance) {
        const { error } = await supabase
          .from('attendance_records')
          .upsert({
            id: record.id,
            worker_id: record.workerId,
            worker_name: record.workerName,
            date: record.date,
            status: record.status,
            overtime: record.overtime || 'no',
            notes: record.notes || null,
            created_at: record.createdAt || new Date().toISOString(),
            updated_at: record.updatedAt || new Date().toISOString()
          });

        if (error) {
          console.error(`Error migrating attendance record:`, error);
        }
      }
    }

    console.log('Migration completed successfully!');
    return true;
  } catch (error) {
    console.error('Error migrating data:', error);
    return false;
  }
}