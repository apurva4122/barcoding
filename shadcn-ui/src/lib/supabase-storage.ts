import { supabase, type SupabaseQRCode } from './supabase'
import type { Barcode, PackingStatus } from '@/types'

const TABLE_NAME = 'app_070c516bb6_qr_codes'

export interface SupabaseBarcode {
  id: string
  user_id: string
  code: string
  description: string
  weight?: string
  packer_name?: string
  status: string
  qr_code_image?: string
  shipping_location?: string
  assigned_worker?: string // Store worker assignment directly
  packed_at?: string
  shipped_at?: string
  created_at: string
  updated_at: string
}

// Convert Supabase row to Barcode type
function convertToBarcode(row: SupabaseBarcode): Barcode {
  return {
    id: row.id || '',
    code: row.code,
    description: row.description || '',
    createdAt: row.created_at || new Date().toISOString(),
    weight: row.weight,
    packerName: row.packer_name,
    status: (row.status as PackingStatus) || 'pending',
    qrCodeImage: row.qr_code_image,
    shippingLocation: row.shipping_location || '',
    assignedWorker: row.assigned_worker, // Include assigned worker
    packedAt: row.packed_at,
    shippedAt: row.shipped_at,
    updatedAt: row.updated_at
  }
}

// Convert Barcode to Supabase row
function convertToSupabaseRow(barcode: Barcode): Omit<SupabaseBarcode, 'id' | 'created_at' | 'updated_at'> {
  return {
    code: barcode.code,
    description: barcode.description || '',
    packer_name: barcode.packerName || barcode.packer || '',
    weight: barcode.weight || '',
    status: barcode.status || 'pending',
    qr_code_image: barcode.qrCodeImage || '',
    shipping_location: barcode.shippingLocation || '',
    assigned_worker: barcode.assignedWorker
  }
}

// Helper function to get date 10 days ago
function getTenDaysAgo(): string {
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  return tenDaysAgo.toISOString();
}

export async function saveQRCodeToSupabase(barcode: Barcode): Promise<boolean> {
  try {
    const rowData = convertToSupabaseRow(barcode);

    // Try upsert instead of insert to handle potential conflicts
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .upsert([rowData], {
        onConflict: 'code',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      // Check if it's a CORS or network error
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS')) {
        console.warn('⚠️ CORS/Network error saving QR code to Supabase, will save to localStorage only');
        return false;
      }
      console.error('❌ SUPABASE INSERT FAILED:', JSON.stringify(error, null, 2));
      return false;
    }

    return true;
  } catch (error: any) {
    // Catch CORS and network errors
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('CORS') || error?.name === 'TypeError') {
      console.warn('⚠️ CORS/Network error saving QR code to Supabase, will save to localStorage only');
      return false;
    }
    console.error('❌ UNEXPECTED ERROR:', error);
    return false;
  }
}

export async function getAllQRCodesFromSupabase(): Promise<Barcode[]> {
  try {
    const tenDaysAgo = getTenDaysAgo();
    console.log('Fetching QR codes from last 10 days since:', tenDaysAgo);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .gte('created_at', tenDaysAgo) // Only get records from last 10 days
      .order('created_at', { ascending: false })

    if (error) {
      // Check if it's a CORS or network error
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS')) {
        console.warn('⚠️ CORS/Network error accessing Supabase QR codes table, will fallback to localStorage');
        return []
      }
      console.error('Supabase select error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return []
    }

    console.log(`Retrieved ${data?.length || 0} QR codes from last 10 days`);

    return data ? data.map(convertToBarcode) : []
  } catch (error: any) {
    // Catch CORS and network errors
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('CORS') || error?.name === 'TypeError') {
      console.warn('⚠️ CORS/Network error accessing Supabase QR codes table, will fallback to localStorage');
      return []
    }
    console.error('Unexpected error fetching QR codes from Supabase:', error)
    return []
  }
}

export async function findQRCodeByCodeInSupabase(code: string): Promise<Barcode | null> {
  try {
    const tenDaysAgo = getTenDaysAgo();

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('code', code)
      .gte('created_at', tenDaysAgo) // Only search in last 10 days
      .single()

    if (error) {
      // Check if it's a CORS or network error
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS')) {
        console.warn('⚠️ CORS/Network error accessing Supabase QR codes table');
        return null
      }

      if (error.code === 'PGRST116') {
        // No rows found - try without date filter for backward compatibility
        console.log('QR code not found in last 10 days, searching all records...');
        const { data: allData, error: allError } = await supabase
          .from(TABLE_NAME)
          .select('*')
          .eq('code', code)
          .single()

        if (allError) {
          if (allError.code === 'PGRST116') {
            return null
          }
          // Check for CORS errors
          if (allError.message?.includes('Failed to fetch') || allError.message?.includes('CORS')) {
            console.warn('⚠️ CORS/Network error accessing Supabase QR codes table');
            return null
          }
          console.log('Error finding QR code in all records:', allError)
          return null
        }

        return allData ? convertToBarcode(allData) : null
      }
      console.log('Error finding QR code in Supabase:', error)
      return null
    }


    return data ? convertToBarcode(data) : null


  } catch (error: any) {
    // Catch CORS and network errors
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('CORS') || error?.name === 'TypeError') {
      console.warn('⚠️ CORS/Network error finding QR code in Supabase');
      return null
    }
    console.error('Error finding QR code in Supabase:', error)
    return null
  }
}

export async function updateQRCodeStatusInSupabase(
  code: string,
  status: PackingStatus,
  updateData?: { weight?: string; packerName?: string; shippingLocation?: string }
): Promise<Barcode | null> {
  try {
    // Check if the record exists first (with date filter for performance)
    const tenDaysAgo = getTenDaysAgo();
    let existingData;
    let checkError;

    // First try with date filter
    const { data: recentData, error: recentError } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('code', code)
      .gte('created_at', tenDaysAgo)
      .single();

    if (recentError) {
      // Check for CORS errors first
      if (recentError.message?.includes('Failed to fetch') || recentError.message?.includes('CORS')) {
        console.warn('⚠️ CORS/Network error accessing Supabase QR codes table');
        return null
      }

      if (recentError.code === 'PGRST116') {
        // Not found in recent records, try all records
        const { data: allData, error: allError } = await supabase
          .from(TABLE_NAME)
          .select('*')
          .eq('code', code)
          .single();

        if (allError) {
          // Check for CORS errors
          if (allError.message?.includes('Failed to fetch') || allError.message?.includes('CORS')) {
            console.warn('⚠️ CORS/Network error accessing Supabase QR codes table');
            return null
          }
        }

        existingData = allData;
        checkError = allError;
      } else {
        existingData = recentData;
        checkError = recentError;
      }
    } else {
      existingData = recentData;
      checkError = recentError;
    }


    if (checkError) {
      console.error('Record not found, attempting to create it first');

      // Create a new record with minimal data if it doesn't exist
      const newRecord = {
        code: code,
        status: status,
        description: 'Auto-created record',
        updated_at: new Date().toISOString(),
        ...(updateData?.weight && { weight: updateData.weight }),
        ...(updateData?.packerName && { packer_name: updateData.packerName }),
        // Always include shippingLocation if provided (even if empty string, to clear it)
        ...(updateData?.shippingLocation !== undefined && { shipping_location: updateData.shippingLocation }),
        // Set shipped_at when status is DISPATCHED
        ...(status === PackingStatus.DISPATCHED && { shipped_at: new Date().toISOString() })
      };

      console.log('[updateQRCodeStatusInSupabase] Creating new record with shipping location:', newRecord.shipping_location);

      const { data: insertData, error: insertError } = await supabase
        .from(TABLE_NAME)
        .insert([newRecord])
        .select()
        .single();

      if (insertError) {
        console.error('❌ ERROR CREATING QR CODE:', insertError);
        console.error('Error details:', JSON.stringify(insertError, null, 2));
        return null;
      }


      return insertData ? convertToBarcode(insertData) : null;
    }

    // If record exists, update it
    const updatePayload: Partial<SupabaseBarcode> = {
      status,
      updated_at: new Date().toISOString(),
      ...(updateData?.weight && { weight: updateData.weight }),
      ...(updateData?.packerName && { packer_name: updateData.packerName }),
      // Always include shippingLocation if provided (even if empty string, to clear it)
      ...(updateData?.shippingLocation !== undefined && { shipping_location: updateData.shippingLocation }),
      // Set shipped_at when status is DISPATCHED
      ...(status === PackingStatus.DISPATCHED && { shipped_at: new Date().toISOString() })
    };

    console.log('[updateQRCodeStatusInSupabase] Update payload:', JSON.stringify(updatePayload, null, 2));
    console.log('[updateQRCodeStatusInSupabase] Shipping location in payload:', updatePayload.shipping_location);



    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updatePayload)
      .eq('code', code)
      .select()
      .single();

    if (error) {
      console.error('❌ ERROR UPDATING QR CODE:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return null;
    }

    console.log('[updateQRCodeStatusInSupabase] Updated data from Supabase:', data);
    console.log('[updateQRCodeStatusInSupabase] Shipping location in returned data:', data?.shipping_location);

    const convertedBarcode = data ? convertToBarcode(data) : null;
    console.log('[updateQRCodeStatusInSupabase] Converted barcode:', convertedBarcode);
    console.log('[updateQRCodeStatusInSupabase] Shipping location in converted barcode:', convertedBarcode?.shippingLocation);

    return convertedBarcode;
  } catch (error) {
    console.error('❌ UNEXPECTED ERROR:', error);
    return null;
  }
}

export async function deleteQRCodeFromSupabase(code: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('code', code)

    if (error) {
      // Check for CORS errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS')) {
        console.warn('⚠️ CORS/Network error deleting QR code from Supabase');
        return false
      }
      console.error('Error deleting QR code from Supabase:', error)
      return false
    }

    return true
  } catch (error: any) {
    // Catch CORS and network errors
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('CORS') || error?.name === 'TypeError') {
      console.warn('⚠️ CORS/Network error deleting QR code from Supabase');
      return false
    }
    console.error('Error deleting QR code from Supabase:', error)
    return false
  }
}

// New function to get QR codes by date range for better performance
export async function getQRCodesByDateRange(
  startDate: string,
  endDate?: string
): Promise<Barcode[]> {
  try {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      // Check for CORS errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS')) {
        console.warn('⚠️ CORS/Network error accessing Supabase QR codes table, will fallback to localStorage');
        return [];
      }
      console.error('Supabase date range query error:', error);
      return [];
    }

    console.log(`Retrieved ${data?.length || 0} QR codes for date range: ${startDate} to ${endDate || 'now'}`);

    return data ? data.map(convertToBarcode) : [];
  } catch (error: any) {
    // Catch CORS and network errors
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('CORS') || error?.name === 'TypeError') {
      console.warn('⚠️ CORS/Network error fetching QR codes by date range, will fallback to localStorage');
      return [];
    }
    console.error('Unexpected error fetching QR codes by date range:', error);
    return [];
  }
}