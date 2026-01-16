import { Worker, AttendanceRecord, Gender, AttendanceStatus } from "@/types";

const formatYMD = (year: number, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const formatDateYMD = (date: Date): string => {
  return formatYMD(date.getFullYear(), date.getMonth(), date.getDate());
};

const normalizeRecordDate = (dateValue: string): string => {
  return dateValue.split("T")[0];
};

export interface SalaryCalculationResult {
  baseSalary: number;
  bonus: number;
  overtimeCompensation: number; // Overtime pay after late minutes deduction
  lateMinutesDeduction: number; // Amount deducted due to late minutes (in rupees)
  totalLateMinutes: number; // Total late minutes for the month
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
  year: number,
  defaultOvertime?: boolean // Optional: worker's default OT setting
): SalaryCalculationResult {
  if (!worker.baseSalary || worker.baseSalary <= 0) {
    return {
      baseSalary: 0,
      bonus: 0,
      overtimeCompensation: 0,
      lateMinutesDeduction: 0,
      totalLateMinutes: 0,
      totalSalary: 0,
      hasBonus: false
    };
  }

  // Get date range for the month
  const startDate = formatYMD(year, month, 1);
  const endDate = formatYMD(year, month, new Date(year, month + 1, 0).getDate());

  // If worker is inactive, stop calculations from inactive date
  let effectiveEndDate = endDate;
  if (worker.isActive === false && worker.inactiveDate) {
    // Normalize inactive date to YYYY-MM-DD for safe comparisons
    const inactiveDateStr = normalizeRecordDate(worker.inactiveDate);
    // Use the earlier of: inactive date or end of month
    effectiveEndDate = inactiveDateStr < endDate ? inactiveDateStr : endDate;
  }

  // Filter attendance records for this month up to inactive date
  const monthRecords = attendanceRecords.filter(record => {
    // Normalize the record date to ensure consistent format
    const recordDateStr = normalizeRecordDate(record.date);
    // Ensure we're comparing normalized dates
    const normalizedStartDate = normalizeRecordDate(startDate);
    const normalizedEndDate = normalizeRecordDate(effectiveEndDate);
    return record.workerId === worker.id &&
      recordDateStr >= normalizedStartDate &&
      recordDateStr <= normalizedEndDate;
  });

  if (worker.gender === Gender.MALE) {
    return calculateMaleSalary(worker, monthRecords, month, year, defaultOvertime);
  } else {
    return calculateFemaleSalary(worker, monthRecords, month, year, defaultOvertime);
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
  year: number,
  defaultOvertime?: boolean
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
  let totalLateMinutes = 0; // Track total late minutes for overtime deduction

  // Create a map of records by date for quick lookup
  const recordsByDate = new Map<string, AttendanceRecord>();
  records.forEach(record => {
    recordsByDate.set(normalizeRecordDate(record.date), record);
  });

  // Get today's date to only process days up to today (including today) for current month
  // For past months, process all days in the month
  // But if worker is inactive, stop at inactive date
  const today = new Date();
  const todayStr = formatDateYMD(today);
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const endDate = formatYMD(year, month, new Date(year, month + 1, 0).getDate());

  // Determine the last day to process
  let lastProcessDate = isCurrentMonth ? todayStr : endDate;
  if (worker.isActive === false && worker.inactiveDate) {
    // Use the earlier of: inactive date, today (for current month), or end of month
    const inactiveDateStr = normalizeRecordDate(worker.inactiveDate);
    if (inactiveDateStr < lastProcessDate) {
      lastProcessDate = inactiveDateStr;
    }
  }

  // For past months, process all days. For current month, process up to today
  const daysToProcess = isCurrentMonth && lastProcessDate === todayStr
    ? today.getDate()
    : new Date(year, month + 1, 0).getDate(); // Total days in the month

  // Process each day
  for (let day = 1; day <= daysToProcess; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatYMD(year, month, day);
    const dayOfWeek = date.getDay();
    const isTuesday = dayOfWeek === 2;

    // Skip days after inactive date for inactive workers
    if (worker.isActive === false && worker.inactiveDate && dateStr > normalizeRecordDate(worker.inactiveDate)) {
      continue; // Don't process days after inactive date
    }

    // Look up record using normalized date to ensure exact match
    // dateStr is already in YYYY-MM-DD format from formatYMD, but normalize to be safe
    const normalizedDateStr = normalizeRecordDate(dateStr);
    const record = recordsByDate.get(normalizedDateStr);

    if (record) {
      // Record exists - use explicit status
      if (record.status === AttendanceStatus.PRESENT) {
        presentDays++;
        // Men get paid for Tuesday
        baseSalary += dailyRate;

        // Check for overtime (explicit record overwrites default)
        // Men don't get OT on Tuesday
        if (record.overtime === 'yes' && !isTuesday) {
          overtimeHours += 1; // 1 hour extra
          // Deduct late minutes from overtime
          const lateMins = typeof record.lateMinutes === 'number' ? record.lateMinutes : (record.lateMinutes ? parseInt(String(record.lateMinutes)) : 0);
          if (lateMins > 0) {
            totalLateMinutes += lateMins;
          }
        }
      } else if (record.status === AttendanceStatus.HALF_DAY) {
        halfDays++;
        // Half day = half of daily rate
        baseSalary += dailyRate * 0.5;

        // Check for overtime (can still have overtime on half day, but not on Tuesday)
        if (record.overtime === 'yes' && !isTuesday) {
          overtimeHours += 1;
          // Deduct late minutes from overtime
          const lateMins = typeof record.lateMinutes === 'number' ? record.lateMinutes : (record.lateMinutes ? parseInt(String(record.lateMinutes)) : 0);
          if (lateMins > 0) {
            totalLateMinutes += lateMins;
          }
        }
      } else if (record.status === AttendanceStatus.ABSENT) {
        absentDays++;
        // Explicitly: Absent days get NO pay (no base salary, NO overtime, even if overtime='yes' in record)
      }
    } else {
      // No record exists - default to present and check default OT
      // BUT: For inactive workers, don't default to present after inactive date
      // (This case is already handled by the continue statement above, but keeping for safety)
      if (worker.isActive === false && worker.inactiveDate && dateStr > normalizeRecordDate(worker.inactiveDate)) {
        continue; // Don't count days after inactive date
      }

      presentDays++;
      baseSalary += dailyRate;

      // If default OT is enabled, count overtime (but not on Tuesday for men)
      if (defaultOvertime === true && !isTuesday) {
        overtimeHours += 1;
      }
    }
  }

  // Calculate overtime pay (double hourly rate)
  // Deduct late minutes from overtime hours (convert minutes to hours)
  const lateHoursDeduction = totalLateMinutes / 60;
  const effectiveOvertimeHours = Math.max(0, overtimeHours - lateHoursDeduction);
  const overtimePay = effectiveOvertimeHours * hourlyRate * 2;

  // Calculate the deduction amount (what would have been paid if not for late minutes)
  const lateMinutesDeductionAmount = (lateHoursDeduction * hourlyRate * 2);

  const baseSalaryWithoutOT = baseSalary;
  baseSalary += overtimePay;
  baseSalary = Math.round(baseSalary * 100) / 100; // Round to 2 decimal places

  // Calculate attendance bonus
  const bonus = calculateAttendanceBonus(absentDays, halfDays, true);
  const totalSalary = baseSalary + bonus;

  return {
    baseSalary: Math.round(baseSalaryWithoutOT * 100) / 100,
    bonus,
    overtimeCompensation: Math.round(overtimePay * 100) / 100,
    lateMinutesDeduction: Math.round(lateMinutesDeductionAmount * 100) / 100,
    totalLateMinutes: totalLateMinutes,
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
  year: number,
  defaultOvertime?: boolean
): SalaryCalculationResult {
  const dailyWage = worker.baseSalary || 0;

  // Hourly rate = daily wage / 9 hours
  const hourlyRate = dailyWage / 9;

  let baseSalary = 0;
  let absentDays = 0;
  let halfDays = 0;
  let overtimeHours = 0;
  let totalLateMinutes = 0; // Track total late minutes for overtime deduction

  // Create a map of records by date for quick lookup
  const recordsByDate = new Map<string, AttendanceRecord>();
  records.forEach(record => {
    recordsByDate.set(normalizeRecordDate(record.date), record);
  });

  // Get today's date to only process days up to today (including today) for current month
  // For past months, process all days in the month
  // But if worker is inactive, stop at inactive date
  const today = new Date();
  const todayStr = formatDateYMD(today);
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const endDate = formatYMD(year, month, new Date(year, month + 1, 0).getDate());

  // Determine the last day to process
  let lastProcessDate = isCurrentMonth ? todayStr : endDate;
  if (worker.isActive === false && worker.inactiveDate) {
    // Use the earlier of: inactive date, today (for current month), or end of month
    const inactiveDateStr = normalizeRecordDate(worker.inactiveDate);
    if (inactiveDateStr < lastProcessDate) {
      lastProcessDate = inactiveDateStr;
    }
  }

  // For past months, process all days. For current month, process up to today
  const daysToProcess = isCurrentMonth && lastProcessDate === todayStr
    ? today.getDate()
    : totalDays; // Total days in the month

  // Process each day
  for (let day = 1; day <= daysToProcess; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatYMD(year, month, day);
    const dayOfWeek = date.getDay();
    const isTuesday = dayOfWeek === 2;

    // Skip days after inactive date for inactive workers
    if (worker.isActive === false && worker.inactiveDate && dateStr > normalizeRecordDate(worker.inactiveDate)) {
      continue; // Don't process days after inactive date
    }

    // Women don't get paid for Tuesday off (no attendance pay, no OT)
    if (isTuesday) {
      continue; // Skip Tuesday completely for women
    }

    // Look up record using normalized date to ensure exact match
    // dateStr is already in YYYY-MM-DD format from formatYMD, but normalize to be safe
    const normalizedDateStr = normalizeRecordDate(dateStr);
    const record = recordsByDate.get(normalizedDateStr);

    if (record) {
      // Record exists - use explicit status
      // CRITICAL: Double-check Tuesday for women - should never process Tuesday records for women
      if (worker.gender === Gender.FEMALE && isTuesday) {
        continue; // Skip Tuesday records for women - no pay, no OT
      }
      
      if (record.status === AttendanceStatus.PRESENT) {
        baseSalary += dailyWage;

        // Check for overtime (explicit record overwrites default)
        // Women never get OT on Tuesday (already checked above, but being explicit)
        if (record.overtime === 'yes' && !isTuesday) {
          overtimeHours += 1; // 1 hour extra
          // Deduct late minutes from overtime
          const lateMins = typeof record.lateMinutes === 'number' ? record.lateMinutes : (record.lateMinutes ? parseInt(String(record.lateMinutes)) : 0);
          if (lateMins > 0) {
            totalLateMinutes += lateMins;
          }
        }
      } else if (record.status === AttendanceStatus.HALF_DAY) {
        halfDays++;
        // Half day = half of daily wage
        baseSalary += dailyWage * 0.5;

        // Check for overtime
        // Women never get OT on Tuesday (already checked above, but being explicit)
        if (record.overtime === 'yes' && !isTuesday) {
          overtimeHours += 1;
          // Deduct late minutes from overtime
          const lateMins = typeof record.lateMinutes === 'number' ? record.lateMinutes : (record.lateMinutes ? parseInt(String(record.lateMinutes)) : 0);
          if (lateMins > 0) {
            totalLateMinutes += lateMins;
          }
        }
      } else if (record.status === AttendanceStatus.ABSENT) {
        absentDays++;
        // Explicitly: Absent days get NO pay (no base salary, NO overtime, even if overtime='yes' in record)
      }
    } else {
      // No record exists - default to present and check default OT
      // BUT: For inactive workers, don't default to present after inactive date
      // (This case is already handled by the continue statement above, but keeping for safety)
      if (worker.isActive === false && worker.inactiveDate && dateStr > normalizeRecordDate(worker.inactiveDate)) {
        continue; // Don't count days after inactive date
      }

      baseSalary += dailyWage;

      // If default OT is enabled, count overtime
      if (defaultOvertime === true) {
        overtimeHours += 1;
      }
    }
  }

  // Calculate overtime pay (double hourly rate)
  // Deduct late minutes from overtime hours (convert minutes to hours)
  const lateHoursDeduction = totalLateMinutes / 60;
  const effectiveOvertimeHours = Math.max(0, overtimeHours - lateHoursDeduction);
  const overtimePay = effectiveOvertimeHours * hourlyRate * 2;

  // Calculate the deduction amount (what would have been paid if not for late minutes)
  const lateMinutesDeductionAmount = (lateHoursDeduction * hourlyRate * 2);

  const baseSalaryWithoutOT = baseSalary;
  baseSalary += overtimePay;
  baseSalary = Math.round(baseSalary * 100) / 100; // Round to 2 decimal places

  // Calculate attendance bonus
  const bonus = calculateAttendanceBonus(absentDays, halfDays, false);
  const totalSalary = baseSalary + bonus;

  return {
    baseSalary: Math.round(baseSalaryWithoutOT * 100) / 100,
    bonus,
    overtimeCompensation: Math.round(overtimePay * 100) / 100,
    lateMinutesDeduction: Math.round(lateMinutesDeductionAmount * 100) / 100,
    totalLateMinutes: totalLateMinutes,
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

/**
 * Generate salary calculation equation as a string
 * @param worker - Worker object
 * @param presentDays - Number of present days
 * @param absentDays - Number of absent days
 * @param halfDays - Number of half days
 * @param salaryDetails - Salary calculation result
 * @param month - Month (0-11)
 * @param year - Year
 * @param attendanceRecords - Optional: Attendance records for the month to show dates
 * @param defaultOvertime - Optional: Default overtime setting for the worker (determines OT for no-record days)
 * @returns Equation string showing how salary was calculated
 */
export function generateSalaryEquation(
  worker: Worker,
  presentDays: number,
  absentDays: number,
  halfDays: number,
  salaryDetails: SalaryCalculationResult,
  month: number,
  year: number,
  attendanceRecords?: AttendanceRecord[],
  defaultOvertime?: boolean
): string {
  if (!worker.baseSalary || worker.baseSalary <= 0) {
    return "Base Salary: ₹0";
  }

  const lines: string[] = [];
  
  // Collect dates for absent, half day, and no-OT days if records are provided
  const absentDates: string[] = [];
  const halfDayDates: string[] = [];
  const noOTDates: string[] = [];
  const otDates: string[] = [];
  
  if (attendanceRecords && attendanceRecords.length > 0) {
    // Create date strings in YYYY-MM-DD format without timezone conversion
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    console.log(`[generateSalaryEquation] Worker: ${worker.name} (${worker.id}), Month: ${month + 1}/${year}`);
    console.log(`[generateSalaryEquation] Date range: ${startDate} to ${endDate}`);
    console.log(`[generateSalaryEquation] Total attendance records: ${attendanceRecords.length}`);
    
    const monthRecords = attendanceRecords.filter(record => {
      const recordDateStr = record.date.split('T')[0]; // Handle potential timestamp
      const matches = record.workerId === worker.id &&
        recordDateStr >= startDate &&
        recordDateStr <= endDate;
      
      // Log records for this worker
      if (record.workerId === worker.id) {
        console.log(`[generateSalaryEquation] Found record for worker: date=${record.date}, normalized=${recordDateStr}, status=${record.status}, inRange=${recordDateStr >= startDate && recordDateStr <= endDate}, matches=${matches}`);
      }
      
      return matches;
    });
    
    console.log(`[generateSalaryEquation] Filtered month records: ${monthRecords.length}`);
    
    monthRecords.forEach(record => {
      // Parse date string to avoid timezone issues
      const recordDateStr = record.date.split('T')[0]; // YYYY-MM-DD
      const [recordYear, recordMonth, recordDay] = recordDateStr.split('-').map(Number);
      const date = new Date(recordYear, recordMonth - 1, recordDay);
      const dayOfWeek = date.getDay();
      const isTuesday = dayOfWeek === 2;
      
      // Women don't get paid for Tuesday - skip completely
      if (worker.gender === Gender.FEMALE && isTuesday) {
        console.log(`[generateSalaryEquation] Skipping Tuesday record for female worker: ${recordDateStr}`);
        return; // Skip Tuesday records for women
      }
      
      const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
      
      if (record.status === AttendanceStatus.ABSENT) {
        console.log(`[generateSalaryEquation] Adding absent date: ${dateStr} (from ${recordDateStr})`);
        absentDates.push(dateStr);
      } else if (record.status === AttendanceStatus.HALF_DAY) {
        if (record.overtime === 'yes') {
          halfDayDates.push(dateStr + ' (OT)');
        } else {
          halfDayDates.push(dateStr + ' (No-OT)');
        }
      } else if (record.status === AttendanceStatus.PRESENT) {
        if (worker.gender === Gender.MALE && isTuesday) {
          // Men get paid for Tuesday but no OT
          noOTDates.push(dateStr + ' (Tue)');
        } else if (record.overtime === 'yes') {
          otDates.push(dateStr);
        } else {
          noOTDates.push(dateStr);
        }
      }
    });
    
    // Also check for days with no record (default to present, may have default OT)
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= totalDays; day++) {
      // Create date string in YYYY-MM-DD format without timezone conversion
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const isTuesday = dayOfWeek === 2;
      
      if (worker.gender === Gender.FEMALE && isTuesday) {
        continue; // Skip Tuesdays for women
      }
      
      const hasRecord = monthRecords.some(r => {
        // Ensure we're comparing dates correctly (both in YYYY-MM-DD format)
        const recordDateStr = r.date.split('T')[0]; // Handle potential timestamp
        return recordDateStr === dateStr;
      });
      
      if (!hasRecord) {
        const displayDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
        // Days with no record default to present, OT depends on defaultOvertime setting
        if (worker.gender === Gender.MALE && isTuesday) {
          // Men get paid for Tuesday but no OT, even if defaultOvertime is true
          noOTDates.push(displayDate + ' (Tue-NoRec)');
        } else if (defaultOvertime === true) {
          // No record + defaultOvertime = OT
          otDates.push(displayDate + ' (NoRec)');
        } else {
          // No record + no defaultOvertime = No-OT
          noOTDates.push(displayDate + ' (NoRec)');
        }
      }
    }
  }
  
  if (worker.gender === Gender.MALE) {
    // Male: Monthly salary based calculation
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
    
    const dailyRate = worker.baseSalary / (workingDays + tuesdays);
    const hourlyRate = dailyRate / 10;
    
    // Summary line
    lines.push(`Parameters: ${presentDays} Present, ${absentDays} Absent, ${halfDays} Half Day`);
    
    // Show dates if available
    if (absentDates.length > 0) {
      console.log(`[generateSalaryEquation] Final absent dates array for ${worker.name}:`, absentDates);
      lines.push(`Absent Dates: ${absentDates.join(", ")}`);
    } else {
      console.log(`[generateSalaryEquation] No absent dates found for ${worker.name} in month ${month + 1}/${year}`);
    }
    if (halfDayDates.length > 0) {
      lines.push(`Half Day Dates: ${halfDayDates.join(", ")}`);
    }
    if (otDates.length > 0) {
      lines.push(`OT Dates: ${otDates.join(", ")}`);
    }
    if (noOTDates.length > 0) {
      lines.push(`No-OT Dates: ${noOTDates.join(", ")}`);
    }
    
    // Base salary calculation
    const baseSalaryAmount = salaryDetails.baseSalary;
    const baseCalc: string[] = [];
    if (presentDays > 0) {
      baseCalc.push(`${presentDays}P × ₹${dailyRate.toFixed(2)}`);
    }
    if (halfDays > 0) {
      baseCalc.push(`${halfDays}HD × ₹${(dailyRate * 0.5).toFixed(2)}`);
    }
    if (absentDays > 0 && absentDates.length === 0) {
      lines.push(`Absent Days: ${absentDays} (No pay)`);
    }
    if (baseCalc.length > 0) {
      lines.push(`Base: ${baseCalc.join(" + ")} = ₹${baseSalaryAmount.toFixed(2)}`);
    }
    
    // Overtime calculation
    if (salaryDetails.overtimeCompensation > 0) {
      const effectiveOTHours = salaryDetails.overtimeCompensation / (hourlyRate * 2);
      let otLine = `OT: ${effectiveOTHours.toFixed(1)}hrs × ₹${(hourlyRate * 2).toFixed(2)} = ₹${salaryDetails.overtimeCompensation.toFixed(2)}`;
      if (salaryDetails.totalLateMinutes > 0) {
        const lateHours = (salaryDetails.totalLateMinutes / 60).toFixed(1);
        otLine += ` (Late: ${salaryDetails.totalLateMinutes}min / 60 = ${lateHours}hrs deducted)`;
      }
      lines.push(otLine);
    } else {
      lines.push(`OT: No overtime`);
    }
    
    // Bonus
    const halfDaysAsAbsent = Math.floor(halfDays / 2);
    const totalAbsentDays = absentDays + halfDaysAsAbsent;
    if (salaryDetails.bonus > 0) {
      lines.push(`Bonus: ₹${salaryDetails.bonus} (Total absent: ${totalAbsentDays} = ${absentDays} absent + ${halfDaysAsAbsent} from ${halfDays}HD)`);
    } else {
      lines.push(`Bonus: ₹0 (Total absent: ${totalAbsentDays} = ${absentDays} absent + ${halfDaysAsAbsent} from ${halfDays}HD)`);
    }
  } else {
    // Female: Daily wage based calculation
    const dailyWage = worker.baseSalary;
    const hourlyRate = dailyWage / 9;
    
    // Count working days (excluding Tuesdays)
    const totalDays = new Date(year, month + 1, 0).getDate();
    let tuesdays = 0;
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 2) tuesdays++;
    }
    
    // Summary line
    lines.push(`Parameters: ${presentDays} Present, ${absentDays} Absent, ${halfDays} Half Day`);
    
    // Show dates if available
    if (absentDates.length > 0) {
      console.log(`[generateSalaryEquation] Final absent dates array for ${worker.name}:`, absentDates);
      lines.push(`Absent Dates: ${absentDates.join(", ")}`);
    } else {
      console.log(`[generateSalaryEquation] No absent dates found for ${worker.name} in month ${month + 1}/${year}`);
    }
    if (halfDayDates.length > 0) {
      lines.push(`Half Day Dates: ${halfDayDates.join(", ")}`);
    }
    if (noOTDates.length > 0) {
      lines.push(`No-OT Dates: ${noOTDates.join(", ")}`);
    }
    if (otDates.length > 0) {
      lines.push(`OT Dates: ${otDates.join(", ")}`);
    }
    
    // Base salary calculation
    const baseSalaryAmount = salaryDetails.baseSalary;
    const baseCalc: string[] = [];
    if (presentDays > 0) {
      baseCalc.push(`${presentDays}P × ₹${dailyWage.toFixed(2)}`);
    }
    if (halfDays > 0) {
      baseCalc.push(`${halfDays}HD × ₹${(dailyWage * 0.5).toFixed(2)}`);
    }
    if (absentDays > 0 && absentDates.length === 0) {
      lines.push(`Absent Days: ${absentDays} (No pay)`);
    }
    if (tuesdays > 0) {
      lines.push(`Tuesdays: ${tuesdays} (No pay)`);
    }
    if (baseCalc.length > 0) {
      lines.push(`Base: ${baseCalc.join(" + ")} = ₹${baseSalaryAmount.toFixed(2)}`);
    }
    
    // Overtime calculation
    if (salaryDetails.overtimeCompensation > 0) {
      const effectiveOTHours = salaryDetails.overtimeCompensation / (hourlyRate * 2);
      let otLine = `OT: ${effectiveOTHours.toFixed(1)}hrs × ₹${(hourlyRate * 2).toFixed(2)} = ₹${salaryDetails.overtimeCompensation.toFixed(2)}`;
      if (salaryDetails.totalLateMinutes > 0) {
        const lateHours = (salaryDetails.totalLateMinutes / 60).toFixed(1);
        otLine += ` (Late: ${salaryDetails.totalLateMinutes}min / 60 = ${lateHours}hrs deducted)`;
      }
      lines.push(otLine);
    } else {
      lines.push(`OT: No overtime`);
    }
    
    // Bonus
    const halfDaysAsAbsent = Math.floor(halfDays / 2);
    const totalAbsentDays = absentDays + halfDaysAsAbsent;
    if (salaryDetails.bonus > 0) {
      lines.push(`Bonus: ₹${salaryDetails.bonus} (Total absent: ${totalAbsentDays} = ${absentDays} absent + ${halfDaysAsAbsent} from ${halfDays}HD)`);
    } else {
      lines.push(`Bonus: ₹0 (Total absent: ${totalAbsentDays} = ${absentDays} absent + ${halfDaysAsAbsent} from ${halfDays}HD)`);
    }
  }
  
  lines.push(`Total: ₹${salaryDetails.totalSalary.toFixed(2)}`);
  
  return lines.join("\n");
}
