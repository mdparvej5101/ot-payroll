/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Employee, EmployeeAttendanceReport, AttendanceDay } from '../types';
import { groupRawPunches, generatePayrollReport } from '../utils/calculator';
import OvertimeDetailsTable from './OvertimeDetailsTable';
import { 
  Users, 
  Calendar, 
  FileText, 
  Play, 
  CreditCard, 
  CheckCircle2, 
  Clipboard, 
  PlusCircle, 
  HelpCircle,
  TrendingUp,
  Clock,
  Briefcase
} from 'lucide-react';

interface ManualOvertimeCalculatorProps {
  employees: Employee[];
  adminDeductions: { [key: string]: boolean };
  onToggleDeduction: (empId: string, dateStr: string) => void;
  autoMinusUnder9HrsList: { [empId: string]: boolean };
  onToggleAutoMinus: (empId: string) => void;
  onAddPaymentHistory: (record: any) => void;
}

const MONTHS_LIST = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const YEARS_LIST = ['2024', '2025', '2026'];

// The manual input fields panel

export default function ManualOvertimeCalculator({
  employees,
  adminDeductions,
  onToggleDeduction,
  autoMinusUnder9HrsList,
  onToggleAutoMinus,
  onAddPaymentHistory
}: ManualOvertimeCalculatorProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('08');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [pastedPunches, setPastedPunches] = useState('');
  const [generatedReport, setGeneratedReport] = useState<EmployeeAttendanceReport | null>(null);
  const [successPaidMessage, setSuccessPaidMessage] = useState(false);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const targetMonthStr = `${selectedYear}-${selectedMonth}`;

  // Load registered pasted punches for currently selected parameters
  useEffect(() => {
    if (selectedEmployeeId) {
      const storageKey = `manual_punches_${selectedEmployeeId}_${targetMonthStr}`;
      const saved = localStorage.getItem(storageKey);
      setPastedPunches(saved || '');
      setGeneratedReport(null);
      setSuccessPaidMessage(false);
    }
  }, [selectedEmployeeId, targetMonthStr]);

  // Load pre-selected default employee if none is active
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId]);

  // Initial state hooks and loading logic

  const handleGenerateReport = () => {
    if (!selectedEmployee) {
      alert("Please select a valid employee first.");
      return;
    }

    // Save pasted logs for persistence
    const storageKey = `manual_punches_${selectedEmployee.id}_${targetMonthStr}`;
    localStorage.setItem(storageKey, pastedPunches.trim());

    // Convert raw time text input line-by-line to standard parser readable structure
    const lines = pastedPunches.split('\n');
    const customRows: any[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      customRows.push({
        "Department": selectedEmployee.department,
        "Name": selectedEmployee.name,
        "No.": selectedEmployee.number,
        "Date/Time": trimmed
      });
    });

    const groupedPunches = groupRawPunches(customRows);
    const reports = generatePayrollReport(
      [selectedEmployee], 
      groupedPunches, 
      adminDeductions, 
      autoMinusUnder9HrsList, 
      targetMonthStr
    );

    if (reports.length > 0) {
      setGeneratedReport(reports[0]);
    } else {
      setGeneratedReport(null);
    }
    setSuccessPaidMessage(false);
  };

  const handleRegisterPayment = () => {
    if (!generatedReport) return;
    const { employee, summary } = generatedReport;
    
    const paidMonthObj = MONTHS_LIST.find(m => m.value === selectedMonth);
    const readableMonth = `${paidMonthObj?.label} ${selectedYear}`;

    const record = {
      id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      monthStr: readableMonth,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeNum: employee.number,
      department: employee.department,
      totalDaysWorked: summary.totalDaysWorked,
      offDaysCount: summary.offDaysCount,
      cumulativeHours: summary.cumulativeHours,
      cumulativeOvertimeHours: summary.cumulativeOvertimeHours,
      regularPay: summary.regularPay,
      overtimePay: summary.overtimePay,
      totalGrossPay: summary.totalGrossPay,
      paymentDateStr: new Date().toISOString()
    };

    onAddPaymentHistory(record);
    setSuccessPaidMessage(true);

    // Fade message out after 5 seconds
    setTimeout(() => {
      setSuccessPaidMessage(false);
    }, 5000);
  };

  const selectedRawPunches = generatedReport ? (() => {
    const customRows: any[] = [];
    pastedPunches.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      customRows.push({
        "Department": selectedEmployee?.department || "COMPANY",
        "Name": selectedEmployee?.name || "",
        "No.": selectedEmployee?.number || "",
        "Date/Time": trimmed
      });
    });
    const grouped = groupRawPunches(customRows);
    return selectedEmployee ? (grouped[selectedEmployee.name] || grouped[selectedEmployee.number]) : undefined;
  })() : undefined;

  const resolvedMonthLabel = MONTHS_LIST.find(m => m.value === selectedMonth)?.label || 'August';

  return (
    <div className="space-y-6" id="manual-overtime-calc-container">
      {/* Configuration Control Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Empower Overtime Input & Biometric Parser
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Choose any employee, select their target calculation month, paste standard biometric timestamps of their punch logins, and generate a dynamic report.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Selected Employee */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                1. Select Employee Profile
              </label>
              <select
                id="manual-emp-select"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-350 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
              >
                <option value="" disabled>-- Select Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} (Code #{emp.number}) - {emp.department}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Select Month */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                2. Select Calendar Month
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  id="manual-month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 bg-white border border-slate-200 hover:border-slate-350 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
                >
                  {MONTHS_LIST.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <select
                  id="manual-year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 bg-white border border-slate-200 hover:border-slate-350 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
                >
                  {YEARS_LIST.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Additional info pane */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-150 flex flex-col justify-between">
              <div className="text-[11px] text-slate-500 leading-normal">
                <span className="font-semibold text-slate-700 block mb-0.5">Calculation Rules Pre-Set:</span>
                • Shift Duty requirement: <strong className="text-slate-800">{selectedEmployee?.dutyHours || 9} hrs/day</strong> <br />
                • Hourly regular/overtime rate: <strong className="text-slate-800">৳{selectedEmployee?.hourlyRate || 120}/hr</strong>
              </div>
              {selectedEmployee && (
                <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 self-start mt-1 uppercase tracking-wider">
                  Active Profile: {selectedEmployee.name}
                </div>
              )}
            </div>
          </div>

          {/* Pasted text biometric entries */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-500" />
                3. Paste Biometric Text Punch Logs (Copy from WhatsApp, Excel, or Admin Notepad)
              </label>
            </div>

            <textarea
              id="manual-punch-paste-input"
              value={pastedPunches}
              onChange={(e) => {
                setPastedPunches(e.target.value);
                setSuccessPaidMessage(false);
              }}
              rows={8}
              placeholder={`Copy and paste date/time list from log. Example:\n01/08/2025 11:48:41\n01/08/2025 21:03:42\n02/08/2025 09:55:22\n02/08/2025 21:42:57`}
              className="w-full font-mono text-xs p-3.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-100 shadow-inner leading-relaxed"
            />
          </div>

          {/* Trigger button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              id="generate-manual-report-btn"
              onClick={handleGenerateReport}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg hover:shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Play className="w-4 h-4 text-white fill-current" />
              Generate Overtime Report
            </button>

            {generatedReport && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                Calculated {Object.keys(generatedReport.days).length} calendar days for {resolvedMonthLabel} {selectedYear}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Generated Report output frame */}
      {generatedReport && (
        <div className="space-y-6 animate-fadeIn" id="manual-report-output-box">
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] tracking-widest text-indigo-400 font-bold uppercase">
                  Calculated Monthly Summary
                </span>
                <h4 className="text-lg font-bold text-white mt-1">
                  {generatedReport.employee.name} — Roster Bill for {resolvedMonthLabel} {selectedYear}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Department: <strong className="text-slate-200">{generatedReport.employee.department}</strong> | Standard Shift: <strong className="text-slate-200">{generatedReport.employee.dutyHours} Hours</strong> | Rate: <strong className="text-slate-200">৳{generatedReport.employee.hourlyRate}/Hr</strong>
                </p>
              </div>

              {/* Paying History Action Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <button
                  id="register-payment-history-btn"
                  onClick={handleRegisterPayment}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[12px] px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer select-none uppercase tracking-wider"
                >
                  <CreditCard className="w-4 h-4" />
                  Add to Company Paying History
                </button>
              </div>
            </div>

            {successPaidMessage && (
              <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-bold leading-relaxed flex items-center gap-2 animate-bounce">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Successfully saved payment history to the system! This finalized bill is now displayed on the Main Dashboard under Company Paying History.
              </div>
            )}

            {/* Selected Employee Month Totals Footer - 5 Column Bento Layout */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 text-center text-slate-900">
              <div className="bg-slate-800/40 border border-slate-700/50 p-2.5 rounded-xl">
                <span className="text-[9px] tracking-wider text-slate-400 font-bold uppercase block">Work Days</span>
                <p className="text-sm font-extrabold text-white mt-1">{generatedReport.summary.totalDaysWorked} Days</p>
              </div>
              
              <div className="bg-slate-800/40 border border-slate-700/50 p-2.5 rounded-xl">
                <span className="text-[9px] tracking-wider text-amber-400 font-bold uppercase block">Off Days</span>
                <p className="text-sm font-extrabold text-amber-500 mt-1">{generatedReport.summary.offDaysCount} Days</p>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/50 p-2.5 rounded-xl col-span-2 md:col-span-1">
                <span className="text-[9px] tracking-wider text-slate-400 font-bold uppercase block">Avg Hours</span>
                <p className="text-sm font-extrabold text-white mt-1">{generatedReport.summary.cumulativeHours.toFixed(1)} hrs</p>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/50 p-2.5 rounded-xl">
                <span className="text-[9px] tracking-wider text-indigo-400 font-bold uppercase block">Overtime Hrs</span>
                <p className="text-sm font-extrabold text-indigo-300 mt-1">{generatedReport.summary.cumulativeOvertimeHours.toFixed(1)} hrs</p>
              </div>

              <div className="bg-indigo-950/85 border border-indigo-750 p-2.5 rounded-xl">
                <span className="text-[9px] tracking-wider text-indigo-300 font-bold uppercase block">Overtime Pay</span>
                <p className="text-sm font-extrabold text-emerald-400 mt-1">৳{generatedReport.summary.overtimePay.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Table representation */}
          <OvertimeDetailsTable
            report={generatedReport}
            rawPunches={selectedRawPunches}
            adminDeductions={adminDeductions}
            onToggleDeduction={(dateStr) => {
              onToggleDeduction(generatedReport.employee.id, dateStr);
              // re-trigger calculations to dynamically update values on screen!
              setTimeout(() => {
                handleGenerateReport();
              }, 50);
            }}
            autoMinusUnder9Hrs={autoMinusUnder9HrsList[generatedReport.employee.id] || false}
            onToggleAutoMinus={() => {
              onToggleAutoMinus(generatedReport.employee.id);
              // re-trigger calculations
              setTimeout(() => {
                handleGenerateReport();
              }, 50);
            }}
          />
        </div>
      )}
    </div>
  );
}
