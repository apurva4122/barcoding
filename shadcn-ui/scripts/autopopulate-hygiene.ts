/**
 * One-time script to autopopulate hygiene records for last 20 days
 * - Fetches recent hygiene images from Supabase for each area
 * - Uses AI to edit images (adjust angle, remove objects)
 * - Creates hygiene records for last 20 days (excluding Tuesdays) at 10 AM
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const HYGIENE_TABLE = 'app_f79f105891_hygiene_records';
const HYGIENE_AREAS = ['toilets', 'storage_area', 'packaging_area', 'processing_area', 'office_area'];

// You'll need to set this - options:
// 1. OpenAI API key for DALL-E image editing
// 2. Replicate API token for image editing models
// 3. Stability AI API key
const AI_API_KEY = process.env.REPLICATE_API_TOKEN || '';

interface HygieneRecord {
    worker_id: string;
    worker_name: string;
    date: string;
    area: string;
    photo_url: string;
    notes?: string;
}

/**
 * Fetch the most recent hygiene record for each area
 */
async function getRecentHygieneImages(): Promise<Map<string, string>> {
    const areaImages = new Map<string, string>();

    for (const area of HYGIENE_AREAS) {
        try {
            const { data, error } = await supabase
                .from(HYGIENE_TABLE)
                .select('photo_url, area')
                .eq('area', area)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) {
                console.warn(`No recent image found for ${area}:`, error?.message);
                continue;
            }

            areaImages.set(area, data.photo_url);
            console.log(`Found recent image for ${area}: ${data.photo_url}`);
        } catch (error) {
            console.error(`Error fetching image for ${area}:`, error);
        }
    }

    return areaImages;
}

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
}

/**
 * Edit image using OpenAI DALL-E or Replicate
 * Adjusts angle and removes objects to make room cleaner
 */
async function editImageWithAI(imageBuffer: Buffer, area: string): Promise<Buffer> {
    if (!AI_API_KEY) {
        console.warn('No AI API key found. Using original image.');
        return imageBuffer;
    }

    try {
        if (USE_OPENAI) {
            // Using OpenAI DALL-E for image editing
            // Note: DALL-E doesn't directly edit images, so we'll use a workaround
            // For actual image editing, consider using Replicate or Stability AI
            console.log(`Editing image for ${area} using OpenAI...`);

            // Convert buffer to base64
            const base64Image = imageBuffer.toString('base64');

            // For OpenAI, we'd need to use their image editing endpoint
            // This is a placeholder - you may need to use Replicate or another service
            const response = await fetch('https://api.openai.com/v1/images/edits', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AI_API_KEY}`,
                },
                body: createFormData(imageBuffer, area),
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.statusText}`);
            }

            const result = await response.json();
            // Download the edited image
            const editedImageUrl = result.data[0]?.url;
            if (editedImageUrl) {
                return await downloadImage(editedImageUrl);
            }
        } else {
            // Using Replicate API for image editing
            console.log(`Editing image for ${area} using Replicate...`);

            const base64Image = imageBuffer.toString('base64');
            const dataUrl = `data:image/jpeg;base64,${base64Image}`;

            // Using a popular image editing model on Replicate
            // You can use models like: "stability-ai/sdxl", "lucataco/realistic-vision-v5.1", etc.
            const response = await fetch('https://api.replicate.com/v1/predictions', {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${AI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    version: "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", // Example model
                    input: {
                        prompt: `Clean and professional photo of ${area.replace('_', ' ')}. Remove any clutter, adjust camera angle slightly, make the room look cleaner and more organized.`,
                        image: dataUrl,
                        strength: 0.7, // How much to modify the image
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`Replicate API error: ${response.statusText}`);
            }

            const prediction = await response.json();

            // Poll for result
            let result = prediction;
            while (result.status === 'starting' || result.status === 'processing') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
                    headers: {
                        'Authorization': `Token ${AI_API_KEY}`,
                    },
                });
                result = await statusResponse.json();
            }

            if (result.status === 'succeeded' && result.output) {
                const editedImageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
                return await downloadImage(editedImageUrl);
            }
        }
    } catch (error) {
        console.error(`Error editing image for ${area}:`, error);
        // Return original image if editing fails
        return imageBuffer;
    }

    return imageBuffer;
}


/**
 * Upload image to Supabase Storage
 */
async function uploadImageToSupabase(imageBuffer: Buffer, area: string, date: string): Promise<string> {
    const fileName = `hygiene-${area}-${date}-${Date.now()}.jpg`;
    const filePath = `hygiene/${fileName}`;

    const { data, error } = await supabase.storage
        .from('hygiene-photos') // Adjust bucket name as needed
        .upload(filePath, imageBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
        });

    if (error) {
        throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('hygiene-photos')
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}

/**
 * Get last 20 working days (excluding Tuesdays)
 */
function getLast20WorkingDays(): string[] {
    const dates: string[] = [];
    const today = new Date();
    let daysBack = 0;
    let daysFound = 0;

    while (daysFound < 20) {
        const date = new Date(today);
        date.setDate(date.getDate() - daysBack);

        const dayOfWeek = date.getDay();
        // Skip Tuesday (day 2)
        if (dayOfWeek !== 2) {
            const dateStr = date.toISOString().split('T')[0];
            dates.push(dateStr);
            daysFound++;
        }

        daysBack++;

        // Safety check to avoid infinite loop
        if (daysBack > 100) break;
    }

    return dates.reverse(); // Oldest to newest
}

/**
 * Get a random worker ID and name (or use a default)
 */
async function getRandomWorker(): Promise<{ id: string; name: string }> {
    try {
        const { data, error } = await supabase
            .from('workers')
            .select('id, name')
            .eq('is_active', true)
            .limit(1)
            .single();

        if (error || !data) {
            // Fallback to default
            return { id: 'default-worker-id', name: 'Hygiene Inspector' };
        }

        return { id: data.id, name: data.name };
    } catch (error) {
        return { id: 'default-worker-id', name: 'Hygiene Inspector' };
    }
}

/**
 * Create hygiene record in Supabase
 */
async function createHygieneRecord(record: HygieneRecord): Promise<boolean> {
    try {
        const { error } = await supabase
            .from(HYGIENE_TABLE)
            .insert([record]);

        if (error) {
            console.error(`Error creating hygiene record:`, error);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`Error creating hygiene record:`, error);
        return false;
    }
}

/**
 * Main function to autopopulate hygiene records
 */
async function autopopulateHygiene() {
    console.log('Starting hygiene autopopulation...');

    // Get recent images for each area
    const areaImages = await getRecentHygieneImages();

    if (areaImages.size === 0) {
        console.error('No recent hygiene images found. Please upload at least one image per area first.');
        return;
    }

    // Get last 20 working days
    const dates = getLast20WorkingDays();
    console.log(`Generating records for ${dates.length} days:`, dates);

    // Get a worker for the records
    const worker = await getRandomWorker();
    console.log(`Using worker: ${worker.name} (${worker.id})`);

    let successCount = 0;
    let failCount = 0;

    // Process each date and area
    for (const date of dates) {
        for (const area of HYGIENE_AREAS) {
            const originalImageUrl = areaImages.get(area);

            if (!originalImageUrl) {
                console.warn(`Skipping ${area} for ${date} - no source image`);
                continue;
            }

            try {
                console.log(`Processing ${area} for ${date}...`);

                // Download original image
                const originalImage = await downloadImage(originalImageUrl);

                // Edit image with AI
                const editedImage = await editImageWithAI(originalImage, area);

                // Upload edited image to Supabase
                const photoUrl = await uploadImageToSupabase(editedImage, area, date);

                // Create hygiene record
                // Date format should be YYYY-MM-DD (without time for hygiene records)
                const record: HygieneRecord = {
                    worker_id: worker.id,
                    worker_name: worker.name,
                    date: date, // Just the date, not datetime
                    area: area,
                    photo_url: photoUrl,
                    notes: `Auto-generated hygiene record for ${area.replace('_', ' ')} at 10:00 AM`,
                };

                const success = await createHygieneRecord(record);

                if (success) {
                    successCount++;
                    console.log(`✅ Created record for ${area} on ${date}`);
                } else {
                    failCount++;
                    console.error(`❌ Failed to create record for ${area} on ${date}`);
                }

                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                failCount++;
                console.error(`Error processing ${area} for ${date}:`, error);
            }
        }
    }

    console.log('\n=== Summary ===');
    console.log(`✅ Successfully created: ${successCount} records`);
    console.log(`❌ Failed: ${failCount} records`);
    console.log('Autopopulation complete!');
}

// Run the script
// Check if running directly (not imported)
const isMainModule = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('autopopulate-hygiene');

if (isMainModule) {
    autopopulateHygiene()
        .then(() => {
            console.log('Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}

export { autopopulateHygiene };

