import { supabase } from './supabase-client';
import { Worker, AttendanceRecord, AttendanceStatus } from '@/types';

// Worker Management Functions

/**
 * Get all workers from Supabase
 */
export async function getAllWorkersFromSupabase(): Promise<Worker[]> {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workers from Supabase:', error);
      return [];
    }

    return data.map(worker => ({
      id: worker.id,
      employeeId: worker.employee_id,
      name: worker.name,
      department: worker.department || undefined,
      position: worker.position || undefined,
      isPacker: worker.is_packer,
      createdAt: worker.created_at,
      updatedAt: worker.updated_at || undefined
    }));
  } catch (error) {
    console.error('Error in getAllWorkersFromSupabase:', error);
    return [];
  }
}

/**
 * Save a worker to Supabase
 */
export async function saveWorkerToSupabase(worker: Worker): Promise<boolean> {
  try {
    // Check if worker exists
    const { data: existingWorker } = await supabase
      .from('workers')
      .select('id')
      .eq('id', worker.id)
      .single();

    const workerData = {
      id: worker.id,
      employee_id: worker.employeeId,
      name: worker.name,
      department: worker.department || null,
      position: worker.position || null,
      is_packer: worker.isPacker || false,
    };

    if (existingWorker) {
      // Update existing worker
      const { error } = await supabase
        .from('workers')
        .update(workerData)
        .eq('id', worker.id);

      if (error) {
        console.error('Error updating worker in Supabase:', error);
        return false;
      }
    } else {
      // Insert new worker
      const { error } = await supabase
        .from('workers')
        .insert([workerData]);

      if (error) {
        console.error('Error inserting worker in Supabase:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in saveWorkerToSupabase:', error);
    return false;
  }
}

/**
 * Delete a worker from Supabase
 */
export async function deleteWorkerFromSupabase(workerId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', workerId);

    if (error) {
      console.error('Error deleting worker from Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteWorkerFromSupabase:', error);
    return false;
  }
}

/**
 * Get worker by ID from Supabase
 */
export async function getWorkerByIdFromSupabase(workerId: string): Promise<Worker | null> {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .single();

    if (error || !data) {
      console.error('Error fetching worker by ID from Supabase:', error);
      return null;
    }

    return {
      id: data.id,
      employeeId: data.employee_id,
      name: data.name,
      department: data.department || undefined,
      position: data.position || undefined,
      isPacker: data.is_packer,
      createdAt: data.created_at,
      updatedAt: data.updated_at || undefined
    };
  } catch (error) {
    console.error('Error in getWorkerByIdFromSupabase:', error);
    return null;
  }
}

// Attendance Management Functions

/**
 * Get all attendance records from Supabase
 */
export async function getAllAttendanceFromSupabase(): Promise<AttendanceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching attendance from Supabase:', error);
      return [];
    }

    return data.map(record => ({
      id: record.id,
      workerId: record.worker_id,
      workerName: record.worker_name,
      date: record.date,
      status: record.status as AttendanceStatus,
      overtime: record.overtime,
      notes: record.notes || undefined,
      createdAt: record.created_at,
      updatedAt: record.updated_at || undefined
    }));
  } catch (error) {
    console.error('Error in getAllAttendanceFromSupabase:', error);
    return [];
  }
}

/**
 * Save attendance record to Supabase
 */
export async function saveAttendanceToSupabase(attendance: AttendanceRecord): Promise<boolean> {
  try {
    console.log('🔄 Attempting to save attendance to Supabase:', attendance);
    console.log('🔍 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://orsdqaeqqobltrmpvtmj.supabase.co');

    const attendanceData = {
      id: attendance.id,
      worker_id: attendance.workerId,
      worker_name: attendance.workerName,
      date: attendance.date,
      status: attendance.status,
      overtime: attendance.overtime || 'no',
      notes: attendance.notes || null,
    };

    console.log('📝 Converted attendance data for Supabase:', attendanceData);

    // Try upsert first (like barcode sync) for better reliability
    const { data: upsertData, error: upsertError } = await supabase
      .from('attendance_records')
      .upsert([attendanceData], {
        onConflict: 'worker_id,date',
        ignoreDuplicates: false
      })
      .select();

    if (!upsertError && upsertData) {
      console.log('✅ Attendance saved to Supabase successfully (upsert):', upsertData);
      return true;
    }

    // If upsert fails (e.g., constraint not set up), fall back to check-then-insert/update
    if (upsertError) {
      console.error('❌ Upsert error details:', {
        message: upsertError.message,
        code: upsertError.code,
        details: upsertError.details,
        hint: upsertError.hint
      });
      console.warn('⚠️ Upsert failed, falling back to check-then-insert/update:', upsertError.message);

      // Check if attendance record exists for this worker and date
      const { data: existingRecord } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('worker_id', attendance.workerId)
        .eq('date', attendance.date)
        .single();

      if (existingRecord) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('attendance_records')
          .update(attendanceData)
          .eq('worker_id', attendance.workerId)
          .eq('date', attendance.date);

        if (updateError) {
          console.error('❌ Error updating attendance in Supabase:', updateError);
          return false;
        }
        console.log('✅ Attendance updated in Supabase successfully');
        return true;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert([attendanceData]);

        if (insertError) {
          console.error('❌ Error inserting attendance in Supabase:', insertError);
          console.error('Error details:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          });
          
          // Check if table doesn't exist
          if (insertError.code === '42P01' || insertError.message?.includes('does not exist')) {
            console.error('❌ TABLE DOES NOT EXIST! Please create the attendance_records table in Supabase.');
            console.error('📋 Run the SQL from supabase-tables.sql in your Supabase SQL editor.');
          }
          
          return false;
        }
        console.log('✅ Attendance inserted in Supabase successfully');
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('❌ UNEXPECTED ERROR saving attendance:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return false;
  }
}

/**
 * Get attendance records by date from Supabase
 */
export async function getAttendanceByDateFromSupabase(date: string): Promise<AttendanceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('date', date)
      .order('worker_name', { ascending: true });

    if (error) {
      console.error('Error fetching attendance by date from Supabase:', error);
      return [];
    }

    return data.map(record => ({
      id: record.id,
      workerId: record.worker_id,
      workerName: record.worker_name,
      date: record.date,
      status: record.status as AttendanceStatus,
      overtime: record.overtime,
      notes: record.notes || undefined,
      createdAt: record.created_at,
      updatedAt: record.updated_at || undefined
    }));
  } catch (error) {
    console.error('Error in getAttendanceByDateFromSupabase:', error);
    return [];
  }
}

/**
 * Get present packers for a specific date from Supabase
 */
export async function getPresentPackersFromSupabase(date: string): Promise<Worker[]> {
  try {
    // Get all packers
    const { data: packers, error: packersError } = await supabase
      .from('workers')
      .select('*')
      .eq('is_packer', true);

    if (packersError) {
      console.error('Error fetching packers from Supabase:', packersError);
      return [];
    }

    // Get attendance records for the date
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('worker_id, status')
      .eq('date', date);

    if (attendanceError) {
      console.error('Error fetching attendance from Supabase:', attendanceError);
      return [];
    }

    // Filter present packers
    const presentPackers = packers.filter(packer => {
      const attendanceRecord = attendance.find(a => a.worker_id === packer.id);
      // Present if no record (default) or status is present
      return !attendanceRecord || attendanceRecord.status === 'present';
    });

    return presentPackers.map(worker => ({
      id: worker.id,
      employeeId: worker.employee_id,
      name: worker.name,
      department: worker.department || undefined,
      position: worker.position || undefined,
      isPacker: worker.is_packer,
      createdAt: worker.created_at,
      updatedAt: worker.updated_at || undefined
    }));
  } catch (error) {
    console.error('Error in getPresentPackersFromSupabase:', error);
    return [];
  }
}

/**
 * Update attendance record in Supabase
 */
export async function updateAttendanceInSupabase(attendance: AttendanceRecord): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('attendance_records')
      .update({
        worker_name: attendance.workerName,
        status: attendance.status,
        overtime: attendance.overtime || 'no',
        notes: attendance.notes || null,
      })
      .eq('id', attendance.id);

    if (error) {
      console.error('Error updating attendance in Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateAttendanceInSupabase:', error);
    return false;
  }
}

/**
 * Toggle overtime for a worker on a specific date
 */
export async function toggleOvertimeInSupabase(workerId: string, date: string): Promise<boolean> {
  try {
    // Get existing record
    const { data: existingRecord, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('worker_id', workerId)
      .eq('date', date)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching attendance record:', fetchError);
      return false;
    }

    if (existingRecord) {
      // Toggle existing record
      const newOvertimeStatus = existingRecord.overtime === 'yes' ? 'no' : 'yes';
      const { error } = await supabase
        .from('attendance_records')
        .update({ overtime: newOvertimeStatus })
        .eq('id', existingRecord.id);

      if (error) {
        console.error('Error toggling overtime:', error);
        return false;
      }
    } else {
      // Create new record with overtime
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('name')
        .eq('id', workerId)
        .single();

      if (workerError || !worker) {
        console.error('Error fetching worker for overtime record:', workerError);
        return false;
      }

      const { error } = await supabase
        .from('attendance_records')
        .insert([{
          worker_id: workerId,
          worker_name: worker.name,
          date: date,
          status: 'present',
          overtime: 'yes'
        }]);

      if (error) {
        console.error('Error creating overtime record:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in toggleOvertimeInSupabase:', error);
    return false;
  }
}

/**
 * Check if worker has overtime for a specific date
 */
export async function hasOvertimeForDateInSupabase(workerId: string, date: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('overtime')
      .eq('worker_id', workerId)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking overtime:', error);
      return false;
    }

    return data?.overtime === 'yes';
  } catch (error) {
    console.error('Error in hasOvertimeForDateInSupabase:', error);
    return false;
  }
}