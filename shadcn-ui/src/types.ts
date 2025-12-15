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
  DISPATCHED = "shipped",
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
  isCleaner?: boolean; // New field to designate if worker is a cleaner
  gender: Gender; // Male or Female
  baseSalary?: number; // Daily wage for women, monthly salary for men
  advanceCurrentMonth?: number; // Advance payment for current month
  advanceLastMonth?: number; // Advance payment for last month
  advanceDeduction?: number; // Deduction for advance payment from salary
  isActive?: boolean; // Whether worker is still active (not left company). Defaults to true
  createdAt: string;
}

export interface HygieneRecord {
  id: string;
  workerId: string;
  workerName: string;
  date: string; // YYYY-MM-DD format
  area: HygieneArea;
  photoUrl: string;
  notes?: string;
  createdAt: string;
}

export enum HygieneArea {
  TOILETS = "toilets",
  STORAGE_AREA = "storage_area",
  PACKAGING_AREA = "packaging_area",
  PROCESSING_AREA = "processing_area",
  OFFICE_AREA = "office_area"
}

export interface LabTestRecord {
  id: string;
  testType: LabTestType;
  category: LabTestCategory;
  productName: string;
  month: string; // YYYY-MM format
  fileUrl: string;
  notes?: string;
  createdAt: string;
}

export enum LabTestType {
  FINISHED_GOOD = "finished_good",
  RAW_MATERIAL = "raw_material"
}

export enum LabTestCategory {
  // Finished Goods
  TAMARIND_JELLY = "tamarind_jelly",
  MANGO_JELLY = "mango_jelly",
  POPSICLES = "popsicles",
  // Raw Materials
  WATER = "water",
  SUGAR = "sugar",
  TAMARIND = "tamarind"
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  workerName: string;
  date: string; // YYYY-MM-DD format
  status: AttendanceStatus;
  overtime: 'yes' | 'no';
  lateMinutes?: number; // Minutes late - will be deducted from overtime
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