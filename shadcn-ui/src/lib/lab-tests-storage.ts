import { supabase } from './supabase'
import type { LabTestRecord, LabTestType, LabTestCategory } from '@/types'

const LAB_TESTS_TABLE = 'app_f79f105891_lab_tests'

export interface SupabaseLabTestRecord {
  id: string
  user_id: string
  test_type: string
  category: string
  product_name: string
  month: string // YYYY-MM format
  file_url: string
  notes?: string
  created_at: string
}

// Convert Supabase lab test record row to LabTestRecord type
function convertToLabTestRecord(row: SupabaseLabTestRecord): LabTestRecord {
  return {
    id: row.id,
    testType: row.test_type as LabTestType,
    category: row.category as LabTestCategory,
    productName: row.product_name,
    month: row.month,
    fileUrl: row.file_url,
    notes: row.notes,
    createdAt: row.created_at
  }
}

// Convert LabTestRecord to Supabase row
function convertToSupabaseLabTestRow(record: Omit<LabTestRecord, 'id' | 'createdAt'>): Omit<SupabaseLabTestRecord, 'id' | 'user_id' | 'created_at'> {
  return {
    test_type: record.testType,
    category: record.category,
    product_name: record.productName,
    month: record.month,
    file_url: record.fileUrl,
    notes: record.notes
  }
}

/**
 * Get all lab test records from Supabase
 */
export async function getAllLabTestRecords(): Promise<LabTestRecord[]> {
  try {
    const { data, error } = await supabase
      .from(LAB_TESTS_TABLE)
      .select('*')
      .order('month', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching lab test records:', error)
      return []
    }

    return (data || []).map(convertToLabTestRecord)
  } catch (error) {
    console.error('Error in getAllLabTestRecords:', error)
    return []
  }
}

/**
 * Get lab test records for a specific month
 */
export async function getLabTestRecordsByMonth(month: string): Promise<LabTestRecord[]> {
  try {
    const { data, error } = await supabase
      .from(LAB_TESTS_TABLE)
      .select('*')
      .eq('month', month)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching lab test records by month:', error)
      return []
    }

    return (data || []).map(convertToLabTestRecord)
  } catch (error) {
    console.error('Error in getLabTestRecordsByMonth:', error)
    return []
  }
}

/**
 * Save a lab test record to Supabase
 */
export async function saveLabTestRecord(record: Omit<LabTestRecord, 'id' | 'createdAt'>): Promise<LabTestRecord | null> {
  try {
    const row = convertToSupabaseLabTestRow(record)
    
    const { data, error } = await supabase
      .from(LAB_TESTS_TABLE)
      .insert(row)
      .select()
      .single()

    if (error) {
      console.error('Error saving lab test record:', error)
      return null
    }

    return convertToLabTestRecord(data)
  } catch (error) {
    console.error('Error in saveLabTestRecord:', error)
    return null
  }
}

/**
 * Upload lab test file to Supabase Storage
 */
export async function uploadLabTestFile(file: File, testType: string, category: string, month: string): Promise<string | null> {
  try {
    const fileName = `${testType}_${category}_${month}_${Date.now()}.${file.name.split('.').pop()}`
    const filePath = `lab-tests/${fileName}`

    const { data, error } = await supabase.storage
      .from('lab-tests')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading file:', error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('lab-tests')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error in uploadLabTestFile:', error)
    return null
  }
}

/**
 * Delete a lab test record
 */
export async function deleteLabTestRecord(recordId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(LAB_TESTS_TABLE)
      .delete()
      .eq('id', recordId)

    if (error) {
      console.error('Error deleting lab test record:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteLabTestRecord:', error)
    return false
  }
}

