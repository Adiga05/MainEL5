import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Header } from '../components/Header';
import { Navigation2, AlertCircle, Map, ShieldAlert } from 'lucide-react';

export const DriverLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800">
      <Header currentRole="driver" />

      {/* Driver Sub-Navigation Pill Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-slate-700 flex items-center">
            <ShieldAlert className="w-4 h-4 text-rose-600 mr-1.5" />
            Emergency Responder Interface
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">Live Traffic & Flood Risk Navigation</span>
        </div>

        <div className="flex space-x-1">
          <NavLink
            to="/driver/routing"
            className={({ isActive }) =>
              `flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Navigation2 className="w-3.5 h-3.5 mr-1.5" />
            Emergency Routing
          </NavLink>

          <NavLink
            to="/driver/map"
            className={({ isActive }) =>
              `flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Map className="w-3.5 h-3.5 mr-1.5" />
            Live Risk Map
          </NavLink>

          <NavLink
            to="/driver/report"
            className={({ isActive }) =>
              `flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
            Report Road Hazard
          </NavLink>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};

