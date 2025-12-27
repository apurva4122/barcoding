/**
 * Comprehensive hygiene autopopulation script
 * - Downloads existing images
 * - Uploads them to Supabase storage
 * - Creates records with random times around 10 AM
 * - Optionally uses Replicate for image editing
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

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
        return await response.buffer();
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
 */
async function editImageWithReplicate(imageBuffer, area) {
    if (!REPLICATE_API_KEY) {
        return null; // No API key, skip editing
    }

    try {
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        // Use a free model that works well
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                input: {
                    prompt: `Professional clean photo of ${area.replace('_', ' ')}. Clean, organized, hygienic environment.`,
                    image: dataUrl,
                    strength: 0.3,
                    num_outputs: 1,
                    num_inference_steps: 20,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Replicate API error: ${response.statusText} - ${errorText}`);
        }

        const prediction = await response.json();
        
        // Poll for result
        let result = prediction;
        let attempts = 0;
        const maxAttempts = 30;

        while ((result.status === 'starting' || result.status === 'processing') && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;

            const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
                headers: {
                    'Authorization': `Token ${REPLICATE_API_KEY}`,
                },
            });

            if (!statusResponse.ok) {
                result = await statusResponse.json();
                if (result.status === 'succeeded' || result.status === 'failed' || result.status === 'canceled') {
                    break;
                }
            }
        }

        if (result.status === 'succeeded' && result.output) {
            const editedImageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
            return await downloadImage(editedImageUrl);
        }

        return null; // Failed, will use original
    } catch (error) {
        console.log(`  ⚠️ Replicate editing failed: ${error.message.substring(0, 100)}`);
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
 * Create hygiene record
 */
async function createHygieneRecord(record) {
    try {
        const { error } = await supabase
            .from(HYGIENE_TABLE)
            .insert([record]);

        if (error) {
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
                    console.log(`  🎨 Attempting AI edit...`);
                    const editedImage = await editImageWithReplicate(originalImage, area);
                    if (editedImage) {
                        finalImage = editedImage;
                        aiEditedCount++;
                        console.log(`  ✅ Image edited with AI`);
                    } else {
                        console.log(`  ℹ️ Using original image (AI edit failed or skipped)`);
                    }
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

                const success = await createHygieneRecord(record);

                if (success) {
                    successCount++;
                    console.log(`  ✅ Created record for ${area} on ${date} at ${time}\n`);
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
    console.log(`❌ Failed: ${failCount} records`);
    if (REPLICATE_API_KEY) {
        console.log(`🎨 AI-edited images: ${aiEditedCount}`);
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

