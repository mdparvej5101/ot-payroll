/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Employee, EmployeeAttendanceReport, AttendanceDay, UnmatchedLog, PaidRecord } from './types';
import {
  INITIAL_MOCK_EMPLOYEES,
  groupRawPunches,
  generatePayrollReport,
  findUnmatchedExcelKeys
} from './utils/calculator';
import EmployeeManager from './components/EmployeeManager';
import AttendanceUploader from './components/AttendanceUploader';
import PayrollReport from './components/PayrollReport';
import OvertimeDetailsTable from './components/OvertimeDetailsTable';
import CompanyPayingHistory from './components/CompanyPayingHistory';
import ManualOvertimeCalculator from './components/ManualOvertimeCalculator';
import MonthlyReportsViewer from './components/MonthlyReportsViewer';
import { FileSpreadsheet, Users, Briefcase, Calculator, Clock, HelpCircle, ShieldCheck, FileText, Play, Trash2, Menu, X } from 'lucide-react';

// Roster calculation and persistence setup

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('roster_live_employees');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error reading employees from localStorage:", e);
    }
    return INITIAL_MOCK_EMPLOYEES;
  });

  const [rawData, setRawData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calculate' | 'reports' | 'roster'>('dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [calcMode, setCalcMode] = useState<'text' | 'excel'>('text');
  const [isCalculatedReportGenerated, setIsCalculatedReportGenerated] = useState(false);
  const [confirmDeleteEmpId, setConfirmDeleteEmpId] = useState<string | null>(null);
  const authedEmail = "Admin";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [paymentHistory, setPaymentHistory] = useState<PaidRecord[]>(() => {
    try {
      const saved = localStorage.getItem('roster_live_payments');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error reading payments from localStorage:", e);
    }
    return [];
  });

  const [adminDeductions, setAdminDeductions] = useState<{[key: string]: boolean}>(() => {
    try {
      const saved = localStorage.getItem('roster_live_adminDeductions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error reading admin deductions from localStorage:", e);
    }
    return {};
  });

  const [autoMinusUnder9HrsList, setAutoMinusUnder9HrsList] = useState<{[empId: string]: boolean}>(() => {
    try {
      const saved = localStorage.getItem('roster_live_autoMinusUnder9HrsList');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error reading auto minus settings from localStorage:", e);
    }
    return {};
  });

  // No remote backend fetches required since states are loaded synchronously on mount from localStorage.
  useEffect(() => {
    // Keep rawData in sync or print status
    console.log("App loaded. System status: Live, Database: LocalStorage (Database-Free Mode)");
  }, []);

  const handleAddPaymentHistory = (record: PaidRecord) => {
    setPaymentHistory(prev => {
      const exists = prev.some(r => r.employeeId === record.employeeId && r.monthStr === record.monthStr);
      let updated;
      if (exists) {
        updated = prev.map(r => r.employeeId === record.employeeId && r.monthStr === record.monthStr ? record : r);
      } else {
        updated = [record, ...prev];
      }
      localStorage.setItem('roster_live_payments', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteHistoryRecord = (id: string) => {
    setPaymentHistory(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('roster_live_payments', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    setPaymentHistory([]);
    localStorage.removeItem('roster_live_payments');
  };

  // Sync edits to LocalStorage
  const handleEmployeesChange = (updatedList: Employee[]) => {
    setEmployees(updatedList);
    localStorage.setItem('roster_live_employees', JSON.stringify(updatedList));
  };

  // Reset database back to default seed records locally
  const handleResetToDefault = () => {
    setEmployees(INITIAL_MOCK_EMPLOYEES);
    localStorage.setItem('roster_live_employees', JSON.stringify(INITIAL_MOCK_EMPLOYEES));

    setAdminDeductions({});
    localStorage.removeItem('roster_live_adminDeductions');

    setAutoMinusUnder9HrsList({});
    localStorage.removeItem('roster_live_autoMinusUnder9HrsList');
  };

  // Database syncing triggers

  // Run Calculations
  const groupedPunches = groupRawPunches(rawData);
  const reports = generatePayrollReport(employees, groupedPunches, adminDeductions, autoMinusUnder9HrsList);
  const unmatchedLogs = findUnmatchedExcelKeys(employees, groupedPunches);

  // Helper to compile human-readable month label for database rows
  const resolveMonthLabel = (daysObj: { [dateStr: string]: any }) => {
    const dates = Object.keys(daysObj);
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

  // Drilldown Selected Employee details (default to first active parsed employee with days worked, if none explicitly chosen yet)
  const firstActiveEmployee = reports.find(r => r.summary.totalDaysWorked > 0);
  const activeSelectedEmployeeId = selectedEmployeeId || (firstActiveEmployee ? firstActiveEmployee.employee.id : (reports.length > 0 ? reports[0].employee.id : null));
  const selectedReport = reports.find(r => r.employee.id === activeSelectedEmployeeId);
  const selectedRawPunches = selectedReport 
    ? (groupedPunches[selectedReport.employee.name] || groupedPunches[selectedReport.employee.number])
    : undefined;

  // Check if current employee report is already written to Mongo database history
  const isSelectedReportSaved = selectedReport 
    ? paymentHistory.some(p => p.employeeId === selectedReport.employee.id && p.monthStr === resolveMonthLabel(selectedReport.days))
    : false;

  const handleSaveReportForActiveEmployee = () => {
    if (!selectedReport) return;
    const { employee, days, summary } = selectedReport;
    const resolvedMonth = resolveMonthLabel(days);

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

    handleAddPaymentHistory(record);
  };



  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 1. Dark Collapsible Sidebar/Drawer */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-slate-900 flex flex-col h-full shrink-0 print:hidden z-50 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        {/* Brand Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shrink-0 shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">PayrollFlow</span>
          </div>

          {/* Close button for Mobile Drawer view */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close DrawerMenu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            id="nav-calculate-overtime"
            onClick={() => {
              setActiveTab('calculate');
              setSelectedEmployeeId(null);
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'calculate'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Clock className="w-5 h-5 shrink-0" />
            <span>Calculate Overtime</span>
          </button>

          <button
            id="nav-reports-explorer"
            onClick={() => {
              setActiveTab('reports');
              setSelectedEmployeeId(null);
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5 shrink-0" />
            <span>Reports</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('roster');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5 shrink-0" />
            <span>Employees</span>
          </button>
        </nav>

        {/* Sidebar Footer with system status */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex flex-col gap-1.5 px-3 py-2">
            <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Database Status</div>
            <div className="text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
              Local Storage Active
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            {/* Hamburger Trigger for Mobile/Tablet Drawer */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 text-slate-655 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-lg font-bold text-slate-800 tracking-tight truncate">Attendance & Overtime Calculator</h1>
            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-emerald-700 font-semibold uppercase shrink-0 hidden sm:inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Parser Active
            </span>
          </div>

          <div className="flex items-center gap-4">
            {rawData.length > 0 && (
              <p className="text-xs text-slate-500 font-mono italic max-w-[200px] truncate mr-2 hidden md:block">
                Loaded: {fileName}
              </p>
            )}
          </div>
        </header>

        {/* Scrollable Main Content Frame */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto print:p-0 print:overflow-visible">
          
          {/* Render Active View Modules */}
          {activeTab === 'dashboard' ? (
            <div className="space-y-6" id="payroll-dashboard-tab animate-fadeIn">
              <CompanyPayingHistory
                paymentHistory={paymentHistory}
                onDeleteHistoryRecord={handleDeleteHistoryRecord}
                onClearAllHistory={handleClearAllHistory}
              />
            </div>
          ) : activeTab === 'calculate' ? (
            <div className="space-y-6 animate-fadeIn" id="manual-calculation-tab">
              {/* Sub-selector to toggle between Manual Biometric Text Paste vs XLSX file upload */}
              <div className="flex bg-slate-200/80 p-1.5 rounded-xl w-fit border border-slate-250 print:hidden shrink-0">
                <button
                  type="button"
                  id="tab-toggle-text"
                  onClick={() => setCalcMode('text')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    calcMode === 'text'
                      ? 'bg-white text-slate-800 shadow-sm font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Option A: Paste Biometric Text logs
                </button>
                <button
                  type="button"
                  id="tab-toggle-excel"
                  onClick={() => setCalcMode('excel')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    calcMode === 'excel'
                      ? 'bg-white text-slate-800 shadow-sm font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Option B: Upload Excel Attendance Sheet
                </button>
              </div>

              {calcMode === 'text' ? (
                <ManualOvertimeCalculator
                  employees={employees}
                  adminDeductions={adminDeductions}
                  onToggleDeduction={(empId, dateStr) => {
                    const key = `${empId}_${dateStr}`;
                    setAdminDeductions(prev => {
                      const updated = {
                        ...prev,
                        [key]: !prev[key]
                      };
                      localStorage.setItem('roster_live_adminDeductions', JSON.stringify(updated));
                      return updated;
                    });
                  }}
                  autoMinusUnder9HrsList={autoMinusUnder9HrsList}
                  onToggleAutoMinus={(empId) => {
                    setAutoMinusUnder9HrsList(prev => {
                      const updated = {
                        ...prev,
                        [empId]: !prev[empId]
                      };
                      localStorage.setItem('roster_live_autoMinusUnder9HrsList', JSON.stringify(updated));
                      return updated;
                    });
                  }}
                  onAddPaymentHistory={handleAddPaymentHistory}
                />
              ) : (
                <div className="space-y-6">
                  {/* File Uploader Bar */}
                  <div className="print:hidden border-b border-dashed border-slate-200 pb-3">
                    <AttendanceUploader
                      onDataParsed={(data) => {
                        setRawData(data);
                        setSelectedEmployeeId(null);
                        setIsCalculatedReportGenerated(false); // require clicking Generate as requested
                      }}
                      fileName={fileName}
                      setFileName={setFileName}
                      unmatchedLogs={unmatchedLogs}
                      hasData={rawData.length > 0}
                    />
                  </div>

                  {/* Dynamic Help Callout / Generate trigger button as requested in Requirement #2 */}
                  {rawData.length > 0 && !isCalculatedReportGenerated && (
                    <div className="p-10 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs text-center space-y-4 max-w-lg mx-auto py-12 animate-fadeIn">
                      <div className="w-14 h-14 bg-indigo-50 text-indigo-650 flex items-center justify-center rounded-xl mx-auto shadow-sm border border-indigo-100">
                        <FileSpreadsheet className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-extrabold text-slate-800 text-sm">Attendance Logs Loaded & Active</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          We found <strong className="text-slate-800 font-extrabold">{rawData.length} check-in log records</strong> in <strong className="font-mono text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{fileName}</strong>. To compute real-time shift hours, deduct static breaks, and configure overtime payouts, click the Generate button.
                        </p>
                      </div>
                      <button
                        type="button"
                        id="calculate-generate-btn"
                        onClick={() => setIsCalculatedReportGenerated(true)}
                        className="py-3 px-7 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md inline-flex items-center gap-2 cursor-pointer border border-indigo-650 active:scale-95 text-[11px] uppercase tracking-wider font-sans select-none"
                      >
                        <Play className="w-3.5 h-3.5 fill-current text-white" />
                        Generate Overtime Report
                      </button>
                    </div>
                  )}

                  {/* Payroll Results Section & Daily Drilldowns - only rendered upon Generation! */}
                  {isCalculatedReportGenerated && (
                    <>
                      {/* Beautiful Employee Selection Dropdown for direct access */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fadeIn">
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1.5 hover:text-indigo-650 transition-colors">
                            <Users className="w-4.5 h-4.5 text-indigo-600" />
                            Select Employee to Audit punches
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Choose an employee from the parsed {reports.length} workforce profiles
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <label htmlFor="employee-detail-select" className="text-xs font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                            Punch Profile:
                          </label>
                          <select
                            id="employee-detail-select"
                            value={activeSelectedEmployeeId || ""}
                            onChange={(e) => setSelectedEmployeeId(e.target.value || null)}
                            className="py-2.5 px-4 text-xs font-bold rounded-xl bg-white border border-slate-300 shadow-xs outline-none text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all min-w-[240px]"
                          >
                            {reports.map(r => (
                              <option key={r.employee.id} value={r.employee.id}>
                                {r.summary.totalDaysWorked > 0 ? "● " : "○ "}
                                {r.employee.name.toUpperCase()} 
                                {r.summary.totalDaysWorked > 0 ? ` (Worked: ${r.summary.totalDaysWorked}d, OT Wages: ৳${r.summary.overtimePay.toFixed(2)})` : ' (No punched records)'}
                              </option>
                            ))}
                          </select>

                          {activeSelectedEmployeeId && (
                            confirmDeleteEmpId === activeSelectedEmployeeId ? (
                              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1.5 rounded-xl animate-pulse">
                                <span className="text-[10px] font-bold text-rose-700 px-1.5 select-none">Delete permanently?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = employees.filter(emp => emp.id !== activeSelectedEmployeeId);
                                    handleEmployeesChange(updated);
                                    setSelectedEmployeeId(null);
                                    setConfirmDeleteEmpId(null);
                                  }}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteEmpId(null)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setConfirmDeleteEmpId(activeSelectedEmployeeId);
                                }}
                                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-750 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 select-none"
                                title="Delete this employee from roster"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Delete Employee</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Detailed Daily Drilldown table shown directly for the selected employee */}
                      {selectedReport && (
                        <div className="animate-fadeIn">
                          <OvertimeDetailsTable
                            report={selectedReport}
                            rawPunches={selectedRawPunches}
                            adminDeductions={adminDeductions}
                            onToggleDeduction={(dateStr) => {
                              const key = `${selectedReport.employee.id}_${dateStr}`;
                              setAdminDeductions(prev => {
                                const updated = {
                                  ...prev,
                                  [key]: !prev[key]
                                };
                                localStorage.setItem('roster_live_adminDeductions', JSON.stringify(updated));
                                return updated;
                              });
                            }}
                            autoMinusUnder9Hrs={autoMinusUnder9HrsList[selectedReport.employee.id] || false}
                            onToggleAutoMinus={() => {
                              const empId = selectedReport.employee.id;
                              setAutoMinusUnder9HrsList(prev => {
                                const updated = {
                                  ...prev,
                                  [empId]: !prev[empId]
                                };
                                localStorage.setItem('roster_live_autoMinusUnder9HrsList', JSON.stringify(updated));
                                return updated;
                              });
                            }}
                            onSave={handleSaveReportForActiveEmployee}
                            isSaved={isSelectedReportSaved}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === 'reports' ? (
            <div className="space-y-6 animate-fadeIn" id="reports-tab">
              <MonthlyReportsViewer
                employees={employees}
                paymentHistory={paymentHistory}
                onDeleteHistoryRecord={handleDeleteHistoryRecord}
                activeFileRawData={rawData}
                activeFileName={fileName}
              />
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn" id="roster-tab">
              <EmployeeManager
                employees={employees}
                onEmployeesChange={handleEmployeesChange}
                onResetToDefault={handleResetToDefault}
              />
            </div>
          )}

          {/* Footer of Scroll area */}
          <footer className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 pt-8 border-t border-slate-200 print:hidden gap-2 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Calculation Logic: <code>((Exit - Entry) - 15m Buffer) - Duty shift</code></span>
              <span className="h-3 w-px bg-slate-300 hidden sm:inline"></span>
              <span>Currency: BDT (৳)</span>
            </div>
            <div>System Status: Live & Ready | Database: Local Storage (Database-Free)</div>
          </footer>
        </div>
      </main>
    </div>
  );
}
