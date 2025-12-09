import { Worker, AttendanceRecord, Gender, AttendanceStatus } from "@/types";

export interface SalaryCalculationResult {
  baseSalary: number;
  bonus: number;
  totalSalary: number;
  hasBonus: boolean;
}

/**
 * Calculate salary for a worker based on attendance records for the current month
 * 
 * Rules:
 * - Men: Monthly base salary, 10 hours daily, paid for Tuesday off, overtime is double hourly rate (1 hour extra)
 * - Women: Daily wage (base salary is daily), 9 hours daily, NOT paid for Tuesday off, overtime is double hourly rate (1 hour extra)
 * 
 * Attendance Bonus:
 * - Male: Rs. 1000 if all present, Rs. 500 if 1 absent, Rs. 0 if 2+ absent
 * - Female: Rs. 500 if all present, Rs. 250 if 1 absent, Rs. 0 if 2+ absent
 * - Half day logic: 1 half day = no deduction, 2 half days = 1 full day absent (half bonus), 4 half days = 2 full days absent (no bonus)
 */
export function calculateMonthlySalary(
  worker: Worker,
  attendanceRecords: AttendanceRecord[],
  month: number,
  year: number
): SalaryCalculationResult {
  if (!worker.baseSalary || worker.baseSalary <= 0) {
    return { baseSalary: 0, bonus: 0, totalSalary: 0, hasBonus: false };
  }

  // Get date range for the month
  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

  // Filter attendance records for this month
  const monthRecords = attendanceRecords.filter(record => {
    return record.date >= startDate && record.date <= endDate && record.workerId === worker.id;
  });

  if (worker.gender === Gender.MALE) {
    return calculateMaleSalary(worker, monthRecords, month, year);
  } else {
    return calculateFemaleSalary(worker, monthRecords, month, year);
  }
}

/**
 * Calculate attendance bonus based on absent days and half days
 * 
 * Rules:
 * - 1 half day = no deduction
 * - 2 half days = 1 full day absent (half bonus)
 * - 4 half days = 2 full days absent (no bonus)
 */
function calculateAttendanceBonus(
  absentDays: number,
  halfDays: number,
  isMale: boolean
): number {
  // Convert half days to absent days: 2 half days = 1 absent day
  const halfDaysAsAbsent = Math.floor(halfDays / 2);
  const totalAbsentDays = absentDays + halfDaysAsAbsent;

  if (isMale) {
    // Male: Rs. 1000 if all present, Rs. 500 if 1 absent, Rs. 0 if 2+ absent
    if (totalAbsentDays === 0) {
      return 1000;
    } else if (totalAbsentDays === 1) {
      return 500;
    } else {
      return 0;
    }
  } else {
    // Female: Rs. 500 if all present, Rs. 250 if 1 absent, Rs. 0 if 2+ absent
    if (totalAbsentDays === 0) {
      return 500;
    } else if (totalAbsentDays === 1) {
      return 250;
    } else {
      return 0;
    }
  }
}

/**
 * Calculate salary for male workers
 * - Monthly base salary
 * - 10 hours daily schedule
 * - Paid for Tuesday off
 * - Overtime: double hourly rate, 1 hour extra
 * - Attendance bonus: Rs. 1000 if all present, Rs. 500 if 1 absent, Rs. 0 if 2+ absent
 */
function calculateMaleSalary(
  worker: Worker,
  records: AttendanceRecord[],
  month: number,
  year: number
): SalaryCalculationResult {
  const monthlySalary = worker.baseSalary || 0;

  // Calculate working days in the month (excluding Tuesdays)
  const totalDays = new Date(year, month + 1, 0).getDate();
  let workingDays = 0;
  let tuesdays = 0;

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 2) { // Tuesday
      tuesdays++;
    } else {
      workingDays++;
    }
  }

  // Daily rate = monthly salary / (working days + tuesdays) since men get paid for Tuesday
  const dailyRate = monthlySalary / (workingDays + tuesdays);

  // Hourly rate = daily rate / 10 hours
  const hourlyRate = dailyRate / 10;

  let baseSalary = 0;
  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let overtimeHours = 0;

  records.forEach(record => {
    const date = new Date(record.date);
    const dayOfWeek = date.getDay();
    const isTuesday = dayOfWeek === 2;

    if (record.status === AttendanceStatus.PRESENT) {
      presentDays++;
      // Men get paid for Tuesday
      baseSalary += dailyRate;

      // Check for overtime
      if (record.overtime === 'yes') {
        overtimeHours += 1; // 1 hour extra
      }
    } else if (record.status === AttendanceStatus.HALF_DAY) {
      halfDays++;
      // Half day = half of daily rate
      baseSalary += dailyRate * 0.5;

      // Check for overtime (can still have overtime on half day)
      if (record.overtime === 'yes') {
        overtimeHours += 1;
      }
    } else if (record.status === AttendanceStatus.ABSENT) {
      absentDays++;
    }
  });

  // Add overtime pay (double hourly rate)
  const overtimePay = overtimeHours * hourlyRate * 2;
  baseSalary += overtimePay;
  baseSalary = Math.round(baseSalary * 100) / 100; // Round to 2 decimal places

  // Calculate attendance bonus
  const bonus = calculateAttendanceBonus(absentDays, halfDays, true);
  const totalSalary = baseSalary + bonus;

  return {
    baseSalary,
    bonus,
    totalSalary: Math.round(totalSalary * 100) / 100,
    hasBonus: bonus > 0
  };
}

/**
 * Calculate salary for female workers
 * - Daily wage (base salary is daily)
 * - 9 hours daily schedule
 * - NOT paid for Tuesday off
 * - Overtime: double hourly rate, 1 hour extra
 * - Attendance bonus: Rs. 500 if all present, Rs. 250 if 1 absent, Rs. 0 if 2+ absent
 */
function calculateFemaleSalary(
  worker: Worker,
  records: AttendanceRecord[],
  month: number,
  year: number
): SalaryCalculationResult {
  const dailyWage = worker.baseSalary || 0;

  // Hourly rate = daily wage / 9 hours
  const hourlyRate = dailyWage / 9;

  let baseSalary = 0;
  let absentDays = 0;
  let halfDays = 0;
  let overtimeHours = 0;

  records.forEach(record => {
    const date = new Date(record.date);
    const dayOfWeek = date.getDay();
    const isTuesday = dayOfWeek === 2;

    // Women don't get paid for Tuesday off
    if (isTuesday) {
      return; // Skip Tuesday
    }

    if (record.status === AttendanceStatus.PRESENT) {
      baseSalary += dailyWage;

      // Check for overtime
      if (record.overtime === 'yes') {
        overtimeHours += 1; // 1 hour extra
      }
    } else if (record.status === AttendanceStatus.HALF_DAY) {
      halfDays++;
      // Half day = half of daily wage
      baseSalary += dailyWage * 0.5;

      // Check for overtime
      if (record.overtime === 'yes') {
        overtimeHours += 1;
      }
    } else if (record.status === AttendanceStatus.ABSENT) {
      absentDays++;
    }
  });

  // Add overtime pay (double hourly rate)
  const overtimePay = overtimeHours * hourlyRate * 2;
  baseSalary += overtimePay;
  baseSalary = Math.round(baseSalary * 100) / 100; // Round to 2 decimal places

  // Calculate attendance bonus
  const bonus = calculateAttendanceBonus(absentDays, halfDays, false);
  const totalSalary = baseSalary + bonus;

  return {
    baseSalary,
    bonus,
    totalSalary: Math.round(totalSalary * 100) / 100,
    hasBonus: bonus > 0
  };
}

/**
 * Get current month and year
 */
export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth(),
    year: now.getFullYear()
  };
}

