import React, { useState, useEffect } from 'react';
import { routingService } from '../../services/routingService';
import { gisService } from '../../services/gisService';
import { InteractiveMap } from '../../maps/InteractiveMap';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Navigation2, Hospital, AlertTriangle, ShieldAlert, ArrowRight, Clock, MapPin } from 'lucide-react';

export const DriverRouting: React.FC = () => {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [roads, setRoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [routing, setRouting] = useState(false);

  // Driver Current Location (e.g. Bommanahalli junction)
  const [origin, setOrigin] = useState({ lat: 12.898, lon: 77.625, name: 'Current GPS Location (Bommanahalli)' });
  // Destination
  const [dest, setDest] = useState({ lat: 12.933, lon: 77.688, name: 'Sakra World Hospital' });

  const [routeData, setRouteData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [hp, rk] = await Promise.all([
          gisService.getHospitals(),
          gisService.getRoadRisk(15.0)
        ]);
        setHospitals(hp?.features || []);
        setRoads(rk?.features || []);
      } catch (err) {
        console.error('Failed to load driver data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const calculateRoute = async (dLat: number, dLon: number, dName: string) => {
    setRouting(true);
    setErrorMsg(null);
    try {
      const res = await routingService.getRecommendedRoute({
        origin_lon: origin.lon,
        origin_lat: origin.lat,
        dest_lon: dLon,
        dest_lat: dLat,
        risk_weight: 3.0,
        vehicle_type: 'ambulance',
        rainfall_1h_mm: 15.0
      });
      setRouteData(res);
      setDest({ lat: dLat, lon: dLon, name: dName });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Route calculation failed');
    } finally {
      setRouting(false);
    }
  };

  useEffect(() => {
    if (!loading && hospitals.length > 0) {
      const first = hospitals[0];
      const coords = first.geometry?.coordinates || [77.688, 12.933];
      calculateRoute(coords[1], coords[0], first.properties?.name || 'Sakra World Hospital');
    }
  }, [loading]);

  if (loading) {
    return <LoadingSpinner message="Initializing emergency vehicle routing system..." />;
  }

  const rec = routeData?.recommended_route;
  const alt = routeData?.alternative_route;

  return (
    <div className="space-y-4">
      {/* Driver Dispatch Header */}
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <Navigation2 className="w-5 h-5 text-pink-600" />
            <span>Emergency Vehicle Route Guidance</span>
          </h2>
          <p className="text-xs text-sky-800 font-medium mt-0.5">
            Automated flood-risk avoidance • Bypasses verified road closures and low-lying water accumulations
          </p>
        </div>

        {/* Quick Select Destination Hospital Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Hospitals:</span>
          {hospitals.slice(0, 4).map((h, i) => {
            const coords = h.geometry?.coordinates || [];
            const isSelected = dest.name === h.properties?.name;
            return (
              <button
                key={i}
                onClick={() => calculateRoute(coords[1], coords[0], h.properties?.name || '')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                  isSelected
                    ? 'bg-pink-600 text-white shadow-2xs'
                    : 'bg-pink-50/60 border border-pink-200 text-pink-800 hover:bg-pink-100'
                }`}
              >
                🏥 {h.properties?.name?.split(' ')[0] || `Hospital ${i+1}`}
              </button>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl text-xs text-pink-700">
          {errorMsg}
        </div>
      )}

      {/* Main Grid: Turn/Risk Info + Live Navigation Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Route Guidance Panel */}
        <div className="space-y-4">
          {rec && (
            <div className="bg-white/95 p-5 rounded-2xl border-2 border-pink-300 shadow-xs space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-pink-700 text-sm">RECOMMENDED ROUTE</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
                  Flood-Aware
                </span>
              </div>

              <div className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
                🎯 Destination: {dest.name}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center py-2 bg-gradient-to-r from-pink-50/40 to-sky-50/40 rounded-xl border border-sky-100">
                <div>
                  <div className="text-[10px] text-slate-400">Est. Time</div>
                  <div className="text-lg font-bold text-pink-700">{rec.total_time_minutes} min</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Distance</div>
                  <div className="text-lg font-bold text-slate-800">{rec.total_distance_km} km</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Risk Score</div>
                  <div className="text-lg font-bold text-emerald-600">{(rec.average_risk_probability * 100).toFixed(0)}%</div>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed text-[11px]">
                {rec.recommendation_reason}
              </p>

              {rec.warnings?.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                  <div className="font-bold text-[11px] flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    En-Route Warnings:
                  </div>
                  {rec.warnings.map((w: string, idx: number) => (
                    <div key={idx} className="text-[11px]">• {w}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {alt && (
            <div className="bg-white/95 p-4 rounded-2xl border border-sky-200 shadow-xs space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sky-800">ALTERNATIVE ROUTE</span>
                <span className="text-[10px] font-medium text-slate-500">Higher Elevation</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-800">
                <span>{alt.total_distance_km} km</span>
                <span>{alt.total_time_minutes} mins</span>
              </div>
            </div>
          )}
        </div>

        {/* Live Route Map */}
        <div className="lg:col-span-2">
          <InteractiveMap
            height="620px"
            roads={roads}
            hospitals={hospitals}
            activeRoute={rec}
            alternativeRoute={alt}
            origin={{ lat: origin.lat, lon: origin.lon, label: origin.name }}
            destination={{ lat: dest.lat, lon: dest.lon, label: dest.name }}
            showLayerToggle={true}
          />
        </div>
      </div>
    </div>
  );
};

