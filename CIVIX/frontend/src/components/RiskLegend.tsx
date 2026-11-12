import React from 'react';

export const RiskLegend: React.FC = () => {
  return (
    <div className="bg-white/95 backdrop-blur-xs rounded-xl border border-sky-200/80 p-3.5 shadow-md text-xs">
      <div className="font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
        <span className="w-2 h-2 rounded-full bg-pink-400"></span>
        <span>Road Disruption Risk</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center space-x-2">
          <span className="w-4 h-2 rounded-full bg-[#4ade80] inline-block shadow-2xs"></span>
          <span className="text-slate-700">Low Risk (&lt; 25%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-2 rounded-full bg-[#facc15] inline-block shadow-2xs"></span>
          <span className="text-slate-700">Moderate Risk (25 – 50%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-2 rounded-full bg-[#fb923c] inline-block shadow-2xs"></span>
          <span className="text-slate-700">High Risk (50 – 75%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-2 rounded-full bg-[#f87171] inline-block shadow-2xs"></span>
          <span className="text-slate-700 font-medium">Very High Risk (&gt; 75%)</span>
        </div>
        <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
          <span className="w-4 h-2 rounded-full bg-slate-900 inline-block shadow-2xs"></span>
          <span className="text-slate-900 font-semibold">Verified Road Closure</span>
        </div>
      </div>
    </div>
  );
};


