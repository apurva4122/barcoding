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
      setBarcodes(barcodesData);
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

    const chartData = last10Days.map(date => {
      // Get all shipped barcodes (those with shippedAt field set) for this specific date
      const dayBarcodes = barcodes.filter(barcode => {
        // Only include barcodes that have been shipped (have shippedAt field)
        if (!barcode.shippedAt) return false;

        // Use shippedAt date for filtering
        const shippedDate = new Date(barcode.shippedAt);
        const barcodeDate = getDateString(shippedDate);
        return barcodeDate === date;
      });

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

    // Debug logging
    console.log('📊 Chart data:', chartData);
    console.log('📦 Total barcodes:', barcodes.length);
    console.log('📦 Shipped barcodes (with shippedAt):', barcodes.filter(b => b.shippedAt).length);

    return chartData;
  };

  if (loading) {
    return (
      <div className="mb-6">
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const chartData = getShippedByDateAndLocation();
  const hasData = chartData.some(item => item.total > 0);

  return (
    <div className="mb-6">
      <DateAxisBarChart
        title="QR Codes Shipped by Date and Location - Last 10 Days"
        data={chartData}
        height={350}
      />
      {!hasData && barcodes.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          <p>No shipped QR codes found in the last 10 days.</p>
          <p className="text-xs mt-1">Total barcodes: {barcodes.length} | Shipped (with shippedAt): {barcodes.filter(b => b.shippedAt).length}</p>
        </div>
      )}
    </div>
  );
}