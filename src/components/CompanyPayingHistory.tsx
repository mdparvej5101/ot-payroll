/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PaidRecord } from '../types';
import { 
  DollarSign, 
  Trash2, 
  Search, 
  Calendar, 
  Users, 
  Printer, 
  TrendingUp, 
  Briefcase, 
  ChevronRight,
  Info,
  History,
  FileCheck2,
  Clock
} from 'lucide-react';

interface CompanyPayingHistoryProps {
  paymentHistory: PaidRecord[];
  onDeleteHistoryRecord: (id: string) => void;
  onClearAllHistory: () => void;
}

export default function CompanyPayingHistory({
  paymentHistory,
  onDeleteHistoryRecord,
  onClearAllHistory
}: CompanyPayingHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Compute stats
  const totalPaidGross = paymentHistory.reduce((sum, r) => sum + r.totalGrossPay, 0);
  const totalPaidRegular = paymentHistory.reduce((sum, r) => sum + r.regularPay, 0);
  const totalPaidOvertime = paymentHistory.reduce((sum, r) => sum + r.overtimePay, 0);
  const totalPaidHours = paymentHistory.reduce((sum, r) => sum + r.cumulativeHours, 0);
  const totalOvertimeHours = paymentHistory.reduce((sum, r) => sum + r.cumulativeOvertimeHours, 0);
  
  // Unique months in history for filter
  const months = ['ALL', ...Array.from(new Set(paymentHistory.map(r => r.monthStr)))];

  // Filtering logs
  const filteredHistory = paymentHistory.filter(r => {
    const matchesSearch = 
      r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employeeNum.includes(searchTerm) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMonth = monthFilter === 'ALL' || r.monthStr === monthFilter;

    return matchesSearch && matchesMonth;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="company-paying-history-dashboard">
      
      {/* 1. Global Financial Metrics banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Cumulative Overtime Paid */}
        <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl text-white shadow-md relative overflow-hidden" id="dash-paid-gross">
          <div className="absolute right-4 top-4 text-emerald-500/20 bg-emerald-500/10 p-2 rounded-xl">
            <span className="text-xl font-bold text-emerald-400">৳</span>
          </div>
          <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Cumulative Paid Overtime</span>
          <h3 className="text-2.5xl font-extrabold mt-1 text-white select-all">
            ৳{totalPaidOvertime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Overtime bonus credits saved
          </p>
        </div>

        {/* Overtime Hours Disbursed */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden" id="dash-paid-regular">
          <div className="absolute right-4 top-4 text-indigo-600/10 bg-indigo-50 p-2 rounded-xl">
            <Clock className="w-6 h-6 text-indigo-600" />
          </div>
          <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Overtime Hours Disbursed</span>
          <h3 className="text-2xl font-bold mt-1 text-slate-800">
            {totalOvertimeHours.toFixed(1)} hrs
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">
            Standard duty shifts exceeded
          </p>
        </div>

        {/* Avg OT Paid Per Voucher */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden" id="dash-paid-ot">
          <div className="absolute right-4 top-4 text-indigo-600/10 bg-indigo-50 p-2 rounded-xl">
            <span className="text-xl font-bold text-indigo-500">৳</span>
          </div>
          <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Avg OT Per Voucher</span>
          <h3 className="text-2xl font-bold mt-1 text-slate-800">
            ৳{(paymentHistory.length ? (totalPaidOvertime / paymentHistory.length) : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            Average payout across transactions
          </p>
        </div>

        {/* Logged months / entries count */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden" id="dash-paid-batches">
          <div className="absolute right-4 top-4 text-sky-600/10 bg-sky-50 p-2 rounded-xl">
            <History className="w-6 h-6 text-sky-600" />
          </div>
          <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Transactions Registered</span>
          <h3 className="text-2xl font-bold mt-1 text-slate-800">
            {paymentHistory.length} Payments
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">
            Historical payment logs tracked in system database
          </p>
        </div>
      </div>

      {/* 2. Registered history entries Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" id="history-logs-main-card">
        
        {/* Card Header controls */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-800 text-base flex items-center gap-1.5">
              <FileCheck2 className="w-5 h-5 text-indigo-600" />
              Company Paying History Logs
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">List of verified and paid monthly vouchers registered by Admin</p>
          </div>

          <div className="flex gap-2">
            {paymentHistory.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-205 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  Print Paying Report
                </button>
                {showClearAllConfirm ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-220 p-1 rounded-lg animate-pulse">
                    <span className="text-[10px] font-bold text-rose-700 px-1.5 select-none">Are you sure?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllHistory();
                        setShowClearAllConfirm(false);
                      }}
                      className="bg-red-600 hover:bg-red-750 text-white font-bold text-[10px] px-2 py-1 rounded cursor-pointer transition-colors"
                    >
                      Yes, Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearAllConfirm(false)}
                      className="bg-slate-205 hover:bg-slate-300 text-slate-700 font-bold text-[10px] px-2 py-1 rounded cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClearAllConfirm(true)}
                    className="px-3.5 py-1.5 text-xs font-bold text-red-650 bg-white hover:bg-red-50 border border-red-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All History
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-150 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search history by employee name, code, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-700"
            />
          </div>

          {/* Month selector filter list */}
          {months.length > 2 && (
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto" id="history-month-filter">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {months.map(m => (
                <button
                  key={m}
                  onClick={() => setMonthFilter(m)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    monthFilter === m 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Voucher Ref</th>
                <th className="px-5 py-3">Staff Name</th>
                <th className="px-5 py-3">Dept</th>
                <th className="px-5 py-3 text-center">Month Bill</th>
                <th className="px-5 py-3 text-center">Days Worked</th>
                <th className="px-5 py-3 text-center">OT Hours</th>
                <th className="px-5 py-3 text-right text-indigo-600">OT Earned</th>
                <th className="px-5 py-3 text-center">Registration Date</th>
                <th className="px-5 py-3 text-center print:hidden">Purge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-10 text-center text-slate-400 bg-white">
                    <div className="max-w-md mx-auto space-y-2 py-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                        <History className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-slate-700">No payment records match your parameters</p>
                      <p className="text-xs text-slate-400 leading-normal">
                        Generate and register staff salaries under the new <strong className="text-slate-600">Calculate Overtime</strong> tab to populate this history dashboard.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map(record => {
                  const paymentDate = new Date(record.paymentDateStr);
                  
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Ref ID */}
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-400">
                        {record.id.substring(0, 11)}..
                      </td>

                      {/* Staff Name */}
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {record.employeeName}
                        <span className="block text-[10.5px] text-slate-400 font-normal font-sans">ID Code: #{record.employeeNum}</span>
                      </td>

                      {/* Dept */}
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {record.department}
                      </td>

                      {/* Month Bill */}
                      <td className="px-5 py-3.5 text-center font-semibold text-indigo-700 whitespace-nowrap">
                        {record.monthStr}
                      </td>

                      {/* Days Worked */}
                      <td className="px-5 py-3.5 text-center font-medium">
                        {record.totalDaysWorked} worked <span className="text-[10px] text-slate-400">({record.offDaysCount} off)</span>
                      </td>

                      {/* OT Hours */}
                      <td className="px-5 py-3.5 text-center font-mono font-semibold text-indigo-600 bg-indigo-50/10">
                        {record.cumulativeOvertimeHours.toFixed(1)} hrs
                      </td>

                      {/* OT Earned */}
                      <td className="px-5 py-3.5 text-right font-bold text-indigo-600 bg-indigo-50/10">
                        ৳{record.overtimePay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Registration Date */}
                      <td className="px-5 py-3.5 text-center text-xs text-slate-400 whitespace-nowrap">
                        {paymentDate.toLocaleDateString()} {paymentDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </td>

                      {/* Delete Action */}
                      <td className="px-5 py-3 text-center print:hidden">
                        {deleteConfirmId === record.id ? (
                          <div className="flex items-center justify-center gap-1 bg-rose-50 border border-rose-150 p-1 rounded animate-fadeIn">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteHistoryRecord(record.id);
                                setDeleteConfirmId(null);
                              }}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(record.id)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-red-650 rounded-lg transition-colors cursor-pointer"
                            title="Purge record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
