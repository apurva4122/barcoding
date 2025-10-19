import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface HorizontalBarChartProps {
  title: string;
  data: BarChartData[];
  maxValue?: number;
  height?: number;
}

export function HorizontalBarChart({ title, data, maxValue, height = 300 }: HorizontalBarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value)) || 1;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" style={{ height: `${height}px` }}>
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No data available
            </div>
          ) : (
            data.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {item.value}
                  </span>
                </div>
                <div className="relative">
                  <div className="h-8 bg-muted rounded-lg overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        item.color || 'bg-blue-500'
                      }`}
                      style={{
                        width: `${(item.value / max) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}