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

// Use same fallback values as supabase-client.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://orsdqaeqqobltrmpvtmj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yc2RxYWVxcW9ibHRybXB2dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDc5MDQsImV4cCI6MjA2OTg4MzkwNH0.QhL8nm2-swoGTImb0Id-0WNjQOO9PC6O8wRo5ctpQ-Q';
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
        // Using Replicate API for image editing
        console.log(`Editing image for ${area} using Replicate...`);

        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        // Using a free image-to-image model on Replicate
        // Model: lucataco/realistic-vision-v5.1-inpainting (free tier available)
        // This model can do image-to-image transformations for editing
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${AI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: "lucataco/realistic-vision-v5.1-inpainting:5c9a5e3c8e4b8e4b8e4b8e4b8e4b8e4b8", // Free model for subtle image editing
                input: {
                    prompt: `Professional clean photo of ${area.replace('_', ' ')}. Clean, organized, hygienic environment.`,
                    image: dataUrl,
                    strength: 0.3, // Low strength for subtle variations only (0.0 = original, 1.0 = completely new)
                    guidance_scale: 5.0, // Lower guidance for more subtle changes
                    num_inference_steps: 15, // Fewer steps for faster, more subtle changes
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Replicate API error: ${response.statusText} - ${errorText}`);
        }

        const prediction = await response.json();
        console.log(`Prediction created: ${prediction.id}, status: ${prediction.status}`);

        // Poll for result (check every 2 seconds)
        let result = prediction;
        let attempts = 0;
        const maxAttempts = 60; // 2 minutes max wait

        while ((result.status === 'starting' || result.status === 'processing') && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;

            const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
                headers: {
                    'Authorization': `Token ${AI_API_KEY}`,
                },
            });

            if (!statusResponse.ok) {
                throw new Error(`Failed to check prediction status: ${statusResponse.statusText}`);
            }

            result = await statusResponse.json();

            if (result.status === 'succeeded' || result.status === 'failed' || result.status === 'canceled') {
                break;
            }

            console.log(`  Waiting... (${attempts * 2}s) Status: ${result.status}`);
        }

        if (result.status === 'succeeded' && result.output) {
            const editedImageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
            console.log(`  ✅ Image edited successfully: ${editedImageUrl}`);
            return await downloadImage(editedImageUrl);
        } else if (result.status === 'failed') {
            throw new Error(`Replicate prediction failed: ${result.error || 'Unknown error'}`);
        } else {
            throw new Error(`Replicate prediction timed out or was canceled. Status: ${result.status}`);
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
    console.log('🚀 Starting hygiene autopopulation...');
    console.log(`📋 Supabase URL: ${supabaseUrl ? '✓' : '✗'}`);
    console.log(`🔑 Replicate Token: ${AI_API_KEY ? '✓' : '✗'}`);

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
autopopulateHygiene()
    .then(() => {
        console.log('Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });

export { autopopulateHygiene };

