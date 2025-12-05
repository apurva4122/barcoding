# Salary Management Setup Guide

## Overview

The salary management system has been implemented with the following features:

1. **Base Salary Column** - Visible in attendance management table
2. **Password Protection** - Salary editing requires password (default: `admin123`)
3. **Gender Field** - Required when adding workers (Male/Female)
4. **Automated Salary Calculation** - Calculates monthly salary based on attendance
5. **Dashboard Integration** - Shows calculated salaries in dashboard charts

## Salary Calculation Rules

### For Men (Male Workers)
- **Base Salary**: Monthly salary
- **Daily Schedule**: 10 hours
- **Weekly Off**: Tuesday (paid)
- **Overtime**: Double hourly rate, 1 hour extra only
- **Calculation**: 
  - Daily rate = Monthly salary / (working days + Tuesdays)
  - Hourly rate = Daily rate / 10 hours
  - Salary = (Present days × Daily rate) + (Half days × Daily rate × 0.5) + (Overtime hours × Hourly rate × 2)

### For Women (Female Workers)
- **Base Salary**: Daily wage
- **Daily Schedule**: 9 hours
- **Weekly Off**: Tuesday (NOT paid)
- **Overtime**: Double hourly rate, 1 hour extra only
- **Calculation**:
  - Hourly rate = Daily wage / 9 hours
  - Salary = (Present days × Daily wage) + (Half days × Daily wage × 0.5) + (Overtime hours × Hourly rate × 2)
  - Tuesday attendance is excluded from calculation

## Database Setup

### Step 1: Update Workers Table

Run this SQL in your Supabase SQL Editor to add the new columns:

```sql
-- Add gender column
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'male' 
CHECK (gender IN ('male', 'female'));

-- Add base_salary column
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS base_salary DECIMAL(10, 2);

-- Update existing workers to have default gender (if needed)
UPDATE workers SET gender = 'male' WHERE gender IS NULL;
```

### Step 2: Verify Table Structure

The workers table should now have:
- `id` (UUID)
- `employee_id` (VARCHAR)
- `name` (VARCHAR)
- `department` (VARCHAR, nullable)
- `position` (VARCHAR, nullable)
- `is_packer` (BOOLEAN)
- `gender` (VARCHAR) - NEW
- `base_salary` (DECIMAL) - NEW
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Usage Instructions

### Adding a New Worker

1. Click "Add Worker" in the Attendance Management section
2. Fill in all required fields:
   - Name
   - Employee ID
   - **Gender** (Male or Female) - NEW
   - **Base Salary** - NEW
     - For Men: Enter monthly salary (e.g., 30000)
     - For Women: Enter daily wage (e.g., 500)
3. Optionally fill in Department, Position
4. Toggle "Designate as Packer" if needed
5. Click "Add Worker"

### Editing Base Salary

1. In the Workers Attendance table, find the worker
2. Click the lock icon (🔒) next to their base salary
3. Enter password (default: `admin123`)
4. Enter new base salary amount
5. Click "Save Salary"

**Note**: To change the password, edit the `SALARY_EDIT_PASSWORD` constant in `src/components/attendance-management.tsx`

### Viewing Calculated Salaries

1. Go to Dashboard tab
2. View the "Top 5 Highest Absentees" and "Top 5 Minimum Absentees" charts
3. Salaries are automatically calculated and displayed below each chart
4. Salaries update daily based on attendance records

## Password Configuration

The default password for editing salaries is `admin123`. To change it:

1. Open `src/components/attendance-management.tsx`
2. Find the line: `const SALARY_EDIT_PASSWORD = "admin123";`
3. Change it to your desired password
4. Save and rebuild the application

## Important Notes

1. **Gender is Required**: All workers must have a gender assigned. Existing workers default to "male" if not set.

2. **Base Salary Format**:
   - Men: Enter monthly salary (e.g., 30000 for ₹30,000/month)
   - Women: Enter daily wage (e.g., 500 for ₹500/day)

3. **Salary Calculation**:
   - Calculated automatically based on attendance records
   - Updates daily when viewing dashboard
   - Considers present days, half days, absences, and overtime
   - Tuesday handling differs by gender

4. **Overtime Rules**:
   - Only 1 hour extra per day
   - Paid at double the hourly rate
   - Can be toggled per worker per day

5. **Weekly Off (Tuesday)**:
   - Men: Paid for Tuesday off
   - Women: NOT paid for Tuesday off
   - If marked present on Tuesday, it counts normally

## Troubleshooting

### Salary Not Showing
- Ensure base salary is set for the worker
- Check that attendance records exist for the current month
- Verify gender is set correctly

### Salary Calculation Incorrect
- Verify base salary is entered correctly
- Check gender is set correctly (affects calculation method)
- Ensure attendance records are properly marked
- Verify overtime is marked correctly

### Cannot Edit Salary
- Check password is correct (default: `admin123`)
- Ensure worker exists and is selected
- Check browser console for errors

## Next Steps

1. Update existing workers in Supabase to add gender and base salary
2. Test salary calculation with sample data
3. Verify dashboard shows correct calculated salaries
4. Consider changing the default password for production use

