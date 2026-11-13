import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import api from '../services/api';
import { ShieldAlert, User, LogOut, Navigation, BarChart3 } from 'lucide-react';

interface HeaderProps {
  currentRole: 'admin' | 'driver';
  onSwitchRole?: (newRole: 'admin' | 'driver') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentRole, onSwitchRole }) => {
  const navigate = useNavigate();
  const user = authService.getStoredUser();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkApi = async () => {
      try {
        await api.get('/gis/study-area');
        if (isMounted) setApiOnline(true);
      } catch {
        if (isMounted) setApiOnline(false);
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-xs border-b border-sky-100 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center space-x-3">
        {/* Blue Brand Badge Logo */}
        <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-600 shadow-xs">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
            Urban Flood Risk and Emergency Accessibility System
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Backend API Connection Status Badge */}
        {apiOnline !== null && (
          <div
            className={`hidden lg:flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-xl border shadow-2xs ${
              apiOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-pink-50 text-pink-800 border-pink-200'
            }`}
            title={apiOnline ? 'Connected to FastAPI Backend (Port 8000)' : 'Backend API is unreachable'}
          >
            <span
              className={`w-2 h-2 rounded-full mr-1.5 ${
                apiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-pink-500'
              }`}
            ></span>
            <span>{apiOnline ? 'Backend API Connected' : 'Backend Offline'}</span>
          </div>
        )}

        {/* Pastel Role Switcher Pill */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 text-xs">
          <button
            onClick={() => {
              if (onSwitchRole) onSwitchRole('admin');
              navigate('/admin/overview');
            }}
            className={`flex items-center px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentRole === 'admin'
                ? 'bg-sky-50 text-sky-900 border border-sky-200 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
            Authority Dashboard
          </button>
          <button
            onClick={() => {
              if (onSwitchRole) onSwitchRole('driver');
              navigate('/driver/routing');
            }}
            className={`flex items-center px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentRole === 'driver'
                ? 'bg-pink-50 text-pink-900 border border-pink-200 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 mr-1.5 text-pink-600" />
            Emergency Driver UI
          </button>
        </div>

        {/* User Profile & Logout */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 text-xs font-bold shadow-2xs">
              <User className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-800">{user?.username || 'Officer'}</p>
              <p className="text-[10px] text-slate-500 capitalize">{user?.role || currentRole}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-pink-600 rounded-lg hover:bg-pink-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
