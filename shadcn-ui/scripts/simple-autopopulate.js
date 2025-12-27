/**
 * Simplified version - uses existing images without AI editing
 * Run this if you don't have AI API keys or want to skip image editing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const HYGIENE_TABLE = 'app_f79f105891_hygiene_records';
const HYGIENE_AREAS = ['toilets', 'storage_area', 'packaging_area', 'processing_area', 'office_area'];

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
        // Skip Tuesday (day 2)
        if (dayOfWeek !== 2) {
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
                .single();

            if (error || !data) {
                console.warn(`No recent image found for ${area}`);
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
 * Get a random active worker
 */
async function getRandomWorker() {
    try {
        const { data, error } = await supabase
            .from('workers')
            .select('id, name')
            .eq('is_active', true)
            .limit(1)
            .single();

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
            console.error(`Error creating record:`, error);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`Error creating record:`, error);
        return false;
    }
}

/**
 * Main function
 */
async function autopopulateHygiene() {
    console.log('Starting hygiene autopopulation (simple version - no AI editing)...\n');

    // Get recent images
    const areaImages = await getRecentHygieneImages();

    if (areaImages.size === 0) {
        console.error('No recent hygiene images found. Please upload at least one image per area first.');
        return;
    }

    // Get dates
    const dates = getLast20WorkingDays();
    console.log(`Generating records for ${dates.length} days (excluding Tuesdays)\n`);

    // Get worker
    const worker = await getRandomWorker();
    console.log(`Using worker: ${worker.name} (${worker.id})\n`);

    let successCount = 0;
    let failCount = 0;

    // Create records
    for (const date of dates) {
        for (const area of HYGIENE_AREAS) {
            const photoUrl = areaImages.get(area);

            if (!photoUrl) {
                console.warn(`Skipping ${area} for ${date} - no source image`);
                continue;
            }

            try {
                const record = {
                    worker_id: worker.id,
                    worker_name: worker.name,
                    date: date,
                    area: area,
                    photo_url: photoUrl, // Reuse same image
                    notes: `Auto-generated hygiene record for ${area.replace('_', ' ')} at 10:00 AM`,
                };

                const success = await createHygieneRecord(record);

                if (success) {
                    successCount++;
                    console.log(`✅ ${area} - ${date}`);
                } else {
                    failCount++;
                    console.error(`❌ Failed: ${area} - ${date}`);
                }

                // Small delay
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                failCount++;
                console.error(`Error: ${area} - ${date}:`, error.message);
            }
        }
    }

    console.log('\n=== Summary ===');
    console.log(`✅ Successfully created: ${successCount} records`);
    console.log(`❌ Failed: ${failCount} records`);
    console.log('\nNote: This script reused existing images. For AI-edited images, use autopopulate-hygiene.ts');
}

// Run
autopopulateHygiene()
    .then(() => {
        console.log('\nScript completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });

