/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EmployeeAttendanceReport, Employee, AttendanceDay } from '../types';
import { Calendar, ShieldAlert, ToggleLeft, ToggleRight, MinusCircle, CheckCircle, Info, AlertTriangle, Database } from 'lucide-react';
import { formatHumanDate, formatHoursFractional, formatTime24 } from '../utils/calculator';

interface OvertimeDetailsTableProps {
  report: EmployeeAttendanceReport;
  rawPunches: { [dateStr: string]: AttendanceDay } | undefined;
  adminDeductions?: { [key: string]: boolean };
  onToggleDeduction?: (dateStr: string) => void;
  autoMinusUnder9Hrs?: boolean;
  onToggleAutoMinus?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
}

export default function OvertimeDetailsTable({
  report,
  rawPunches = {},
  adminDeductions = {},
  onToggleDeduction,
  autoMinusUnder9Hrs = false,
  onToggleAutoMinus,
  onSave,
  isSaved = false
}: OvertimeDetailsTableProps) {
  const { employee, days, summary } = report;

  // Combine calendar dates from calculations, raw logs OR full monthly window
  const allDateKeys = Array.from(new Set([
    ...Object.keys(days),
    ...Object.keys(rawPunches)
  ])).sort((a, b) => b.localeCompare(a)); // Chronological descending order

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" id="overtime-details-subtable">
      
      {/* 1. Header Card with Employee Summary & Settings */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Daily Attendance Audit & Overtime Drilldown
          </h3>
          <p className="text-xs text-slate-500">
            Currently displaying day-by-day calculations for: <strong className="text-slate-800">{employee.name}</strong> (Code #{employee.number})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs bg-indigo-50 border border-indigo-150 text-indigo-700 p-2 px-3.5 rounded-lg font-medium">
            💼 Standard Shift: <strong>{employee.dutyHours} Hours</strong> | Rate: <strong>৳{employee.hourlyRate}/hr</strong>
          </div>
        </div>
      </div>

      {/* 2. Admin Overtime Deductions Panel (Requirement #1) */}
      <div className="p-4 bg-amber-50/50 border-b border-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-2.5 max-w-2xl">
          <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-900 text-xs leading-tight">Admin Late Punishment Overrides (Duty Shortage Subtraction)</p>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              If this employee worked less than their standard {employee.dutyHours} duty hours (e.g. worked 8 hours 40 minutes, meaning they are short by 20 minutes), you can punish/subtract that exact shortage from their total overtime balance. Enable the global override below or selectively select on specific days in the table.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center">
          {onToggleAutoMinus && (
            <button
              onClick={onToggleAutoMinus}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer border ${
                autoMinusUnder9Hrs
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-250 hover:bg-slate-50'
              }`}
            >
              {autoMinusUnder9Hrs ? (
                <>
                  <ToggleRight className="w-5 h-5 text-white" />
                  <span>Global Punishment ON</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5 text-slate-400" />
                  <span>Global Punishment OFF</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 3. Logic helper alert */}
      <div className="p-4 bg-indigo-50/40 border-b border-indigo-100 text-[11px] text-slate-600 flex flex-col gap-2">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-indigo-950 leading-tight">Daily Overtime Calculation Formula (Requirement #2 & 3):</p>
            <p className="mt-1 leading-normal">
              No fixed shift schedules apply. We calculate the duration strictly between the first <strong>IN</strong> punch and final <strong>OUT</strong> punch. 
              <code>Overtime Hours = (Final OUT - First IN) - (15m Break Buffer) - ({employee.dutyHours} Duty requirement)</code>.
              Overtime Wages are computed strictly as: <code>Overtime Hours × ৳{employee.hourlyRate} (Hourly Rate)</code>.
            </p>
          </div>
        </div>
        <div className="bg-amber-50/65 border border-amber-100 rounded-lg p-2.5 flex items-center gap-2 mt-1 Text-[11px] text-amber-800 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
          <span><strong>Break Subtraction Note:</strong> A standard 15-minute break (-0.25 hrs) is automatically subtracted from the total gross duration of each working day.</span>
        </div>
      </div>

      {/* 4. Daily Attendance Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-5 py-3">Work Date</th>
              <th className="px-5 py-3 text-center">First Punch (IN)</th>
              <th className="px-5 py-3 text-center">Last Punch (OUT)</th>
              <th className="px-5 py-3 text-center font-mono">Gross Duration</th>
              <th className="px-5 py-3 text-center font-mono">Shift Requirement</th>
              <th className="px-5 py-3 text-center font-mono text-indigo-600">Calculated Overtime</th>
              <th className="px-5 py-3 text-right text-indigo-600">Earnings Credited</th>
              <th className="px-5 py-3 text-center print:hidden">Admin Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {allDateKeys.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-slate-400 bg-white">
                  No attendance punches recorded for this employee profile inside the active XLS batch.
                </td>
              </tr>
            ) : (
              allDateKeys.map(dateStr => {
                const dayLog = rawPunches[dateStr];
                const ct = days[dateStr];

                // Requirement #3: Blank IN and OUT represent an OFF DAY
                if (ct?.isOffDay) {
                  return (
                    <tr key={dateStr} className="bg-slate-50/50 hover:bg-slate-100/50 transition-colors italic text-slate-500">
                      {/* Work Date */}
                      <td className="px-5 py-3.5 font-medium text-slate-600 whitespace-nowrap">
                        {formatHumanDate(new Date(dateStr))}
                      </td>

                      {/* Blank In Time */}
                      <td className="px-5 py-3.5 text-center font-mono text-slate-400 font-semibold text-xs transition-colors">
                        [ Blank ]
                      </td>

                      {/* Blank Out Time */}
                      <td className="px-5 py-3.5 text-center font-mono text-slate-400 font-semibold text-xs transition-colors">
                        [ Blank ]
                      </td>

                      {/* Gross Duration */}
                      <td className="px-5 py-3.5 text-center font-mono text-slate-400 text-xs">
                        -
                      </td>

                      {/* Shift Requirement */}
                      <td className="px-5 py-3.5 text-center font-mono text-slate-400 text-xs">
                        -
                      </td>

                      {/* Calculated Overtime */}
                      <td className="px-5 py-3.5 text-center font-mono text-slate-400 text-xs">
                        -
                      </td>

                      {/* Earnings */}
                      <td className="px-5 py-3.5 text-right font-mono text-slate-400 text-xs font-bold">
                        ৳0.00
                      </td>

                      {/* Actions column if duty is 9 hours */}
                      <td className="px-5 py-3.5 text-center print:hidden">
                        <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          OFF DAY
                        </span>
                      </td>
                    </tr>
                  );
                }

                // If we have an incomplete punch error (e.g. they only swiped once during the day)
                if (dayLog && dayLog.hasError) {
                  return (
                    <tr key={dateStr} className="bg-amber-50/50 hover:bg-amber-50">
                      <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                        {formatHumanDate(dayLog.date)}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-500 font-semibold">
                        {formatTime24(dayLog.inTime)} <span className="text-[10px] bg-indigo-50 border border-indigo-100 px-1 rounded text-indigo-600">IN</span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-400 italic">
                        Missing Out Punch
                      </td>
                      <td colSpan={4} className="px-5 py-3.5 text-amber-700 text-xs font-bold font-mono">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>{dayLog.errorMessage || "Single swipe logged. Out punches cannot be solved automatically."}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center print:hidden">
                        <span className="text-slate-400 text-xs">-</span>
                      </td>
                    </tr>
                  );
                }

                // If calculations are standard
                if (!ct) return null;
                const dDate = dayLog?.date || new Date(dateStr);

                const shortageHrs = ct.shortageHours || 0;
                const hasShortage = shortageHrs > 0;
                const shortageMins = Math.round(shortageHrs * 60);

                const deductionKey = `${employee.id}_${dateStr}`;
                const isDeductedOnThisDay = adminDeductions[deductionKey] === true;
                const isDeducted = hasShortage && (isDeductedOnThisDay || autoMinusUnder9Hrs);

                return (
                  <tr key={dateStr} className="hover:bg-slate-50/50 transition-colors">
                    {/* Work Date */}
                    <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                      {formatHumanDate(dDate)}
                    </td>

                    {/* First Punch (IN) */}
                    <td className="px-5 py-3.5 text-center font-mono text-slate-700 bg-emerald-50/10">
                      {ct.inTimeStr}
                    </td>

                    {/* Last Punch (OUT) */}
                    <td className="px-5 py-3.5 text-center font-mono text-slate-700 bg-emerald-50/10">
                      {ct.outTimeStr}
                    </td>

                    {/* Gross Duration */}
                    <td className="px-5 py-3.5 text-center font-mono text-slate-600">
                      {formatHoursFractional(ct.totalDurationFractional)}
                      <span className="block text-[10px] text-slate-400">({ct.totalDurationFractional.toFixed(2)} hrs)</span>
                    </td>

                    {/* Shift Requirement */}
                    <td className="px-5 py-3.5 text-center font-mono text-slate-500">
                      {ct.dutyHours} hrs
                      <span className="block text-[10px] text-slate-400">Standard Shift</span>
                    </td>

                    {/* Calculated Overtime Hours Remaining */}
                    <td className={`px-5 py-3.5 text-center font-mono font-bold transition-all ${
                      isDeducted 
                        ? 'text-red-500 bg-red-50/20' 
                        : ct.overtimeHours > 0 
                        ? 'text-indigo-600 bg-indigo-50/20' 
                        : 'text-slate-400 bg-slate-50/40'
                    }`}>
                      {isDeducted ? (
                        <>
                          <span className="line-through">0 mins</span>
                          <span className="block text-[10px] text-red-500 font-bold font-sans">-{shortageMins}m Late Penalty</span>
                        </>
                      ) : ct.overtimeHours > 0 ? (
                        <>
                          {formatHoursFractional(ct.overtimeHours)}
                          <span className="block text-[10px] text-indigo-500">({ct.overtimeHours.toFixed(2)} hrs)</span>
                        </>
                      ) : hasShortage ? (
                        <div className="text-slate-400">
                          -
                          <span className="block text-[9px] text-amber-600 font-semibold">Short by {shortageMins}m</span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* Earnings Credited */}
                    <td className={`px-5 py-3.5 text-right font-bold transition-all ${
                      isDeducted 
                        ? 'text-red-500 bg-red-10/10' 
                        : ct.overtimePay > 0 
                        ? 'text-indigo-600 bg-indigo-50/20' 
                        : 'text-slate-400'
                    }`}>
                      {isDeducted ? (
                        <>
                          <span className="line-through">৳0.00</span>
                          <span className="block text-[10px] text-red-500 font-bold font-sans">-৳{Math.abs(shortageHrs * employee.hourlyRate).toFixed(2)}</span>
                        </>
                      ) : ct.overtimePay > 0 ? (
                        <>
                          ৳{ct.overtimePay.toFixed(2)}
                          <span className="block text-[10px] text-indigo-400">@ ৳{employee.hourlyRate}/hr</span>
                        </>
                      ) : (
                        "৳0.00"
                      )}
                    </td>

                    {/* Interactive Admin Minus action buttons (Requirement #1) */}
                    <td className="px-5 py-3 text-center print:hidden">
                      {hasShortage ? (
                        onToggleDeduction ? (
                          <button
                            onClick={() => onToggleDeduction(dateStr)}
                            disabled={autoMinusUnder9Hrs} // Disabled if global override is ON
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none flex items-center gap-1 mx-auto transition-all cursor-pointer ${
                              autoMinusUnder9Hrs
                                ? 'bg-slate-150 text-slate-450 border border-slate-200 cursor-not-allowed opacity-60'
                                : isDeductedOnThisDay
                                ? 'bg-red-650 text-white hover:bg-red-700'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-350'
                            }`}
                            title={autoMinusUnder9Hrs ? "Deactivate Global Override above to manage this day individually" : `Subtract ${shortageMins}m late shortage`}
                          >
                            {isDeductedOnThisDay ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                                <span>Late Penalty Active</span>
                              </>
                            ) : (
                              <>
                                <MinusCircle className="w-3.5 h-3.5 text-slate-500" />
                                <span>Minus Late ({shortageMins}m)</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )
                      ) : (
                        <span className="text-[10.5px] bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-1 rounded font-medium whitespace-nowrap">
                          No shortage (Full Duty)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Employee Month Totals Footer - 5 Column Bento Layout */}
      <div className="bg-slate-50 p-4 border-t border-slate-200 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] tracking-wider text-slate-400 font-bold uppercase block">Work Days Logged</span>
          <p className="text-base font-bold text-slate-800 mt-1">{summary.totalDaysWorked} Days</p>
        </div>
        
        {/* Requirement #3: Off Days Counter display badge */}
        <div className="bg-white p-3 rounded-xl border border-amber-200">
          <span className="text-[10px] tracking-wider text-amber-500 font-bold uppercase block">Off Days Counted</span>
          <p className="text-base font-bold text-amber-600 mt-1">{summary.offDaysCount} Days</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 col-span-2 md:col-span-1">
          <span className="text-[10px] tracking-wider text-slate-400 font-bold uppercase block">Productive Work Hours</span>
          <p className="text-base font-bold text-slate-800 mt-1">{summary.cumulativeHours.toFixed(1)} Hours</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] tracking-wider text-slate-400 font-bold uppercase block">Total Overtime Hours</span>
          <p className="text-base font-bold text-indigo-600 mt-1">{summary.cumulativeOvertimeHours.toFixed(1)} hrs</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] tracking-wider text-slate-400 font-bold uppercase block">Overtime Wages Due</span>
          <p className="text-base font-bold text-indigo-600 mt-1">৳{summary.overtimePay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Save Report Action Footer */}
      {onSave && (
        <div className="p-5 bg-indigo-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-2 h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSaved ? 'bg-emerald-400' : 'bg-indigo-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSaved ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
            </span>
            <span className="text-xs font-medium text-slate-500">
              {isSaved 
                ? `Saved! "${employee.name}" overtime voucher is securely written to MongoDB.` 
                : `Ready to submit. Click Save to log calculated OT for "${employee.name}".`
              }
            </span>
          </div>

          <div>
            {isSaved ? (
              <button
                disabled
                className="py-2.5 px-6 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 font-sans inline-flex items-center gap-1.5 select-none"
              >
                <CheckCircle className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>Save Success</span>
              </button>
            ) : (
              <button
                onClick={onSave}
                className="py-2.5 px-6 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md inline-flex items-center gap-2 cursor-pointer border border-indigo-650 hover:shadow-indigo-150 text-[11px]"
              >
                <CheckCircle className="w-3.5 h-3.5 text-indigo-200" />
                Save Report to MongoDB
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
