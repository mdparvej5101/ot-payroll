/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Employee {
  id: string; // Employee ID or system ID
  name: string; // Employee Name (matching XLS sheet)
  number: string; // Employee Punch Number (e.g., '6' for MAHBUB)
  department: string; // Department (e.g., 'OUR COMPANY')
  hourlyRate: number; // Regular Hourly pay rate (e.g., $15/hr)
  overtimeRate: number; // Overtime Hourly pay rate (e.g., 1.5x regular ($22.5) or fixed)
  dutyHours: number; // Daily standard duty hours (Default is 9, customizable)
}

export interface DayPunchRaw {
  department: string;
  name: string;
  number: string;
  dateTime: Date;
  location?: string;
  idNumber?: string;
  verifyCode?: string;
  cardNo?: string;
}

export interface AttendanceDay {
  dateStr: string; // Key in format YYYY-MM-DD
  date: Date;
  punches: Date[];
  inTime: Date | null;
  outTime: Date | null;
  totalDurationHours: number; // Difference in decimal hours
  hasError: boolean; // Flag if only 1 punch or incomplete logs
  errorMessage?: string;
}

export interface OvertimeCalculation {
  dateStr: string; // YYYY-MM-DD
  inTimeStr: string; // "11:51:44"
  outTimeStr: string; // "21:03:33"
  totalDurationFractional: number; // e.g. 10.33 hours (10 hrs 20 mins)
  breakDeductionFractional: number; // e.g. 0.25 hours (15 minutes)
  dutyHours: number; // standard duty hours required (e.g. 9.0)
  overtimeHours: number; // hours of overtime calculated (e.g. 1.08 hours)
  overtimePay: number; // overtimeHours * employee.overtimeRate
  isOvertimeEligible: boolean;
  isOffDay?: boolean; // Indicates if no punches recorded for that day
  isAdminDeducted?: boolean; // Indicates if overtime was deducted by admin override
  shortageHours?: number; // Shows how many hours employee was short of their shift requirement (e.g. 20 minutes)
}

export interface EmployeeAttendanceReport {
  employee: Employee;
  days: { [dateStr: string]: OvertimeCalculation };
  summary: {
    totalDaysWorked: number;
    offDaysCount: number; // Indicates total number of off days categorized
    cumulativeHours: number;
    cumulativeOvertimeHours: number;
    regularPay: number;
    overtimePay: number;
    totalGrossPay: number;
  };
}

export interface UnmatchedLog {
  excelKey: string;
  totalPunches: number;
  sampleDate: string;
}

export interface PaidRecord {
  id: string;
  monthStr: string; // e.g. "August 2025"
  employeeId: string;
  employeeName: string;
  employeeNum: string;
  department: string;
  totalDaysWorked: number;
  offDaysCount: number;
  cumulativeHours: number;
  cumulativeOvertimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalGrossPay: number;
  paymentDateStr: string; // ISO string format
}


