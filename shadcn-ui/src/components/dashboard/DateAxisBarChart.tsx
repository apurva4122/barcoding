import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DateBarChartData {
  date: string;
  locations: { [location: string]: number };
  total: number;
}

interface DateAxisBarChartProps {
  title: string;
  data: DateBarChartData[];
  height?: number;
}

// Generate distinct colors for locations
const generateColor = (index: number): string => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
    'bg-red-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500',
    'bg-teal-500', 'bg-cyan-500'
  ];
  return colors[index % colors.length];
};

export function DateAxisBarChart({ title, data, height = 300 }: DateAxisBarChartProps) {
  // Get all unique locations across all dates
  const allLocations = Array.from(
    new Set(data.flatMap(d => Object.keys(d.locations)))
  );
  
  const maxValue = Math.max(...data.map(d => d.total)) || 1;
  
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
            <>
              {/* Legend */}
              <div className="flex flex-wrap gap-2 mb-4">
                {allLocations.map((location, index) => (
                  <div key={location} className="flex items-center gap-1">
                    <div className={`w-3 h-3 ${generateColor(index)} rounded-sm`} />
                    <span className="text-xs text-muted-foreground">{location}</span>
                  </div>
                ))}
              </div>
              
              {/* Chart */}
              <div className="flex items-end justify-between gap-2 h-48">
                {data.map((item, dateIndex) => (
                  <div key={dateIndex} className="flex flex-col items-center flex-1">
                    {/* Stacked bars */}
                    <div className="relative flex flex-col justify-end w-full h-32 mb-2">
                      <div className="w-full bg-muted rounded-sm overflow-hidden" style={{ height: '100%' }}>
                        {allLocations.map((location, locationIndex) => {
                          const count = item.locations[location] || 0;
                          const percentage = item.total > 0 ? (count / item.total) * 100 : 0;
                          
                          if (count === 0) return null;
                          
                          return (
                            <div
                              key={location}
                              className={`w-full ${generateColor(locationIndex)} transition-all duration-300`}
                              style={{ height: `${percentage}%` }}
                              title={`${location}: ${count}`}
                            />
                          );
                        })}
                      </div>
                      
                      {/* Total count label */}
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                        <span className="text-xs font-medium text-foreground">
                          {item.total}
                        </span>
                      </div>
                    </div>
                    
                    {/* Date label */}
                    <div className="text-xs text-muted-foreground text-center">
                      {item.date}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}