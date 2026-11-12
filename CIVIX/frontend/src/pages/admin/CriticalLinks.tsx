import React, { useState, useEffect } from 'react';
import { routingService } from '../../services/routingService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { GitCommit, AlertOctagon, ShieldCheck, ArrowRight } from 'lucide-react';

export const CriticalLinks: React.FC = () => {
  const [criticalData, setCriticalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCritical() {
      try {
        const res = await routingService.getCriticalLinks();
        setCriticalData(res);
      } catch (err) {
        console.error('Failed to load critical links:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCritical();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Calculating edge betweenness centrality & emergency connectivity graph..." />;
  }

  const list = criticalData?.critical_roads || [];

  return (
    <div className="space-y-6">
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs">
        <h2 className="text-base font-bold text-slate-800">Critical Road Links & Emergency Bottleneck Analysis</h2>
        <p className="text-xs text-sky-800 font-medium mt-0.5">
          Graph-theoretical betweenness centrality identifying segments whose disruption severely impacts hospital accessibility
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-sky-50 to-white p-4 rounded-2xl border border-sky-200 shadow-xs">
          <span className="text-xs font-semibold text-sky-800 uppercase">Analyzed Links</span>
          <div className="text-2xl font-bold text-sky-950 mt-1">{list.length} Key Segments</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Ranked by betweenness centrality score</p>
        </div>
        <div className="bg-gradient-to-br from-pink-50 to-white p-4 rounded-2xl border border-pink-200 shadow-xs">
          <span className="text-xs font-semibold text-pink-800 uppercase">Primary Bottleneck Zone</span>
          <div className="text-2xl font-bold text-pink-700 mt-1">ORR - Bellandur</div>
          <p className="text-[11px] text-pink-600 mt-0.5">Central transit corridor connecting hospitals</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-800 uppercase">Intervention Priority</span>
          <div className="text-2xl font-bold text-emerald-800 mt-1">SWD Culvert 4B</div>
          <p className="text-[11px] text-emerald-700 mt-0.5">Pre-monsoon pump positioning recommended</p>
        </div>
      </div>

      {/* Ranked Table */}
      <div className="bg-white/95 rounded-2xl border border-sky-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Critical Road Ranking (Top Bottlenecks)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Road Name</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Centrality Index</th>
                <th className="py-3 px-4">Emergency Transit Impact</th>
                <th className="py-3 px-4">Mitigation Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {list.map((r: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">#{idx + 1}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{r.road_name}</td>
                  <td className="py-3 px-4 capitalize text-slate-600">{r.road_type}</td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{r.criticality_score}</td>
                  <td className="py-3 px-4 text-slate-600">{r.emergency_impact}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      idx < 3 ? 'bg-rose-100 text-rose-800' :
                      idx < 7 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {idx < 3 ? 'Critical: Pre-deploy Pump' : idx < 7 ? 'High: Patrol Monitor' : 'Routine Drain Check'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

