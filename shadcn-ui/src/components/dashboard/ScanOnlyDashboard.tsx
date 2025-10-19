import React, { useState, useEffect } from 'react';
import { BarChart } from './BarChart';
import { HorizontalBarChart } from './HorizontalBarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllBarcodes } from '@/lib/storage';
import { getWorkerForBarcode } from '@/lib/supabase';
import { Barcode, PackingStatus } from '@/types';

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

export function ScanOnlyDashboard() {
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [assignments, setAssignments] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load barcodes
      const barcodesData = await getAllBarcodes();
      setBarcodes(barcodesData);

      // Load assignments using the same approach as BarcodeList
      const assignmentsMap: { [key: string]: string } = {};
      
      // Process barcodes in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < barcodesData.length; i += batchSize) {
        const batch = barcodesData.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (barcode) => {
          try {
            const workerName = await getWorkerForBarcode(barcode.code);
            return { code: barcode.code, worker: workerName };
          } catch (error) {
            console.error(`Error getting worker for barcode ${barcode.code}:`, error);
            return { code: barcode.code, worker: null };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // Update assignments map
        batchResults.forEach(result => {
          if (result.worker) {
            assignmentsMap[result.code] = result.worker;
          }
        });
      }
      
      setAssignments(assignmentsMap);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get date string (YYYY-MM-DD)
  const getDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Get yesterday's date
  const getYesterday = (): string => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return getDateString(yesterday);
  };

  // Get today's date
  const getToday = (): string => {
    return getDateString(new Date());
  };

  // Get last N days
  const getLastNDays = (n: number): string[] => {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(getDateString(date));
    }
    return days;
  };

  // 1. Yesterday's pending barcodes by worker
  const getYesterdayPendingByWorker = (): BarChartData[] => {
    const yesterday = getYesterday();
    const pendingBarcodes = barcodes.filter(barcode => {
      const barcodeDate = getDateString(new Date(barcode.createdAt));
      return barcodeDate === yesterday && barcode.status === PackingStatus.PENDING;
    });

    const workerCounts: { [key: string]: number } = {};
    pendingBarcodes.forEach(barcode => {
      const worker = assignments[barcode.code] || 'Unassigned';
      workerCounts[worker] = (workerCounts[worker] || 0) + 1;
    });

    return Object.entries(workerCounts)
      .map(([worker, count]) => ({
        label: worker,
        value: count,
        color: 'bg-orange-500'
      }))
      .sort((a, b) => b.value - a.value);
  };

  // 2. Today's pending barcodes by worker
  const getTodayPendingByWorker = (): BarChartData[] => {
    const today = getToday();
    const pendingBarcodes = barcodes.filter(barcode => {
      const barcodeDate = getDateString(new Date(barcode.createdAt));
      return barcodeDate === today && barcode.status === PackingStatus.PENDING;
    });

    const workerCounts: { [key: string]: number } = {};
    pendingBarcodes.forEach(barcode => {
      const worker = assignments[barcode.code] || 'Unassigned';
      workerCounts[worker] = (workerCounts[worker] || 0) + 1;
    });

    return Object.entries(workerCounts)
      .map(([worker, count]) => ({
        label: worker,
        value: count,
        color: 'bg-blue-500'
      }))
      .sort((a, b) => b.value - a.value);
  };

  // 3. Pending barcodes by date (last 5 days)
  const getPendingByDateLast5Days = (): BarChartData[] => {
    const last5Days = getLastNDays(5);
    
    return last5Days.map(date => {
      const count = barcodes.filter(barcode => {
        const barcodeDate = getDateString(new Date(barcode.createdAt));
        return barcodeDate === date && barcode.status === PackingStatus.PENDING;
      }).length;

      // Format date for display (MM/DD)
      const displayDate = new Date(date).toLocaleDateString('en-US', { 
        month: 'numeric', 
        day: 'numeric' 
      });

      return {
        label: displayDate,
        value: count,
        color: 'bg-green-500'
      };
    });
  };

  // 4. Total packed barcodes by worker
  const getPackedByWorker = (): BarChartData[] => {
    const packedBarcodes = barcodes.filter(barcode => 
      barcode.status === PackingStatus.PACKED
    );

    const workerCounts: { [key: string]: number } = {};
    packedBarcodes.forEach(barcode => {
      const worker = assignments[barcode.code] || 'Unassigned';
      workerCounts[worker] = (workerCounts[worker] || 0) + 1;
    });

    return Object.entries(workerCounts)
      .map(([worker, count]) => ({
        label: worker,
        value: count,
        color: 'bg-purple-500'
      }))
      .sort((a, b) => b.value - a.value);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  // Get total packed count
  const getTotalPackedCount = (): number => {
    return barcodes.filter(barcode => barcode.status === PackingStatus.PACKED).length;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">QR Code Analytics Dashboard</h2>
        <p className="text-muted-foreground">Real-time insights into your QR code operations</p>
      </div>
      
      <div className="space-y-8">
        {/* First row: Yesterday's pending and Last 5 days side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BarChart
            title="Yesterday's Pending QR Codes by Worker"
            data={getYesterdayPendingByWorker()}
          />
          
          <BarChart
            title="Pending QR Codes - Last 5 Days"
            data={getPendingByDateLast5Days()}
          />
        </div>
        
        {/* Second row: Total packed count */}
        <div className="w-full">
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Packed QR Codes</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600 mb-3">
                    {getTotalPackedCount()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total QR codes in packed state
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Third row: Today's pending (full width horizontal) */}
        <div className="w-full">
          <HorizontalBarChart
            title="Today's Pending QR Codes by Worker"
            data={getTodayPendingByWorker()}
            height={280}
          />
        </div>
      </div>
    </div>
  );
}