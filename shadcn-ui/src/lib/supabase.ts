import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://orsdqaeqqobltrmpvtmj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yc2RxYWVxcW9ibHRybXB2dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDc5MDQsImV4cCI6MjA2OTg4MzkwNH0.QhL8nm2-swoGTImb0Id-0WNjQOO9PC6O8wRo5ctpQ-Q'

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Worker {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface BarcodeAssignment {
  id: string
  user_id: string
  barcode_code: string
  worker_name: string
  assigned_at: string
}

// Worker management functions
// NOTE: This file uses old table names for barcode assignments compatibility
// For worker management, use getAllWorkers() from attendance-utils instead
export const getWorkers = async (): Promise<Worker[]> => {
  // Use a fixed user_id since we're not using Supabase auth
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  try {
    const { data, error } = await supabase
      .from('app_070c516bb6_workers')
      .select('*')
      .eq('user_id', FIXED_USER_ID)
      .order('name')

    if (error) {
      // If table doesn't exist or CORS error, return empty array
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS') || error.code === '42P01') {
        console.warn('⚠️ Old workers table not accessible, returning empty array');
        return []
      }
      throw error
    }
    return data || []
  } catch (error: any) {
    // Catch CORS and network errors
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('CORS') || error?.name === 'TypeError') {
      console.warn('⚠️ CORS/Network error accessing old workers table, returning empty array');
      return []
    }
    throw error
  }
}

export const addWorker = async (name: string): Promise<Worker> => {
  // Use a fixed user_id since we're not using Supabase auth
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  const { data, error } = await supabase
    .from('app_070c516bb6_workers')
    .insert({
      user_id: FIXED_USER_ID,
      name: name.trim()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteWorker = async (workerId: string): Promise<void> => {
  // Use a fixed user_id since we're not using Supabase auth
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  const { error } = await supabase
    .from('app_070c516bb6_workers')
    .delete()
    .eq('id', workerId)
    .eq('user_id', FIXED_USER_ID)

  if (error) throw error
}

// Barcode assignment functions
export const saveBarcodeAssignments = async (assignments: { barcode_code: string, worker_name: string }[]): Promise<void> => {
  // Use a fixed user_id since we're not using Supabase auth
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  console.log('[saveBarcodeAssignments] Called with', assignments.length, 'assignments');
  console.log('[saveBarcodeAssignments] Input assignments:', JSON.stringify(assignments, null, 2));

  if (assignments.length === 0) {
    console.warn('[saveBarcodeAssignments] No assignments provided, returning early');
    return;
  }

  // Validate assignments have required fields
  const invalidAssignments = assignments.filter(a => !a.barcode_code || !a.worker_name);
  if (invalidAssignments.length > 0) {
    console.error('[saveBarcodeAssignments] Invalid assignments found:', invalidAssignments);
    throw new Error(`Invalid assignments: ${invalidAssignments.length} assignments missing barcode_code or worker_name`);
  }

  // Delete existing assignments for these barcodes
  const barcodeCodes = assignments.map(a => a.barcode_code)
  console.log('[saveBarcodeAssignments] Deleting existing assignments for codes:', barcodeCodes);
  
  const { error: deleteError } = await supabase
    .from('app_070c516bb6_barcode_assignments')
    .delete()
    .in('barcode_code', barcodeCodes)
    .eq('user_id', FIXED_USER_ID)

  if (deleteError) {
    console.warn('[saveBarcodeAssignments] Delete error (may be expected):', deleteError);
  }

  // Insert new assignments
  const assignmentsToInsert = assignments.map(assignment => ({
    user_id: FIXED_USER_ID,
    barcode_code: assignment.barcode_code.trim(),
    worker_name: assignment.worker_name.trim()
  }))

  console.log('[saveBarcodeAssignments] Inserting to table app_070c516bb6_barcode_assignments:');
  console.log('[saveBarcodeAssignments] Data to insert:', JSON.stringify(assignmentsToInsert, null, 2));
  console.log('[saveBarcodeAssignments] Sample record:', assignmentsToInsert[0]);

  const { data, error } = await supabase
    .from('app_070c516bb6_barcode_assignments')
    .insert(assignmentsToInsert)
    .select()

  if (error) {
    console.error('[saveBarcodeAssignments] INSERT ERROR:', error);
    console.error('[saveBarcodeAssignments] Error code:', error.code);
    console.error('[saveBarcodeAssignments] Error message:', error.message);
    console.error('[saveBarcodeAssignments] Error details:', error.details);
    console.error('[saveBarcodeAssignments] Error hint:', error.hint);
    throw error;
  }

  console.log('[saveBarcodeAssignments] Success! Inserted', data?.length || 0, 'records');
  console.log('[saveBarcodeAssignments] Returned data:', data);
}

export const getBarcodeAssignments = async (): Promise<BarcodeAssignment[]> => {
  // Use a fixed user_id since we're not using Supabase auth
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  try {
    const { data, error } = await supabase
      .from('app_070c516bb6_barcode_assignments')
      .select('*')
      .eq('user_id', FIXED_USER_ID)

    if (error) {
      // If table doesn't exist or CORS error, return empty array
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS') || error.code === '42P01') {
        console.warn('⚠️ Barcode assignments table not accessible, returning empty array');
        return []
      }
      throw error
    }
    return data || []
  } catch (error: any) {
    // Catch CORS and network errors
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('CORS') || error?.name === 'TypeError') {
      console.warn('⚠️ CORS/Network error accessing barcode assignments table, returning empty array');
      return []
    }
    throw error
  }
}

export const getWorkerForBarcode = async (barcodeCode: string): Promise<string | null> => {
  // Use a fixed user_id since we're not using Supabase auth
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  try {
    const { data, error } = await supabase
      .from('app_070c516bb6_barcode_assignments')
      .select('worker_name')
      .eq('barcode_code', barcodeCode)
      .eq('user_id', FIXED_USER_ID)
      .single()

    if (error) {
      // PGRST116 = no rows returned, which is normal if barcode has no assignment
      if (error.code === 'PGRST116') {
        return null
      }
      return null
    }
    return data?.worker_name || null
  } catch (error: any) {
    return null
  }
}