import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'sky' | 'pink' | 'green' | 'amber' | 'lavender' | 'blue' | 'rose' | 'emerald' | 'cyan';
  badge?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'sky',
  badge,
}) => {
  const colorMap: Record<string, { bg: string; iconBg: string; text: string; border: string; valueText: string }> = {
    sky: {
      bg: 'bg-gradient-to-br from-sky-50/80 to-white',
      iconBg: 'bg-sky-100 text-sky-700 border border-sky-200',
      text: 'text-sky-800',
      border: 'border-sky-200/80',
      valueText: 'text-sky-950',
    },
    pink: {
      bg: 'bg-gradient-to-br from-pink-50/80 to-white',
      iconBg: 'bg-pink-100 text-pink-700 border border-pink-200',
      text: 'text-pink-800',
      border: 'border-pink-200/80',
      valueText: 'text-pink-950',
    },
    green: {
      bg: 'bg-gradient-to-br from-emerald-50/80 to-white',
      iconBg: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      text: 'text-emerald-800',
      border: 'border-emerald-200/80',
      valueText: 'text-emerald-950',
    },
    blue: {
      bg: 'bg-gradient-to-br from-sky-50/80 to-white',
      iconBg: 'bg-sky-100 text-sky-700 border border-sky-200',
      text: 'text-sky-800',
      border: 'border-sky-200/80',
      valueText: 'text-sky-950',
    },
    rose: {
      bg: 'bg-gradient-to-br from-pink-50/80 to-white',
      iconBg: 'bg-pink-100 text-pink-700 border border-pink-200',
      text: 'text-pink-800',
      border: 'border-pink-200/80',
      valueText: 'text-pink-950',
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-50/80 to-white',
      iconBg: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      text: 'text-emerald-800',
      border: 'border-emerald-200/80',
      valueText: 'text-emerald-950',
    },
    cyan: {
      bg: 'bg-gradient-to-br from-cyan-50/80 to-white',
      iconBg: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
      text: 'text-cyan-800',
      border: 'border-cyan-200/80',
      valueText: 'text-cyan-950',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50/80 to-white',
      iconBg: 'bg-amber-100 text-amber-700 border border-amber-200',
      text: 'text-amber-800',
      border: 'border-amber-200/80',
      valueText: 'text-amber-950',
    },
    lavender: {
      bg: 'bg-gradient-to-br from-purple-50/80 to-white',
      iconBg: 'bg-purple-100 text-purple-700 border border-purple-200',
      text: 'text-purple-800',
      border: 'border-purple-200/80',
      valueText: 'text-purple-950',
    },
  };

  const scheme = colorMap[color] || colorMap.sky;

  return (
    <div className={`${scheme.bg} rounded-2xl border ${scheme.border} p-5 shadow-xs transition-all hover:shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${scheme.iconBg} shadow-2xs`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <div className="mt-2.5 flex items-baseline justify-between">
        <span className={`text-2xl font-bold ${scheme.valueText}`}>{value}</span>
        {badge && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/80 border border-slate-200/80 text-slate-600 shadow-2xs">
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500 truncate">{subtitle}</p>}
    </div>
  );
};
