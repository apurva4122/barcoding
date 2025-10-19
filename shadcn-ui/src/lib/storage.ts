import { Barcode, PackingStatus } from "@/types";
import { 
  saveQRCodeToSupabase, 
  getAllQRCodesFromSupabase, 
  findQRCodeByCodeInSupabase, 
  updateQRCodeStatusInSupabase,
  deleteQRCodeFromSupabase,
  getQRCodesByDateRange
} from './supabase-storage';

const STORAGE_KEY = "package-qr-codes";

/**
 * Retrieve all barcodes from Supabase (last 10 days) and fallback to local storage
 */
export async function getAllBarcodes(): Promise<Barcode[]> {
  try {
    // Try to get from Supabase first (now limited to last 10 days)
    const supabaseBarcodes = await getAllQRCodesFromSupabase();
    if (supabaseBarcodes.length > 0) {
      console.log(`Retrieved ${supabaseBarcodes.length} barcodes from Supabase (last 10 days)`);
      return supabaseBarcodes;
    }

    // Fallback to local storage
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) {
      return [];
    }
    const localBarcodes = JSON.parse(storedData);
    console.log(`Retrieved ${localBarcodes.length} barcodes from local storage`);
    return localBarcodes;
  } catch (error) {
    console.error("Error retrieving barcodes:", error);
    // Fallback to local storage
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      const localBarcodes = storedData ? JSON.parse(storedData) : [];
      console.log(`Fallback: Retrieved ${localBarcodes.length} barcodes from local storage`);
      return localBarcodes;
    } catch (localError) {
      console.error("Error retrieving barcodes from local storage:", localError);
      return [];
    }
  }
}

/**
 * Get barcodes by date range for better performance
 */
export async function getBarcodesByDateRange(
  startDate: string, 
  endDate?: string
): Promise<Barcode[]> {
  try {
    return await getQRCodesByDateRange(startDate, endDate);
  } catch (error) {
    console.error("Error retrieving barcodes by date range:", error);
    return [];
  }
}

/**
 * Get recent barcodes (last N days)
 */
export async function getRecentBarcodes(days: number = 10): Promise<Barcode[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await getBarcodesByDateRange(startDate.toISOString());
}

/**
 * Save a new barcode to Supabase and local storage
 */
export async function saveBarcode(barcode: Barcode): Promise<Barcode> {
  try {
    // Try to save to Supabase first
    const supabaseSuccess = await saveQRCodeToSupabase(barcode);
    
    if (supabaseSuccess) {
      console.log('QR code saved to Supabase successfully');
      return barcode;
    } else {
      console.warn('Failed to save to Supabase, falling back to local storage');
    }
  } catch (error) {
    console.error('Error saving to Supabase, falling back to local storage:', error);
  }

  // Fallback to local storage
  const barcodes = await getAllBarcodes();
  
  // Check if barcode already exists
  const existingIndex = barcodes.findIndex(b => b.code === barcode.code);
  
  if (existingIndex >= 0) {
    // Update existing barcode
    barcodes[existingIndex] = barcode;
  } else {
    // Add new barcode
    barcodes.push(barcode);
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(barcodes));
    return barcode;
  } catch (error) {
    console.error("Error saving barcode to local storage:", error);
    throw new Error("Failed to save barcode");
  }
}

/**
 * Save multiple barcodes at once
 */
export async function saveBarcodes(newBarcodes: Barcode[]): Promise<Barcode[]> {
  // Try to save each barcode to Supabase first
  const savedBarcodes: Barcode[] = [];
  
  for (const barcode of newBarcodes) {
    try {
      const savedBarcode = await saveBarcode(barcode);
      savedBarcodes.push(savedBarcode);
    } catch (error) {
      console.error(`Error saving barcode ${barcode.code}:`, error);
    }
  }
  
  return savedBarcodes;
}

/**
 * Find a barcode by its code from Supabase or local storage
 */
export async function findBarcodeByCode(code: string): Promise<Barcode | null> {
  try {
    // Try Supabase first (now with optimized search)
    const supabaseBarcode = await findQRCodeByCodeInSupabase(code);
    if (supabaseBarcode) {

     console.log("Supabase:",supabaseBarcode);
      return supabaseBarcode;
    }
  } catch (error) {
    console.error('Error finding barcode in Supabase:', error);
  }

  // Fallback to local storage
  const barcodes = await getAllBarcodes();
  return barcodes.find(b => b.code === code) || null;
}

/**
 * Delete a barcode by its code
 */
export async function deleteBarcode(code: string): Promise<boolean> {
  try {
    // Try to delete from Supabase first
    const supabaseSuccess = await deleteQRCodeFromSupabase(code);
    if (supabaseSuccess) {
      return true;
    }
  } catch (error) {
    console.error('Error deleting barcode from Supabase:', error);
  }

  // Fallback to local storage
  const barcodes = await getAllBarcodes();
  const newBarcodes = barcodes.filter(b => b.code !== code);
  
  if (newBarcodes.length === barcodes.length) {
    return false; // No barcode was found to delete
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBarcodes));
    return true;
  } catch (error) {
    console.error("Error deleting barcode from local storage:", error);
    return false;
  }
}

/**
 * Delete multiple barcodes by their codes
 */
export async function deleteMultipleBarcodes(codes: string[]): Promise<boolean> {
  try {
    // Try to delete from Supabase first
    let allSucceeded = true;
    for (const code of codes) {
      const success = await deleteQRCodeFromSupabase(code);
      if (!success) {
        allSucceeded = false;
      }
    }
    if (allSucceeded) {
      return true;
    }
  } catch (error) {
    console.error('Error deleting multiple barcodes from Supabase:', error);
  }

  // Fallback to local storage
  const barcodes = await getAllBarcodes();
  const newBarcodes = barcodes.filter(b => !codes.includes(b.code));
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBarcodes));
    return true;
  } catch (error) {
    console.error("Error deleting multiple barcodes from local storage:", error);
    return false;
  }
}

/**
 * Update barcode status in Supabase and local storage
 */
export async function updateBarcodeStatus(
  code: string, 
  status: PackingStatus, 
  updateData?: { weight?: string; packerName?: string; shippingLocation?: string }
): Promise<Barcode | null> {
  console.log("Starting updateBarcodeStatus with code:", code, "status:", status);
  console.log("Update data received:", updateData);
  
  if (!code) {
    console.error("Error: Empty code passed to updateBarcodeStatus");
    return null;
  }
  
  // Try to update in Supabase first (now with optimized search)
  try {
    console.log("Attempting to update directly in Supabase first");
    console.log("Shipping location being passed to Supabase:", updateData?.shippingLocation);
    const updatedBarcode = await updateQRCodeStatusInSupabase(code, status, updateData);
    if (updatedBarcode) {
      console.log("Successfully updated in Supabase:", updatedBarcode);
      console.log("Returned shipping location:", updatedBarcode.shippingLocation);
      return updatedBarcode;
    }
  } catch (supabaseError) {
    console.error('Error updating barcode status in Supabase:', supabaseError);
  }
  
  // Fallback to local handling
  const barcode = await findBarcodeByCode(code);
  
  if (!barcode) {
    console.log("No barcode found with code:", code);
    // Create a new barcode with minimal information if not found
    const newBarcode: Barcode = {
      id: '',
      code: code,
      description: 'Auto-created during status update',
      createdAt: new Date().toISOString(),
      status: status,
      weight: updateData?.weight || '',
      packerName: updateData?.packerName || '',
      shippingLocation: updateData?.shippingLocation || '',
      qrCodeImage: ''
    };
    
    // Save the new barcode first
    await saveBarcode(newBarcode);
    console.log("Created new barcode:", newBarcode);
    return newBarcode;
  }
  
  console.log("Found existing barcode:", barcode);
  // Validate status progression
  if (!isValidStatusProgression(barcode.status, status)) {
    throw new Error(`Invalid status transition: ${barcode.status} → ${status}`);
  }

  // Fallback to local storage update
  const updatedBarcode: Barcode = {
    ...barcode,
    status,
    weight: updateData?.weight || barcode.weight || '',
    packerName: updateData?.packerName || barcode.packerName || '',
    shippingLocation: updateData?.shippingLocation || barcode.shippingLocation || ''
  };
  
  try {
    const result = await saveBarcode(updatedBarcode);
    console.log("Successfully saved updated barcode to local storage:", updatedBarcode);
    return updatedBarcode;
  } catch (error) {
    console.error("Error saving updated barcode to local storage:", error);
    return null;
  }
}

/**
 * Validate status progression
 * Ensures statuses can only progress in the correct order
 */
function isValidStatusProgression(currentStatus?: PackingStatus, newStatus?: PackingStatus): boolean {
  console.log(`Checking status progression from ${currentStatus} to ${newStatus}`);
  
  // If no current status, or status is PENDING, any new status is valid
  if (!currentStatus || currentStatus === PackingStatus.PENDING) {
    return true;
  }
  
  // Same status is always valid
  if (currentStatus === newStatus) {
    return true;
  }
  
  // Enable proper status progression
  switch (currentStatus) {
    case PackingStatus.PACKED:
      // From PACKED can move to DISPATCHED or DELIVERED (for flexibility)
      return newStatus === PackingStatus.DISPATCHED || newStatus === PackingStatus.DELIVERED;
      
    case PackingStatus.DISPATCHED:
      // From DISPATCHED can only move to DELIVERED
      return newStatus === PackingStatus.DELIVERED;
      
    case PackingStatus.DELIVERED:
      // Cannot change status once delivered
      return false;
      
    default:
      // Unknown status - allow the change for robustness
      console.warn(`Unknown current status: ${currentStatus}`);
      return true;
  }
}

/**
 * Clear all barcodes from storage
 */
export function clearAllBarcodes(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing barcodes from storage:", error);
  }
}