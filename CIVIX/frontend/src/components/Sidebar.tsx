import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  CloudRain,
  Route,
  Waves,
  AlertTriangle,
  Navigation2,
  GitCommit,
  Layers,
  Database,
  Cpu,
  Settings,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const navItems = [
    { to: '/admin/overview', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/live-risk-map', label: 'Live Risk Map', icon: Map },
    { to: '/admin/rainfall-monitoring', label: 'Rainfall Monitoring', icon: CloudRain },
    { to: '/admin/road-network', label: 'Road Network', icon: Route },
    { to: '/admin/drainage-infrastructure', label: 'Drainage Infrastructure', icon: Waves },
    { to: '/admin/incident-management', label: 'Incident Management', icon: AlertTriangle },
    { to: '/admin/emergency-routing', label: 'Emergency Routing', icon: Navigation2 },
    { to: '/admin/critical-links', label: 'Critical Links', icon: GitCommit },
    { to: '/admin/scenario-analysis', label: 'Scenario Analysis', icon: Layers },
    { to: '/admin/dataset-management', label: 'Dataset Management', icon: Database },
    { to: '/admin/model-performance', label: 'Model Performance', icon: Cpu },
    { to: '/admin/settings', label: 'Study Area & Settings', icon: Settings },
  ];

  return (
    <aside className={`w-64 bg-[#1e2638] text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-700/60 shadow-md ${className}`}>
      {/* Brand Header with Pastel Accents */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-pink-100/90 border border-pink-300 flex items-center justify-center text-pink-600 shadow-xs">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold tracking-wide uppercase text-white">Urban Flood Intel</span>
              <Sparkles className="w-3 h-3 text-sky-300" />
            </div>
            <span className="block text-[10px] text-sky-200/80 font-medium">Decision Support System</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold tracking-wider uppercase text-slate-400">
          Core Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-sky-500/25 text-sky-200 border border-sky-400/40 font-semibold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Corridor Scope Badge with Pastel Mint Green */}
      <div className="p-3 m-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200">
        <div className="font-semibold text-emerald-300 flex items-center space-x-1 mb-0.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
          <span>Bommanahalli–Marathahalli</span>
        </div>
        <div className="text-slate-300 text-[10px] leading-tight">Bengaluru Urban Corridor</div>
        <div className="text-[10px] text-sky-300 mt-1 font-mono">12.885° – 12.995° N</div>
      </div>
    </aside>
  );
};
