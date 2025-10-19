import { Worker, AttendanceRecord } from "@/types";

const SUPABASE_URL = 'https://orsdqaeqqobltrmpvtmj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yc2RxYWVxcW9ibHRybXB2dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDc5MDQsImV4cCI6MjA2OTg4MzkwNH0.QhL8nm2-swoGTImb0Id-0WNjQOO9PC6O8wRo5ctpQ-Q';

// Workers table operations
export async function saveWorkerToSupabase(worker: Worker): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/workers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        id: worker.id,
        name: worker.name,
        employee_id: worker.employeeId,
        department: worker.department,
        position: worker.position,
        is_packer: worker.isPacker || false,
        created_at: worker.createdAt
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error saving worker to Supabase:', error);
    return false;
  }
}

export async function getAllWorkersFromSupabase(): Promise<Worker[]> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/workers?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      employeeId: row.employee_id,
      department: row.department,
      position: row.position,
      isPacker: row.is_packer,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('Error fetching workers from Supabase:', error);
    return [];
  }
}

export async function updateWorkerInSupabase(worker: Worker): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/workers?id=eq.${worker.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        name: worker.name,
        employee_id: worker.employeeId,
        department: worker.department,
        position: worker.position,
        is_packer: worker.isPacker || false
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error updating worker in Supabase:', error);
    return false;
  }
}

export async function deleteWorkerFromSupabase(workerId: string): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/workers?id=eq.${workerId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting worker from Supabase:', error);
    return false;
  }
}

// Attendance records table operations
export async function saveAttendanceRecordToSupabase(record: AttendanceRecord): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/attendance_records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        id: record.id,
        worker_id: record.workerId,
        worker_name: record.workerName,
        date: record.date,
        status: record.status,
        overtime: record.overtime,
        notes: record.notes,
        created_at: record.createdAt,
        updated_at: record.updatedAt
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error saving attendance record to Supabase:', error);
    return false;
  }
}

export async function getAllAttendanceRecordsFromSupabase(): Promise<AttendanceRecord[]> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/attendance_records?select=*&order=date.desc,created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.map((row: any) => ({
      id: row.id,
      workerId: row.worker_id,
      workerName: row.worker_name,
      date: row.date,
      status: row.status,
      overtime: row.overtime,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    console.error('Error fetching attendance records from Supabase:', error);
    return [];
  }
}

export async function updateAttendanceRecordInSupabase(record: AttendanceRecord): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/attendance_records?id=eq.${record.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        worker_name: record.workerName,
        status: record.status,
        overtime: record.overtime,
        notes: record.notes,
        updated_at: new Date().toISOString()
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error updating attendance record in Supabase:', error);
    return false;
  }
}

export async function deleteAttendanceRecordsForWorkerFromSupabase(workerId: string): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/attendance_records?worker_id=eq.${workerId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting attendance records from Supabase:', error);
    return false;
  }
}

export async function getAttendanceRecordsByDateFromSupabase(date: string): Promise<AttendanceRecord[]> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/attendance_records?date=eq.${date}&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.map((row: any) => ({
      id: row.id,
      workerId: row.worker_id,
      workerName: row.worker_name,
      date: row.date,
      status: row.status,
      overtime: row.overtime,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    console.error('Error fetching attendance records by date from Supabase:', error);
    return [];
  }
}