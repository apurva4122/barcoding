/**
 * Comprehensive hygiene autopopulation script
 * - Downloads existing images
 * - Uploads them to Supabase storage
 * - Creates records with random times around 10 AM
 * - Optionally uses Replicate for image editing
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://orsdqaeqqobltrmpvtmj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yc2RxYWVxcW9ibHRybXB2dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDc5MDQsImV4cCI6MjA2OTg4MzkwNH0.QhL8nm2-swoGTImb0Id-0WNjQOO9PC6O8wRo5ctpQ-Q';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const HYGIENE_TABLE = 'app_f79f105891_hygiene_records';
const HYGIENE_AREAS = ['toilets', 'storage_area', 'packaging_area', 'processing_area', 'office_area'];
const REPLICATE_API_KEY = process.env.REPLICATE_API_TOKEN || '';

/**
 * Get last 20 working days (excluding Tuesdays)
 */
function getLast20WorkingDays() {
    const dates = [];
    const today = new Date();
    let daysBack = 0;
    let daysFound = 0;

    while (daysFound < 20) {
        const date = new Date(today);
        date.setDate(date.getDate() - daysBack);

        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 2) { // Skip Tuesday
            const dateStr = date.toISOString().split('T')[0];
            dates.push(dateStr);
            daysFound++;
        }

        daysBack++;
        if (daysBack > 100) break;
    }

    return dates.reverse();
}

/**
 * Generate random time around 10 AM (between 9:45 AM and 10:15 AM)
 */
function getRandomTimeAround10AM() {
    const baseMinutes = 10 * 60; // 10:00 AM in minutes
    const randomOffset = Math.floor(Math.random() * 31) - 15; // -15 to +15 minutes
    const totalMinutes = baseMinutes + randomOffset;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

/**
 * Download image from URL
 */
async function downloadImage(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        console.error(`Error downloading image from ${url}:`, error.message);
        throw error;
    }
}

/**
 * Upload image to Supabase Storage
 */
async function uploadImageToSupabase(imageBuffer, area, date, time) {
    const fileName = `hygiene-${area}-${date}-${time.replace(':', '-')}-${Date.now()}.jpg`;
    const filePath = `hygiene/${fileName}`;

    try {
        const { data, error } = await supabase.storage
            .from('hygiene-photos')
            .upload(filePath, imageBuffer, {
                contentType: 'image/jpeg',
                upsert: false,
            });

        if (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }

        const { data: urlData } = supabase.storage
            .from('hygiene-photos')
            .getPublicUrl(filePath);

        return urlData.publicUrl;
    } catch (error) {
        console.error(`Error uploading image:`, error.message);
        throw error;
    }
}

/**
 * Edit image with Replicate (optional, falls back to original if fails)
 * Using a simpler, more reliable approach with better error handling
 */
async function editImageWithReplicate(imageBuffer, area) {
    if (!REPLICATE_API_KEY) {
        return null; // No API key, skip editing
    }

    try {
        // Use a simple, fast model that works well for image-to-image
        // Using FLUX.1-schnell which is fast and works well for subtle edits
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        console.log(`  🎨 Sending image to Replicate for editing...`);
        
        // Use a model specifically designed for image-to-image with subtle variations
        // lucataco/realistic-vision-v5.1-inpainting works well for subtle edits
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: "lucataco/realistic-vision-v5.1-inpainting",
                input: {
                    prompt: `Same ${area.replace('_', ' ')} from slightly different angle. Clean, professional, hygienic. Same room, different perspective.`,
                    image: dataUrl,
                    strength: 0.2, // Very low strength for subtle changes (0.0 = original, 1.0 = completely new)
                    guidance_scale: 3.0, // Lower guidance for more subtle changes
                    num_inference_steps: 20, // Fewer steps for faster, more subtle changes
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { detail: errorText };
            }
            
            // Handle rate limiting with retry
            if (response.status === 429) {
                const retryAfter = errorData.retry_after || 10;
                console.log(`  ⚠️ Rate limited. Waiting ${retryAfter}s before retry...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                // Retry once
                return await editImageWithReplicate(imageBuffer, area);
            }
            
            // Handle insufficient credit
            if (response.status === 402) {
                console.log(`  ⚠️ Insufficient Replicate credit. Using original image.`);
                return null;
            }
            
            throw new Error(`Replicate API error: ${response.statusText} - ${errorData.detail || errorText}`);
        }

        const prediction = await response.json();
        console.log(`  ⏳ Prediction created: ${prediction.id}`);
        
        // Poll for result with timeout
        let result = prediction;
        let attempts = 0;
        const maxAttempts = 20; // 40 seconds max

        while ((result.status === 'starting' || result.status === 'processing') && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;

            const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
                headers: {
                    'Authorization': `Token ${REPLICATE_API_KEY}`,
                },
            });

            if (!statusResponse.ok) {
                break;
            }
            
            result = await statusResponse.json();
            
            if (result.status === 'succeeded' || result.status === 'failed' || result.status === 'canceled') {
                break;
            }
            
            if (attempts % 5 === 0) {
                console.log(`  ⏳ Still processing... (${attempts * 2}s)`);
            }
        }

        if (result.status === 'succeeded' && result.output) {
            // Handle different output formats
            let editedImageUrl;
            if (typeof result.output === 'string') {
                editedImageUrl = result.output;
            } else if (Array.isArray(result.output)) {
                editedImageUrl = result.output[0];
            } else if (result.output && typeof result.output === 'object') {
                // Some models return object with url property
                editedImageUrl = result.output.url || result.output[0] || result.output;
            } else {
                editedImageUrl = result.output;
            }
            
            console.log(`  ✅ Image edited successfully with subtle variations`);
            return await downloadImage(editedImageUrl);
        } else if (result.status === 'failed') {
            console.log(`  ⚠️ Replicate processing failed: ${result.error || 'Unknown error'}`);
            return null;
        }

        return null; // Failed, will use original

        /* Original Replicate code - disabled due to rate limits
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        // Use a simpler, faster model
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: "black-forest-labs/flux-schnell",
                input: {
                    prompt: `Professional clean photo of ${area.replace('_', ' ')}. Clean, organized, hygienic environment.`,
                    image: dataUrl,
                    output_format: "webp",
                    output_quality: 90,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            const errorData = JSON.parse(errorText);
            
            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = errorData.retry_after || 60;
                console.log(`  ⚠️ Rate limited. Waiting ${retryAfter}s...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return null; // Skip this one, try next
            }
            
            // Handle insufficient credit
            if (response.status === 402) {
                console.log(`  ⚠️ Insufficient Replicate credit. Skipping AI editing.`);
                return null;
            }
            
            throw new Error(`Replicate API error: ${response.statusText}`);
        }

        const prediction = await response.json();
        
        // Poll for result with timeout
        let result = prediction;
        let attempts = 0;
        const maxAttempts = 15; // Reduced timeout

        while ((result.status === 'starting' || result.status === 'processing') && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Longer wait
            attempts++;

            const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
                headers: {
                    'Authorization': `Token ${REPLICATE_API_KEY}`,
                },
            });

            if (!statusResponse.ok) {
                break;
            }
            
            result = await statusResponse.json();
            
            if (result.status === 'succeeded' || result.status === 'failed' || result.status === 'canceled') {
                break;
            }
        }

        if (result.status === 'succeeded' && result.output) {
            const editedImageUrl = typeof result.output === 'string' ? result.output : (Array.isArray(result.output) ? result.output[0] : result.output);
            return await downloadImage(editedImageUrl);
        }

        return null; // Failed, will use original
        */
    } catch (error) {
        console.log(`  ⚠️ Replicate editing failed: ${error.message?.substring(0, 100) || 'Unknown error'}`);
        return null; // Failed, will use original
    }
}

/**
 * Get recent hygiene images for each area
 */
async function getRecentHygieneImages() {
    const areaImages = new Map();

    for (const area of HYGIENE_AREAS) {
        try {
            const { data, error } = await supabase
                .from(HYGIENE_TABLE)
                .select('photo_url, area')
                .eq('area', area)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error || !data || !data.photo_url) {
                console.warn(`⚠️ No recent image found for ${area}`);
                continue;
            }

            areaImages.set(area, data.photo_url);
            console.log(`✅ Found image for ${area}: ${data.photo_url.substring(0, 60)}...`);
        } catch (error) {
            console.error(`❌ Error fetching image for ${area}:`, error.message);
        }
    }

    return areaImages;
}

/**
 * Get a random active worker
 */
async function getRandomWorker() {
    try {
        const { data, error } = await supabase
            .from('workers')
            .select('id, name')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

        if (error || !data) {
            return { id: 'default-worker-id', name: 'Hygiene Inspector' };
        }

        return { id: data.id, name: data.name };
    } catch (error) {
        return { id: 'default-worker-id', name: 'Hygiene Inspector' };
    }
}

/**
 * Check if record already exists for date and area
 */
async function recordExists(date, area) {
    try {
        const { data, error } = await supabase
            .from(HYGIENE_TABLE)
            .select('id')
            .eq('date', date)
            .eq('area', area)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            console.warn(`  ⚠️ Error checking for existing record:`, error.message);
            return false;
        }

        return !!data;
    } catch (error) {
        return false;
    }
}

/**
 * Delete duplicate records for a date and area (keep only the most recent one)
 */
async function deleteDuplicateRecords(date, area) {
    try {
        // Get all records for this date and area
        const { data: records, error } = await supabase
            .from(HYGIENE_TABLE)
            .select('id, created_at')
            .eq('date', date)
            .eq('area', area)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn(`  ⚠️ Error fetching duplicates:`, error.message);
            return 0;
        }

        if (!records || records.length <= 1) {
            return 0; // No duplicates
        }

        // Keep the most recent one, delete the rest
        const idsToDelete = records.slice(1).map(r => r.id);
        
        const { error: deleteError } = await supabase
            .from(HYGIENE_TABLE)
            .delete()
            .in('id', idsToDelete);

        if (deleteError) {
            console.warn(`  ⚠️ Error deleting duplicates:`, deleteError.message);
            return 0;
        }

        return idsToDelete.length;
    } catch (error) {
        console.warn(`  ⚠️ Error in deleteDuplicateRecords:`, error.message);
        return 0;
    }
}

/**
 * Create hygiene record (with duplicate check and cleanup)
 */
async function createHygieneRecord(record) {
    try {
        // First, check and clean up any existing duplicates
        const deletedCount = await deleteDuplicateRecords(record.date, record.area);
        if (deletedCount > 0) {
            console.log(`  🧹 Cleaned up ${deletedCount} duplicate record(s) for ${record.area} on ${record.date}`);
        }

        // Check if record already exists
        const exists = await recordExists(record.date, record.area);
        if (exists) {
            console.log(`  ⏭️ Record already exists for ${record.area} on ${record.date}, skipping...`);
            return 'skipped';
        }

        // Insert new record
        const { error } = await supabase
            .from(HYGIENE_TABLE)
            .insert([record]);

        if (error) {
            // Check if it's a duplicate error (shouldn't happen after our check, but just in case)
            if (error.message?.includes('duplicate') || error.code === '23505') {
                console.log(`  ⏭️ Duplicate record detected for ${record.area} on ${record.date}, skipping...`);
                return 'skipped';
            }
            console.error(`  ❌ Error creating record:`, error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`  ❌ Error creating record:`, error.message);
        return false;
    }
}

/**
 * Main function
 */
async function autopopulateHygiene() {
    console.log('🚀 Starting hygiene autopopulation with image upload...\n');
    console.log(`📋 Supabase URL: ${supabaseUrl ? '✓' : '✗'}`);
    console.log(`🔑 Replicate Token: ${REPLICATE_API_KEY ? '✓ (will try AI editing)' : '✗ (skipping AI editing)'}\n`);

    // Get recent images
    const areaImages = await getRecentHygieneImages();

    if (areaImages.size === 0) {
        console.error('❌ No recent hygiene images found. Please upload at least one image per area first.');
        process.exit(1);
    }

    // Get dates
    const dates = getLast20WorkingDays();
    console.log(`📅 Generating records for ${dates.length} days (excluding Tuesdays)\n`);

    // Get worker
    const worker = await getRandomWorker();
    console.log(`👤 Using worker: ${worker.name} (${worker.id})\n`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    let aiEditedCount = 0;

    // Process each date and area
    for (const date of dates) {
        for (const area of HYGIENE_AREAS) {
            const sourceImageUrl = areaImages.get(area);

            if (!sourceImageUrl) {
                console.warn(`⚠️ Skipping ${area} for ${date} - no source image`);
                continue;
            }

            try {
                console.log(`📸 Processing ${area} for ${date}...`);

                // Download original image
                const originalImage = await downloadImage(sourceImageUrl);

                // Try to edit with Replicate (optional)
                let finalImage = originalImage;
                if (REPLICATE_API_KEY) {
                    console.log(`  🎨 Attempting AI edit with Replicate...`);
                    const editedImage = await editImageWithReplicate(originalImage, area);
                    if (editedImage) {
                        finalImage = editedImage;
                        aiEditedCount++;
                        console.log(`  ✅ Image successfully edited with AI`);
                    } else {
                        console.log(`  ℹ️ Using original image (AI edit unavailable)`);
                    }
                    
                    // Add delay between Replicate requests to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                // Generate random time around 10 AM
                const time = getRandomTimeAround10AM();

                // Upload to Supabase Storage
                console.log(`  📤 Uploading to Supabase storage...`);
                const photoUrl = await uploadImageToSupabase(finalImage, area, date, time);

                // Create record
                const record = {
                    worker_id: worker.id,
                    worker_name: worker.name,
                    date: date,
                    area: area,
                    photo_url: photoUrl,
                    notes: `Auto-generated hygiene record for ${area.replace('_', ' ')} at ${time}`,
                };

                const result = await createHygieneRecord(record);

                if (result === true) {
                    successCount++;
                    console.log(`  ✅ Created record for ${area} on ${date} at ${time}\n`);
                } else if (result === 'skipped') {
                    skippedCount++;
                    console.log(`  ⏭️ Skipped duplicate record for ${area} on ${date}\n`);
                } else {
                    failCount++;
                    console.error(`  ❌ Failed to create record for ${area} on ${date}\n`);
                }

                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                failCount++;
                console.error(`  ❌ Error processing ${area} for ${date}:`, error.message);
                console.log('');
            }
        }
    }

    console.log('\n=== Summary ===');
    console.log(`✅ Successfully created: ${successCount} records`);
    console.log(`⏭️ Skipped (duplicates): ${skippedCount} records`);
    console.log(`❌ Failed: ${failCount} records`);
    if (REPLICATE_API_KEY) {
        console.log(`🎨 AI-edited images: ${aiEditedCount} (Note: AI editing disabled due to rate limits)`);
    }
    console.log('🎉 Autopopulation complete!');
}

// Run the script
autopopulateHygiene()
    .then(() => {
        console.log('\n✨ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Script failed:', error);
        process.exit(1);
    });

