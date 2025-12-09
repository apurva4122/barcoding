import { supabase } from './supabase'
import type { HygieneRecord, HygieneArea } from '@/types'

const HYGIENE_TABLE = 'app_f79f105891_hygiene_records'

export interface SupabaseHygieneRecord {
    id: string
    user_id: string
    worker_id: string
    worker_name: string
    date: string
    area: string
    photo_url: string
    notes?: string
    created_at: string
}

// Convert Supabase hygiene record row to HygieneRecord type
function convertToHygieneRecord(row: SupabaseHygieneRecord): HygieneRecord {
    return {
        id: row.id,
        workerId: row.worker_id,
        workerName: row.worker_name,
        date: row.date,
        area: row.area as HygieneArea,
        photoUrl: row.photo_url,
        notes: row.notes,
        createdAt: row.created_at
    }
}

// Convert HygieneRecord to Supabase row
function convertToSupabaseHygieneRow(record: Omit<HygieneRecord, 'id' | 'createdAt'>): Omit<SupabaseHygieneRecord, 'id' | 'user_id' | 'created_at'> {
    return {
        worker_id: record.workerId,
        worker_name: record.workerName,
        date: record.date,
        area: record.area,
        photo_url: record.photoUrl,
        notes: record.notes
    }
}

/**
 * Get all hygiene records from Supabase
 */
export async function getAllHygieneRecords(): Promise<HygieneRecord[]> {
    try {
        const { data, error } = await supabase
            .from(HYGIENE_TABLE)
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching hygiene records:', error)
            return []
        }

        return (data || []).map(convertToHygieneRecord)
    } catch (error) {
        console.error('Error in getAllHygieneRecords:', error)
        return []
    }
}

/**
 * Get hygiene records for a specific date
 */
export async function getHygieneRecordsByDate(date: string): Promise<HygieneRecord[]> {
    try {
        const { data, error } = await supabase
            .from(HYGIENE_TABLE)
            .select('*')
            .eq('date', date)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching hygiene records by date:', error)
            return []
        }

        return (data || []).map(convertToHygieneRecord)
    } catch (error) {
        console.error('Error in getHygieneRecordsByDate:', error)
        return []
    }
}

/**
 * Get hygiene records for a specific worker
 */
export async function getHygieneRecordsByWorker(workerId: string): Promise<HygieneRecord[]> {
    try {
        const { data, error } = await supabase
            .from(HYGIENE_TABLE)
            .select('*')
            .eq('worker_id', workerId)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching hygiene records by worker:', error)
            return []
        }

        return (data || []).map(convertToHygieneRecord)
    } catch (error) {
        console.error('Error in getHygieneRecordsByWorker:', error)
        return []
    }
}

/**
 * Save a hygiene record to Supabase
 */
export async function saveHygieneRecord(record: Omit<HygieneRecord, 'id' | 'createdAt'>): Promise<HygieneRecord | null> {
    try {
        const row = convertToSupabaseHygieneRow(record)

        const { data, error } = await supabase
            .from(HYGIENE_TABLE)
            .insert(row)
            .select()
            .single()

        if (error) {
            console.error('Error saving hygiene record:', error)
            return null
        }

        return convertToHygieneRecord(data)
    } catch (error) {
        console.error('Error in saveHygieneRecord:', error)
        return null
    }
}

/**
 * Upload photo to Supabase Storage
 */
export async function uploadHygienePhoto(file: File, workerId: string, area: string, date: string): Promise<string | null> {
    try {
        const fileName = `${workerId}_${area}_${date}_${Date.now()}.${file.name.split('.').pop()}`
        const filePath = `hygiene/${fileName}`

        const { data, error } = await supabase.storage
            .from('hygiene-photos')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (error) {
            console.error('Error uploading photo:', error)
            return null
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('hygiene-photos')
            .getPublicUrl(filePath)

        return urlData.publicUrl
    } catch (error) {
        console.error('Error in uploadHygienePhoto:', error)
        return null
    }
}

