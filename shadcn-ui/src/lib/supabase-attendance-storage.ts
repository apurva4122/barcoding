import { supabase } from './supabase'
import type { Worker, AttendanceRecord, AttendanceStatus } from '@/types'

const WORKERS_TABLE = 'app_f79f105891_workers'
const ATTENDANCE_TABLE = 'app_f79f105891_attendance'

export interface SupabaseWorker {
  id: string
  user_id: string
  name: string
  employee_id: string
  department?: string
  position?: string
  is_packer: boolean
  is_cleaner?: boolean
  created_at: string
  updated_at: string
}

export interface SupabaseAttendance {
  id: string
  user_id: string
  worker_id: string
  worker_name: string
  date: string
  status: string
  overtime?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Convert Supabase worker row to Worker type
function convertToWorker(row: SupabaseWorker): Worker {
  return {
    id: row.id,
    name: row.name,
    employeeId: row.employee_id,
    department: row.department || '',
    position: row.position || '',
    isPacker: row.is_packer,
    isCleaner: row.is_cleaner || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Convert Worker to Supabase row (without user_id as it's handled by RLS)
function convertToSupabaseWorkerRow(worker: Worker): Omit<SupabaseWorker, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  return {
    name: worker.name,
    employee_id: worker.employeeId,
    department: worker.department || '',
    position: worker.position || '',
    is_packer: worker.isPacker || false,
    is_cleaner: worker.isCleaner || false
  }
}

// Convert Supabase attendance row to AttendanceRecord type
function convertToAttendanceRecord(row: SupabaseAttendance): AttendanceRecord {
  return {
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name,
    date: row.date,
    status: row.status as AttendanceStatus,
    overtime: row.overtime || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Convert AttendanceRecord to Supabase row (without user_id as it's handled by RLS)
function convertToSupabaseAttendanceRow(attendance: AttendanceRecord): Omit<SupabaseAttendance, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  return {
    worker_id: attendance.workerId,
    worker_name: attendance.workerName,
    date: attendance.date,
    status: attendance.status,
    overtime: attendance.overtime || '',
    notes: attendance.notes || ''
  }
}

// Worker Management Functions
export async function saveWorkerToSupabase(worker: Worker): Promise<boolean> {
  try {
    console.log('🔄 Attempting to save worker to Supabase:', worker);

    const rowData = convertToSupabaseWorkerRow(worker);
    console.log('📝 Converted worker data for Supabase:', rowData);

    const { data, error } = await supabase
      .from(WORKERS_TABLE)
      .insert([rowData])
      .select();

    if (error) {
      console.error('❌ SUPABASE WORKER INSERT FAILED:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('✅ Worker saved to Supabase successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ UNEXPECTED ERROR saving worker:', error);
    return false;
  }
}

export async function getAllWorkersFromSupabase(): Promise<Worker[]> {
  try {
    //console.log('🔄 Fetching all workers from Supabase...');

    const { data, error } = await supabase
      .from(WORKERS_TABLE)
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Supabase workers select error:', error);
      return [];
    }

    //console.log(`✅ Retrieved ${data?.length || 0} workers from Supabase`);
    return data ? data.map(convertToWorker) : [];
  } catch (error) {
    console.error('❌ Unexpected error fetching workers from Supabase:', error);
    return [];
  }
}

export async function deleteWorkerFromSupabase(workerId: string): Promise<boolean> {
  try {
    console.log('🔄 Deleting worker from Supabase:', workerId);

    const { error } = await supabase
      .from(WORKERS_TABLE)
      .delete()
      .eq('id', workerId);

    if (error) {
      console.error('❌ Error deleting worker from Supabase:', error);
      return false;
    }

    console.log('✅ Worker deleted from Supabase successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting worker from Supabase:', error);
    return false;
  }
}

export async function updateWorkerInSupabase(worker: Worker): Promise<boolean> {
  try {
    console.log('🔄 Updating worker in Supabase:', worker);

    const updatePayload: Partial<SupabaseWorker> = {
      name: worker.name,
      employee_id: worker.employeeId,
      department: worker.department || '',
      position: worker.position || '',
      is_packer: worker.isPacker || false,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(WORKERS_TABLE)
      .update(updatePayload)
      .eq('id', worker.id)
      .select()
      .single();

    if (error) {
      console.error('❌ ERROR UPDATING WORKER:', error);
      return false;
    }

    console.log('✅ Worker updated in Supabase successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ UNEXPECTED ERROR updating worker:', error);
    return false;
  }
}

export async function getWorkerByIdFromSupabase(workerId: string): Promise<Worker | null> {
  try {
    console.log('🔄 Fetching worker by ID from Supabase:', workerId);

    const { data, error } = await supabase
      .from(WORKERS_TABLE)
      .select('*')
      .eq('id', workerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('ℹ️ No worker found with ID:', workerId);
        return null; // No worker found
      }
      console.error('❌ Error finding worker in Supabase:', error);
      return null;
    }

    console.log('✅ Worker found in Supabase:', data);
    return data ? convertToWorker(data) : null;
  } catch (error) {
    console.error('❌ Error finding worker in Supabase:', error);
    return null;
  }
}

// Attendance Management Functions
export async function saveAttendanceToSupabase(attendance: AttendanceRecord): Promise<boolean> {
  try {
    console.log('🔄 Attempting to save attendance to Supabase:', attendance);

    const rowData = convertToSupabaseAttendanceRow(attendance);
    console.log('📝 Converted attendance data for Supabase:', rowData);

    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .upsert([rowData], {
        onConflict: 'worker_id,date',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ SUPABASE ATTENDANCE INSERT FAILED:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('✅ Attendance saved to Supabase successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ UNEXPECTED ERROR saving attendance:', error);
    return false;
  }
}

export async function getAllAttendanceFromSupabase(): Promise<AttendanceRecord[]> {
  try {
    //console.log('🔄 Fetching all attendance from Supabase...');

    // Get attendance records from last 30 days for performance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .select('*')
      .gte('date', startDate)
      .order('date', { ascending: false })
      .order('worker_name', { ascending: true });

    if (error) {
      console.error('❌ Supabase attendance select error:', error);
      return [];
    }

    //console.log(`✅ Retrieved ${data?.length || 0} attendance records from Supabase`);
    return data ? data.map(convertToAttendanceRecord) : [];
  } catch (error) {
    console.error('❌ Unexpected error fetching attendance from Supabase:', error);
    return [];
  }
}

export async function updateAttendanceInSupabase(attendance: AttendanceRecord): Promise<boolean> {
  try {
    console.log('🔄 Updating attendance in Supabase:', attendance);

    const updatePayload: Partial<SupabaseAttendance> = {
      status: attendance.status,
      overtime: attendance.overtime || '',
      notes: attendance.notes || '',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .update(updatePayload)
      .eq('id', attendance.id)
      .select()
      .single();

    if (error) {
      console.error('❌ ERROR UPDATING ATTENDANCE:', error);
      return false;
    }

    console.log('✅ Attendance updated in Supabase successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ UNEXPECTED ERROR updating attendance:', error);
    return false;
  }
}

export async function getAttendanceByDateFromSupabase(date: string): Promise<AttendanceRecord[]> {
  try {
    console.log('🔄 Fetching attendance by date from Supabase:', date);

    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .select('*')
      .eq('date', date)
      .order('worker_name', { ascending: true });

    if (error) {
      console.error('❌ Supabase attendance by date select error:', error);
      return [];
    }

    console.log(`✅ Retrieved ${data?.length || 0} attendance records for date ${date}`);
    return data ? data.map(convertToAttendanceRecord) : [];
  } catch (error) {
    console.error('❌ Unexpected error fetching attendance by date from Supabase:', error);
    return [];
  }
}

// Special Functions for Barcode Assignment
export async function getPresentPackersFromSupabase(date: string): Promise<Worker[]> {
  try {
    console.log('🔄 Fetching present packers from Supabase for date:', date);

    // Get attendance records for the date where status is 'present' and worker is a packer
    const { data: attendanceData, error: attendanceError } = await supabase
      .from(ATTENDANCE_TABLE)
      .select(`
        worker_id,
        worker_name,
        ${WORKERS_TABLE}!inner(
          id,
          name,
          employee_id,
          department,
          position,
          is_packer,
          created_at,
          updated_at
        )
      `)
      .eq('date', date)
      .eq('status', 'present')
      .eq(`${WORKERS_TABLE}.is_packer`, true);

    if (attendanceError) {
      console.error('❌ Error fetching present packers from Supabase:', attendanceError);
      return [];
    }

    if (!attendanceData || attendanceData.length === 0) {
      console.log(`ℹ️ No present packers found for date ${date}`);
      return [];
    }

    // Convert to Worker objects
    const presentPackers = attendanceData
      .map((record: any) => {
        const workerData = record[WORKERS_TABLE];
        if (workerData) {
          return convertToWorker(workerData);
        }
        return null;
      })
      .filter((worker): worker is Worker => worker !== null);

    console.log(`✅ Retrieved ${presentPackers.length} present packers for date ${date}`);
    return presentPackers;
  } catch (error) {
    console.error('❌ Unexpected error fetching present packers from Supabase:', error);
    return [];
  }
}

// Database setup functions (to be called once to create tables)
export async function setupWorkersTables(): Promise<boolean> {
  try {
    // This would typically be done via Supabase dashboard or migration scripts
    // Including here for reference of the expected table structure

    const workersTableSQL = `
      CREATE TABLE IF NOT EXISTS ${WORKERS_TABLE} (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users NOT NULL,
        name TEXT NOT NULL,
        employee_id TEXT UNIQUE NOT NULL,
        department TEXT,
        position TEXT,
        is_packer BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );

      CREATE INDEX IF NOT EXISTS workers_user_idx ON ${WORKERS_TABLE}(user_id);
      CREATE INDEX IF NOT EXISTS workers_employee_idx ON ${WORKERS_TABLE}(employee_id);
      CREATE INDEX IF NOT EXISTS workers_packer_idx ON ${WORKERS_TABLE}(is_packer);

      ALTER TABLE ${WORKERS_TABLE} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "allow_read_own_workers" ON ${WORKERS_TABLE} FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "allow_insert_own_workers" ON ${WORKERS_TABLE} FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "allow_update_own_workers" ON ${WORKERS_TABLE} FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY "allow_delete_own_workers" ON ${WORKERS_TABLE} FOR DELETE USING (auth.uid() = user_id);
    `;

    const attendanceTableSQL = `
      CREATE TABLE IF NOT EXISTS ${ATTENDANCE_TABLE} (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users NOT NULL,
        worker_id UUID REFERENCES ${WORKERS_TABLE}(id) ON DELETE CASCADE NOT NULL,
        worker_name TEXT NOT NULL,
        date DATE NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half-day')),
        overtime TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        UNIQUE(worker_id, date)
      );

      CREATE INDEX IF NOT EXISTS attendance_user_idx ON ${ATTENDANCE_TABLE}(user_id);
      CREATE INDEX IF NOT EXISTS attendance_worker_idx ON ${ATTENDANCE_TABLE}(worker_id);
      CREATE INDEX IF NOT EXISTS attendance_date_idx ON ${ATTENDANCE_TABLE}(date);
      CREATE INDEX IF NOT EXISTS attendance_status_idx ON ${ATTENDANCE_TABLE}(status);

      ALTER TABLE ${ATTENDANCE_TABLE} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "allow_read_own_attendance" ON ${ATTENDANCE_TABLE} FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "allow_insert_own_attendance" ON ${ATTENDANCE_TABLE} FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "allow_update_own_attendance" ON ${ATTENDANCE_TABLE} FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY "allow_delete_own_attendance" ON ${ATTENDANCE_TABLE} FOR DELETE USING (auth.uid() = user_id);
    `;

    console.log('📋 Table setup SQL generated. Please run these in Supabase SQL editor:');
    console.log('Workers Table SQL:', workersTableSQL);
    console.log('Attendance Table SQL:', attendanceTableSQL);

    return true;
  } catch (error) {
    console.error('Error setting up tables:', error);
    return false;
  }
}