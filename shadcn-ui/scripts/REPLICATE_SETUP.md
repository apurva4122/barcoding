# Replicate API Setup Guide - Step by Step

This guide will help you set up Replicate API for AI image editing in the hygiene autopopulation script.

## Step 1: Create a Replicate Account (Free)

1. Go to [https://replicate.com](https://replicate.com)
2. Click **"Sign Up"** in the top right
3. Sign up with:
   - Email and password, OR
   - GitHub account (recommended - faster)
4. Verify your email if required

## Step 2: Get Your API Token

1. After logging in, click on your **profile icon** (top right)
2. Select **"Account"** or **"API Tokens"**
3. You'll see your API token (starts with `r8_...`)
4. Click **"Copy"** to copy the token
5. **Important**: Keep this token secret! Don't share it publicly.

## Step 3: Add Token to Environment Variables

1. Open your project's `.env.local` file (in the root directory, not in scripts folder)
2. Add this line:
   ```env
   REPLICATE_API_TOKEN=r8_your_token_here
   ```
3. Replace `r8_your_token_here` with your actual token
4. Save the file

## Step 4: Install Dependencies

Navigate to the scripts folder and install required packages:

```bash
cd scripts
npm install
```

Required packages:
- `@supabase/supabase-js` - For Supabase access
- `dotenv` - For environment variables
- `node-fetch` - For API calls
- `tsx` - For running TypeScript

## Step 5: Verify Setup

Test that your token works by running a simple test:

```bash
# In scripts folder
node -e "require('dotenv').config({path:'../.env.local'}); console.log('Token:', process.env.REPLICATE_API_TOKEN ? 'Found ✓' : 'Missing ✗')"
```

## Step 6: Run the Script

Now you're ready to run the autopopulation script:

```bash
npm run autopopulate
```

Or:
```bash
npx tsx autopopulate-hygiene.ts
```

## Free Model Information

The script uses **FLUX.1-schnell** model which is:
- ✅ **Free** for first-time users
- ✅ **Fast** (generates in seconds)
- ✅ **Good quality** for image-to-image transformations
- ✅ **No credit card required** initially

### Free Tier Limits:
- Replicate offers free credits when you sign up
- FLUX.1-schnell is very fast and uses minimal credits
- You can process many images with the free tier

### Alternative Free Models:
If FLUX.1-schnell doesn't work, the script can be easily modified to use:
- `lucataco/realistic-vision-v5.1-inpainting` - For object removal
- `stability-ai/sdxl` - High quality but slower

## Troubleshooting

### Issue: "Invalid API token"
- **Solution**: Double-check your token in `.env.local`
- Make sure there are no extra spaces
- Token should start with `r8_`

### Issue: "Insufficient credits"
- **Solution**: 
  - Replicate gives free credits on signup
  - Check your account balance at replicate.com/account
  - FLUX.1-schnell uses very few credits per image

### Issue: "Model not found"
- **Solution**: The model name might have changed
- Check Replicate's model library: replicate.com/explore
- Update the model version in the script if needed

### Issue: "Image upload failed"
- **Solution**: 
  - Check your Supabase storage bucket permissions
  - Ensure `hygiene-photos` bucket exists
  - Verify Supabase credentials in `.env.local`

## Cost Estimate

For 100 images (20 days × 5 areas):
- **FLUX.1-schnell**: ~$0.003 per image = **~$0.30 total**
- With free credits: **$0.00** (if you have free credits)

## Next Steps

1. ✅ Create Replicate account
2. ✅ Get API token
3. ✅ Add to `.env.local`
4. ✅ Install dependencies
5. ✅ Run the script!

The script will:
- Fetch recent hygiene images
- Edit each one with AI (adjust angle, remove clutter)
- Upload edited images to Supabase
- Create hygiene records for last 20 days (excluding Tuesdays)

## Support

- Replicate Docs: https://replicate.com/docs
- Replicate Models: https://replicate.com/explore
- Replicate Pricing: https://replicate.com/pricing

