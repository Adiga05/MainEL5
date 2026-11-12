import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { gisService } from '../../services/gisService';
import { rainfallService } from '../../services/rainfallService';
import { StatsCard } from '../../components/StatsCard';
import { InteractiveMap } from '../../maps/InteractiveMap';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  Route,
  AlertTriangle,
  CloudRain,
  ShieldCheck,
  CheckCircle2,
  GitCommit,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [roads, setRoads] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ov, rk, hp] = await Promise.all([
          dashboardService.getOverview(),
          gisService.getRoadRisk(0.0),
          gisService.getHospitals()
        ]);
        setData(ov);
        setRoads(rk?.features || []);
        setHospitals(hp?.features || []);
      } catch (err) {
        console.error('Failed to load overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading municipal intelligence dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Scope Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">Municipal Decision-Support Dashboard</h2>
          <p className="text-xs text-sky-800 font-medium mt-0.5">
            Real-time urban flood risk and emergency accessibility monitoring for Bommanahalli–Marathahalli corridor
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            Telemetry Stream Active
          </span>
          <button
            onClick={() => navigate('/admin/live-risk-map')}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
          >
            <span>Open Live Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 6 Key Stats Cards with Pastel Themes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Monitored Roads"
          value={data?.total_roads_monitored || roads.length}
          subtitle="Corridor centerlines"
          icon={Route}
          color="sky"
        />
        <StatsCard
          title="High-Risk Links"
          value={data?.high_risk_roads || 0}
          subtitle="Elevated flood risk"
          icon={AlertTriangle}
          color="pink"
        />
        <StatsCard
          title="Active Reports"
          value={data?.active_incidents || 0}
          subtitle="Pending field check"
          icon={TrendingUp}
          color="amber"
        />
        <StatsCard
          title="Verified Closures"
          value={data?.verified_closures || 0}
          subtitle="Bypassed by routing"
          icon={ShieldCheck}
          color="rose"
        />
        <StatsCard
          title="Hourly Rainfall"
          value={`${data?.max_hourly_rainfall_mm || 0} mm`}
          subtitle="Max telemetry reading"
          icon={CloudRain}
          color="green"
        />
        <StatsCard
          title="Critical Links"
          value={data?.critical_emergency_links || 15}
          subtitle="Hospital bottlenecks"
          icon={GitCommit}
          color="lavender"
        />
      </div>

      {/* Map & Recent Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/95 rounded-2xl border border-sky-100 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Corridor Flood Risk Snapshot</h3>
              <p className="text-[11px] text-slate-500">Road segments color-coded by disruption risk</p>
            </div>
            <button
              onClick={() => navigate('/admin/emergency-routing')}
              className="text-xs font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 transition-colors"
            >
              Test Emergency Route &rarr;
            </button>
          </div>
          <InteractiveMap
            height="460px"
            roads={roads}
            hospitals={hospitals}
            showLayerToggle={false}
          />
        </div>

        {/* Recent Incidents Panel */}
        <div className="bg-white/95 rounded-2xl border border-sky-100 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">Recent Incident Reports</h3>
              <button
                onClick={() => navigate('/admin/incident-management')}
                className="text-xs text-sky-700 hover:underline font-semibold"
              >
                View all
              </button>
            </div>

            <div className="space-y-3">
              {data?.recent_incidents?.length > 0 ? (
                data.recent_incidents.map((inc: any) => (
                  <div key={inc.id} className="p-3 bg-gradient-to-r from-pink-50/40 to-slate-50 rounded-xl border border-pink-100 text-xs shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 capitalize">
                        {inc.type} #{inc.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        inc.status === 'verified'
                          ? 'bg-pink-100 text-pink-700 border border-pink-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {inc.status}
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-2">{inc.description || 'Water accumulation logged on road segment.'}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {inc.time ? new Date(inc.time).toLocaleString() : 'Recent report'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  No active disruptions logged in the study corridor.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => navigate('/admin/scenario-analysis')}
              className="w-full py-2 bg-gradient-to-r from-sky-50 to-pink-50 hover:from-sky-100 hover:to-pink-100 border border-sky-200 text-slate-800 rounded-xl text-xs font-semibold text-center transition-all shadow-2xs"
            >
              Simulate Monsoon Cloudburst Scenario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

