/**
 * Utility function to migrate barcode status from 'created' to 'pending'
 * This should be run once to update existing data
 */

import { getAllBarcodes, saveBarcode } from '@/lib/storage';
import { PackingStatus } from '@/types';

export const migrateCreatedToPending = async (): Promise<number> => {
  try {
    console.log('Starting migration of created status to pending...');
    
    // Get all barcodes
    const barcodes = await getAllBarcodes();
    console.log(`Found ${barcodes.length} total barcodes`);
    
    let migrated = 0;
    
    // Update any with 'created' status
    for (const barcode of barcodes) {
      if (barcode.status === 'created') {
        console.log(`Migrating barcode ${barcode.code} from 'created' to 'pending'`);
        
        const updatedBarcode = {
          ...barcode,
          status: PackingStatus.PENDING
        };
        
        // Save the updated barcode
        const success = await saveBarcode(updatedBarcode);
        if (success) {
          migrated++;
        } else {
          console.error(`Failed to migrate barcode ${barcode.code}`);
        }
      }
    }
    
    console.log(`Migration completed. Migrated ${migrated} barcodes.`);
    return migrated;
    
  } catch (error) {
    console.error('Error during migration:', error);
    return 0;
  }
};

// Function to run migration from browser console
declare global {
  interface Window {
    migrateCreatedToPending: typeof migrateCreatedToPending;
  }
}

if (typeof window !== 'undefined') {
  window.migrateCreatedToPending = migrateCreatedToPending;
}

export default migrateCreatedToPending;