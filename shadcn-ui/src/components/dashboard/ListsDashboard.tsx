import React, { useState, useEffect } from 'react';
import { DateAxisBarChart } from './DateAxisBarChart';
import { getAllBarcodes } from '@/lib/storage';
import { Barcode, PackingStatus } from '@/types';

interface DateBarChartData {
  date: string;
  locations: { [location: string]: number };
  total: number;
}

export function ListsDashboard() {
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const barcodesData = await getAllBarcodes();
      console.log('[ListsDashboard] Total barcodes loaded:', barcodesData.length);
      
      // Log dispatched barcodes
      const dispatchedBarcodes = barcodesData.filter(b => b.status === PackingStatus.DISPATCHED);
      console.log('[ListsDashboard] Dispatched barcodes count:', dispatchedBarcodes.length);
      
      // Log sample dispatched barcode data
      if (dispatchedBarcodes.length > 0) {
        console.log('[ListsDashboard] Sample dispatched barcodes (first 5):', 
          dispatchedBarcodes.slice(0, 5).map(b => ({
            id: b.id,
            status: b.status,
            shippedAt: b.shippedAt,
            updatedAt: b.updatedAt,
            createdAt: b.createdAt,
            shippingLocation: b.shippingLocation
          }))
        );
      }
      
      setBarcodes(barcodesData);
    } catch (error) {
      console.error('[ListsDashboard] Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get date string (YYYY-MM-DD)
  const getDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
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

  // Shipped barcodes by date and location (last 10 days)
  const getShippedByDateAndLocation = (): DateBarChartData[] => {
    const last10Days = getLastNDays(10);
    console.log('[ListsDashboard] Last 10 days being checked:', last10Days);

    const chartData = last10Days.map(date => {
      // Get all dispatched barcodes for this specific date
      const dayBarcodes = barcodes.filter(barcode => {
        if (barcode.status !== PackingStatus.DISPATCHED) return false;

        // Use shippedAt if available, otherwise fall back to updatedAt or createdAt
        let relevantDate: Date;
        if (barcode.shippedAt) {
          relevantDate = new Date(barcode.shippedAt);
        } else if (barcode.updatedAt) {
          relevantDate = new Date(barcode.updatedAt);
        } else {
          relevantDate = new Date(barcode.createdAt);
        }

        const barcodeDate = getDateString(relevantDate);
        return barcodeDate === date;
      });

      // Log matching barcodes for this date
      if (dayBarcodes.length > 0) {
        console.log(`[ListsDashboard] Date ${date}: Found ${dayBarcodes.length} dispatched barcodes`, 
          dayBarcodes.map(b => ({
            id: b.id,
            shippedAt: b.shippedAt,
            updatedAt: b.updatedAt,
            createdAt: b.createdAt,
            shippingLocation: b.shippingLocation
          }))
        );
      }

      // Group by shipping location for this date
      const locations: { [key: string]: number } = {};
      dayBarcodes.forEach(barcode => {
        const location = barcode.shippingLocation || 'Unknown Location';
        locations[location] = (locations[location] || 0) + 1;
      });

      // Format date for display (MM/DD)
      const displayDate = new Date(date).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric'
      });

      return {
        date: displayDate,
        locations,
        total: dayBarcodes.length
      };
    });

    console.log('[ListsDashboard] Final chart data:', chartData);
    console.log('[ListsDashboard] Chart data summary:', {
      totalDates: chartData.length,
      datesWithData: chartData.filter(d => d.total > 0).length,
      totalBarcodes: chartData.reduce((sum, d) => sum + d.total, 0),
      locationsFound: [...new Set(chartData.flatMap(d => Object.keys(d.locations)))]
    });

    return chartData;
  };

  // Calculate chart data
  const chartData = getShippedByDateAndLocation();

  if (loading) {
    return (
      <div className="mb-6">
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  console.log('[ListsDashboard] Rendering chart with data:', chartData);

  return (
    <div className="mb-6">
      <DateAxisBarChart
        title="QR Codes Shipped by Date and Location - Last 10 Days"
        data={chartData}
        height={350}
      />
    </div>
  );
}
