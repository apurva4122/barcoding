"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { BarChart } from "./dashboard/BarChart";
import { getAllWorkers, getAllAttendance } from "@/lib/attendance-utils";
import { getAllBarcodes } from "@/lib/storage";
import { getAllHygieneRecords, getHygieneRecordsByDate } from "@/lib/hygiene-storage";
import { Worker, AttendanceRecord, AttendanceStatus, Barcode, PackingStatus, HygieneRecord, HygieneArea } from "@/types";
import { calculateMonthlySalary, getCurrentMonthYear, type SalaryCalculationResult } from "@/lib/salary-calculator";
import { TrendingDown, TrendingUp, DollarSign, Calendar, Sparkles, Package, Users, CheckCircle2, XCircle } from "lucide-react";

interface WorkerAbsenteeStats {
  workerId: string;
  workerName: string;
  employeeId: string;
  absentCount: number;
  presentCount: number;
  halfDayCount: number;
  totalDays: number;
  salary: number; // Total monthly salary (base + bonus)
  salaryDetails: SalaryCalculationResult; // Detailed salary breakdown
}

export function Dashboard() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [hygieneRecords, setHygieneRecords] = useState<HygieneRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
    // Set current month
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    setCurrentMonth(monthYear);
  }, []);

  useEffect(() => {
    loadHygieneRecords();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Include inactive workers for salary calculations in dashboard
      const [workersData, attendanceData, barcodesData] = await Promise.all([
        getAllWorkers(true), // true = include inactive workers
        getAllAttendance(),
        getAllBarcodes()
      ]);
      setWorkers(workersData);
      setAttendanceRecords(attendanceData);
      setBarcodes(barcodesData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHygieneRecords = async () => {
    try {
      const records = await getHygieneRecordsByDate(selectedDate);
      setHygieneRecords(records);
    } catch (error) {
      console.error('Error loading hygiene records:', error);
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

  // Get last month date range
  const getLastMonthRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastMonth = month === 0 ? 11 : month - 1;
    const lastMonthYear = month === 0 ? year - 1 : year;
    const startDate = new Date(lastMonthYear, lastMonth, 1).toISOString().split('T')[0];
    const endDate = new Date(lastMonthYear, lastMonth + 1, 0).toISOString().split('T')[0];
    return { startDate, endDate };
  };

  // Calculate last month salaries for all workers
  const calculateLastMonthSalaries = (): WorkerAbsenteeStats[] => {
    const { month, year } = getCurrentMonthYear();
    const lastMonth = month === 0 ? 11 : month - 1;
    const lastMonthYear = month === 0 ? year - 1 : year;
    const { startDate, endDate } = getLastMonthRange();

    // Filter attendance records for last month
    const lastMonthRecords = attendanceRecords.filter(record => {
      return record.date >= startDate && record.date <= endDate;
    });

    // Calculate stats for each worker
    const statsMap = new Map<string, WorkerAbsenteeStats>();

    // Initialize all workers with last month salary
    workers.forEach(worker => {
      const salaryDetails = calculateMonthlySalary(worker, attendanceRecords, lastMonth, lastMonthYear);

      statsMap.set(worker.id, {
        workerId: worker.id,
        workerName: worker.name,
        employeeId: worker.employeeId,
        absentCount: 0,
        presentCount: 0,
        halfDayCount: 0,
        totalDays: 0,
        salary: salaryDetails.totalSalary,
        salaryDetails: salaryDetails
      });
    });

    // Count attendance for each worker in last month
    lastMonthRecords.forEach(record => {
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

    return Array.from(statsMap.values()).sort((a, b) => b.salary - a.salary);
  };

  // Calculate absentee stats for each worker for current month
  const calculateAbsenteeStats = (): WorkerAbsenteeStats[] => {
    const { startDate, endDate } = getCurrentMonthRange();
    const { month, year } = getCurrentMonthYear();

    // Filter attendance records for current month
    const monthRecords = attendanceRecords.filter(record => {
      return record.date >= startDate && record.date <= endDate;
    });

    // Calculate stats for each worker
    const statsMap = new Map<string, WorkerAbsenteeStats>();

    // Initialize all workers
    workers.forEach(worker => {
      // Calculate salary for this worker
      const salaryDetails = calculateMonthlySalary(worker, attendanceRecords, month, year);

      statsMap.set(worker.id, {
        workerId: worker.id,
        workerName: worker.name,
        employeeId: worker.employeeId,
        absentCount: 0,
        presentCount: 0,
        halfDayCount: 0,
        totalDays: 0,
        salary: salaryDetails.totalSalary,
        salaryDetails: salaryDetails
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
      salary: stat.salary || 0,
      salaryDetails: stat.salaryDetails
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

  // Calculate barcode scanning statistics
  const getBarcodeStats = () => {
    const total = barcodes.length;
    const pending = barcodes.filter(b => b.status === PackingStatus.PENDING).length;
    const packed = barcodes.filter(b => b.status === PackingStatus.PACKED).length;
    const dispatched = barcodes.filter(b => b.status === PackingStatus.DISPATCHED).length;
    const delivered = barcodes.filter(b => b.status === PackingStatus.DELIVERED).length;

    // Today's scanning activity
    const today = new Date().toISOString().split('T')[0];
    const todayScanned = barcodes.filter(b => {
      const updatedDate = b.updatedAt ? new Date(b.updatedAt).toISOString().split('T')[0] : null;
      return updatedDate === today;
    }).length;

    return { total, pending, packed, dispatched, delivered, todayScanned };
  };

  // Calculate hygiene check status
  const getHygieneStatus = () => {
    const areas = [
      HygieneArea.TOILETS,
      HygieneArea.STORAGE_AREA,
      HygieneArea.PACKAGING_AREA,
      HygieneArea.PROCESSING_AREA,
      HygieneArea.OFFICE_AREA
    ];

    const completed = areas.filter(area =>
      hygieneRecords.some(record => record.area === area)
    ).length;

    return { total: areas.length, completed, pending: areas.length - completed };
  };

  const barcodeStats = getBarcodeStats();
  const hygieneStatus = getHygieneStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-2">
          Overview of attendance, hygiene checks, and barcode scanning progress
        </p>
      </div>

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="hygiene" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Hygiene Checks
          </TabsTrigger>
          <TabsTrigger value="barcode" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Barcode Scanning
          </TabsTrigger>
        </TabsList>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6">

          {/* All Workers Salaries Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                All Workers Salaries - {currentMonth}
              </CardTitle>
              <CardDescription>
                Complete salary breakdown for all workers including attendance bonus
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workers.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No workers found
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {calculateAbsenteeStats()
                    .sort((a, b) => b.salary - a.salary) // Sort by salary descending
                    .map((stat) => {
                      const worker = workers.find(w => w.id === stat.workerId);
                      const hasBonus = stat.salaryDetails?.hasBonus || false;
                      const bonus = stat.salaryDetails?.bonus || 0;
                      const baseSalary = stat.salaryDetails?.baseSalary || 0;
                      return (
                        <div key={stat.workerId} className="flex items-center justify-between py-3 border-b">
                          <div className="flex-1">
                            <div className="font-medium">{stat.workerName}</div>
                            <div className="text-sm text-muted-foreground">
                              {stat.employeeId} • {stat.presentCount} present, {stat.absentCount} absent, {stat.halfDayCount} half day
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              ₹{stat.salary.toLocaleString()}
                              {hasBonus && (
                                <span className="text-green-600 text-sm font-normal ml-1">
                                  (+₹{bonus.toLocaleString()} bonus)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Base: ₹{baseSalary.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

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
                        {highestChartData.map((item, index) => {
                          const worker = workers.find(w => w.name === item.label);
                          const stat = top5Highest.find(s => s.workerName === item.label);
                          const hasBonus = stat?.salaryDetails?.hasBonus || false;
                          const bonus = stat?.salaryDetails?.bonus || 0;
                          return (
                            <div key={index} className="flex items-center justify-between text-sm py-1 border-b">
                              <span className="font-medium">{item.label}</span>
                              <span className="text-muted-foreground">
                                ₹{item.salary?.toLocaleString() || '0'}
                                {hasBonus && (
                                  <span className="text-green-600 ml-1">
                                    (+₹{bonus.toLocaleString()} bonus)
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
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
                        {minimumChartData.map((item, index) => {
                          const worker = workers.find(w => w.name === item.label);
                          const stat = top5Minimum.find(s => s.workerName === item.label);
                          const hasBonus = stat?.salaryDetails?.hasBonus || false;
                          const bonus = stat?.salaryDetails?.bonus || 0;
                          return (
                            <div key={index} className="flex items-center justify-between text-sm py-1 border-b">
                              <span className="font-medium">{item.label}</span>
                              <span className="text-muted-foreground">
                                ₹{item.salary?.toLocaleString() || '0'}
                                {hasBonus && (
                                  <span className="text-green-600 ml-1">
                                    (+₹{bonus.toLocaleString()} bonus)
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
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

          {/* Last Month Salaries by Worker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Last Month Salaries (Labour-wise)
              </CardTitle>
              <CardDescription>
                Individual worker salaries for the previous month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workers.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No workers found
                </div>
              ) : (
                <div className="space-y-2">
                  {calculateLastMonthSalaries().map((stat) => {
                    const worker = workers.find(w => w.id === stat.workerId);
                    return (
                      <div key={stat.workerId} className="flex items-center justify-between py-2 border-b">
                        <div className="flex-1">
                          <div className="font-medium">{stat.workerName}</div>
                          <div className="text-sm text-muted-foreground">{stat.employeeId}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            ₹{stat.salary.toLocaleString()}
                            {stat.salaryDetails?.hasBonus && (
                              <span className="text-green-600 text-sm font-normal ml-1">
                                (+₹{stat.salaryDetails.bonus.toLocaleString()} bonus)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {stat.presentCount} present, {stat.absentCount} absent
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hygiene Checks Tab */}
        <TabsContent value="hygiene" className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">Hygiene Checks Progress</h3>
            <p className="text-muted-foreground mt-2">
              Daily hygiene check status for {new Date(selectedDate).toLocaleDateString()}
            </p>
          </div>

          {/* Date Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="max-w-xs"
              />
            </CardContent>
          </Card>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Hygiene Check Status
              </CardTitle>
              <CardDescription>
                {hygieneStatus.completed} of {hygieneStatus.total} areas completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {hygieneStatus.completed}/{hygieneStatus.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${(hygieneStatus.completed / hygieneStatus.total) * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {[
                  { value: HygieneArea.TOILETS, label: "Clean Toilets" },
                  { value: HygieneArea.STORAGE_AREA, label: "Cleaned Storage Area" },
                  { value: HygieneArea.PACKAGING_AREA, label: "Cleaned Packaging Area" },
                  { value: HygieneArea.PROCESSING_AREA, label: "Cleaned Processing Area" },
                  { value: HygieneArea.OFFICE_AREA, label: "Clean Office Area" },
                ].map((area) => {
                  const record = hygieneRecords.find(r => r.area === area.value);
                  const completed = !!record;
                  return (
                    <div
                      key={area.value}
                      className={`p-4 border rounded-lg flex items-center justify-between ${completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <div className="font-medium">{area.label}</div>
                          {record && (
                            <div className="text-xs text-muted-foreground">
                              By {record.workerName}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Records */}
          {hygieneRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Records</CardTitle>
                <CardDescription>
                  Latest hygiene records for {new Date(selectedDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {hygieneRecords.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={record.photoUrl}
                          alt={record.area}
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold">
                            {[
                              { value: HygieneArea.TOILETS, label: "Clean Toilets" },
                              { value: HygieneArea.STORAGE_AREA, label: "Cleaned Storage Area" },
                              { value: HygieneArea.PACKAGING_AREA, label: "Cleaned Packaging Area" },
                              { value: HygieneArea.PROCESSING_AREA, label: "Cleaned Processing Area" },
                              { value: HygieneArea.OFFICE_AREA, label: "Clean Office Area" },
                            ].find(a => a.value === record.area)?.label || record.area}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            By {record.workerName} • {new Date(record.createdAt).toLocaleString()}
                          </p>
                          {record.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{record.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Barcode Scanning Tab */}
        <TabsContent value="barcode" className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">Barcode Scanning Progress</h3>
            <p className="text-muted-foreground mt-2">
              Overview of package scanning and status distribution
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Packages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{barcodeStats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{barcodeStats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Dispatched</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{barcodeStats.dispatched}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today Scanned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{barcodeStats.todayScanned}</div>
              </CardContent>
            </Card>
          </div>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Package Status Distribution
              </CardTitle>
              <CardDescription>
                Current status breakdown of all packages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span>Pending</span>
                  </div>
                  <span className="font-medium">{barcodeStats.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>Packed</span>
                  </div>
                  <span className="font-medium">{barcodeStats.packed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-500 rounded"></div>
                    <span>Dispatched</span>
                  </div>
                  <span className="font-medium">{barcodeStats.dispatched}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Delivered</span>
                  </div>
                  <span className="font-medium">{barcodeStats.delivered}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}