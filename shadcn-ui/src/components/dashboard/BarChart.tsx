import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  title: string;
  data: BarChartData[];
  maxValue?: number;
  height?: number;
}

export function BarChart({ title, data, maxValue, height = 200 }: BarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value)) || 1;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3" style={{ height: `${height}px` }}>
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No data available
            </div>
          ) : (
            data.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-20 text-xs text-right font-mono text-muted-foreground truncate">
                  {item.label}
                </div>
                <div className="flex-1 relative">
                  <div className="h-6 bg-muted rounded-sm overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        item.color || 'bg-primary'
                      }`}
                      style={{
                        width: `${(item.value / max) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="absolute right-2 top-0 h-6 flex items-center">
                    <span className="text-xs font-medium text-foreground">
                      {item.value}
                    </span>
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