# Hygiene Autopopulation Script

## Quick Start

**From the project root:**
```powershell
cd workspace\shadcn-ui\scripts
node populate-hygiene-with-images.js
```

**Or from anywhere:**
```powershell
node workspace\shadcn-ui\scripts\populate-hygiene-with-images.js
```

## What This Script Does

1. **Fetches existing images** from your hygiene records for each area
2. **Downloads images** from Supabase storage
3. **Optionally edits images** with Replicate AI (if API key is set)
4. **Uploads images** to Supabase storage with new filenames
5. **Creates hygiene records** for the last 20 working days (excluding Tuesdays)
6. **Sets random times** around 10 AM (between 9:45 AM and 10:15 AM)

## Requirements

1. **Supabase credentials** in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

2. **Replicate API token** (optional, for AI image editing):
   ```
   REPLICATE_API_TOKEN=your_token
   ```

3. **At least one existing hygiene record** per area (toilets, storage_area, packaging_area, processing_area, office_area)

## Output

The script will:
- Create ~100 records (20 days × 5 areas)
- Upload images to Supabase storage
- Set random times around 10 AM for each record
- Show progress and summary at the end

## Troubleshooting

**Error: "No recent hygiene images found"**
- Make sure you have at least one hygiene record uploaded for each area
- Check that images are accessible in Supabase storage

**Error: "Cannot find module"**
- Make sure you're running from the correct directory
- Or use the full path: `node workspace\shadcn-ui\scripts\populate-hygiene-with-images.js`

**Replicate errors (rate limiting, insufficient credit)**
- The script will automatically fall back to using original images
- This is normal and won't stop the script from working

