import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Barcode, PackingStatus } from "@/types";
import { getAllBarcodes } from "@/lib/storage";
import { getWorkers, getAttendanceRecords, getPresentWorkersForDate } from "@/lib/attendance-utils";
import { Package, Users, Clock, TrendingUp, CheckCircle, AlertCircle, XCircle, BarChart3 } from "lucide-react";

export function Dashboard() {
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [barcodesData, workersData, attendanceData] = await Promise.all([
        getAllBarcodes(),
        getWorkers(),
        getAttendanceRecords()
      ]);
      
      setBarcodes(barcodesData);
      setWorkers(workersData);
      setAttendanceRecords(attendanceData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Package Statistics
  const getPackageStats = () => {
    const total = barcodes.length;
    const pending = barcodes.filter(b => b.status === PackingStatus.PENDING).length;
    const packed = barcodes.filter(b => b.status === PackingStatus.PACKED).length;
    const dispatched = barcodes.filter(b => b.status === PackingStatus.DISPATCHED).length;
    const delivered = barcodes.filter(b => b.status === PackingStatus.DELIVERED).length;

    return { total, pending, packed, dispatched, delivered };
  };

  // Attendance Statistics
  const getAttendanceStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords.filter(r => r.date === today);
    
    const total = workers.length;
    const absent = todayRecords.filter(r => r.status === 'absent').length;
    const halfDay = todayRecords.filter(r => r.status === 'half_day').length;
    const present = total - absent - halfDay; // Default present
    const overtime = todayRecords.filter(r => r.overtime === 'yes').length;

    return { total, present, absent, halfDay, overtime };
  };

  // Daily Activity Data
  const getDailyActivity = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayBarcodes = barcodes.filter(b => 
        new Date(b.createdAt).toISOString().split('T')[0] === date
      );
      const dayAttendance = attendanceRecords.filter(r => r.date === date);
      
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        packages: dayBarcodes.length,
        attendance: dayAttendance.filter(r => r.status === 'present').length,
        packed: dayBarcodes.filter(b => b.status === PackingStatus.PACKED).length
      };
    });
  };

  // Status Distribution for Pie Chart
  const getStatusDistribution = () => {
    const stats = getPackageStats();
    return [
      { name: 'Pending', value: stats.pending, color: '#f59e0b' },
      { name: 'Packed', value: stats.packed, color: '#3b82f6' },
      { name: 'Dispatched', value: stats.dispatched, color: '#8b5cf6' },
      { name: 'Delivered', value: stats.delivered, color: '#10b981' }
    ].filter(item => item.value > 0);
  };

  // Worker Performance
  const getWorkerPerformance = () => {
    const workerStats = new Map();
    
    barcodes.forEach(barcode => {
      if (barcode.assignedWorker) {
        const current = workerStats.get(barcode.assignedWorker) || { 
          name: barcode.assignedWorker, 
          total: 0, 
          packed: 0, 
          delivered: 0 
        };
        current.total++;
        if (barcode.status === PackingStatus.PACKED) current.packed++;
        if (barcode.status === PackingStatus.DELIVERED) current.delivered++;
        workerStats.set(barcode.assignedWorker, current);
      }
    });

    return Array.from(workerStats.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };

  const packageStats = getPackageStats();
  const attendanceStats = getAttendanceStats();
  const dailyActivity = getDailyActivity();
  const statusDistribution = getStatusDistribution();
  const workerPerformance = getWorkerPerformance();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your package management and attendance system</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packageStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {packageStats.pending} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.present}</div>
            <p className="text-xs text-muted-foreground">
              of {attendanceStats.total} total workers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {packageStats.total > 0 ? Math.round(((packageStats.delivered) / packageStats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {packageStats.delivered} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overtime Workers</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.overtime}</div>
            <p className="text-xs text-muted-foreground">
              working overtime today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Daily Activity</TabsTrigger>
          <TabsTrigger value="status">Package Status</TabsTrigger>
          <TabsTrigger value="performance">Worker Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>7-Day Activity Overview</CardTitle>
              <CardDescription>Daily packages created and attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="packages" 
                    stackId="1"
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                    name="Packages Created"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="packed" 
                    stackId="2"
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.6}
                    name="Packages Packed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Package Status Distribution</CardTitle>
                <CardDescription>Current status of all packages</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Progress</CardTitle>
                <CardDescription>Package processing pipeline</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      Pending
                    </span>
                    <span className="text-sm text-muted-foreground">{packageStats.pending}</span>
                  </div>
                  <Progress value={packageStats.total > 0 ? (packageStats.pending / packageStats.total) * 100 : 0} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      Packed
                    </span>
                    <span className="text-sm text-muted-foreground">{packageStats.packed}</span>
                  </div>
                  <Progress value={packageStats.total > 0 ? (packageStats.packed / packageStats.total) * 100 : 0} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      Dispatched
                    </span>
                    <span className="text-sm text-muted-foreground">{packageStats.dispatched}</span>
                  </div>
                  <Progress value={packageStats.total > 0 ? (packageStats.dispatched / packageStats.total) * 100 : 0} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Delivered
                    </span>
                    <span className="text-sm text-muted-foreground">{packageStats.delivered}</span>
                  </div>
                  <Progress value={packageStats.total > 0 ? (packageStats.delivered / packageStats.total) * 100 : 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Worker Performance</CardTitle>
              <CardDescription>Most active workers by package handling</CardDescription>
            </CardHeader>
            <CardContent>
              {workerPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={workerPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#3b82f6" name="Total Packages" />
                    <Bar dataKey="packed" fill="#10b981" name="Packed" />
                    <Bar dataKey="delivered" fill="#8b5cf6" name="Delivered" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No worker performance data available yet.</p>
                  <p className="text-sm">Assign packages to workers to see performance metrics.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest package updates and attendance changes</CardDescription>
        </CardHeader>
        <CardContent>
          {barcodes.length > 0 ? (
            <div className="space-y-3">
              {barcodes
                .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
                .slice(0, 5)
                .map((barcode) => (
                  <div key={barcode.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      <div>
                        <p className="font-medium">{barcode.code}</p>
                        <p className="text-sm text-muted-foreground">{barcode.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        barcode.status === PackingStatus.DELIVERED ? "default" :
                        barcode.status === PackingStatus.DISPATCHED ? "secondary" :
                        barcode.status === PackingStatus.PACKED ? "outline" : "destructive"
                      }>
                        {barcode.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(barcode.updatedAt || barcode.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity.</p>
              <p className="text-sm">Start creating packages to see activity here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}