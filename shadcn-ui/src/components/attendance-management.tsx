import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Worker, AttendanceRecord, AttendanceStatus, Gender } from "@/types";
import { getAllWorkers, getAllAttendance, saveWorker, saveAttendance, toggleOvertimeForWorker, deleteWorker } from "@/lib/attendance-utils";
import { Plus, Users, UserCheck, UserX, Clock, Download, AlertCircle, UserPlus, Package, Trash2, AlertTriangle, CheckCircle2, Lock, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface AttendanceManagementProps {
  onAttendanceUpdate?: () => void;
}

export function AttendanceManagement({ onAttendanceUpdate }: AttendanceManagementProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Worker form
  const [workerForm, setWorkerForm] = useState({
    name: "",
    employeeId: "",
    department: "",
    position: "",
    isPacker: false,
    gender: Gender.MALE,
    baseSalary: ""
  });

  // Salary edit state
  const [salaryEditState, setSalaryEditState] = useState<{
    workerId: string | null;
    password: string;
    newSalary: string;
    showDialog: boolean;
  }>({
    workerId: null,
    password: "",
    newSalary: "",
    showDialog: false
  });

  // Password for editing salary (in production, this should be stored securely)
  const SALARY_EDIT_PASSWORD = "admin123"; // Change this to your desired password

  // Attendance form
  const [attendanceForm, setAttendanceForm] = useState({
    workerId: "",
    status: AttendanceStatus.ABSENT, // Can be present, absent, or half-day
    notes: ""
  });

  // Delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    worker: Worker | null;
  }>({
    isOpen: false,
    worker: null
  });

  // Dialog states
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Load data when component mounts or date changes
  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      const [workersData, attendanceData] = await Promise.all([
        getAllWorkers(),
        getAllAttendance()
      ]);

      setWorkers(workersData);
      setAttendanceRecords(attendanceData);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add new worker
  const addWorker = async () => {
    if (!workerForm.name.trim() || !workerForm.employeeId.trim()) {
      setError("Name and Employee ID are required");
      return;
    }

    // Check for duplicate employee ID
    if (workers.some(w => w.employeeId === workerForm.employeeId.trim())) {
      setError("Employee ID already exists");
      return;
    }

    setFormLoading(true);
    try {
      const newWorker: Worker = {
        id: `worker-${Date.now()}`,
        name: workerForm.name.trim(),
        employeeId: workerForm.employeeId.trim(),
        department: workerForm.department.trim() || undefined,
        position: workerForm.position.trim() || undefined,
        isPacker: workerForm.isPacker,
        gender: workerForm.gender,
        baseSalary: workerForm.baseSalary ? parseFloat(workerForm.baseSalary) : undefined,
        createdAt: new Date().toISOString()
      };

      const success = await saveWorker(newWorker);

      if (success) {
        await loadData(); // Refresh data

        // Reset form
        setWorkerForm({
          name: "",
          employeeId: "",
          department: "",
          position: "",
          isPacker: false,
          gender: Gender.MALE,
          baseSalary: ""
        });
        setWorkerDialogOpen(false);
        setError(null);

        toast.success("Worker added successfully");

        if (onAttendanceUpdate) {
          onAttendanceUpdate();
        }
      } else {
        setError("Failed to add worker");
      }
    } catch (error) {
      console.error("Error adding worker:", error);
      setError("Failed to add worker");
    } finally {
      setFormLoading(false);
    }
  };

  // Delete worker
  const handleDeleteWorker = async () => {
    if (!deleteConfirmation.worker) return;

    setFormLoading(true);
    try {
      const success = await deleteWorker(deleteConfirmation.worker.id);

      if (success) {
        await loadData(); // Refresh data
        toast.success(`Worker ${deleteConfirmation.worker.name} deleted successfully`);

        if (onAttendanceUpdate) {
          onAttendanceUpdate();
        }
      } else {
        toast.error("Failed to delete worker");
      }
    } catch (error) {
      console.error("Error deleting worker:", error);
      toast.error("Failed to delete worker");
    } finally {
      setFormLoading(false);
      setDeleteConfirmation({ isOpen: false, worker: null });
    }
  };

  // Mark attendance (can be present, absent, or half-day)
  const markAttendance = async () => {
    if (!attendanceForm.workerId) {
      setError("Please select a worker");
      return;
    }

    setFormLoading(true);
    try {
      // Check if attendance already exists for this worker and date
      const existingRecord = attendanceRecords.find(
        r => r.workerId === attendanceForm.workerId && r.date === selectedDate
      );

      const worker = workers.find(w => w.id === attendanceForm.workerId);
      if (!worker) {
        setError("Worker not found");
        return;
      }

      let newRecord: AttendanceRecord;

      if (existingRecord) {
        // Update existing record
        newRecord = {
          ...existingRecord,
          status: attendanceForm.status,
          notes: attendanceForm.notes.trim() || undefined,
          updatedAt: new Date().toISOString()
        };

        // If changing to present, reset overtime if it was set (can be toggled separately)
        if (attendanceForm.status === AttendanceStatus.PRESENT && existingRecord.status === AttendanceStatus.ABSENT) {
          // Keep existing overtime status when changing from absent to present
        }

        toast.success(`Attendance updated to ${attendanceForm.status}`);
      } else {
        // Create new record
        newRecord = {
          id: `attendance-${Date.now()}`,
          workerId: attendanceForm.workerId,
          workerName: worker.name,
          date: selectedDate,
          status: attendanceForm.status,
          overtime: 'yes', // Default to 'yes' (overtime on by default)
          notes: attendanceForm.notes.trim() || undefined,
          createdAt: new Date().toISOString()
        };
        toast.success(`Attendance marked as ${attendanceForm.status}`);
      }

      const success = await saveAttendance(newRecord);

      if (success) {
        await loadData(); // Refresh data

        // Reset form
        setAttendanceForm({
          workerId: "",
          status: AttendanceStatus.PRESENT, // Default to present for next time
          notes: ""
        });
        setAttendanceDialogOpen(false);
        setError(null);

        if (onAttendanceUpdate) {
          onAttendanceUpdate();
        }
      } else {
        setError("Failed to mark attendance");
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      setError("Failed to mark attendance");
    } finally {
      setFormLoading(false);
    }
  };

  // Toggle overtime for a worker
  const handleOvertimeToggle = async (workerId: string) => {
    try {
      console.log('🔄 Toggling overtime for worker:', workerId, 'date:', selectedDate);
      const currentStatus = checkHasOvertime(workerId);
      const newStatus = !currentStatus;

      // Optimistically update UI
      setOvertimeStatus(prev => ({ ...prev, [workerId]: newStatus }));

      await toggleOvertimeForWorker(workerId, selectedDate);
      await loadData(); // Refresh data from Supabase

      // Reload overtime status after data refresh
      const { hasOvertimeForDate } = await import('@/lib/attendance-utils');
      const updatedStatus = await hasOvertimeForDate(workerId, selectedDate);
      setOvertimeStatus(prev => ({ ...prev, [workerId]: updatedStatus }));

      toast.success(`Overtime ${newStatus ? 'enabled' : 'disabled'} for this date and future dates`);

      if (onAttendanceUpdate) {
        onAttendanceUpdate();
      }
    } catch (error) {
      console.error("❌ Error toggling overtime:", error);
      // Revert optimistic update on error
      const currentStatus = checkHasOvertime(workerId);
      setOvertimeStatus(prev => ({ ...prev, [workerId]: currentStatus }));
      toast.error("Failed to update overtime status");
    }
  };

  // Toggle packer status for a worker (implemented locally since not in utils)
  const handlePackerToggle = async (workerId: string) => {
    try {
      const worker = workers.find(w => w.id === workerId);
      if (!worker) return;

      const updatedWorker = {
        ...worker,
        isPacker: !worker.isPacker
      };

      const success = await saveWorker(updatedWorker);
      if (success) {
        await loadData(); // Refresh data
        toast.success("Packer status updated");

        if (onAttendanceUpdate) {
          onAttendanceUpdate();
        }
      } else {
        toast.error("Failed to update packer status");
      }
    } catch (error) {
      console.error("Error toggling packer status:", error);
      toast.error("Failed to update packer status");
    }
  };

  // Get attendance for selected date
  const getDateAttendance = () => {
    return attendanceRecords.filter(record => record.date === selectedDate);
  };

  // Get worker status for selected date
  const getWorkerStatus = (workerId: string) => {
    const record = attendanceRecords.find(r => r.workerId === workerId && r.date === selectedDate);
    if (record) {
      return record.status;
    }
    return AttendanceStatus.PRESENT; // Default present
  };

  // State to track overtime status for each worker
  const [overtimeStatus, setOvertimeStatus] = useState<Record<string, boolean>>({});

  // Load overtime status from Supabase for all workers
  useEffect(() => {
    const loadOvertimeStatus = async () => {
      const statusMap: Record<string, boolean> = {};
      const { hasOvertimeForDate } = await import('@/lib/attendance-utils');

      for (const worker of workers) {
        try {
          const hasOvertime = await hasOvertimeForDate(worker.id, selectedDate);
          statusMap[worker.id] = hasOvertime;
        } catch (error) {
          console.error(`Error loading overtime for worker ${worker.id}:`, error);
          statusMap[worker.id] = true; // Default to 'yes'
        }
      }
      setOvertimeStatus(statusMap);
    };

    if (workers.length > 0 && selectedDate) {
      loadOvertimeStatus();
    }
  }, [workers, selectedDate, attendanceRecords]);

  // Check if worker has overtime for selected date
  const checkHasOvertime = (workerId: string) => {
    // First check the state map (from Supabase)
    if (overtimeStatus[workerId] !== undefined) {
      return overtimeStatus[workerId];
    }

    // Fallback to checking local records
    const record = attendanceRecords.find(r => {
      // Match by workerId (could be UUID or string ID)
      const workerMatch = r.workerId === workerId;
      if (!workerMatch) {
        const worker = workers.find(w => w.id === workerId);
        if (worker) {
          return attendanceRecords.some(ar => ar.workerId === worker.id && ar.date === selectedDate);
        }
      }
      return workerMatch && r.date === selectedDate;
    });

    // Default to 'yes' if no record found (overtime on by default)
    return record ? record.overtime === 'yes' : true;
  };

  // Get attendance summary
  const getAttendanceSummary = () => {
    const dateRecords = getDateAttendance();
    const total = workers.length;
    const absent = dateRecords.filter(r => r.status === AttendanceStatus.ABSENT).length;
    const halfDay = dateRecords.filter(r => r.status === AttendanceStatus.HALF_DAY).length;
    const present = total - absent - halfDay; // Default present unless marked otherwise
    const overtime = dateRecords.filter(r => r.overtime === 'yes').length;
    const packers = workers.filter(w => w.isPacker).length;

    // Calculate present packers
    const presentPackerIds = workers
      .filter(w => w.isPacker)
      .filter(w => {
        const record = dateRecords.find(r => r.workerId === w.id);
        return !record || (record.status !== AttendanceStatus.ABSENT && record.status !== AttendanceStatus.HALF_DAY);
      }).length;

    return { total, present, absent, halfDay, overtime, packers, presentPackers: presentPackerIds };
  };

  // Download attendance report
  const downloadReport = () => {
    if (workers.length === 0) {
      toast.error("No workers to export");
      return;
    }

    const csvContent = [
      "Employee ID,Name,Department,Position,Is Packer,Status,Overtime,Notes",
      ...workers.map(worker => {
        const record = attendanceRecords.find(r => r.workerId === worker.id && r.date === selectedDate);
        const status = getWorkerStatus(worker.id);
        const overtime = checkHasOvertime(worker.id) ? 'Yes' : 'No';
        const isPacker = worker.isPacker ? 'Yes' : 'No';
        return `${worker.employeeId},${worker.name},${worker.department || ''},${worker.position || ''},${isPacker},${status},${overtime},${record?.notes || ''}`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Attendance report downloaded");
  };

  const summary = getAttendanceSummary();

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Attendance Management</h2>
          <p className="text-muted-foreground">Workers are present by default unless marked absent or half-day. Only packers can be assigned barcodes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadReport} disabled={workers.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Date Selection and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Date Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="attendance-date">Select Date</Label>
                <Input
                  id="attendance-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance Summary ({selectedDate})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
                <div className="text-sm text-muted-foreground">Total Workers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.present}</div>
                <div className="text-sm text-muted-foreground">Present</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{summary.presentPackers}</div>
                <div className="text-sm text-muted-foreground">Present Packers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{summary.overtime}</div>
                <div className="text-sm text-muted-foreground">Overtime</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Add Worker */}
        <Dialog open={workerDialogOpen} onOpenChange={setWorkerDialogOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Add Worker
                </CardTitle>
                <CardDescription>
                  Register a new worker in the system
                </CardDescription>
              </CardHeader>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Worker</DialogTitle>
              <DialogDescription>
                Register a new worker to track their attendance.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="worker-name">Name *</Label>
                  <Input
                    id="worker-name"
                    value={workerForm.name}
                    onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                    placeholder="Worker name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker-id">Employee ID *</Label>
                  <Input
                    id="worker-id"
                    value={workerForm.employeeId}
                    onChange={(e) => setWorkerForm({ ...workerForm, employeeId: e.target.value })}
                    placeholder="EMP001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="worker-department">Department</Label>
                  <Input
                    id="worker-department"
                    value={workerForm.department}
                    onChange={(e) => setWorkerForm({ ...workerForm, department: e.target.value })}
                    placeholder="Department"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker-position">Position</Label>
                  <Input
                    id="worker-position"
                    value={workerForm.position}
                    onChange={(e) => setWorkerForm({ ...workerForm, position: e.target.value })}
                    placeholder="Position"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="worker-gender">Gender *</Label>
                  <Select
                    value={workerForm.gender}
                    onValueChange={(value) => setWorkerForm({ ...workerForm, gender: value as Gender })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Gender.MALE}>Male</SelectItem>
                      <SelectItem value={Gender.FEMALE}>Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker-salary">
                    Base Salary * ({workerForm.gender === Gender.MALE ? 'Monthly' : 'Daily'})
                  </Label>
                  <Input
                    id="worker-salary"
                    type="number"
                    step="0.01"
                    min="0"
                    value={workerForm.baseSalary}
                    onChange={(e) => setWorkerForm({ ...workerForm, baseSalary: e.target.value })}
                    placeholder={workerForm.gender === Gender.MALE ? "Monthly salary" : "Daily wage"}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is-packer"
                  checked={workerForm.isPacker}
                  onCheckedChange={(checked) => setWorkerForm({ ...workerForm, isPacker: checked })}
                />
                <Label htmlFor="is-packer" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Designate as Packer (can be assigned barcodes)
                </Label>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setWorkerDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addWorker} disabled={formLoading}>
                {formLoading ? "Adding..." : "Add Worker"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mark Attendance / Change Status */}
        <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Mark/Change Attendance
                </CardTitle>
                <CardDescription>
                  Mark attendance status or change existing status for {selectedDate}
                </CardDescription>
              </CardHeader>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark/Change Attendance</DialogTitle>
              <DialogDescription>
                Set or change attendance status for {selectedDate}. Workers are present by default unless marked otherwise.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="attendance-worker">Select Worker *</Label>
                <Select
                  value={attendanceForm.workerId}
                  onValueChange={(value) => {
                    const worker = workers.find(w => w.id === value);
                    const existingRecord = attendanceRecords.find(
                      r => r.workerId === value && r.date === selectedDate
                    );
                    setAttendanceForm({
                      ...attendanceForm,
                      workerId: value,
                      status: existingRecord?.status || AttendanceStatus.PRESENT
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((worker) => {
                      const record = attendanceRecords.find(
                        r => r.workerId === worker.id && r.date === selectedDate
                      );
                      const currentStatus = record?.status || AttendanceStatus.PRESENT;
                      return (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.name} ({worker.employeeId}) {worker.isPacker && '📦'}
                          {record && ` - Currently: ${currentStatus}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendance-status">Status *</Label>
                <Select
                  value={attendanceForm.status}
                  onValueChange={(value) => setAttendanceForm({ ...attendanceForm, status: value as AttendanceStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AttendanceStatus.PRESENT}>Present</SelectItem>
                    <SelectItem value={AttendanceStatus.ABSENT}>Absent</SelectItem>
                    <SelectItem value={AttendanceStatus.HALF_DAY}>Half Day</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select Present to mark someone as present (e.g., if marked absent by mistake)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendance-notes">Notes</Label>
                <Textarea
                  id="attendance-notes"
                  value={attendanceForm.notes}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                  placeholder="Optional notes"
                  rows={3}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={markAttendance} disabled={formLoading}>
                {formLoading ? "Saving..." : "Save Attendance"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmation.isOpen} onOpenChange={(open) => setDeleteConfirmation({ isOpen: open, worker: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Worker
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteConfirmation.worker?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This will permanently delete:
              <ul className="list-disc list-inside mt-2">
                <li>Worker profile and information</li>
                <li>All attendance records for this worker</li>
                <li>Any historical data associated with this worker</li>
              </ul>
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmation({ isOpen: false, worker: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteWorker} disabled={formLoading}>
              {formLoading ? "Deleting..." : "Delete Worker"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salary Edit Dialog */}
      <Dialog open={salaryEditState.showDialog} onOpenChange={(open) => {
        if (!open) {
          setSalaryEditState({
            workerId: null,
            password: "",
            newSalary: "",
            showDialog: false
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Edit Base Salary
            </DialogTitle>
            <DialogDescription>
              Enter password to edit base salary. This action is protected.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="salary-password">Password *</Label>
              <Input
                id="salary-password"
                type="password"
                value={salaryEditState.password}
                onChange={(e) => setSalaryEditState({ ...salaryEditState, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-salary">
                New Base Salary ({workers.find(w => w.id === salaryEditState.workerId)?.gender === Gender.MALE ? 'Monthly' : 'Daily'}) *
              </Label>
              <Input
                id="new-salary"
                type="number"
                step="0.01"
                min="0"
                value={salaryEditState.newSalary}
                onChange={(e) => setSalaryEditState({ ...salaryEditState, newSalary: e.target.value })}
                placeholder="Enter new salary"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSalaryEditState({
                workerId: null,
                password: "",
                newSalary: "",
                showDialog: false
              });
            }}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (salaryEditState.password !== SALARY_EDIT_PASSWORD) {
                setError("Incorrect password");
                return;
              }
              if (!salaryEditState.workerId || !salaryEditState.newSalary) {
                setError("Please enter a valid salary amount");
                return;
              }

              setFormLoading(true);
              setError(null);
              try {
                const worker = workers.find(w => w.id === salaryEditState.workerId);
                if (!worker) {
                  setError("Worker not found");
                  return;
                }

                const updatedWorker: Worker = {
                  ...worker,
                  baseSalary: parseFloat(salaryEditState.newSalary)
                };

                const success = await saveWorker(updatedWorker);
                if (success) {
                  await loadData();
                  setSalaryEditState({
                    workerId: null,
                    password: "",
                    newSalary: "",
                    showDialog: false
                  });
                  toast.success("Base salary updated successfully");
                } else {
                  setError("Failed to update salary");
                }
              } catch (error) {
                console.error("Error updating salary:", error);
                setError("Failed to update salary");
              } finally {
                setFormLoading(false);
              }
            }} disabled={formLoading}>
              {formLoading ? "Saving..." : "Save Salary"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Workers Attendance ({selectedDate})</CardTitle>
          <CardDescription>
            All workers are present by default. Toggle packer status, overtime, or mark absent/half-day as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Packer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((worker) => {
                  const status = getWorkerStatus(worker.id);
                  const hasOvertime = checkHasOvertime(worker.id);

                  return (
                    <TableRow key={worker.id}>
                      <TableCell className="font-mono">{worker.employeeId}</TableCell>
                      <TableCell className="font-medium">{worker.name}</TableCell>
                      <TableCell>
                        <Badge variant={(worker.gender || Gender.MALE) === Gender.MALE ? "default" : "secondary"}>
                          {(worker.gender || Gender.MALE) === Gender.MALE ? "Male" : "Female"}
                        </Badge>
                      </TableCell>
                      <TableCell>{worker.department || '-'}</TableCell>
                      <TableCell>{worker.position || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {worker.baseSalary
                              ? `₹${worker.baseSalary.toLocaleString()}${(worker.gender || Gender.MALE) === Gender.MALE ? '/month' : '/day'}`
                              : 'Not set'
                            }
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSalaryEditState({
                                workerId: worker.id,
                                password: "",
                                newSalary: worker.baseSalary?.toString() || "",
                                showDialog: true
                              });
                            }}
                            className="h-6 w-6 p-0"
                            title="Edit salary"
                          >
                            <Lock className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={worker.isPacker || false}
                            onCheckedChange={() => handlePackerToggle(worker.id)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {worker.isPacker ? '📦 Packer' : 'Not Packer'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              status === AttendanceStatus.PRESENT ? "default" :
                                status === AttendanceStatus.HALF_DAY ? "secondary" : "destructive"
                            }
                          >
                            {status}
                          </Badge>
                          {(status === AttendanceStatus.ABSENT || status === AttendanceStatus.HALF_DAY) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const existingRecord = attendanceRecords.find(
                                    r => r.workerId === worker.id && r.date === selectedDate
                                  );

                                  const updatedRecord: AttendanceRecord = {
                                    ...(existingRecord || {
                                      id: `attendance-${Date.now()}`,
                                      workerId: worker.id,
                                      workerName: worker.name,
                                      date: selectedDate,
                                      createdAt: new Date().toISOString()
                                    }),
                                    status: AttendanceStatus.PRESENT,
                                    overtime: existingRecord?.overtime || 'no',
                                    updatedAt: new Date().toISOString()
                                  };

                                  const success = await saveAttendance(updatedRecord);
                                  if (success) {
                                    await loadData();
                                    toast.success(`${worker.name} marked as present`);
                                    if (onAttendanceUpdate) {
                                      onAttendanceUpdate();
                                    }
                                  } else {
                                    toast.error("Failed to update attendance");
                                  }
                                } catch (error) {
                                  console.error("Error marking as present:", error);
                                  toast.error("Failed to update attendance");
                                }
                              }}
                              className="h-6 text-xs text-green-600 hover:text-green-700"
                              title="Mark as present"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Present
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={hasOvertime}
                            onCheckedChange={() => handleOvertimeToggle(worker.id)}
                            disabled={status === AttendanceStatus.ABSENT}
                          />
                          <span className="text-sm text-muted-foreground">
                            {hasOvertime ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmation({ isOpen: true, worker })}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No workers registered yet.</p>
              <p className="text-sm">Add workers to start tracking attendance.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}