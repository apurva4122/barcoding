import { supabase } from './supabase-client';
import { Worker, AttendanceRecord, AttendanceStatus } from '@/types';

// Settings Management Functions

const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000';
const SETTINGS_TABLE = 'app_070c516bb6_settings';

/**
 * Get default overtime setting for a specific worker from Supabase
 */
export async function getWorkerDefaultOvertimeSetting(workerId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('value')
      .eq('user_id', FIXED_USER_ID)
      .eq('key', `worker_${workerId}_default_overtime`)
      .single();

    if (error) {
      // If setting doesn't exist, return false (default)
      if (error.code === 'PGRST116') {
        return false;
      }
      console.error('Error fetching worker default overtime setting:', error);
      return false;
    }

    return data?.value === true || data?.value === 'true';
  } catch (error) {
    console.error('Error in getWorkerDefaultOvertimeSetting:', error);
    return false;
  }
}

/**
 * Save default overtime setting for a specific worker to Supabase
 */
export async function saveWorkerDefaultOvertimeSetting(workerId: string, value: boolean): Promise<boolean> {
  try {
    const settingKey = `worker_${workerId}_default_overtime`;

    // Try to update existing setting
    const { error: updateError } = await supabase
      .from(SETTINGS_TABLE)
      .update({ value: value })
      .eq('user_id', FIXED_USER_ID)
      .eq('key', settingKey);

    // If update failed (no existing record), insert new one
    if (updateError) {
      const { error: insertError } = await supabase
        .from(SETTINGS_TABLE)
        .insert({
          user_id: FIXED_USER_ID,
          key: settingKey,
          value: value
        });

      if (insertError) {
        console.error('Error saving worker default overtime setting:', insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in saveWorkerDefaultOvertimeSetting:', error);
    return false;
  }
}

/**
 * Get all worker default overtime settings
 */
export async function getAllWorkerDefaultOvertimeSettings(): Promise<Record<string, boolean>> {
  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('key, value')
      .eq('user_id', FIXED_USER_ID)
      .like('key', 'worker_%_default_overtime');

    if (error) {
      console.error('Error fetching worker default overtime settings:', error);
      return {};
    }

    const settings: Record<string, boolean> = {};
    data?.forEach((item: any) => {
      // Extract worker ID from key (format: worker_{workerId}_default_overtime)
      const match = item.key.match(/^worker_(.+)_default_overtime$/);
      if (match) {
        const workerId = match[1];
        settings[workerId] = item.value === true || item.value === 'true';
      }
    });

    return settings;
  } catch (error) {
    console.error('Error in getAllWorkerDefaultOvertimeSettings:', error);
    return {};
  }
}

// Worker Management Functions

/**
 * Get all workers from Supabase
 */
export async function getAllWorkersFromSupabase(includeInactive: boolean = true): Promise<Worker[]> {
  try {
    let query = supabase
      .from('workers')
      .select('*');

    // If includeInactive is false, filter to only active workers
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

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
      isCleaner: worker.is_cleaner || false,
      gender: worker.gender || 'male', // Default to male for backward compatibility
      baseSalary: worker.base_salary || undefined,
      advanceCurrentMonth: worker.advance_current_month || undefined,
      advanceLastMonth: worker.advance_last_month || undefined,
      advanceDeduction: worker.advance_deduction || undefined,
      isActive: worker.is_active !== undefined ? worker.is_active : true, // Default to true for backward compatibility
      createdAt: worker.created_at
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
      is_cleaner: worker.isCleaner || false,
      gender: worker.gender || 'male',
      base_salary: worker.baseSalary || null,
      advance_current_month: worker.advanceCurrentMonth || null,
      advance_last_month: worker.advanceLastMonth || null,
      advance_deduction: worker.advanceDeduction || null,
      is_active: worker.isActive !== undefined ? worker.isActive : true,
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
      isCleaner: data.is_cleaner || false,
      gender: data.gender || 'male',
      baseSalary: data.base_salary || undefined,
      advanceCurrentMonth: data.advance_current_month || undefined,
      advanceLastMonth: data.advance_last_month || undefined,
      advanceDeduction: data.advance_deduction || undefined,
      isActive: data.is_active !== undefined ? data.is_active : true,
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
      overtime: attendance.overtime || 'yes', // Default to 'yes' (overtime on by default)
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
      isCleaner: worker.is_cleaner || false,
      gender: worker.gender || 'male',
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

    // Get existing record for the selected date
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

    // Determine new overtime status
    // Default is 'yes', so if no record exists or current is 'yes', toggle to 'no'
    // If current is 'no', toggle to 'yes'
    const currentOvertime = existingRecord?.overtime || 'yes'; // Default to 'yes'
    const newOvertimeStatus = currentOvertime === 'yes' ? 'no' : 'yes';

    // Get worker name for creating new records
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('name')
      .eq('id', actualWorkerId)
      .maybeSingle();

    if (workerError || !worker) {
      console.error('❌ Error fetching worker:', workerError);
      return false;
    }

    // Update or create record for the selected date
    if (existingRecord) {
      const { error } = await supabase
        .from('attendance_records')
        .update({ overtime: newOvertimeStatus })
        .eq('id', existingRecord.id);

      if (error) {
        console.error('❌ Error updating overtime:', error);
        return false;
      }
    } else {
      // Create new record with the new overtime status
      const { error } = await supabase
        .from('attendance_records')
        .insert([{
          worker_id: actualWorkerId,
          worker_name: worker.name,
          date: date,
          status: 'present', // Default to present when creating overtime record
          overtime: newOvertimeStatus
        }]);

      if (error) {
        console.error('❌ Error creating overtime record:', error);
        return false;
      }
    }

    // Now update all future dates with the same overtime status
    // Get all future attendance records for this worker
    const { data: futureRecords, error: futureError } = await supabase
      .from('attendance_records')
      .select('id, date')
      .eq('worker_id', actualWorkerId)
      .gte('date', date)
      .neq('date', date); // Exclude the current date (already updated)

    if (futureError && futureError.code !== 'PGRST116') {
      console.warn('⚠️ Error fetching future records (continuing anyway):', futureError);
    }

    if (futureRecords && futureRecords.length > 0) {
      // Update all future records to match the new overtime status
      const futureIds = futureRecords.map(r => r.id);

      // Update in batches if needed (Supabase has limits)
      for (const recordId of futureIds) {
        const { error: updateError } = await supabase
          .from('attendance_records')
          .update({ overtime: newOvertimeStatus })
          .eq('id', recordId);

        if (updateError) {
          console.warn('⚠️ Error updating future record:', updateError);
        }
      }

      console.log(`✅ Updated ${futureIds.length} future records with overtime status: ${newOvertimeStatus}`);
    }

    console.log('✅ Overtime toggled successfully:', newOvertimeStatus, 'for date and future dates');
    return true;
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
        // If not found, default to 'yes' (overtime on by default)
        console.warn('⚠️ Cannot find worker UUID for overtime check:', workerId, '- defaulting to yes');
        return true; // Default to 'yes'
      }
    }

    // Check for the most recent overtime record on or before this date
    // This handles forward-looking logic - if toggled off on a date, it stays off for future dates
    const { data, error } = await supabase
      .from('attendance_records')
      .select('overtime, date')
      .eq('worker_id', actualWorkerId)
      .lte('date', date) // Get records on or before this date
      .order('date', { ascending: false })
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking overtime:', error);
      return true; // Default to 'yes' on error
    }

    // If we have a record, use its overtime status
    // Otherwise default to 'yes' (overtime on by default)
    if (data && data.length > 0) {
      return data[0].overtime === 'yes';
    }

    // Default to 'yes' if no record exists
    return true;
  } catch (error) {
    console.error('Error in hasOvertimeForDateInSupabase:', error);
    return true; // Default to 'yes' on error
  }
}