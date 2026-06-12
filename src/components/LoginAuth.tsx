import React, { useState } from 'react';
import { Mail, Lock, LogIn, ShieldAlert, Sparkles, Eye, EyeOff } from 'lucide-react';

interface LoginAuthProps {
  onLoginSuccess: (email: string) => void;
}

export default function LoginAuth({ onLoginSuccess }: LoginAuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      // Store login in localStorage to survive refresh
      localStorage.setItem('auth_email', data.email);
      onLoginSuccess(data.email);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const useDemoCredentials = () => {
    setEmail('rangdhanuit@gmail.com');
    setPassword('rangdhanu');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans" id="auth-root-container">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Visual Brand Header */}
        <div className="flex justify-center items-center gap-2 mb-2">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-md">
            <Lock className="w-6 h-6" id="auth-logo-icon" />
          </div>
        </div>
        
        <h2 className="text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          Sign in to Roster System
        </h2>
        <p className="mt-2 text-center text-xs text-slate-500">
          Secure, authenticated access for Payroll & Attendance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200">
          
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-150 rounded-xl flex items-center gap-2 text-xs text-rose-800 transition-colors animate-fadeIn" id="auth-error-alert">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-150 rounded-xl flex items-center gap-2 text-xs text-emerald-800 animate-fadeIn" id="auth-success-alert">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} id="auth-form">
            <div>
              <label htmlFor="auth-email-input" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 h-4 text-slate-400" />
                </div>
                <input
                  id="auth-email-input"
                  name="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-250 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 placeholder-slate-400 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password-input" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 h-4 text-slate-400" />
                </div>
                <input
                  id="auth-password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-250 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 placeholder-slate-400 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              id="auth-submit-button"
              className="w-full flex justify-center items-center gap-1.5 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all cursor-pointer select-none active:scale-95"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Helper Credentials Box */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-4 text-center">
            <div 
              onClick={useDemoCredentials}
              className="w-full py-2.5 px-3.5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 rounded-xl cursor-pointer transition-all text-xs text-left text-slate-650"
              id="auth-demo-credential-hint"
            >
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Quick Administrator Access</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Click here to pre-fill custom administrator credentials: <br />
                Email: <code className="bg-white px-1 py-0.5 border rounded text-emerald-800">rangdhanuit@gmail.com</code> <br />
                Password: <code className="bg-white px-1 py-0.5 border rounded text-emerald-800">rangdhanu</code>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
