import { Worker, AttendanceRecord, AttendanceStatus } from '@/types';
import {
  getAllWorkersFromSupabase,
  saveWorkerToSupabase,
  deleteWorkerFromSupabase,
  getWorkerByIdFromSupabase,
  getAllAttendanceFromSupabase,
  saveAttendanceToSupabase,
  getAttendanceByDateFromSupabase,
  getPresentPackersFromSupabase,
  updateAttendanceInSupabase,
  toggleOvertimeInSupabase,
  hasOvertimeForDateInSupabase
} from './supabase-service';

const WORKERS_STORAGE_KEY = 'workers';
const ATTENDANCE_STORAGE_KEY = 'attendance';

// Worker Management Functions with Supabase integration

/**
 * Get all workers from Supabase with localStorage fallback
 */
export async function getAllWorkers(includeInactive: boolean = true): Promise<Worker[]> {
  try {
    // Try to get from Supabase first
    const supabaseWorkers = await getAllWorkersFromSupabase(includeInactive);
    if (supabaseWorkers.length > 0) {
      // Also sync to localStorage for offline access
      localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(supabaseWorkers));
      return supabaseWorkers;
    }

    // Fallback to localStorage
    const storedData = localStorage.getItem(WORKERS_STORAGE_KEY);
    if (!storedData) {
      return [];
    }
    const localWorkers = JSON.parse(storedData);
    return localWorkers;
  } catch (error) {
    console.error('Error retrieving workers:', error);
    // Fallback to localStorage
    try {
      const storedData = localStorage.getItem(WORKERS_STORAGE_KEY);
      const localWorkers = storedData ? JSON.parse(storedData) : [];
      return localWorkers;
    } catch (localError) {
      console.error('Error retrieving workers from localStorage:', localError);
      return [];
    }
  }
}

/**
 * Get all attendance records from Supabase with localStorage fallback
 */
export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  try {
    // Try to get from Supabase first
    const supabaseAttendance = await getAllAttendanceFromSupabase();
    if (supabaseAttendance.length > 0) {
      // Also sync to localStorage for offline access
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(supabaseAttendance));
      return supabaseAttendance;
    }

    // Fallback to localStorage
    const storedData = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    if (!storedData) {
      return [];
    }
    const localAttendance = JSON.parse(storedData);
    return localAttendance;
  } catch (error) {
    console.error('Error retrieving attendance:', error);
    // Fallback to localStorage
    try {
      const storedData = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      const localAttendance = storedData ? JSON.parse(storedData) : [];
      return localAttendance;
    } catch (localError) {
      console.error('Error retrieving attendance from localStorage:', localError);
      return [];
    }
  }
}

/**
 * Save a worker to Supabase and localStorage
 */
export async function saveWorker(worker: Worker): Promise<boolean> {
  try {
    // Try to save to Supabase first
    const supabaseSuccess = await saveWorkerToSupabase(worker);

    if (supabaseSuccess) {
      // Also update localStorage
      const workers = await getAllWorkers();
      const existingIndex = workers.findIndex(w => w.id === worker.id);

      if (existingIndex >= 0) {
        workers[existingIndex] = { ...worker, updatedAt: new Date().toISOString() };
      } else {
        const newWorker = {
          ...worker,
          id: worker.id || `worker-${Date.now()}`,
          createdAt: worker.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        workers.push(newWorker);
      }

      localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(workers));
      return true;
    }
  } catch (error) {
    console.error('Error saving to Supabase, falling back to localStorage:', error);
  }

  // Fallback to localStorage only
  const workers = await getAllWorkers();

  // Check if worker already exists
  const existingIndex = workers.findIndex(w => w.id === worker.id || w.employeeId === worker.employeeId);

  if (existingIndex >= 0) {
    // Update existing worker
    workers[existingIndex] = { ...worker, updatedAt: new Date().toISOString() };
  } else {
    // Add new worker
    const newWorker = {
      ...worker,
      id: worker.id || `worker-${Date.now()}`,
      createdAt: worker.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    workers.push(newWorker);
  }

  try {
    localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(workers));
    return true;
  } catch (error) {
    console.error('Error saving worker to localStorage:', error);
    return false;
  }
}

/**
 * Save attendance record to Supabase and localStorage
 */
export async function saveAttendance(attendance: AttendanceRecord): Promise<boolean> {
  try {
    // Try to save to Supabase first
    const supabaseSuccess = await saveAttendanceToSupabase(attendance);

    if (supabaseSuccess) {
      // Also update localStorage
      const attendanceRecords = await getAllAttendance();
      const existingIndex = attendanceRecords.findIndex(
        a => a.workerId === attendance.workerId && a.date === attendance.date
      );

      if (existingIndex >= 0) {
        attendanceRecords[existingIndex] = { ...attendance, updatedAt: new Date().toISOString() };
      } else {
        const newAttendance = {
          ...attendance,
          id: attendance.id || `attendance-${Date.now()}`,
          createdAt: attendance.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        attendanceRecords.push(newAttendance);
      }

      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendanceRecords));
      return true;
    }
  } catch (error) {
    console.error('Error saving to Supabase, falling back to localStorage:', error);
  }

  // Fallback to localStorage only
  const attendanceRecords = await getAllAttendance();

  // Check if attendance already exists for this worker and date
  const existingIndex = attendanceRecords.findIndex(
    a => a.workerId === attendance.workerId && a.date === attendance.date
  );

  if (existingIndex >= 0) {
    // Update existing attendance
    attendanceRecords[existingIndex] = { ...attendance, updatedAt: new Date().toISOString() };
  } else {
    // Add new attendance
    const newAttendance = {
      ...attendance,
      id: attendance.id || `attendance-${Date.now()}`,
      createdAt: attendance.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    attendanceRecords.push(newAttendance);
  }

  try {
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendanceRecords));
    return true;
  } catch (error) {
    console.error('Error saving attendance to localStorage:', error);
    return false;
  }
}

/**
 * Delete a worker from Supabase and localStorage
 */
export async function deleteWorker(workerId: string): Promise<boolean> {
  try {
    // Try to delete from Supabase first
    const supabaseSuccess = await deleteWorkerFromSupabase(workerId);
    if (supabaseSuccess) {
      // Also update localStorage
      const workers = await getAllWorkers();
      const newWorkers = workers.filter(w => w.id !== workerId);
      localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(newWorkers));

      // Also remove related attendance records
      const attendance = await getAllAttendance();
      const newAttendance = attendance.filter(a => a.workerId !== workerId);
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(newAttendance));

      return true;
    }
  } catch (error) {
    console.error('Error deleting worker from Supabase:', error);
  }

  // Fallback to localStorage
  const workers = await getAllWorkers();
  const newWorkers = workers.filter(w => w.id !== workerId);

  if (newWorkers.length === workers.length) {
    return false; // No worker was found to delete
  }

  try {
    localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(newWorkers));

    // Also remove related attendance records
    const attendance = await getAllAttendance();
    const newAttendance = attendance.filter(a => a.workerId !== workerId);
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(newAttendance));

    return true;
  } catch (error) {
    console.error('Error deleting worker from localStorage:', error);
    return false;
  }
}

/**
 * Get attendance records for a specific date from Supabase with localStorage fallback
 */
export async function getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
  try {
    // Try to get from Supabase first
    const supabaseAttendance = await getAttendanceByDateFromSupabase(date);
    if (supabaseAttendance.length > 0) {
      return supabaseAttendance;
    }
  } catch (error) {
    console.error('Error retrieving attendance by date from Supabase:', error);
  }

  // Fallback to localStorage
  const allAttendance = await getAllAttendance();
  const dateAttendance = allAttendance.filter(a => a.date === date);
  return dateAttendance;
}

/**
 * Get present packers for a specific date from Supabase with localStorage fallback
 */
export async function getPresentPackersForDate(date: string): Promise<Worker[]> {
  try {
    // Try to get from Supabase first
    const supabasePackers = await getPresentPackersFromSupabase(date);
    if (supabasePackers.length > 0) {
      return supabasePackers;
    }
  } catch (error) {
    console.error('Error retrieving present packers from Supabase:', error);
  }

  // Fallback to localStorage
  try {
    const [workers, attendance] = await Promise.all([
      getAllWorkers(),
      getAttendanceByDate(date)
    ]);

    // Filter workers who are packers and present on the given date
    const presentPackers = workers.filter(worker => {
      if (!worker.isPacker) return false;

      const workerAttendance = attendance.find(a => a.workerId === worker.id);
      // Present if no record (default) or status is present
      return !workerAttendance || workerAttendance.status === AttendanceStatus.PRESENT;
    });

    return presentPackers;
  } catch (error) {
    console.error('Error retrieving present packers from localStorage:', error);
    return [];
  }
}

/**
 * Toggle overtime for a worker on a specific date
 */
export async function toggleOvertimeForWorker(workerId: string, date: string): Promise<void> {
  try {
    console.log('🔄 toggleOvertimeForWorker called with workerId:', workerId, 'date:', date);

    // Try to toggle in Supabase first
    const supabaseSuccess = await toggleOvertimeInSupabase(workerId, date);

    if (supabaseSuccess) {
      console.log('✅ Overtime toggled successfully in Supabase');
      // Refresh data to get updated records from Supabase
      // The loadData() call in the component will handle this
      return;
    } else {
      console.warn('⚠️ Supabase toggle failed, trying localStorage fallback');
    }
  } catch (error) {
    console.error('❌ Error updating in Supabase, falling back to localStorage:', error);
  }

  // Fallback to localStorage
  try {
    const records = await getAllAttendance();
    const existingRecord = records.find(r => r.workerId === workerId && r.date === date);

    if (existingRecord) {
      // Toggle overtime status
      const updatedRecord = {
        ...existingRecord,
        overtime: existingRecord.overtime === 'yes' ? 'no' : 'yes',
        updatedAt: new Date().toISOString()
      };

      await saveAttendance(updatedRecord);
      console.log('✅ Overtime toggled in localStorage');
    } else {
      // Create new record with overtime
      const workers = await getAllWorkers();
      const worker = workers.find(w => w.id === workerId);
      if (worker) {
        const newRecord: AttendanceRecord = {
          id: `attendance-${Date.now()}-${workerId}`,
          workerId: workerId,
          workerName: worker.name,
          date: date,
          status: AttendanceStatus.PRESENT,
          overtime: 'yes', // Default to 'yes' (overtime on by default)
          createdAt: new Date().toISOString()
        };

        await saveAttendance(newRecord);
        console.log('✅ New overtime record created in localStorage');
      } else {
        console.error('❌ Worker not found for overtime toggle:', workerId);
      }
    }
  } catch (error) {
    console.error('❌ Error in localStorage fallback:', error);
    throw error;
  }
}

/**
 * Check if a worker has overtime for a specific date
 */
export async function hasOvertimeForDate(workerId: string, date: string): Promise<boolean> {
  try {
    // Try to check in Supabase first
    return await hasOvertimeForDateInSupabase(workerId, date);
  } catch (error) {
    console.error('Error checking overtime in Supabase, falling back to localStorage:', error);

    // Fallback to localStorage
    const attendanceRecords = await getAllAttendance();
    const record = attendanceRecords.find(r => r.workerId === workerId && r.date === date);
    return record?.overtime === 'yes';
  }
}

// Legacy function aliases for backward compatibility
export const getWorkers = getAllWorkers;
export const getAttendanceRecords = getAllAttendance;
export const saveAttendanceRecord = saveAttendance;