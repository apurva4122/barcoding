"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Worker, AttendanceRecord, AttendanceStatus } from "@/types";
import { getAllWorkers, getAllAttendance, saveWorker, saveAttendance, toggleOvertimeForWorker, deleteWorker } from "@/lib/attendance-utils";
import { Plus, Users, UserCheck, UserX, Clock, Download, AlertCircle, UserPlus, Package, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";

interface AttendanceManagementProps {
  onAttendanceUpdate?: (attendance: AttendanceRecord[]) => void;
}

export function AttendanceManagement({ onAttendanceUpdate }: AttendanceManagementProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [showWorkerManagement, setShowWorkerManagement] = useState(false);
  
  const [workerForm, setWorkerForm] = useState({
    name: '',
    employeeId: '',
    department: '',
    position: '',
    isPacker: false
  });

  // Load workers and attendance data
  const loadData = async () => {
    try {
      setLoading(true);
      
      const [workersData, attendanceData] = await Promise.all([
        getAllWorkers(),
        getAllAttendance()
      ]);
      
      setWorkers(workersData);
      setAttendanceRecords(attendanceData);
      
      if (onAttendanceUpdate) {
        onAttendanceUpdate(attendanceData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Get attendance for selected date
  const getAttendanceForDate = (date: string): AttendanceRecord[] => {
    return attendanceRecords.filter(record => record.date === date);
  };

  // Get worker attendance status for a specific date
  const getWorkerAttendance = (workerId: string, date: string): AttendanceRecord | null => {
    return attendanceRecords.find(record => 
      record.workerId === workerId && record.date === date
    ) || null;
  };

  // Handle adding new worker
  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Add worker clicked', workerForm);
    
    if (!workerForm.name.trim() || !workerForm.employeeId.trim()) {
      toast.error('Name and Employee ID are required');
      return;
    }

    // Check for duplicate employee ID
    const existingWorker = workers.find(w => w.employeeId === workerForm.employeeId.trim());
    if (existingWorker) {
      toast.error('Employee ID already exists');
      return;
    }

    setFormLoading(true);
    try {
      const newWorker: Worker = {
        id: `worker-${Date.now()}`,
        name: workerForm.name.trim(),
        employeeId: workerForm.employeeId.trim(),
        department: workerForm.department.trim() || '',
        position: workerForm.position.trim() || '',
        isPacker: workerForm.isPacker,
        createdAt: new Date().toISOString()
      };

      console.log('Saving worker:', newWorker);
      const success = await saveWorker(newWorker);
      
      if (success) {
        setWorkers(prev => [...prev, newWorker]);
        setWorkerForm({
          name: '',
          employeeId: '',
          department: '',
          position: '',
          isPacker: false
        });
        toast.success('Worker added successfully');
        console.log('Worker added successfully');
      } else {
        toast.error('Failed to add worker');
      }
    } catch (error) {
      console.error('Error adding worker:', error);
      toast.error('Failed to add worker');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle deleting worker
  const handleDeleteWorker = async (workerId: string) => {
    if (!confirm('Are you sure you want to delete this worker? This will also remove all their attendance records.')) {
      return;
    }

    try {
      const success = await deleteWorker(workerId);
      if (success) {
        setWorkers(prev => prev.filter(w => w.id !== workerId));
        setAttendanceRecords(prev => prev.filter(r => r.workerId !== workerId));
        toast.success('Worker deleted successfully');
      } else {
        toast.error('Failed to delete worker');
      }
    } catch (error) {
      console.error('Error deleting worker:', error);
      toast.error('Failed to delete worker');
    }
  };

  // Handle attendance status change
  const handleAttendanceChange = async (workerId: string, status: AttendanceStatus) => {
    try {
      const worker = workers.find(w => w.id === workerId);
      if (!worker) return;

      const existingRecord = getWorkerAttendance(workerId, selectedDate);
      
      const attendanceRecord: AttendanceRecord = {
        id: existingRecord?.id || `attendance-${workerId}-${selectedDate}`,
        workerId,
        workerName: worker.name,
        date: selectedDate,
        status,
        overtime: existingRecord?.overtime || 'no',
        notes: existingRecord?.notes || '',
        createdAt: existingRecord?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await saveAttendance(attendanceRecord);
      
      if (success) {
        setAttendanceRecords(prev => {
          const filtered = prev.filter(r => !(r.workerId === workerId && r.date === selectedDate));
          return [...filtered, attendanceRecord];
        });

        if (onAttendanceUpdate) {
          const updatedRecords = attendanceRecords.filter(r => !(r.workerId === workerId && r.date === selectedDate));
          updatedRecords.push(attendanceRecord);
          onAttendanceUpdate(updatedRecords);
        }
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
    }
  };

  // Handle overtime toggle
  const handleOvertimeToggle = async (workerId: string) => {
    try {
      await toggleOvertimeForWorker(workerId, selectedDate);
      await loadData(); // Reload data to get updated records
    } catch (error) {
      console.error('Error updating overtime:', error);
      toast.error('Failed to update overtime');
    }
  };

  // Export attendance data
  const exportAttendance = () => {
    const dateAttendance = getAttendanceForDate(selectedDate);
    const csvContent = [
      ['Employee ID', 'Name', 'Department', 'Position', 'Status', 'Overtime', 'Notes'].join(','),
      ...dateAttendance.map(record => {
        const worker = workers.find(w => w.id === record.workerId);
        return [
          worker?.employeeId || '',
          record.workerName,
          worker?.department || '',
          worker?.position || '',
          record.status,
          record.overtime || 'no',
          record.notes || ''
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Attendance exported successfully');
  };

  const dateAttendance = getAttendanceForDate(selectedDate);
  const presentCount = dateAttendance.filter(r => r.status === AttendanceStatus.PRESENT).length;
  const absentCount = dateAttendance.filter(r => r.status === AttendanceStatus.ABSENT).length;
  const halfDayCount = dateAttendance.filter(r => r.status === AttendanceStatus.HALF_DAY).length;
  const packers = workers.filter(w => w.isPacker);

  const handleManageWorkersClick = () => {
    console.log('Manage workers clicked');
    setShowWorkerManagement(true);
  };

  const handleBackToAttendance = () => {
    console.log('Back to attendance clicked');
    setShowWorkerManagement(false);
  };

  // Worker Management View
  if (showWorkerManagement) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBackToAttendance}
              className="hover:bg-gray-50 transition-colors duration-200"
            >
              ← Back to Attendance
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Manage Workers</h2>
              <p className="text-sm text-gray-600">Add and manage your workers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium">{workers.length} Total Workers</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Worker Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add New Worker</CardTitle>
              <CardDescription>Add workers to track their attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddWorker} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={workerForm.name}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter worker name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="employeeId">Employee ID *</Label>
                    <Input
                      id="employeeId"
                      value={workerForm.employeeId}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, employeeId: e.target.value }))}
                      placeholder="Enter employee ID"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={workerForm.department}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, department: e.target.value }))}
                      placeholder="Enter department"
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={workerForm.position}
                      onChange={(e) => setWorkerForm(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="Enter position"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPacker"
                    checked={workerForm.isPacker}
                    onCheckedChange={(checked) => setWorkerForm(prev => ({ ...prev, isPacker: checked }))}
                  />
                  <Label htmlFor="isPacker" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Designate as Packer (for barcode assignment)
                  </Label>
                </div>

                <Button type="submit" disabled={formLoading} className="w-full">
                  {formLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Worker
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Workers List */}
          <Card>
            <CardHeader>
              <CardTitle>Workers List ({workers.length})</CardTitle>
              <CardDescription>Manage existing workers</CardDescription>
            </CardHeader>
            <CardContent>
              {workers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Workers Added</h3>
                  <p className="text-gray-600">Add your first worker to get started</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {workers.map((worker) => (
                    <div key={worker.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{worker.name}</h3>
                          {worker.isPacker && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <Package className="h-3 w-3 mr-1" />
                              Packer
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          ID: {worker.employeeId} • {worker.department} • {worker.position}
                        </p>
                        <p className="text-xs text-gray-500">
                          Added: {new Date(worker.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteWorker(worker.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main Attendance View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Management</h2>
          <p className="text-sm text-gray-600">Track daily worker attendance</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={handleManageWorkersClick}
            className="hover:bg-gray-50 transition-colors duration-200"
            style={{ position: 'relative', zIndex: 1 }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Workers
          </Button>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium">{workers.length} Workers</span>
            <Package className="h-5 w-5 text-blue-500 ml-4" />
            <span className="text-sm font-medium">{packers.length} Packers</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Attendance for {selectedDate}</CardTitle>
              <CardDescription>Track worker attendance and overtime</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <Button onClick={exportAttendance} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Present</p>
                <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <UserX className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">Absent</p>
                <p className="text-2xl font-bold text-red-600">{absentCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Half Day</p>
                <p className="text-2xl font-bold text-yellow-600">{halfDayCount}</p>
              </div>
            </div>
          </div>

          {workers.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Workers Found</h3>
              <p className="text-gray-600 mb-4">Add workers to start tracking attendance</p>
              <Button onClick={handleManageWorkersClick}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Workers
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {workers.map((worker) => {
                const attendance = getWorkerAttendance(worker.id, selectedDate);
                const hasOvertime = attendance?.overtime === 'yes';
                
                return (
                  <div key={worker.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{worker.name}</h3>
                          {worker.isPacker && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <Package className="h-3 w-3 mr-1" />
                              Packer
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          ID: {worker.employeeId} • {worker.department} • {worker.position}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`overtime-${worker.id}`} className="text-sm">
                          Overtime
                        </Label>
                        <Switch
                          id={`overtime-${worker.id}`}
                          checked={hasOvertime}
                          onCheckedChange={() => handleOvertimeToggle(worker.id)}
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={attendance?.status === AttendanceStatus.PRESENT ? "default" : "outline"}
                          onClick={() => handleAttendanceChange(worker.id, AttendanceStatus.PRESENT)}
                          className="text-xs"
                        >
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant={attendance?.status === AttendanceStatus.HALF_DAY ? "default" : "outline"}
                          onClick={() => handleAttendanceChange(worker.id, AttendanceStatus.HALF_DAY)}
                          className="text-xs"
                        >
                          Half Day
                        </Button>
                        <Button
                          size="sm"
                          variant={attendance?.status === AttendanceStatus.ABSENT ? "destructive" : "outline"}
                          onClick={() => handleAttendanceChange(worker.id, AttendanceStatus.ABSENT)}
                          className="text-xs"
                        >
                          Absent
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}