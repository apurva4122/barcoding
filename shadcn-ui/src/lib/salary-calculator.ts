import { Worker, AttendanceRecord, Gender, AttendanceStatus } from "@/types";

/**
 * Calculate salary for a worker based on attendance records for the current month
 * 
 * Rules:
 * - Men: Monthly base salary, 10 hours daily, paid for Tuesday off, overtime is double hourly rate (1 hour extra)
 * - Women: Daily wage (base salary is daily), 9 hours daily, NOT paid for Tuesday off, overtime is double hourly rate (1 hour extra)
 */
export function calculateMonthlySalary(
  worker: Worker,
  attendanceRecords: AttendanceRecord[],
  month: number,
  year: number
): number {
  if (!worker.baseSalary || worker.baseSalary <= 0) {
    return 0;
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
 * Calculate salary for male workers
 * - Monthly base salary
 * - 10 hours daily schedule
 * - Paid for Tuesday off
 * - Overtime: double hourly rate, 1 hour extra
 */
function calculateMaleSalary(
  worker: Worker,
  records: AttendanceRecord[],
  month: number,
  year: number
): number {
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

  let totalSalary = 0;
  let presentDays = 0;
  let halfDays = 0;
  let overtimeHours = 0;

  records.forEach(record => {
    const date = new Date(record.date);
    const dayOfWeek = date.getDay();
    const isTuesday = dayOfWeek === 2;

    if (record.status === AttendanceStatus.PRESENT) {
      presentDays++;
      // Men get paid for Tuesday
      totalSalary += dailyRate;
      
      // Check for overtime
      if (record.overtime === 'yes') {
        overtimeHours += 1; // 1 hour extra
      }
    } else if (record.status === AttendanceStatus.HALF_DAY) {
      halfDays++;
      // Half day = half of daily rate
      totalSalary += dailyRate * 0.5;
      
      // Check for overtime (can still have overtime on half day)
      if (record.overtime === 'yes') {
        overtimeHours += 1;
      }
    }
    // Absent = no pay
  });

  // Add overtime pay (double hourly rate)
  const overtimePay = overtimeHours * hourlyRate * 2;
  totalSalary += overtimePay;

  return Math.round(totalSalary * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate salary for female workers
 * - Daily wage (base salary is daily)
 * - 9 hours daily schedule
 * - NOT paid for Tuesday off
 * - Overtime: double hourly rate, 1 hour extra
 */
function calculateFemaleSalary(
  worker: Worker,
  records: AttendanceRecord[],
  month: number,
  year: number
): number {
  const dailyWage = worker.baseSalary || 0;
  
  // Hourly rate = daily wage / 9 hours
  const hourlyRate = dailyWage / 9;

  let totalSalary = 0;
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
      totalSalary += dailyWage;
      
      // Check for overtime
      if (record.overtime === 'yes') {
        overtimeHours += 1; // 1 hour extra
      }
    } else if (record.status === AttendanceStatus.HALF_DAY) {
      // Half day = half of daily wage
      totalSalary += dailyWage * 0.5;
      
      // Check for overtime
      if (record.overtime === 'yes') {
        overtimeHours += 1;
      }
    }
    // Absent = no pay
  });

  // Add overtime pay (double hourly rate)
  const overtimePay = overtimeHours * hourlyRate * 2;
  totalSalary += overtimePay;

  return Math.round(totalSalary * 100) / 100; // Round to 2 decimal places
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

