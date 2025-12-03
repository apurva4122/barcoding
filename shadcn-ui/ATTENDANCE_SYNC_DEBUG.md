# 🔍 Attendance Sync Debugging Guide

## Issue: Attendance data not syncing to Supabase

## Step 1: Check Browser Console

Open your browser's Developer Console (F12) and look for:

1. **Success messages:**
   - `🔄 Attempting to save attendance to Supabase:`
   - `✅ Attendance saved to Supabase successfully`

2. **Error messages:**
   - `❌ SUPABASE ATTENDANCE INSERT/UPDATE FAILED`
   - `❌ Error inserting attendance in Supabase`
   - `❌ TABLE DOES NOT EXIST`

## Step 2: Verify Supabase Table Exists

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Table Editor**
4. Check if `attendance_records` table exists

### If table doesn't exist:

1. Go to **SQL Editor** in Supabase
2. Run the SQL from `supabase-tables.sql` file
3. Or use this simplified version:

```sql
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id TEXT NOT NULL,
    worker_name TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day')),
    overtime TEXT DEFAULT 'no' CHECK (overtime IN ('yes', 'no')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(worker_id, date)
);

-- Enable RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Create policies (allow public access for now)
CREATE POLICY "Allow public read access" ON attendance_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON attendance_records FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON attendance_records FOR DELETE USING (true);
```

## Step 3: Check Table Permissions (RLS)

1. In Supabase Dashboard → **Table Editor** → `attendance_records`
2. Click **"Policies"** tab
3. Make sure there are policies that allow INSERT and UPDATE

If no policies exist, create them:
- Policy name: `Allow public insert`
- Operation: `INSERT`
- Policy definition: `true`

## Step 4: Verify Table Structure

Make sure your `attendance_records` table has these columns:
- `id` (UUID, primary key)
- `worker_id` (TEXT)
- `worker_name` (TEXT)
- `date` (DATE)
- `status` (TEXT)
- `overtime` (TEXT)
- `notes` (TEXT, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Step 5: Test Manually

Try inserting a test record directly in Supabase:

1. Go to **Table Editor** → `attendance_records`
2. Click **"Insert row"**
3. Fill in:
   - `worker_id`: `test-worker-123`
   - `worker_name`: `Test Worker`
   - `date`: `2025-01-15`
   - `status`: `present`
   - `overtime`: `no`
4. Click **"Save"**

If this works, the table exists and permissions are correct.

## Step 6: Check Console Logs

When you mark attendance, check the browser console for:

```
🔄 Attempting to save attendance to Supabase: {...}
📝 Converted attendance data for Supabase: {...}
```

Then look for either:
- ✅ Success message
- ❌ Error message with details

## Common Errors and Fixes

### Error: "relation 'attendance_records' does not exist"
**Fix:** Create the table using SQL from Step 2

### Error: "new row violates row-level security policy"
**Fix:** Create RLS policies (Step 3)

### Error: "duplicate key value violates unique constraint"
**Fix:** This is actually OK - means the record exists. The upsert should handle it.

### Error: "column 'worker_id' does not exist"
**Fix:** Check table structure matches expected columns

## Step 7: Verify Supabase Connection

Check that the Supabase client is initialized correctly:

1. Open browser console
2. Type: `localStorage.getItem('supabase')` (if stored)
3. Check Network tab for Supabase API calls when saving attendance

## Still Not Working?

1. **Check if barcode sync works** - If barcodes sync but attendance doesn't, compare the implementations
2. **Check Supabase logs** - Go to Supabase Dashboard → Logs → API Logs
3. **Try the REST API directly** - Use `supabase-attendance.ts` which uses fetch instead of the client

## Quick Test

Add this to your browser console to test:

```javascript
// Test Supabase connection
const testData = {
  worker_id: 'test-' + Date.now(),
  worker_name: 'Test Worker',
  date: '2025-01-15',
  status: 'present',
  overtime: 'no'
};

// Import supabase client (adjust path as needed)
// Then run:
supabase.from('attendance_records').insert([testData]).then(console.log).catch(console.error);
```

