import { supabase } from './supabase-client';

export interface BatchCounterData {
  id: string;
  machine_id: string;
  batch_count: number;
  timestamp: string;
  production_rate: number | null;
  status: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface BatchCounterStats {
  machine_id: string;
  total_readings: number;
  max_count: number;
  min_count: number;
  avg_production_rate: number;
  last_update: string;
}

/**
 * Get all batch counter data with optional filters
 */
export async function getAllBatchCounterData(
  machineId?: string,
  startDate?: string,
  endDate?: string,
  limit: number = 1000
): Promise<BatchCounterData[]> {
  try {
    let query = supabase
      .from('batch_counter_data')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (machineId) {
      query = query.eq('machine_id', machineId);
    }

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching batch counter data:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllBatchCounterData:', error);
    return [];
  }
}

/**
 * Get latest batch counter data for a specific machine
 */
export async function getLatestBatchCounterData(
  machineId: string
): Promise<BatchCounterData | null> {
  try {
    const { data, error } = await supabase
      .from('batch_counter_data')
      .select('*')
      .eq('machine_id', machineId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching latest batch counter data:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getLatestBatchCounterData:', error);
    return null;
  }
}

/**
 * Get batch counter statistics for the last hour
 */
export async function getBatchCounterStatsLastHour(): Promise<BatchCounterStats[]> {
  try {
    const { data, error } = await supabase
      .from('batch_counter_stats_last_hour')
      .select('*');

    if (error) {
      console.error('Error fetching batch counter stats:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getBatchCounterStatsLastHour:', error);
    return [];
  }
}

/**
 * Get batch counter data for today
 */
export async function getTodayBatchCounterData(
  machineId?: string
): Promise<BatchCounterData[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString();

  return getAllBatchCounterData(machineId, startOfDay);
}

/**
 * Get unique machine IDs
 */
export async function getMachineIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('batch_counter_data')
      .select('machine_id')
      .order('machine_id');

    if (error) {
      console.error('Error fetching machine IDs:', error);
      return [];
    }

    // Get unique machine IDs
    const uniqueIds = [...new Set((data || []).map(item => item.machine_id))];
    return uniqueIds;
  } catch (error) {
    console.error('Error in getMachineIds:', error);
    return [];
  }
}


