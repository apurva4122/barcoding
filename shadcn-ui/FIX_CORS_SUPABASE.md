# How to Fix CORS Issues in Supabase

## 🚀 QUICK FIX - Run Complete Setup Script

**The fastest way to fix all CORS issues is to run the complete setup script:**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open the file `COMPLETE_SUPABASE_SETUP_ALL_TABLES.sql` from your repository
3. Copy and paste the entire SQL script
4. Click **Run**
5. Wait for all queries to complete
6. Refresh your application

This script will:
- ✅ Create all tables (workers, attendance_records, QR codes, barcode assignments)
- ✅ Set up RLS policies for ALL tables
- ✅ Create indexes for performance
- ✅ Configure updated_at triggers

**After running this script, all CORS errors should be resolved!**

---

# How to Fix CORS Issues in Supabase

## Understanding the CORS Error

CORS (Cross-Origin Resource Sharing) errors occur when:
1. Your frontend (Vercel: `https://barcoding-nu.vercel.app`) tries to access Supabase API
2. Supabase doesn't allow requests from your domain
3. Row Level Security (RLS) policies block the requests
4. Tables don't exist or have incorrect permissions

## Solution 1: Check and Fix Row Level Security (RLS) Policies

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com](https://supabase.com)
2. Log in and select your project
3. Go to **Authentication** → **Policies** or **Table Editor**

### Step 2: Verify Tables Exist
Check if these tables exist:
- `workers` (new table)
- `attendance_records` (new table)
- `app_070c516bb6_qr_codes` (old table - optional)
- `app_070c516bb6_workers` (old table - optional)
- `app_070c516bb6_barcode_assignments` (old table - optional)

### Step 3: Check RLS Policies

For each table, ensure RLS policies allow public access:

#### For `workers` table:
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'workers';

-- If RLS is blocking, create/update policies:
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to workers" 
ON workers FOR SELECT 
USING (true);

-- Allow public insert
CREATE POLICY "Allow public insert to workers" 
ON workers FOR INSERT 
WITH CHECK (true);

-- Allow public update
CREATE POLICY "Allow public update to workers" 
ON workers FOR UPDATE 
USING (true);

-- Allow public delete
CREATE POLICY "Allow public delete to workers" 
ON workers FOR DELETE 
USING (true);
```

#### For `attendance_records` table:
```sql
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to attendance_records" 
ON attendance_records FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to attendance_records" 
ON attendance_records FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to attendance_records" 
ON attendance_records FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete to attendance_records" 
ON attendance_records FOR DELETE 
USING (true);
```

#### For old tables (if you want to keep them):
```sql
-- For app_070c516bb6_qr_codes
ALTER TABLE app_070c516bb6_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to qr_codes" 
ON app_070c516bb6_qr_codes 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- For app_070c516bb6_workers
ALTER TABLE app_070c516bb6_workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to old_workers" 
ON app_070c516bb6_workers 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- For app_070c516bb6_barcode_assignments
ALTER TABLE app_070c516bb6_barcode_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to barcode_assignments" 
ON app_070c516bb6_barcode_assignments 
FOR ALL 
USING (true) 
WITH CHECK (true);
```

## Solution 2: Configure CORS in Supabase Settings

### Step 1: Add Your Domain to Allowed Origins
1. Go to **Settings** → **API** in Supabase Dashboard
2. Scroll down to **CORS Configuration**
3. Add your Vercel domain: `https://barcoding-nu.vercel.app`
4. Also add `http://localhost:5173` for local development
5. Click **Save**

### Step 2: Verify API Settings
1. In **Settings** → **API**, verify:
   - **Project URL**: `https://orsdqaeqqobltrmpvtmj.supabase.co`
   - **anon/public key**: Your anon key is visible
   - **service_role key**: Keep this secret!

## Solution 3: Create Missing Tables

If tables don't exist, create them using the SQL Editor:

### Run Complete Setup SQL

Go to **SQL Editor** in Supabase Dashboard and run:

```sql
-- Create workers table (if not exists)
CREATE TABLE IF NOT EXISTS workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    position VARCHAR(255),
    is_packer BOOLEAN DEFAULT FALSE,
    gender VARCHAR(10) DEFAULT 'male' CHECK (gender IN ('male', 'female')),
    base_salary DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create attendance_records table (if not exists)
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
    worker_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'half_day')),
    overtime VARCHAR(10) DEFAULT 'no' CHECK (overtime IN ('yes', 'no')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(worker_id, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workers_employee_id ON workers(employee_id);
CREATE INDEX IF NOT EXISTS idx_workers_is_packer ON workers(is_packer);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_id ON attendance_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON attendance_records(worker_id, date);

-- Enable RLS
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Create policies for workers
DROP POLICY IF EXISTS "Allow public read access to workers" ON workers;
CREATE POLICY "Allow public read access to workers" ON workers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to workers" ON workers;
CREATE POLICY "Allow public insert to workers" ON workers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to workers" ON workers;
CREATE POLICY "Allow public update to workers" ON workers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete to workers" ON workers;
CREATE POLICY "Allow public delete to workers" ON workers FOR DELETE USING (true);

-- Create policies for attendance_records
DROP POLICY IF EXISTS "Allow public read access to attendance_records" ON attendance_records;
CREATE POLICY "Allow public read access to attendance_records" ON attendance_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to attendance_records" ON attendance_records;
CREATE POLICY "Allow public insert to attendance_records" ON attendance_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to attendance_records" ON attendance_records;
CREATE POLICY "Allow public update to attendance_records" ON attendance_records FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete to attendance_records" ON attendance_records;
CREATE POLICY "Allow public delete to attendance_records" ON attendance_records FOR DELETE USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
DROP TRIGGER IF EXISTS update_workers_updated_at ON workers;
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON attendance_records;
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Solution 4: Check API Keys and Environment Variables

### Verify Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Ensure these are set:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://orsdqaeqqobltrmpvtmj.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your anon key from Supabase

### Get Your Supabase Keys

1. Go to Supabase Dashboard → **Settings** → **API**
2. Copy:
   - **Project URL**: `https://orsdqaeqqobltrmpvtmj.supabase.co`
   - **anon public key**: The key starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Solution 5: Test the Connection

### Test in Supabase SQL Editor

Run this query to test if tables are accessible:

```sql
-- Test workers table
SELECT COUNT(*) FROM workers;

-- Test attendance_records table
SELECT COUNT(*) FROM attendance_records;
```

### Test via API

You can test the API directly in your browser:

```
https://orsdqaeqqobltrmpvtmj.supabase.co/rest/v1/workers?select=*&apikey=YOUR_ANON_KEY
```

Replace `YOUR_ANON_KEY` with your actual anon key.

## Solution 6: Disable RLS (Temporary - Not Recommended for Production)

If you need a quick fix for testing (NOT recommended for production):

```sql
-- Disable RLS temporarily (for testing only!)
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
```

**Warning**: This makes your data publicly accessible. Only use for testing!

## Common Issues and Solutions

### Issue 1: "Table does not exist"
**Solution**: Run the SQL scripts above to create the tables

### Issue 2: "Permission denied"
**Solution**: Check RLS policies - ensure public access policies exist

### Issue 3: "CORS policy blocked"
**Solution**: 
1. Add your domain to Supabase CORS settings
2. Check that you're using the correct API key (anon key, not service_role key)

### Issue 4: "Invalid API key"
**Solution**: 
1. Verify your anon key in Vercel environment variables
2. Make sure you're using `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not service_role key)

## Quick Fix Checklist

- [ ] Tables exist in Supabase (`workers`, `attendance_records`)
- [ ] RLS policies allow public access
- [ ] CORS settings include your Vercel domain
- [ ] Environment variables are set in Vercel
- [ ] Using correct anon key (not service_role key)
- [ ] Tables have correct column names and types

## After Fixing

1. **Redeploy on Vercel** (or wait for auto-deployment)
2. **Hard refresh browser** (`Ctrl + Shift + R`)
3. **Check browser console** - CORS errors should be gone
4. **Test functionality** - Data should load from Supabase

## Need Help?

If CORS errors persist:
1. Check Supabase Dashboard → **Logs** for detailed error messages
2. Verify your Supabase project is active (not paused)
3. Check if you've exceeded Supabase free tier limits
4. Ensure your Supabase project URL and keys are correct

