import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, UserPlus, Users, Clock, Calendar } from 'lucide-react';
import { Worker, AttendanceRecord } from '../types';
import { 
  addWorker, 
  getWorkers, 
  updateWorkerAttendance, 
  deleteWorker,
  getAttendanceRecords,
  updateWorkerPackerStatus
} from '../lib/attendance-utils';

export function AttendanceManagement() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [isManageWorkersOpen, setIsManageWorkersOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workersData, attendanceData] = await Promise.all([
        getWorkers(),
        getAttendanceRecords()
      ]);
      setWorkers(workersData);
      setAttendanceRecords(attendanceData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorker = async () => {
    if (!newWorkerName.trim()) return;
    
    try {
      await addWorker(newWorkerName.trim());
      setNewWorkerName('');
      setIsAddWorkerOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error adding worker:', error);
    }
  };

  const handleAttendanceChange = async (workerId: string, field: 'isPresent' | 'isHalfDay' | 'hasOvertime', value: boolean) => {
    try {
      await updateWorkerAttendance(workerId, field, value);
      await loadData();
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  const handlePackerStatusChange = async (workerId: string, isPacker: boolean) => {
    try {
      await updateWorkerPackerStatus(workerId, isPacker);
      await loadData();
    } catch (error) {
      console.error('Error updating packer status:', error);
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    try {
      await deleteWorker(workerId);
      await loadData();
    } catch (error) {
      console.error('Error deleting worker:', error);
    }
  };

  const getTodayAttendance = (workerId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceRecords.find(record => 
      record.worker_id === workerId && record.date === today
    );
  };

  const getAttendanceStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords.filter(record => record.date === today);
    
    const present = todayRecords.filter(record => record.is_present).length;
    const absent = todayRecords.filter(record => !record.is_present).length;
    const halfDay = todayRecords.filter(record => record.is_half_day).length;
    const overtime = todayRecords.filter(record => record.has_overtime).length;
    
    return { present, absent, halfDay, overtime };
  };

  const stats = getAttendanceStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Present</p>
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">Absent</p>
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Half Day</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.halfDay}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Overtime</p>
                <p className="text-2xl font-bold text-blue-600">{stats.overtime}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Dialog open={isAddWorkerOpen} onOpenChange={setIsAddWorkerOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <UserPlus className="h-4 w-4" />
              Add Worker
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Worker</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="worker-name">Worker Name</Label>
                <Input
                  id="worker-name"
                  placeholder="Enter worker name"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddWorker()}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddWorkerOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddWorker} disabled={!newWorkerName.trim()}>
                  Add Worker
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isManageWorkersOpen} onOpenChange={setIsManageWorkersOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Manage Workers
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Workers & Attendance</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {workers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No workers found. Add some workers to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {workers.map((worker) => {
                    const attendance = getTodayAttendance(worker.id);
                    const isPresent = attendance?.is_present ?? true;
                    const isHalfDay = attendance?.is_half_day ?? false;
                    const hasOvertime = attendance?.has_overtime ?? false;
                    
                    return (
                      <Card key={worker.id} className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{worker.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant={isPresent ? "default" : "destructive"}>
                                {isPresent ? "Present" : "Absent"}
                              </Badge>
                              {isHalfDay && <Badge variant="secondary">Half Day</Badge>}
                              {hasOvertime && <Badge variant="outline">Overtime</Badge>}
                              {worker.is_packer && <Badge className="bg-purple-100 text-purple-800">Packer</Badge>}
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={isPresent}
                                  onCheckedChange={(checked) => 
                                    handleAttendanceChange(worker.id, 'isPresent', checked)
                                  }
                                />
                                <Label className="text-sm">Present</Label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={isHalfDay}
                                  onCheckedChange={(checked) => 
                                    handleAttendanceChange(worker.id, 'isHalfDay', checked)
                                  }
                                />
                                <Label className="text-sm">Half Day</Label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={hasOvertime}
                                  onCheckedChange={(checked) => 
                                    handleAttendanceChange(worker.id, 'hasOvertime', checked)
                                  }
                                />
                                <Label className="text-sm">Overtime</Label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={worker.is_packer}
                                  onCheckedChange={(checked) => 
                                    handlePackerStatusChange(worker.id, checked)
                                  }
                                />
                                <Label className="text-sm">Packer</Label>
                              </div>
                            </div>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="flex items-center gap-1">
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Worker</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {worker.name}? This will also remove all their attendance records. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteWorker(worker.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Today's Attendance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {workers.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No workers to display attendance for.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workers.map((worker) => {
                const attendance = getTodayAttendance(worker.id);
                const isPresent = attendance?.is_present ?? true;
                const isHalfDay = attendance?.is_half_day ?? false;
                const hasOvertime = attendance?.has_overtime ?? false;
                
                return (
                  <Card key={worker.id} className={`p-3 ${isPresent ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{worker.name}</h4>
                        <div className="flex gap-1 mt-1">
                          <Badge 
                            variant={isPresent ? "default" : "destructive"} 
                            className="text-xs"
                          >
                            {isPresent ? "Present" : "Absent"}
                          </Badge>
                          {isHalfDay && <Badge variant="secondary" className="text-xs">Half</Badge>}
                          {hasOvertime && <Badge variant="outline" className="text-xs">OT</Badge>}
                          {worker.is_packer && <Badge className="text-xs bg-purple-100 text-purple-800">Packer</Badge>}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}