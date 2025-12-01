# Supabase Integration Setup

This guide will help you set up Supabase integration for the Package QR Code Manager attendance system.

## Prerequisites

1. A Supabase account and project
2. Node.js and pnpm installed
3. Environment variables configured

## Setup Steps

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for the project to be fully initialized
3. Go to Settings > API to get your project URL and anon key

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Initialize Database Tables

1. Start the development server:
   ```bash
   pnpm run dev
   ```

2. Navigate to the "Supabase Setup" tab in the application
3. Click "Initialize Tables" to create the required database schema
4. Optionally, click "Migrate Data" to move existing localStorage data to Supabase

## Database Schema

The integration creates two main tables:

### Workers Table
```sql
CREATE TABLE workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    position VARCHAR(255),
    is_packer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Attendance Records Table
```sql
CREATE TABLE attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    worker_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('present', 'absent', 'half_day')),
    overtime VARCHAR(10) DEFAULT 'no' CHECK (overtime IN ('yes', 'no')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(worker_id, date)
);
```

## Features

### Hybrid Storage
- **Primary**: Supabase database for persistent, cloud-based storage
- **Fallback**: localStorage for offline functionality and backup

### Automatic Sync
- All data operations try Supabase first
- Falls back to localStorage if Supabase is unavailable
- Local data is synced to Supabase when connection is restored

### Data Migration
- Seamlessly migrate existing localStorage data to Supabase
- No data loss during the transition
- Maintains all historical records

## Usage

Once set up, the system will automatically:

1. **Save new data** to both Supabase and localStorage
2. **Load data** from Supabase with localStorage fallback
3. **Sync changes** across all connected devices
4. **Handle offline scenarios** gracefully

## Troubleshooting

### Common Issues

1. **Environment variables not loaded**
   - Ensure `.env.local` is in the project root
   - Restart the development server after adding variables

2. **Database connection errors**
   - Verify your Supabase URL and key are correct
   - Check if your Supabase project is active
   - Ensure Row Level Security policies allow your operations

3. **Migration issues**
   - Initialize tables before migrating data
   - Check browser console for detailed error messages
   - Verify localStorage contains data to migrate

### Getting Help

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Supabase project settings
3. Ensure all environment variables are correctly set
4. Try the setup process step by step

## Security Notes

- Row Level Security (RLS) is enabled on all tables
- Public access policies are created for demonstration purposes
- In production, implement proper authentication and authorization
- Consider using Supabase Auth for user management

## Next Steps

After successful setup:

1. Test the attendance management functionality
2. Generate QR codes for package tracking
3. Monitor data sync between devices
4. Consider implementing user authentication for production use