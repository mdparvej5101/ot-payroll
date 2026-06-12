/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee, DayPunchRaw, AttendanceDay, OvertimeCalculation, EmployeeAttendanceReport, UnmatchedLog } from '../types';

// Initial employee template for database seeding matching the spreadsheet screenshot
export const INITIAL_MOCK_EMPLOYEES: Employee[] = [
  {
    id: "EMP001",
    name: "MAHBUB",
    number: "6",
    department: "OUR COMPANY",
    hourlyRate: 120.00, // 120 Taka/hr default matching user example
    overtimeRate: 120.00,
    dutyHours: 9
  },
  {
    id: "EMP002",
    name: "SARAH KHAN",
    number: "12",
    department: "OUR COMPANY",
    hourlyRate: 150.00,
    overtimeRate: 150.00,
    dutyHours: 9
  },
  {
    id: "EMP003",
    name: "JOHN DOE",
    number: "25",
    department: "LOGISTICS",
    hourlyRate: 110.00,
    overtimeRate: 110.00,
    dutyHours: 9
  },
  {
    id: "EMP004",
    name: "ALEX GRADY",
    number: "33",
    department: "ADMINISTRATION",
    hourlyRate: 160.00,
    overtimeRate: 160.00,
    dutyHours: 9 // standard 9 hours duty as specified in requirement #2
  },
  {
    id: "EMP005",
    name: "TAREK AZIZ",
    number: "8",
    department: "OUR COMPANY",
    hourlyRate: 130.00,
    overtimeRate: 130.00,
    dutyHours: 9
  }
];

// Convert hours fraction to formatted string (e.g. "1h 5m" or "0h 45m")
export function formatHoursFractional(hours: number): string {
  if (hours <= 0) return "0 mins";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} mins`;
  return `${h} hr${h > 1 ? 's' : ''} ${m} min${m > 1 ? 's' : ''}`;
}

// Parse string representation or Excel raw number representing date
export function parseExcelDateValue(val: any): Date | null {
  if (!val) return null;

  // Handle JS Date object
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  // Handle Excel Serial Decimal (e.g., 46083.494259...)
  if (typeof val === 'number') {
    // Excel base date starts at Dec 30, 1899 due to 1900 leap year bug
    const date = new Date((val - 25569) * 86400 * 1000);
    // Adjustment to eliminate minor floating point timezone offsets
    return isNaN(date.getTime()) ? null : date;
  }

  const str = String(val).trim();
  if (!str) return null;

  // Try parsing European format: DD/MM/YYYY HH:mm:ss, DD-MM-YYYY, etc.
  const regexDDMMYYYY = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const match = str.match(regexDDMMYYYY);
  
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? parseInt(match[5], 10) : 0;
    const sec = match[6] ? parseInt(match[6], 10) : 0;

    const testDate = new Date(year, month, day, hour, min, sec);
    if (!isNaN(testDate.getTime())) {
      return testDate;
    }
  }

  // Try standard ISO parsing as fallback
  const dIso = new Date(str);
  if (!isNaN(dIso.getTime())) {
    return dIso;
  }

  return null;
}

// Key format representation for a date
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Human readable date string
export function formatHumanDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format Date to Time String (24 hours formatted)
export function formatTime24(date: Date | null): string {
  if (!date) return "--:--";
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Main parser that translates manual tables or uploaded Excel parsed JSON arrays
 * into mapped punches grouped by employee and date.
 */
export function groupRawPunches(rawData: any[]): { [employeeNameOrNum: string]: { [dateStr: string]: AttendanceDay } } {
  const result: { [key: string]: { [dateStr: string]: AttendanceDay } } = {};

  rawData.forEach(row => {
    // Match keys in any case (XLSX parsing can return capitalized keys)
    let department = '';
    let name = '';
    let number = '';
    let rawTimeVal: any = null;
    let location = '';
    let idNumber = '';
    let verifyCode = '';
    let cardNo = '';

    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase().trim();
      const val = row[key];

      if (lowerKey === 'department' || lowerKey === 'dept') department = String(val);
      else if (lowerKey === 'name' || lowerKey === 'emp name') name = String(val).trim().toUpperCase();
      else if (lowerKey === 'no' || lowerKey === 'no.' || lowerKey === 'employee number') number = String(val).trim();
      else if (lowerKey === 'date/time' || lowerKey === 'datetime' || lowerKey === 'time' || lowerKey === 'date' || lowerKey === 'date_time') rawTimeVal = val;
      else if (lowerKey === 'location' || lowerKey === 'loc') location = String(val);
      else if (lowerKey === 'id number' || lowerKey === 'idnumber' || lowerKey === 'id_number') idNumber = String(val);
      else if (lowerKey === 'verifycode' || lowerKey === 'verify_code') verifyCode = String(val);
      else if (lowerKey === 'cardno' || lowerKey === 'card_no') cardNo = String(val);
    }

    // Must at least have a Name/Number and a Date/Time to parse
    if ((!name && !number) || !rawTimeVal) return;

    const parsedDateTime = parseExcelDateValue(rawTimeVal);
    if (!parsedDateTime) return;

    // Standardize key for grouping. Excel names are highly reliable. Let's look up both name or machine number
    const employeeKey = name || `NO_${number}`;

    if (!result[employeeKey]) {
      result[employeeKey] = {};
    }

    const dateKey = formatDateKey(parsedDateTime);

    if (!result[employeeKey][dateKey]) {
      result[employeeKey][dateKey] = {
        dateStr: dateKey,
        date: new Date(parsedDateTime.getFullYear(), parsedDateTime.getMonth(), parsedDateTime.getDate()),
        punches: [],
        inTime: null,
        outTime: null,
        totalDurationHours: 0,
        hasError: false
      };
    }

    result[employeeKey][dateKey].punches.push(parsedDateTime);
  });

  // Calculate In and Out times for each grouped day
  Object.keys(result).forEach(empKey => {
    Object.keys(result[empKey]).forEach(dateKey => {
      const dayData = result[empKey][dateKey];
      // Sort times ascending
      dayData.punches.sort((a, b) => a.getTime() - b.getTime());

      if (dayData.punches.length >= 2) {
        dayData.inTime = dayData.punches[0];
        dayData.outTime = dayData.punches[dayData.punches.length - 1];
        
        const diffMs = dayData.outTime.getTime() - dayData.inTime.getTime();
        dayData.totalDurationHours = diffMs / (1000 * 60 * 60);
        dayData.hasError = false;
      } else if (dayData.punches.length === 1) {
        // Single punch of the day
        dayData.inTime = dayData.punches[0];
        dayData.outTime = null;
        dayData.totalDurationHours = 0;
        dayData.hasError = true;
        dayData.errorMessage = "Missing punch: Only 1 punch logged on this day.";
      }
    });
  });

  return result;
}

/**
 * Perform precise overtime calculation on grouped attendance records.
 *
 * Logic implementation:
 * - In-time to Out-time total hours: `totalHours`
 * - Standard break offset: 15 minutes = `0.25` hours.
 * - Minimum duty hours: standard `employee.dutyHours` (default is 9).
 * - Overtime hours = `totalHours - 0.25 - dutyHours`.
 * - If positive, multiplier rate applies.
 */
export function calculateOvertimeForDay(
  dayData: AttendanceDay,
  employee: Employee
): OvertimeCalculation {
  const dateStr = dayData.dateStr;
  const inTimeStr = formatTime24(dayData.inTime);
  const outTimeStr = formatTime24(dayData.outTime);
 
  // If there are errors (like single punch), do not compute overtime
  if (dayData.hasError || !dayData.inTime || !dayData.outTime) {
    return {
      dateStr,
      inTimeStr,
      outTimeStr,
      totalDurationFractional: 0,
      breakDeductionFractional: 0,
      dutyHours: employee.dutyHours,
      overtimeHours: 0,
      overtimePay: 0,
      isOvertimeEligible: false,
      shortageHours: 0
    };
  }
 
  const durationHrs = dayData.totalDurationHours;
  // Break deduction is 15 minutes (0.25 hrs)
  const breakDeduction = 0.25; 
  const dutyRequirement = employee.dutyHours;
 
  const overtimeDelta = durationHrs - breakDeduction - dutyRequirement;
  const otHours = overtimeDelta > 0 ? overtimeDelta : 0;
  // Use hourlyRate for overtime calculation (as per requirement 3)
  const otPay = otHours * employee.hourlyRate;
 
  // If actual gross duration is less than standard shift duty hours (e.g. 9 hours), calculate shortage hours
  const shortageHours = durationHrs < dutyRequirement ? (dutyRequirement - durationHrs) : 0;
 
  return {
    dateStr,
    inTimeStr,
    outTimeStr,
    totalDurationFractional: durationHrs,
    breakDeductionFractional: breakDeduction,
    dutyHours: dutyRequirement,
    overtimeHours: otHours,
    overtimePay: parseFloat(otPay.toFixed(2)),
    isOvertimeEligible: otHours > 0,
    shortageHours: parseFloat(shortageHours.toFixed(4))
  };
}

/**
 * Generates summary reports for a selected employee array and loaded XLSX file rows.
 */
export function generatePayrollReport(
  employees: Employee[],
  groupedPunches: { [employeeNameOrNum: string]: { [dateStr: string]: AttendanceDay } },
  adminDeductions: { [key: string]: boolean } = {}, // Key format: `${employeeId}_${dateStr}`
  autoMinusUnder9HrsList: { [employeeId: string]: boolean } = {}, // Key format: `${employeeId}`
  targetMonthStr?: string // "YYYY-MM" format e.g. "2025-08"
): EmployeeAttendanceReport[] {
  const reports: EmployeeAttendanceReport[] = [];

  const spanDates: string[] = [];

  if (targetMonthStr) {
    const parts = targetMonthStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed month
    const lastDayObj = new Date(year, month + 1, 0);
    const totalDays = lastDayObj.getDate();
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      spanDates.push(formatDateKey(dateObj));
    }
  } else {
    // Find overall date range spanned by the active dataset across all loaded employee logs
    let minDateMs = Infinity;
    let maxDateMs = -Infinity;

    Object.keys(groupedPunches).forEach(empKey => {
      Object.keys(groupedPunches[empKey]).forEach(dateStr => {
        const dayData = groupedPunches[empKey][dateStr];
        const time = dayData.date.getTime();
        if (time < minDateMs) minDateMs = time;
        if (time > maxDateMs) maxDateMs = time;
      });
    });

    if (minDateMs !== Infinity && maxDateMs !== -Infinity) {
      const start = new Date(minDateMs);
      const end = new Date(maxDateMs);
      
      // Iterate from start to end day by day to compile full calendar month or date batch
      const curr = new Date(start);
      while (curr <= end) {
        spanDates.push(formatDateKey(curr));
        curr.setDate(curr.getDate() + 1);
      }
    }
  }

  employees.forEach(employee => {
    // Try to match the employee's logs by Name or Employee Code
    // Case insensitive/trimmed spacing lookup
    const empPunchKey = Object.keys(groupedPunches).find(key => 
      key.trim().toUpperCase() === employee.name.trim().toUpperCase() ||
      key.trim() === employee.number.trim()
    );

    const logs = empPunchKey ? groupedPunches[empPunchKey] : {};
    const reportDays: { [dateStr: string]: OvertimeCalculation } = {};

    let totalDaysWorked = 0;
    let offDaysCount = 0;
    let cumulativeHours = 0;
    let cumulativeOvertimeHours = 0;
    let overtimePayTotal = 0;

    // Process all days in chronological window. If a day has no record, it's categorized as an OFF DAY
    const datesToProcess = spanDates.length > 0 ? spanDates : Object.keys(logs).sort();

    datesToProcess.forEach(dateStr => {
      const dayData = logs[dateStr];
      
      // If there are no mock logs for this employee on this active calendar work date, it represents an off day
      if (!dayData) {
        reportDays[dateStr] = {
          dateStr,
          inTimeStr: "", // Blank as specified for Off Days
          outTimeStr: "", // Blank as specified for Off Days
          totalDurationFractional: 0,
          breakDeductionFractional: 0,
          dutyHours: employee.dutyHours,
          overtimeHours: 0,
          overtimePay: 0,
          isOvertimeEligible: false,
          isOffDay: true
        };
        offDaysCount += 1;
        return;
      }

      let otData = calculateOvertimeForDay(dayData, employee);
      
      const shortageHrs = otData.shortageHours || 0;
      const deductionKey = `${employee.id}_${dateStr}`;
      const isLateDeducted = adminDeductions[deductionKey] === true;
      const isGloballyDeducted = autoMinusUnder9HrsList[employee.id] === true;

      if (shortageHrs > 0 && (isLateDeducted || isGloballyDeducted)) {
        // Late / shortage deduction: subtract the shortage duration from standard daily overtime hours (representing penalty)
        const adjustedOvertime = otData.overtimeHours - shortageHrs; 
        const adjustedOvertimePay = adjustedOvertime * employee.hourlyRate;
        
        otData = {
          ...otData,
          overtimeHours: adjustedOvertime,
          overtimePay: parseFloat(adjustedOvertimePay.toFixed(2)),
          isAdminDeducted: true
        };
      }
      
      reportDays[dateStr] = otData;

      if (!dayData.hasError && dayData.inTime && dayData.outTime) {
        totalDaysWorked += 1;
        cumulativeHours += dayData.totalDurationHours - 0.25; // actual hours worked after 15m deduction
        cumulativeOvertimeHours += otData.overtimeHours;
        overtimePayTotal += otData.overtimePay;
      }
    });

    // Calculate regular earnings (set to 0 as we only calculate overtime, not base/basic salary)
    const regularPay = 0;
    
    // Clamp cumulative overtime values to >= 0 so salary totals are never negative
    const finalOvertimeHours = parseFloat(Math.max(0, cumulativeOvertimeHours).toFixed(2));
    const overtimePayFormatted = parseFloat(Math.max(0, overtimePayTotal).toFixed(2));
    const totalGrossPay = overtimePayFormatted;

    reports.push({
      employee,
      days: reportDays,
      summary: {
        totalDaysWorked,
        offDaysCount,
        cumulativeHours: parseFloat(cumulativeHours.toFixed(2)),
        cumulativeOvertimeHours: finalOvertimeHours,
        regularPay,
        overtimePay: overtimePayFormatted,
        totalGrossPay
      }
    });
  });

  return reports;
}

// Generates an array of unmatched punches so the user can easily debug who is missing from the system

export function findUnmatchedExcelKeys(
  employees: Employee[],
  groupedPunches: { [employeeNameOrNum: string]: { [dateStr: string]: AttendanceDay } }
): UnmatchedLog[] {
  const unmatched: UnmatchedLog[] = [];

  Object.keys(groupedPunches).forEach(excelKey => {
    const isMatched = employees.some(emp => 
      emp.name.trim().toUpperCase() === excelKey.trim().toUpperCase() ||
      emp.number.trim() === excelKey.trim()
    );

    if (!isMatched) {
      const days = Object.keys(groupedPunches[excelKey]);
      let punchCount = 0;
      days.forEach(d => {
        punchCount += groupedPunches[excelKey][d].punches.length;
      });

      unmatched.push({
        excelKey,
        totalPunches: punchCount,
        sampleDate: days[0] || 'N/A'
      });
    }
  });

  return unmatched;
}
