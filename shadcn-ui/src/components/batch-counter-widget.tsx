"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  getAllBatchCounterData, 
  getLatestBatchCounterData, 
  getBatchCounterStatsLastHour,
  getMachineIds,
  type BatchCounterData,
  type BatchCounterStats
} from "@/lib/batch-counter-storage";
import { Activity, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface BatchCounterWidgetProps {
  machineId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function BatchCounterWidget({ 
  machineId, 
  autoRefresh = true, 
  refreshInterval = 5000 
}: BatchCounterWidgetProps) {
  const [batchData, setBatchData] = useState<BatchCounterData[]>([]);
  const [latestData, setLatestData] = useState<BatchCounterData | null>(null);
  const [stats, setStats] = useState<BatchCounterStats[]>([]);
  const [machineIds, setMachineIds] = useState<string[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>(machineId || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMachineIds();
  }, []);

  useEffect(() => {
    if (machineIds.length > 0 && !selectedMachine) {
      setSelectedMachine(machineIds[0]);
    }
  }, [machineIds]);

  useEffect(() => {
    if (selectedMachine) {
      loadData();
      
      if (autoRefresh) {
        const interval = setInterval(loadData, refreshInterval);
        return () => clearInterval(interval);
      }
    }
  }, [selectedMachine, autoRefresh, refreshInterval]);

  const loadMachineIds = async () => {
    try {
      const ids = await getMachineIds();
      setMachineIds(ids);
    } catch (err) {
      console.error('Error loading machine IDs:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get today's data for chart (last 100 readings)
      const todayData = await getAllBatchCounterData(selectedMachine, undefined, undefined, 100);
      setBatchData(todayData.reverse()); // Reverse to show chronological order

      // Get latest reading
      const latest = await getLatestBatchCounterData(selectedMachine);
      setLatestData(latest);

      // Get stats
      const statsData = await getBatchCounterStatsLastHour();
      const machineStats = statsData.find(s => s.machine_id === selectedMachine);
      if (machineStats) {
        setStats([machineStats]);
      }
    } catch (err) {
      console.error('Error loading batch counter data:', err);
      setError('Failed to load batch counter data');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading && !latestData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Batch Counter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !latestData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Batch Counter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-red-500">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!latestData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Batch Counter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No batch counter data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = batchData.map(item => ({
    time: formatTimestamp(item.timestamp),
    count: item.batch_count,
    rate: item.production_rate || 0
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Batch Counter
            </CardTitle>
            <CardDescription>
              Real-time production monitoring
            </CardDescription>
          </div>
          {machineIds.length > 1 && (
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              {machineIds.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Current Count</p>
            <p className="text-2xl font-bold">{latestData.batch_count.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Production Rate</p>
            <p className="text-2xl font-bold flex items-center gap-1">
              {latestData.production_rate ? `${latestData.production_rate.toFixed(1)}/hr` : 'N/A'}
              {latestData.production_rate && <TrendingUp className="h-4 w-4 text-green-500" />}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge className={getStatusColor(latestData.status)}>
              {latestData.status}
            </Badge>
          </div>
        </div>

        {/* Last Update */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Last update: {formatTimestamp(latestData.timestamp)}</span>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Batch Count Trend</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                  name="Batch Count"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Stats for Last Hour */}
        {stats.length > 0 && stats[0] && (
          <div className="pt-4 border-t space-y-2">
            <h4 className="text-sm font-medium">Last Hour Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Readings: </span>
                <span className="font-medium">{stats[0].total_readings}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Rate: </span>
                <span className="font-medium">
                  {stats[0].avg_production_rate ? `${stats[0].avg_production_rate.toFixed(1)}/hr` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


