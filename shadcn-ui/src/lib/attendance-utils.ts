import { Worker, AttendanceRecord, AttendanceStatus } from "@/types";

const WORKERS_KEY = 'qr_workers';
const ATTENDANCE_KEY = 'qr_attendance';

// Worker Management
export const getAllWorkers = async (): Promise<Worker[]> => {
  try {
    const stored = localStorage.getItem(WORKERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading workers:', error);
    return [];
  }
};

export const getWorkers = getAllWorkers; // Alias for compatibility

export const saveWorker = async (worker: Worker): Promise<boolean> => {
  try {
    const workers = await getAllWorkers();
    const existingIndex = workers.findIndex(w => w.id === worker.id);
    
    if (existingIndex >= 0) {
      workers[existingIndex] = worker;
    } else {
      workers.push(worker);
    }
    
    localStorage.setItem(WORKERS_KEY, JSON.stringify(workers));
    return true;
  } catch (error) {
    console.error('Error saving worker:', error);
    return false;
  }
};

export const deleteWorker = async (workerId: string): Promise<boolean> => {
  try {
    const workers = await getAllWorkers();
    const filteredWorkers = workers.filter(w => w.id !== workerId);
    localStorage.setItem(WORKERS_KEY, JSON.stringify(filteredWorkers));
    
    // Also remove attendance records for this worker
    const attendance = await getAllAttendance();
    const filteredAttendance = attendance.filter(a => a.workerId !== workerId);
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(filteredAttendance));
    
    return true;
  } catch (error) {
    console.error('Error deleting worker:', error);
    return false;
  }
};

export const togglePackerStatus = async (workerId: string): Promise<boolean> => {
  try {
    const workers = await getAllWorkers();
    const workerIndex = workers.findIndex(w => w.id === workerId);
    
    if (workerIndex >= 0) {
      workers[workerIndex].isPacker = !workers[workerIndex].isPacker;
      localStorage.setItem(WORKERS_KEY, JSON.stringify(workers));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error toggling packer status:', error);
    return false;
  }
};

// Attendance Management
export const getAllAttendance = async (): Promise<AttendanceRecord[]> => {
  try {
    const stored = localStorage.getItem(ATTENDANCE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading attendance:', error);
    return [];
  }
};

export const getAttendanceRecords = getAllAttendance; // Alias for compatibility

export const saveAttendance = async (record: AttendanceRecord): Promise<boolean> => {
  try {
    const records = await getAllAttendance();
    const existingIndex = records.findIndex(r => 
      r.workerId === record.workerId && r.date === record.date
    );
    
    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }
    
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error('Error saving attendance:', error);
    return false;
  }
};

export const saveAttendanceRecord = saveAttendance; // Alias for compatibility

export const toggleOvertimeForWorker = async (workerId: string, date: string): Promise<boolean> => {
  try {
    const records = await getAllAttendance();
    const recordIndex = records.findIndex(r => r.workerId === workerId && r.date === date);
    
    if (recordIndex >= 0) {
      // Toggle existing record
      records[recordIndex].overtime = records[recordIndex].overtime === 'yes' ? 'no' : 'yes';
      records[recordIndex].updatedAt = new Date().toISOString();
    } else {
      // Create new record with overtime
      const workers = await getAllWorkers();
      const worker = workers.find(w => w.id === workerId);
      
      if (worker) {
        const newRecord: AttendanceRecord = {
          id: `attendance-${workerId}-${date}`,
          workerId,
          workerName: worker.name,
          date,
          status: AttendanceStatus.PRESENT,
          overtime: 'yes',
          createdAt: new Date().toISOString()
        };
        records.push(newRecord);
      }
    }
    
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error('Error toggling overtime:', error);
    return false;
  }
};

export const hasOvertimeForDate = async (workerId: string, date: string): Promise<boolean> => {
  try {
    const records = await getAllAttendance();
    const record = records.find(r => r.workerId === workerId && r.date === date);
    return record?.overtime === 'yes';
  } catch (error) {
    console.error('Error checking overtime:', error);
    return false;
  }
};

export const getPresentPackersForDate = async (date: string): Promise<Worker[]> => {
  try {
    const [workers, attendance] = await Promise.all([
      getAllWorkers(),
      getAllAttendance()
    ]);
    
    const packers = workers.filter(w => w.isPacker);
    const dateAttendance = attendance.filter(a => a.date === date);
    
    return packers.filter(packer => {
      const record = dateAttendance.find(a => a.workerId === packer.id);
      // Present if no record (default) or if status is not absent/half-day
      return !record || (record.status !== AttendanceStatus.ABSENT && record.status !== AttendanceStatus.HALF_DAY);
    });
  } catch (error) {
    console.error('Error getting present packers:', error);
    return [];
  }
};

// Utility functions for barcode assignment
export const getAvailablePackers = async (date?: string): Promise<Worker[]> => {
  const currentDate = date || new Date().toISOString().split('T')[0];
  return await getPresentPackersForDate(currentDate);
};

export const getWorkerById = async (workerId: string): Promise<Worker | null> => {
  try {
    const workers = await getAllWorkers();
    return workers.find(w => w.id === workerId) || null;
  } catch (error) {
    console.error('Error getting worker by ID:', error);
    return null;
  }
};

export const getAttendanceForDate = async (date: string): Promise<AttendanceRecord[]> => {
  try {
    const records = await getAllAttendance();
    return records.filter(r => r.date === date);
  } catch (error) {
    console.error('Error getting attendance for date:', error);
    return [];
  }
};