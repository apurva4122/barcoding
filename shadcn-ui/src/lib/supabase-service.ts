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
    console.log('🔄 Attempting to save worker to Supabase:', worker);

    // Check if worker exists by employee_id (more reliable than ID)
    // Use maybeSingle() instead of single() to avoid errors when no record exists
    const { data: existingWorker, error: checkError } = await supabase
      .from('workers')
      .select('id')
      .eq('employee_id', worker.employeeId)
      .maybeSingle();

    // If there's an error checking (not just "no rows"), log it but continue
    if (checkError && checkError.code !== 'PGRST116') {
      console.warn('⚠️ Error checking for existing worker:', checkError);
    }

    const workerData: any = {
      employee_id: worker.employeeId,
      name: worker.name,
      department: worker.department || null,
      position: worker.position || null,
      is_packer: worker.isPacker || false,
    };

    // If worker exists, update it
    if (existingWorker) {
      // Update existing worker by employee_id (don't use ID since it might be invalid)
      const { error: updateError } = await supabase
        .from('workers')
        .update(workerData)
        .eq('employee_id', worker.employeeId);

      if (updateError) {
        console.error('❌ Error updating worker in Supabase:', updateError);
        console.error('Error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        return false;
      }
      console.log('✅ Worker updated in Supabase successfully');
      return true;
    } else {
      // Insert new worker - let database generate UUID
      // Don't pass id field, let Supabase generate it
      const { data: insertedData, error: insertError } = await supabase
        .from('workers')
        .insert([workerData])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error inserting worker in Supabase:', insertError);
        console.error('Error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        return false;
      }

      console.log('✅ Worker inserted in Supabase successfully:', insertedData);
      return true;
    }
  } catch (error) {
    console.error('❌ UNEXPECTED ERROR saving worker:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return false;
  }
}

/**
 * Delete a worker from Supabase
 */
export async function deleteWorkerFromSupabase(workerId: string): Promise<boolean> {
  try {
    // Check if workerId is a valid UUID
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workerId);

    if (!isValidUUID) {
      // If not a UUID, try to find worker by employee_id
      const { data: worker } = await supabase
        .from('workers')
        .select('id')
        .eq('employee_id', workerId)
        .maybeSingle();

      if (!worker) {
        console.error('❌ Worker not found:', workerId);
        return false;
      }

      workerId = worker.id; // Use the actual UUID
    }

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
    // Check if workerId is a valid UUID
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workerId);

    let query = supabase.from('workers').select('*');

    if (isValidUUID) {
      query = query.eq('id', workerId);
    } else {
      // If not a UUID, try to find by employee_id
      query = query.eq('employee_id', workerId);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching worker from Supabase:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      employeeId: data.employee_id,
      name: data.name,
      department: data.department || undefined,
      position: data.position || undefined,
      isPacker: data.is_packer,
      createdAt: data.created_at
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

    // First, get the actual UUID for the worker_id
    // workerId might be a string like "worker-123", so we need to find the real UUID
    let actualWorkerId = attendance.workerId;

    // If workerId is not a UUID, look it up by employee_id or name
    const isWorkerIdUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attendance.workerId);

    if (!isWorkerIdUUID) {
      // Try to find worker by employee_id (if workerId is actually employee_id)
      const { data: workerData } = await supabase
        .from('workers')
        .select('id')
        .eq('employee_id', attendance.workerId)
        .single();

      if (workerData) {
        actualWorkerId = workerData.id;
      } else {
        // If not found, try to find by name
        const { data: workerByName } = await supabase
          .from('workers')
          .select('id')
          .eq('name', attendance.workerName)
          .limit(1)
          .single();

        if (workerByName) {
          actualWorkerId = workerByName.id;
        } else {
          console.error('❌ Cannot find worker UUID for:', attendance.workerId);
          return false;
        }
      }
    }

    // Build attendance data - don't include id if it's not a valid UUID
    const isValidAttendanceUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attendance.id || '');

    const attendanceData: any = {
      worker_id: actualWorkerId, // Use the actual UUID
      worker_name: attendance.workerName,
      date: attendance.date,
      status: attendance.status,
      overtime: attendance.overtime || 'no',
      notes: attendance.notes || null,
    };

    // Only include ID if it's a valid UUID
    if (isValidAttendanceUUID) {
      attendanceData.id = attendance.id;
    }
    // Otherwise, let database generate UUID

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

      // Check if attendance record exists for this worker and date (use actual UUID)
      const { data: existingRecord } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('worker_id', actualWorkerId)
        .eq('date', attendance.date)
        .single();

      if (existingRecord) {
        // Update existing record - don't include id in update
        const updateData = { ...attendanceData };
        delete updateData.id; // Remove id from update

        const { error: updateError } = await supabase
          .from('attendance_records')
          .update(updateData)
          .eq('worker_id', actualWorkerId)
          .eq('date', attendance.date);

        if (updateError) {
          console.error('❌ Error updating attendance in Supabase:', updateError);
          return false;
        }
        console.log('✅ Attendance updated in Supabase successfully');
        return true;
      } else {
        // Insert new record - don't include id, let DB generate UUID
        const insertData = { ...attendanceData };
        delete insertData.id; // Remove id from insert

        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert([insertData]);

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
    console.log('🔄 Toggling overtime for worker:', workerId, 'date:', date);

    // First, resolve the actual worker UUID if workerId is not a UUID
    let actualWorkerId = workerId;
    const isWorkerIdUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workerId);

    if (!isWorkerIdUUID) {
      // Try to find worker by employee_id
      const { data: workerData } = await supabase
        .from('workers')
        .select('id')
        .eq('employee_id', workerId)
        .maybeSingle();

      if (workerData) {
        actualWorkerId = workerData.id;
      } else {
        console.error('❌ Cannot find worker UUID for:', workerId);
        return false;
      }
    }

    // Get existing record using actual UUID
    const { data: existingRecord, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('worker_id', actualWorkerId)
      .eq('date', date)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching attendance record:', fetchError);
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
        console.error('❌ Error toggling overtime:', error);
        return false;
      }
      console.log('✅ Overtime toggled successfully:', newOvertimeStatus);
      return true;
    } else {
      // Create new record with overtime
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('name')
        .eq('id', actualWorkerId)
        .maybeSingle();

      if (workerError || !worker) {
        console.error('❌ Error fetching worker for overtime record:', workerError);
        return false;
      }

      const { error } = await supabase
        .from('attendance_records')
        .insert([{
          worker_id: actualWorkerId,
          worker_name: worker.name,
          date: date,
          status: 'present',
          overtime: 'yes'
        }]);

      if (error) {
        console.error('❌ Error creating overtime record:', error);
        return false;
      }
      console.log('✅ Overtime record created successfully');
      return true;
    }
  } catch (error) {
    console.error('❌ UNEXPECTED ERROR in toggleOvertimeInSupabase:', error);
    return false;
  }
}

/**
 * Check if worker has overtime for a specific date
 */
export async function hasOvertimeForDateInSupabase(workerId: string, date: string): Promise<boolean> {
  try {
    // First, resolve the actual worker UUID if workerId is not a UUID
    let actualWorkerId = workerId;
    const isWorkerIdUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workerId);
    
    if (!isWorkerIdUUID) {
      // Try to find worker by employee_id
      const { data: workerData } = await supabase
        .from('workers')
        .select('id')
        .eq('employee_id', workerId)
        .maybeSingle();
      
      if (workerData) {
        actualWorkerId = workerData.id;
      } else {
        // If not found, try to find by matching the workerId as-is (might be stored differently)
        console.warn('⚠️ Cannot find worker UUID for overtime check:', workerId);
        return false;
      }
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .select('overtime')
      .eq('worker_id', actualWorkerId)
      .eq('date', date)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking overtime:', error);
      return false;
    }

    return data?.overtime === 'yes';
  } catch (error) {
    console.error('Error in hasOvertimeForDateInSupabase:', error);
    return false;
  }
}