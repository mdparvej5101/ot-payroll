/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Employee } from '../types';
import { Plus, Trash2, Search, Edit2, ShieldAlert, Check, X, RefreshCw, Users } from 'lucide-react';

interface EmployeeManagerProps {
  employees: Employee[];
  onEmployeesChange: (updatedList: Employee[]) => void;
  onResetToDefault: () => void;
}

export default function EmployeeManager({
  employees,
  onEmployeesChange,
  onResetToDefault
}: EmployeeManagerProps) {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [hourlyRate, setHourlyRate] = useState(120.00);
  const [overtimeRate, setOvertimeRate] = useState(120.00);
  const [dutyHours, setDutyHours] = useState(9);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editHourly, setEditHourly] = useState(120.00);
  const [editOvertime, setEditOvertime] = useState(120.00);
  const [editDuty, setEditDuty] = useState(9);

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Check if machine number is already in use
    if (employees.some(emp => emp.number.trim() === number.trim())) {
      alert(`Machine Number "${number}" is already assigned to another employee.`);
      return;
    }

    const newEmp: Employee = {
      id: `EMP-${Date.now()}`,
      name: name.trim().toUpperCase(),
      number: number.trim() || String(employees.length + 1),
      department: department.trim() || 'GENERAL',
      hourlyRate,
      overtimeRate,
      dutyHours
    };

    onEmployeesChange([...employees, newEmp]);
    
    // Reset Form
    setName('');
    setNumber('');
    setDepartment('');
    setHourlyRate(120.00);
    setOvertimeRate(120.00);
    setDutyHours(9);
    setIsAdding(false);
  };

  const handleStartEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditName(emp.name);
    setEditNumber(emp.number);
    setEditDept(emp.department);
    setEditHourly(emp.hourlyRate);
    setEditOvertime(emp.overtimeRate);
    setEditDuty(emp.dutyHours);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;

    const updated = employees.map(emp => {
      if (emp.id === id) {
        return {
          ...emp,
          name: editName.trim().toUpperCase(),
          number: editNumber.trim(),
          department: editDept.trim().toUpperCase(),
          hourlyRate: editHourly,
          overtimeRate: editOvertime,
          dutyHours: editDuty
        };
      }
      return emp;
    });

    onEmployeesChange(updated);
    setEditingId(null);
  };

  const handleDeleteEmployee = (id: string) => {
    onEmployeesChange(employees.filter(emp => emp.id !== id));
    if (deleteConfirmId === id) {
      setDeleteConfirmId(null);
    }
  };

  // Helper to auto-update overtime rate to match standard hourly if toggle or input requested
  const handleHourlyRateChange = (val: number, isEdit: boolean) => {
    if (isEdit) {
      setEditHourly(val);
      setEditOvertime(val);
    } else {
      setHourlyRate(val);
      setOvertimeRate(val);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.number.includes(search) ||
    emp.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" id="employee-manager-section">
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-lg">Roster Master Database</h2>
            <p className="text-xs text-slate-500">Manage punch codes, base wages, and rules</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showResetConfirm ? (
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg p-1 animate-pulse">
              <span className="text-[10px] font-bold text-rose-700 px-1.5 select-none">Reset Roster?</span>
              <button
                type="button"
                onClick={() => {
                  onResetToDefault();
                  setShowResetConfirm(false);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2 py-1 rounded cursor-pointer transition-colors"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] px-2 py-1 rounded cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              id="reset-db-btn"
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset simulation database to seed records"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
          )}
          
          <button
            id="toggle-add-form"
            onClick={() => setIsAdding(!isAdding)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Close form' : 'Register New Employee'}
          </button>
        </div>
      </div>

      {/* Add New Employee Form */}
      {isAdding && (
        <form onSubmit={handleAddEmployee} className="p-5 bg-slate-50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-6 gap-4" id="add-employee-form">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Employee Name *</label>
            <input
              type="text"
              required
              placeholder="E.G. MAHBUB"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Punch No. (On Sheet) *</label>
            <input
              type="text"
              required
              placeholder="e.g. 6"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
            <input
              type="text"
              placeholder="E.G. OUR COMPANY"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Hourly Rate (৳) *</label>
            <input
              type="number"
              required
              min="0.1"
              step="0.1"
              value={hourlyRate}
              onChange={(e) => handleHourlyRateChange(parseFloat(e.target.value) || 0, false)}
              className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Overtime Rate (৳) *</label>
            <div className="relative">
              <input
                type="number"
                required
                min="0.1"
                step="0.1"
                value={overtimeRate}
                onChange={(e) => setOvertimeRate(parseFloat(e.target.value) || 0)}
                className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
              <span className="absolute right-2 top-2 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">Auto Equal</span>
            </div>
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-700 mb-1">Duty Hours (Daily) *</label>
            <input
              type="number"
              required
              min="1"
              max="24"
              value={dutyHours}
              onChange={(e) => setDutyHours(parseInt(e.target.value, 10) || 9)}
              className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          <div className="md:col-span-5 flex justify-end items-center">
            <p className="text-xs text-slate-500 italic">⭐ Submitting will register employee in the local storage roster registry</p>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Add Employee
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search database by name, RFID card punch ID, or company department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-700"
          />
        </div>
      </div>

      {/* Roster Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="px-5 py-3">Punch Code</th>
              <th className="px-5 py-3">Employee Name</th>
              <th className="px-5 py-3">Department</th>
              <th className="px-5 py-3 text-center">Base Hourly Rate</th>
              <th className="px-5 py-3 text-center">Overtime Hourly Rate</th>
              <th className="px-5 py-3 text-center">Duty Requirement</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-400 bg-white">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <ShieldAlert className="w-6 h-6 text-slate-300" />
                    <span>No employees found matching standard search</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEmployees.map(emp => {
                const isEditing = editingId === emp.id;

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Punch Code */}
                    <td className="px-5 py-3.5 font-mono font-semibold text-indigo-600">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editNumber}
                          onChange={(e) => setEditNumber(e.target.value)}
                          className="w-16 px-2 py-1 text-xs border border-indigo-400 rounded focus:outline-indigo-500 font-mono text-center text-slate-800"
                        />
                      ) : (
                        `# ${emp.number}`
                      )}
                    </td>

                    {/* Employee Name */}
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full max-w-[150px] px-2 py-1 text-xs border border-indigo-400 rounded focus:outline-indigo-500 text-slate-800"
                        />
                      ) : (
                        emp.name
                      )}
                    </td>

                    {/* Department */}
                    <td className="px-5 py-3.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editDept}
                          onChange={(e) => setEditDept(e.target.value)}
                          className="w-full max-w-[120px] px-2 py-1 text-xs border border-indigo-400 rounded focus:outline-indigo-500 text-slate-800"
                        />
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">
                          {emp.department}
                        </span>
                      )}
                    </td>

                    {/* Base Hourly Rate */}
                    <td className="px-5 py-3.5 text-center font-semibold text-slate-600">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs text-slate-400">৳</span>
                          <input
                            type="number"
                            step="0.1"
                            value={editHourly}
                            onChange={(e) => handleHourlyRateChange(parseFloat(e.target.value) || 0, true)}
                            className="w-16 px-1.5 py-1 text-xs border border-indigo-400 rounded text-center text-slate-800"
                          />
                        </div>
                      ) : (
                        `৳${emp.hourlyRate.toFixed(2)}/hr`
                      )}
                    </td>

                    {/* Overtime Rate */}
                    <td className="px-5 py-3.5 text-center font-semibold text-indigo-600">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs text-slate-400">৳</span>
                          <input
                            type="number"
                            step="0.1"
                            value={editOvertime}
                            onChange={(e) => setEditOvertime(parseFloat(e.target.value) || 0)}
                            className="w-16 px-1.5 py-1 text-xs border border-indigo-400 rounded text-center text-slate-800"
                          />
                        </div>
                      ) : (
                        `৳${emp.overtimeRate.toFixed(2)}/hr`
                      )}
                    </td>

                    {/* Duty Shift Hours */}
                    <td className="px-5 py-3.5 text-center font-medium text-slate-600">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="24"
                            value={editDuty}
                            onChange={(e) => setEditDuty(parseInt(e.target.value) || 9)}
                            className="w-12 px-1 py-1 text-xs border border-indigo-400 rounded text-center text-slate-800"
                          />
                          <span className="text-xs text-slate-400">hrs</span>
                        </div>
                      ) : (
                        `${emp.dutyHours} hrs/day`
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(emp.id)}
                              className="p-1 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded flex items-center gap-1 cursor-pointer"
                              title="Commit edits"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded flex items-center gap-1 cursor-pointer"
                              title="Discard edits"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          </>
                        ) : deleteConfirmId === emp.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 border border-rose-150 rounded-lg p-1 animate-fadeIn whitespace-nowrap">
                            <span className="text-[10px] font-bold text-rose-700 px-1 select-none">Delete?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(emp)}
                              className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit profile & parameters"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(emp.id)}
                              className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Deregister"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="bg-slate-50 px-5 py-3.5 text-xs text-slate-500 border-t border-slate-100 flex items-center justify-between">
        <span>Showing <strong>{filteredEmployees.length}</strong> of <strong>{employees.length}</strong> registered worker keys.</span>
        <span>Standard daily shift default: <strong>9 Hours</strong> (includes breaks). Break deduction: <strong>15 Minutes</strong>.</span>
      </div>
    </div>
  );
}
