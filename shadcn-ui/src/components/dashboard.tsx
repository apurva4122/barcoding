"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "./dashboard/BarChart";
import { getAllWorkers, getAllAttendance } from "@/lib/attendance-utils";
import { Worker, AttendanceRecord, AttendanceStatus } from "@/types";
import { TrendingDown, TrendingUp, DollarSign, Calendar } from "lucide-react";

interface WorkerAbsenteeStats {
  workerId: string;
  workerName: string;
  employeeId: string;
  absentCount: number;
  presentCount: number;
  halfDayCount: number;
  totalDays: number;
  salary?: number; // Will be calculated in next prompt
}

export function Dashboard() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<string>("");

  useEffect(() => {
    loadData();
    // Set current month
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    setCurrentMonth(monthYear);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workersData, attendanceData] = await Promise.all([
        getAllWorkers(),
        getAllAttendance()
      ]);
      setWorkers(workersData);
      setAttendanceRecords(attendanceData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get current month date range
  const getCurrentMonthRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    return { startDate, endDate };
  };

  // Calculate absentee stats for each worker for current month
  const calculateAbsenteeStats = (): WorkerAbsenteeStats[] => {
    const { startDate, endDate } = getCurrentMonthRange();
    
    // Filter attendance records for current month
    const monthRecords = attendanceRecords.filter(record => {
      return record.date >= startDate && record.date <= endDate;
    });

    // Calculate stats for each worker
    const statsMap = new Map<string, WorkerAbsenteeStats>();

    // Initialize all workers
    workers.forEach(worker => {
      statsMap.set(worker.id, {
        workerId: worker.id,
        workerName: worker.name,
        employeeId: worker.employeeId,
        absentCount: 0,
        presentCount: 0,
        halfDayCount: 0,
        totalDays: 0,
        salary: undefined // Will be calculated later
      });
    });

    // Count attendance for each worker
    monthRecords.forEach(record => {
      const stats = statsMap.get(record.workerId);
      if (stats) {
        stats.totalDays++;
        if (record.status === AttendanceStatus.ABSENT) {
          stats.absentCount++;
        } else if (record.status === AttendanceStatus.PRESENT) {
          stats.presentCount++;
        } else if (record.status === AttendanceStatus.HALF_DAY) {
          stats.halfDayCount++;
        }
      }
    });

    return Array.from(statsMap.values());
  };

  // Get top 5 workers with highest absentees
  const getTop5HighestAbsentees = (): WorkerAbsenteeStats[] => {
    const stats = calculateAbsenteeStats();
    return stats
      .sort((a, b) => b.absentCount - a.absentCount)
      .slice(0, 5)
      .filter(stat => stat.absentCount > 0); // Only show workers with absentees
  };

  // Get top 5 workers with minimum absentees (most present)
  const getTop5MinimumAbsentees = (): WorkerAbsenteeStats[] => {
    const stats = calculateAbsenteeStats();
    return stats
      .sort((a, b) => {
        // Sort by absent count ascending, then by present count descending
        if (a.absentCount !== b.absentCount) {
          return a.absentCount - b.absentCount;
        }
        return b.presentCount - a.presentCount;
      })
      .slice(0, 5);
  };

  // Format data for bar chart
  const formatChartData = (stats: WorkerAbsenteeStats[], showAbsent: boolean = true) => {
    return stats.map(stat => ({
      label: stat.workerName,
      value: showAbsent ? stat.absentCount : stat.presentCount,
      color: showAbsent ? 'bg-red-500' : 'bg-green-500',
      employeeId: stat.employeeId,
      salary: stat.salary
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const top5Highest = getTop5HighestAbsentees();
  const top5Minimum = getTop5MinimumAbsentees();
  const highestChartData = formatChartData(top5Highest, true);
  const minimumChartData = formatChartData(top5Minimum, false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Attendance Dashboard</h2>
        <p className="text-muted-foreground mt-2">
          Monthly attendance statistics for {currentMonth}
        </p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Highest Absentees */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-500" />
                  Top 5 Highest Absentees
                </CardTitle>
                <CardDescription className="mt-1">
                  Workers with most absences this month
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {highestChartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No absentee data available for this month</p>
                </div>
              </div>
            ) : (
              <>
                <BarChart
                  title=""
                  data={highestChartData}
                  height={300}
                />
                {/* Salary Display */}
                <div className="mt-6 space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Salaries
                  </h4>
                  <div className="space-y-1">
                    {highestChartData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm py-1 border-b">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground">
                          {item.salary ? `₹${item.salary.toLocaleString()}` : 'Not set'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Minimum Absentees */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-green-500" />
                  Top 5 Minimum Absentees
                </CardTitle>
                <CardDescription className="mt-1">
                  Workers with best attendance this month
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {minimumChartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No attendance data available for this month</p>
                </div>
              </div>
            ) : (
              <>
                <BarChart
                  title=""
                  data={minimumChartData}
                  height={300}
                />
                {/* Salary Display */}
                <div className="mt-6 space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Salaries
                  </h4>
                  <div className="space-y-1">
                    {minimumChartData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm py-1 border-b">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground">
                          {item.salary ? `₹${item.salary.toLocaleString()}` : 'Not set'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Workers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Workers with Absences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {calculateAbsenteeStats().filter(s => s.absentCount > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Perfect Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {calculateAbsenteeStats().filter(s => s.absentCount === 0 && s.presentCount > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}