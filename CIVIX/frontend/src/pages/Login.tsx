import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { ShieldAlert, Lock, User, ArrowRight, Info } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authService.login(username, password);
      if (res.user.role === 'admin') {
        navigate('/admin/overview');
      } else {
        navigate('/driver/routing');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid username or password. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: 'admin' | 'driver') => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('driver1');
      setPassword('driver123');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-sky-50 to-emerald-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-100 to-sky-100 border border-pink-200 flex items-center justify-center text-pink-600 shadow-md mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800">
          Urban Flood Risk and Emergency Accessibility System
        </h2>
        <p className="mt-1.5 text-xs text-sky-800 font-medium">
          Decision-support platform for the Bommanahalli–Marathahalli corridor, Bengaluru
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-sm py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-sky-100">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl text-xs text-pink-700 flex items-start space-x-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-pink-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-slate-50/50"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-slate-50/50"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-xs text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </button>
          </form>

          {/* Demonstration Credentials helper */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              Default Demonstration Credentials:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="p-2.5 border border-sky-200 bg-sky-50/60 rounded-xl text-left hover:bg-sky-100/70 transition-colors shadow-2xs"
              >
                <div className="font-semibold text-sky-900">Municipal Officer</div>
                <div className="text-[10px] text-sky-700">admin / admin123</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('driver')}
                className="p-2.5 border border-pink-200 bg-pink-50/60 rounded-xl text-left hover:bg-pink-100/70 transition-colors shadow-2xs"
              >
                <div className="font-semibold text-pink-900">Emergency Driver</div>
                <div className="text-[10px] text-pink-700">driver1 / driver123</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
