/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { EmployeeAttendanceReport, Employee, PaidRecord } from '../types';
import { Download, Printer, Search, TrendingUp, DollarSign, Clock, Users, Building, ChevronRight, Database, Check } from 'lucide-react';
import { formatHoursFractional } from '../utils/calculator';

interface PayrollReportProps {
  reports: EmployeeAttendanceReport[];
  selectedEmployeeId: string | null;
  onSelectEmployee: (id: string | null) => void;
  paymentHistory: PaidRecord[];
  onAddPaymentHistory: (record: PaidRecord) => void;
}

export default function PayrollReport({
  reports,
  selectedEmployeeId,
  onSelectEmployee,
  paymentHistory = [],
  onAddPaymentHistory
}: PayrollReportProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [successSavedName, setSuccessSavedName] = useState<string | null>(null);

  // Helper to compile human-readable month label for report database rows
  const resolveMonthLabelFromReport = (days: { [dateStr: string]: any }) => {
    const dates = Object.keys(days);
    if (dates.length === 0) return "Monthly Report";
    const firstDateStr = dates[0];
    const dateObj = new Date(firstDateStr);
    if (isNaN(dateObj.getTime())) return "Monthly Report";
    const months = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];
    return `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  };

  // Convert report row summary to fully persistent PaidRecord structure
  const handleSaveToDB = (e: React.MouseEvent, report: EmployeeAttendanceReport) => {
    e.stopPropagation();
    const { employee, days, summary } = report;
    const resolvedMonth = resolveMonthLabelFromReport(days);

    const record: PaidRecord = {
      id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      monthStr: resolvedMonth,
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
    setSuccessSavedName(employee.name);
    
    setTimeout(() => {
      setSuccessSavedName(null);
    }, 4000);
  };

  // Compute Company totals
  const totalEmployees = reports.length;
  const activeWorkedCount = reports.filter(r => r.summary.totalDaysWorked > 0).length;
  
  const totalOvertimeHours = reports.reduce((sum, r) => sum + r.summary.cumulativeOvertimeHours, 0);
  const totalOvertimePay = reports.reduce((sum, r) => sum + r.summary.overtimePay, 0);
  const totalRegularPay = reports.reduce((sum, r) => sum + r.summary.regularPay, 0);
  const totalGrossPayroll = reports.reduce((sum, r) => sum + r.summary.totalGrossPay, 0);

  // Extract unique departments for filters
  const departments = ['ALL', ...Array.from(new Set(reports.map(r => r.employee.department)))];

  // Filter report lists
  const filteredReports = reports.filter(r => {
    const matchesSearch = 
      r.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee.number.includes(searchTerm) ||
      r.employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = deptFilter === 'ALL' || r.employee.department === deptFilter;
    
    return matchesSearch && matchesDept;
  });

  // EXPORT TO EXCEL FEATURE using SheetJS (Full dual-sheet export match)
  const handleExportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Master Payroll Summary
      const summaryRows = reports.map(r => ({
        "Punch ID": r.employee.number,
        "Employee Name": r.employee.name,
        "Department": r.employee.department,
        "Daily Duty Requirement (Hrs)": r.employee.dutyHours,
        "Standard Hourly Rate (৳)": r.employee.hourlyRate,
        "Overtime Rate (৳)": r.employee.overtimeRate,
        "Workdays Logged": r.summary.totalDaysWorked,
        "Off Days Recorded": r.summary.offDaysCount,
        "Total Productive Hours": r.summary.cumulativeHours,
        "Total Overtime Hours": r.summary.cumulativeOvertimeHours,
        "Overtime Earnings (৳)": r.summary.overtimePay,
        "Total Overtime Pay (৳)": r.summary.totalGrossPay
      }));

      // Append general total row
      summaryRows.push({
        "Punch ID": "TOTALS",
        "Employee Name": `Total Workforce: ${totalEmployees}`,
        "Department": "",
        "Daily Duty Requirement (Hrs)": 0,
        "Standard Hourly Rate (৳)": 0,
        "Overtime Rate (৳)": 0,
        "Workdays Logged": reports.reduce((sum, r) => sum + r.summary.totalDaysWorked, 0),
        "Off Days Recorded": reports.reduce((sum, r) => sum + r.summary.offDaysCount, 0),
        "Total Productive Hours": parseFloat(reports.reduce((sum, r) => sum + r.summary.cumulativeHours, 0).toFixed(2)),
        "Total Overtime Hours": parseFloat(totalOvertimeHours.toFixed(2)),
        "Overtime Earnings (৳)": parseFloat(totalOvertimePay.toFixed(2)),
        "Total Overtime Pay (৳)": parseFloat(totalOvertimePay.toFixed(2))
      });

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Monthly Payroll");

      // Sheet 2: Granular Daily Overtime Details
      const detailsRows: any[] = [];
      reports.forEach(r => {
        Object.keys(r.days).forEach(dateStr => {
          const d = r.days[dateStr];
          detailsRows.push({
            "Punch ID": r.employee.number,
            "Employee Name": r.employee.name,
            "Department": r.employee.department,
            "Date": dateStr,
            "Status": d.isOffDay ? "OFF DAY" : "WORK DAY",
            "In Punch Time": d.inTimeStr || (d.isOffDay ? "Blank" : ""),
            "Out Punch Time": d.outTimeStr || (d.isOffDay ? "Blank" : ""),
            "Total In-to-Out Duration (Hrs)": parseFloat(d.totalDurationFractional.toFixed(2)),
            "Deducted Break (Hrs)": d.breakDeductionFractional,
            "Shift Requirement (Hrs)": d.dutyHours,
            "Eligible Overtime (Hrs)": parseFloat(d.overtimeHours.toFixed(2)),
            "Overtime Rate Charged (৳)": r.employee.overtimeRate,
            "Calculated Day Earnings (৳)": d.overtimePay
          });
        });
      });

      const wsDetails = XLSX.utils.json_to_sheet(detailsRows);
      XLSX.utils.book_append_sheet(wb, wsDetails, "Detailed Logs");

      // Download Trigger
      XLSX.writeFile(wb, `Payroll_Overtime_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      alert("Error generating Excel download file: " + err);
    }
  };

  // Launch browser native print dialog with printer-friendly styling rules pre-bound
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="payroll-report-section">
      {/* Success notification banner */}
      {successSavedName && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce print:hidden">
          <Check className="w-4.5 h-4.5 text-emerald-600" />
          <span>Successfully saved <strong>{successSavedName}</strong>'s calculated wages & overtime record to MongoDB Atlas database successfully! This record is now registered in the Main Dashboard.</span>
        </div>
      )}

      {/* Company Financial Dash Summary Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Payroll */}
        <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl text-white shadow-md relative overflow-hidden" id="stat-gross-payroll">
          <div className="absolute right-4 top-4 text-emerald-500/20 bg-emerald-500/10 p-2 rounded-xl">
            <span className="text-xl font-bold text-emerald-400">৳</span>
          </div>
          <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Total Overtime Payroll</span>
          <h3 className="text-2xl font-bold mt-1 text-white select-all">
            ৳{totalOvertimePay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Wages for active calculated rosters
          </p>
        </div>

        {/* Total Overtime Pay */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden" id="stat-ot-payroll">
          <div className="absolute right-4 top-4 text-indigo-600/10 bg-indigo-50 p-2 rounded-xl">
            <span className="text-xl font-bold text-indigo-600">৳</span>
          </div>
          <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Average OT Payout</span>
          <h3 className="text-2xl font-bold mt-1 text-slate-800">
            ৳{(activeWorkedCount ? (totalOvertimePay / activeWorkedCount) : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">
            Average OT pay per active staff
          </p>
        </div>

        {/* Total Overtime Hours */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden" id="stat-ot-hours">
          <div className="absolute right-4 top-4 text-sky-600/10 bg-sky-50 p-2 rounded-xl">
            <Clock className="w-6 h-6 text-sky-600" />
          </div>
          <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Total Overtime Logged</span>
          <h3 className="text-2xl font-bold mt-1 text-slate-800">
            {totalOvertimeHours.toFixed(1)} hrs
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">
            Calculated with <strong>15-min daily break deductions</strong>
          </p>
        </div>

        {/* Workforce Coverage */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden" id="stat-workforce">
          <div className="absolute right-4 top-4 text-amber-600/10 bg-amber-50 p-2 rounded-xl">
            <Users className="w-6 h-6 text-amber-600" />
          </div>
          <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Workforce Attendance</span>
          <h3 className="text-2xl font-bold mt-1 text-slate-800">
            {activeWorkedCount} / {totalEmployees} Active
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">
            Remaining roster matches loaded attendance entries
          </p>
        </div>
      </div>

      {/* Main Payroll Table Module */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" id="payroll-report-table-card">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-800 text-base">Monthly Overtime Report Overview</h3>
            <p className="text-xs text-slate-500">Summary output of biometric punches and computed overtime earnings</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </button>
            <button
              id="export-excel-btn"
              onClick={handleExportToExcel}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Multi-Sheet Excel
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-150 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search reports by employee name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-700"
            />
          </div>

          {/* Department Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto" id="dept-filter-bar">
            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setDeptFilter(dept)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  deptFilter === dept 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left border-collapse print:text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider print:bg-transparent">
                <th className="px-5 py-3">Punch ID</th>
                <th className="px-5 py-3">Employee Name</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3 text-center">Days Worked</th>
                <th className="px-5 py-3 text-center text-amber-600 font-semibold bg-amber-50/10">Off Days</th>
                <th className="px-5 py-3 text-center font-mono">Work Hours</th>
                <th className="px-5 py-3 text-center font-mono text-indigo-600">Overtime Hours</th>
                <th className="px-5 py-3 text-right text-indigo-600">Overtime Earnings</th>
                <th className="px-5 py-3 text-center print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700 print:divide-y-2">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-8 text-center text-slate-400 bg-white">
                    Please load or paste attendance punch timings to start calculations.
                  </td>
                </tr>
              ) : (
                filteredReports.map(report => {
                  const isSelected = selectedEmployeeId === report.employee.id;

                  return (
                    <tr 
                      key={report.employee.id} 
                      className={`hover:bg-indigo-50/20 transition-all cursor-pointer ${
                        isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50/60 font-medium border-l-4 border-indigo-500' : ''
                      }`}
                      onClick={() => onSelectEmployee(isSelected ? null : report.employee.id)}
                    >
                      {/* Punch Number */}
                      <td className="px-5 py-3.5 font-mono text-slate-500 text-xs">
                        # {report.employee.number}
                      </td>

                      {/* Employee Name */}
                      <td className="px-5 py-3.5 font-bold text-slate-900 uppercase tracking-wide">
                        {report.employee.name}
                      </td>

                      {/* Department */}
                      <td className="px-5 py-3.5 text-xs text-slate-500 uppercase">
                        {report.employee.department}
                      </td>

                      {/* Days Worked */}
                      <td className="px-5 py-3.5 text-center font-bold text-slate-800">
                        {report.summary.totalDaysWorked} days
                      </td>

                      {/* Off Days */}
                      <td className="px-5 py-3.5 text-center font-semibold text-amber-600 bg-amber-50/20">
                        {report.summary.offDaysCount} days
                      </td>

                      {/* Work Hours after break */}
                      <td className="px-5 py-3.5 text-center font-mono text-xs">
                        {report.summary.cumulativeHours.toFixed(1)} hrs
                      </td>

                      {/* Overtime Hours */}
                      <td className="px-5 py-3.5 text-center font-mono text-xs font-bold text-indigo-600 bg-indigo-50/20">
                        {report.summary.cumulativeOvertimeHours > 0 
                          ? `${report.summary.cumulativeOvertimeHours.toFixed(1)} hrs`
                          : '0.0 hrs'
                        }
                      </td>

                      {/* Overtime Earnings */}
                      <td className="px-5 py-3.5 text-right font-bold text-indigo-600 bg-indigo-50/10">
                        {report.summary.overtimePay > 0 
                          ? `৳${report.summary.overtimePay.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : "৳0.00"
                        }
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-center print:hidden">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEmployee(isSelected ? null : report.employee.id);
                            }}
                            className="py-1 px-3.5 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-250 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-bold"
                          >
                            Days
                            <span className="text-[10px] text-slate-400 font-bold font-sans ml-0.5">&gt;</span>
                          </button>

                          {(() => {
                            const monthLabel = resolveMonthLabelFromReport(report.days);
                            const isAlreadySaved = paymentHistory.some(p => p.employeeId === report.employee.id && p.monthStr === monthLabel);
                            if (isAlreadySaved) {
                              return (
                                <span className="py-1 px-3 rounded-lg text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 inline-flex items-center gap-1.5 font-bold select-none">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                                  Saved
                                </span>
                              );
                            }
                            return (
                              <button
                                onClick={(e) => handleSaveToDB(e, report)}
                                className="py-1 px-3.5 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-700 text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer font-bold shadow-sm border border-indigo-650"
                              >
                                <span className="w-3.5 h-3.5 border border-white/60 bg-white/10 rounded flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-white stroke-[4]" />
                                </span>
                                Save
                              </button>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bulk Saving Action Bar at the bottom of the table */}
        {filteredReports.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div className="text-xs text-slate-500 font-medium">
              Check all records above. Click bottom save to write all {filteredReports.length} filtered employee reports directly to MongoDB.
            </div>
            <button
              type="button"
              id="bulk-save-mongodb-btn"
              onClick={() => {
                let savedCount = 0;
                filteredReports.forEach(report => {
                  const monthLabel = resolveMonthLabelFromReport(report.days);
                  const isAlreadySaved = paymentHistory.some(p => p.employeeId === report.employee.id && p.monthStr === monthLabel);
                  
                  if (!isAlreadySaved) {
                    const record: PaidRecord = {
                      id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}-${savedCount}`,
                      monthStr: monthLabel,
                      employeeId: report.employee.id,
                      employeeName: report.employee.name,
                      employeeNum: report.employee.number,
                      department: report.employee.department,
                      totalDaysWorked: report.summary.totalDaysWorked,
                      offDaysCount: report.summary.offDaysCount,
                      cumulativeHours: report.summary.cumulativeHours,
                      cumulativeOvertimeHours: report.summary.cumulativeOvertimeHours,
                      regularPay: report.summary.regularPay,
                      overtimePay: report.summary.overtimePay,
                      totalGrossPay: report.summary.totalGrossPay,
                      paymentDateStr: new Date().toISOString()
                    };
                    onAddPaymentHistory(record);
                    savedCount++;
                  }
                });
                
                alert(`Successfully processed and synced all workforce records to the MongoDB database! (${savedCount} new, others skipped as already saved)`);
              }}
              className="px-5 py-2.5 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md inline-flex items-center gap-2 cursor-pointer border border-indigo-650"
            >
              <Database className="w-4 h-4 fill-current text-white" />
              Save All to MongoDB
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
