import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Mail, Lock, Key, ShieldCheck, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';

interface UserRecord {
  _id?: string;
  email: string;
}

interface UserManagerProps {
  currentAdminEmail: string;
}

export default function UserManager({ currentAdminEmail }: UserManagerProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states to create user
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState<string | null>(null);

  // Load existing user emails
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to retrieve system users');
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle Form Submission to create new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newEmail || !newPassword) {
      setErrorMsg('Both Email and Password are required to create a user account.');
      return;
    }

    setCreatingUser(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user account');
      }

      setSuccessMsg(`User account registered successfully: ${newEmail}`);
      setNewEmail('');
      setNewPassword('');
      fetchUsers(); // refresh list
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setCreatingUser(false);
    }
  };

  // Handle User Deletion
  const handleDeleteUser = async (email: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user account');
      }

      setSuccessMsg(`Successfully deleted account: ${email}`);
      setDeleteConfirmEmail(null);
      fetchUsers(); // refresh list
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const isAdmin = currentAdminEmail === "rangdhanuit@gmail.com";

  return (
    <div className="space-y-6 animate-fadeIn" id="user-manager-root">
      {/* 1. Header Hero Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 border border-indigo-150 rounded-xl text-indigo-600">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">System User Accounts</h2>
          </div>
          <p className="text-xs text-slate-500">
            Monitor credentials, add or remove login access, and assign access authorizations.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100/70 p-2.5 rounded-xl shrink-0">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Role Access</div>
            <span className="text-[11px] font-bold text-indigo-900 leading-normal">
              {isAdmin ? "Master Application Administrator" : "Limited System Operator"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 2. Admin Form to Create User Account */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              Create User Account
            </h3>
            <p className="text-[11px] text-slate-400">
              {isAdmin 
                ? "Register a brand new email and login password for employees or sub-managers to access." 
                : "Only the master system administrator is permitted to register new operators."
              }
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl flex items-center gap-2 text-xs text-rose-800 transition-colors animate-fadeIn" id="user-mgmt-error">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl flex items-center gap-2 text-xs text-emerald-800 transition-colors animate-fadeIn" id="user-mgmt-success">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4" id="create-user-form">
            <div>
              <label htmlFor="create-user-email" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Operator Email
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="create-user-email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  disabled={!isAdmin}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-250 focus:border-indigo-500 focus:bg-white rounded-xl text-xs text-slate-800 placeholder-slate-400 transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="create-user-password" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Assigned Login Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="create-user-password"
                  type="text"
                  required
                  placeholder="Enter initial password"
                  disabled={!isAdmin}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-250 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingUser || !isAdmin}
              className="w-full flex justify-center items-center gap-1.5 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow-md transition-all cursor-pointer select-none"
            >
              {creatingUser ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Key className="w-3.5 h-3.5" />
                  <span>Provision Login Credentials</span>
                </>
              )}
            </button>
          </form>

          {!isAdmin && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-amber-800 font-medium">
                You are currently logged in as a secondary user. High-level user authentication management is restricted to the master administrator of Roster System.
              </p>
            </div>
          )}
        </div>

        {/* 3. Users List Panel */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
                <ShieldCheck className="w-4.5 h-4.5 text-indigo-500" />
                Active Operators ({users.length})
              </h3>
              <p className="text-[11px] text-slate-400">Listed accounts recognized in MongoDB database</p>
            </div>
            <button
              onClick={fetchUsers}
              className="px-2.5 py-1 text-[10px] text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
            >
              Refresh Table
            </button>
          </div>

          <div className="overflow-hidden border border-slate-150 rounded-2xl">
            <table className="min-w-full divide-y divide-slate-150 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-650 uppercase tracking-widest">Operator Email</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-650 uppercase tracking-widest">Authority Role</th>
                  <th className="px-4 py-3 text-right max-w-[80px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 text-xs">
                {users.map((user) => {
                  const isPrimaryAdmin = user.email === "rangdhanuit@gmail.com";
                  return (
                    <tr key={user.email} className="hover:bg-slate-50/55 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-slate-700 font-mono">
                        {user.email}
                      </td>
                      <td className="px-4 py-3.5">
                        {isPrimaryAdmin ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.5 rounded-md">
                            Master Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md">
                            Operator User
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {isPrimaryAdmin ? (
                          <span className="text-[10px] text-slate-400 italic">Protected</span>
                        ) : (
                          deleteConfirmEmail === user.email ? (
                            <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-150 p-1 rounded-lg animate-fadeIn">
                              <span className="text-[9px] font-extrabold text-rose-750 px-1">Revoke?</span>
                              <button
                                onClick={() => handleDeleteUser(user.email)}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirmEmail(null)}
                                className="bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold text-[9px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (isAdmin) {
                                  setDeleteConfirmEmail(user.email);
                                } else {
                                  setErrorMsg("Access denied. Only the master administrator can de-authorize users.");
                                }
                              }}
                              className="p-1 px-1.5 hover:bg-rose-50 text-slate-400 hover:text-red-650 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Revoke access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold">Remove</span>
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[11px] text-slate-400 italic">
                      No active operator registrations detected in MongoDB
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
