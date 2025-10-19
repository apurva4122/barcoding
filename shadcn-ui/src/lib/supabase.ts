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
export const getWorkers = async (): Promise<Worker[]> => {
  // Use a fixed user_id since we're not using Supabase auth
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  const { data, error } = await supabase
    .from('app_070c516bb6_workers')
    .select('*')
    .eq('user_id', FIXED_USER_ID)
    .order('name')

  if (error) throw error
  return data || []
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

  // Delete existing assignments for these barcodes
  const barcodeCodes = assignments.map(a => a.barcode_code)
  await supabase
    .from('app_070c516bb6_barcode_assignments')
    .delete()
    .in('barcode_code', barcodeCodes)
    .eq('user_id', FIXED_USER_ID)

  // Insert new assignments
  const assignmentsToInsert = assignments.map(assignment => ({
    user_id: FIXED_USER_ID,
    barcode_code: assignment.barcode_code,
    worker_name: assignment.worker_name
  }))

  const { error } = await supabase
    .from('app_070c516bb6_barcode_assignments')
    .insert(assignmentsToInsert)

  if (error) throw error
}

export const getBarcodeAssignments = async (): Promise<BarcodeAssignment[]> => {
  // Use a fixed user_id since we're not using Supabase auth
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  const { data, error } = await supabase
    .from('app_070c516bb6_barcode_assignments')
    .select('*')
    .eq('user_id', FIXED_USER_ID)

  if (error) throw error
  return data || []
}

export const getWorkerForBarcode = async (barcodeCode: string): Promise<string | null> => {
  // Use a fixed user_id since we're not using Supabase auth
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  const { data, error } = await supabase
    .from('app_070c516bb6_barcode_assignments')
    .select('worker_name')
    .eq('barcode_code', barcodeCode)
    .eq('user_id', FIXED_USER_ID)
    .single()

  if (error) return null
  return data?.worker_name || null
}