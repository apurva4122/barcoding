import { createClient } from '@supabase/supabase-js';

// Use hardcoded values as fallback (same as supabase.ts for barcode sync)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://orsdqaeqqobltrmpvtmj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yc2RxYWVxcW9ibHRybXB2dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDc5MDQsImV4cCI6MjA2OTg4MzkwNH0.QhL8nm2-swoGTImb0Id-0WNjQOO9PC6O8wRo5ctpQ-Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      workers: {
        Row: {
          id: string;
          employee_id: string;
          name: string;
          department: string | null;
          position: string | null;
          is_packer: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          employee_id: string;
          name: string;
          department?: string | null;
          position?: string | null;
          is_packer?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          employee_id?: string;
          name?: string;
          department?: string | null;
          position?: string | null;
          is_packer?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      attendance_records: {
        Row: {
          id: string;
          worker_id: string;
          worker_name: string;
          date: string;
          status: 'present' | 'absent' | 'half_day';
          overtime: 'yes' | 'no';
          notes: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          worker_id: string;
          worker_name: string;
          date: string;
          status: 'present' | 'absent' | 'half_day';
          overtime?: 'yes' | 'no';
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          worker_id?: string;
          worker_name?: string;
          date?: string;
          status?: 'present' | 'absent' | 'half_day';
          overtime?: 'yes' | 'no';
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
    };
  };
}