export interface Barcode {
  id: string;
  code: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  status: PackingStatus;
  weight?: string;
  packerName?: string;
  assignedWorker?: string;
  shippingLocation?: string;
  shippedAt?: string;
  qrCodeImage: string;
}

export enum PackingStatus {
  PENDING = "pending",
  PACKED = "packed",
  DISPATCHED = "dispatched",
  DELIVERED = "delivered"
}

export enum Gender {
  MALE = "male",
  FEMALE = "female"
}

export interface Worker {
  id: string;
  name: string;
  employeeId: string;
  department?: string;
  position?: string;
  isPacker: boolean; // New field to designate if worker is a packer
  gender: Gender; // Male or Female
  baseSalary?: number; // Daily wage for women, monthly salary for men
  advanceCurrentMonth?: number; // Advance payment for current month
  advanceLastMonth?: number; // Advance payment for last month
  advanceDeduction?: number; // Deduction for advance payment from salary
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  workerName: string;
  date: string; // YYYY-MM-DD format
  status: AttendanceStatus;
  overtime: 'yes' | 'no';
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export enum AttendanceStatus {
  PRESENT = "present",
  ABSENT = "absent",
  HALF_DAY = "half_day"
}

export enum OvertimeStatus {
  NO_OVERTIME = "no_overtime",
  OVERTIME = "overtime"
}