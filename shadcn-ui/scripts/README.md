# Hygiene Autopopulation Script

This is a one-time script to autopopulate hygiene records for the last 20 days (excluding Tuesdays).

## Features

- Fetches recent hygiene images from Supabase for each area
- Uses AI to edit images (adjust angle, remove objects, make room cleaner)
- Creates hygiene records for last 20 working days at 10 AM
- Excludes Tuesdays

## Setup

1. Install dependencies:
```bash
cd scripts
npm install
```

2. Set up environment variables in `.env.local` (in project root):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# For AI image editing, choose one:
# Option 1: OpenAI (for DALL-E)
OPENAI_API_KEY=your_openai_api_key

# Option 2: Replicate (recommended for image editing)
REPLICATE_API_TOKEN=your_replicate_api_token
```

3. Make sure you have at least one hygiene record per area in Supabase (the script will use the most recent one as a template)

## Usage

### Option 1: Simple Version (Recommended - No AI editing)
This version reuses existing images without AI editing. Faster and doesn't require AI API keys:

```bash
npm run autopopulate-simple
```

Or directly:
```bash
node simple-autopopulate.js
```

### Option 2: Full Version (With AI Image Editing)
This version edits images using AI before creating records. Requires API keys:

```bash
npm run autopopulate
```

Or directly:
```bash
npx tsx autopopulate-hygiene.ts
```

## How It Works

1. **Fetches Recent Images**: Gets the most recent hygiene photo for each area (washing_area, packaging_area, processing_area, office_area)

2. **AI Image Editing**: 
   - Downloads each image
   - Uses AI to edit (adjust angle, remove clutter, make room cleaner)
   - Uploads edited image back to Supabase Storage

3. **Creates Records**: 
   - Generates records for last 20 working days (excluding Tuesdays)
   - Sets time to 10 AM
   - Creates one record per area per day

## Notes

- This is a **one-time script** - run it once to populate historical data
- The script includes delays to avoid API rate limiting
- If AI editing fails, it will use the original image
- Make sure the Supabase storage bucket `hygiene-photos` exists and has proper permissions

## Troubleshooting

1. **No images found**: Make sure you have at least one hygiene record per area in Supabase
2. **AI editing fails**: Check your API key and ensure you have credits/quota
3. **Upload fails**: Verify Supabase storage bucket name and permissions
4. **Date format issues**: The script uses ISO date format with 10 AM time

