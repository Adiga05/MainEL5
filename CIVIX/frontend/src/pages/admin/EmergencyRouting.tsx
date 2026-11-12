import React, { useState, useEffect } from 'react';
import { routingService } from '../../services/routingService';
import { gisService } from '../../services/gisService';
import { InteractiveMap } from '../../maps/InteractiveMap';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  Navigation2,
  AlertTriangle,
  Clock,
  Shield,
  ArrowRight,
  Hospital,
  Sliders,
  CheckCircle2
} from 'lucide-react';

export const EmergencyRouting: React.FC = () => {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [roads, setRoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [routing, setRouting] = useState(false);

  // Origin & Destination coordinates
  // Default Origin: Bommanahalli Junction (12.898, 77.625)
  const [origin, setOrigin] = useState({ lat: 12.898, lon: 77.625, label: 'Bommanahalli Junction (NH-44)' });
  // Default Destination: Sakra World Hospital, Devarabeesanahalli (12.933, 77.688)
  const [destination, setDestination] = useState({ lat: 12.933, lon: 77.688, label: 'Sakra World Hospital' });

  const [vehicleType, setVehicleType] = useState('ambulance');
  const [riskLambda, setRiskLambda] = useState(3.0);
  const [rainfallMm, setRainfallMm] = useState(25.0);

  const [routeResult, setRouteResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [hp, rk] = await Promise.all([
          gisService.getHospitals(),
          gisService.getRoadRisk(rainfallMm)
        ]);
        setHospitals(hp?.features || []);
        setRoads(rk?.features || []);
      } catch (err) {
        console.error('Failed to load routing data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCalculateRoute = async () => {
    setRouting(true);
    setErrorMsg(null);
    try {
      const res = await routingService.getRecommendedRoute({
        origin_lon: origin.lon,
        origin_lat: origin.lat,
        dest_lon: destination.lon,
        dest_lat: destination.lat,
        risk_weight: riskLambda,
        vehicle_type: vehicleType,
        rainfall_1h_mm: rainfallMm
      });
      setRouteResult(res);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Route calculation failed. Check network connectivity.');
    } finally {
      setRouting(false);
    }
  };

  // Trigger initial route
  useEffect(() => {
    if (!loading) {
      handleCalculateRoute();
    }
  }, [loading]);

  const handleSelectHospital = (h: any) => {
    const coords = h.geometry?.coordinates || [];
    if (coords.length >= 2) {
      setDestination({
        lat: coords[1],
        lon: coords[0],
        label: h.properties?.name || 'Selected Hospital'
      });
    }
  };

  const handleMapClick = (lat: number, lon: number) => {
    // Alternate setting origin or destination
    setOrigin({ lat: roundCoord(lat), lon: roundCoord(lon), label: `Custom Origin (${lat.toFixed(3)}, ${lon.toFixed(3)})` });
  };

  const roundCoord = (n: number) => Math.round(n * 10000) / 10000;

  if (loading) {
    return <LoadingSpinner message="Building routable corridor road graph..." />;
  }

  const rec = routeResult?.recommended_route;
  const alt = routeResult?.alternative_route;

  return (
    <div className="space-y-6">
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs">
        <h2 className="text-base font-bold text-slate-800">Emergency Vehicle Routing & Flood Risk Avoidance</h2>
        <p className="text-xs text-sky-800 font-medium mt-0.5">
          Calculates dynamic risk-penalized routes incorporating verified road closures and real-time waterlogging probability
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Routing Parameter Controls */}
        <div className="bg-white/95 rounded-2xl border border-sky-100 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
            <Navigation2 className="w-4 h-4 text-sky-600" />
            <span>Navigation Parameters</span>
          </h3>

          {errorMsg && (
            <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl text-xs text-pink-700">
              {errorMsg}
            </div>
          )}

          {/* Origin */}
          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">Origin Point</label>
            <div className="p-2.5 bg-sky-50/60 border border-sky-200 rounded-xl text-sky-950 font-medium">
              📍 {origin.label}
            </div>
          </div>

          {/* Quick Hospital Destination Select */}
          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">Emergency Hospital Destination</label>
            <select
              value={destination.label}
              onChange={(e) => {
                const found = hospitals.find((h) => (h.properties?.name || '') === e.target.value);
                if (found) handleSelectHospital(found);
              }}
              className="w-full p-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            >
              {hospitals.map((h, i) => (
                <option key={i} value={h.properties?.name || ''}>
                  {h.properties?.name || `Hospital #${i+1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Type */}
          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">Emergency Vehicle Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVehicleType('ambulance')}
                className={`py-2 px-3 rounded-xl font-semibold text-center border transition-all ${
                  vehicleType === 'ambulance' ? 'bg-sky-600 text-white border-sky-600 shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-sky-50'
                }`}
              >
                Ambulance (108)
              </button>
              <button
                type="button"
                onClick={() => setVehicleType('fire_engine')}
                className={`py-2 px-3 rounded-xl font-semibold text-center border transition-all ${
                  vehicleType === 'fire_engine' ? 'bg-pink-600 text-white border-pink-600 shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-pink-50'
                }`}
              >
                Fire Engine (112)
              </button>
            </div>
          </div>

          {/* Risk Penalty Lambda Slider */}
          <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700">Flood Avoidance Weight (λ):</span>
              <span className="font-bold text-sky-700 px-2 py-0.5 bg-sky-50 rounded-md border border-sky-200">
                {riskLambda.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              value={riskLambda}
              onChange={(e) => setRiskLambda(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
            <p className="text-[10px] text-slate-400">
              Higher values strictly penalize low-lying bottlenecks and overflowing Raja Kaluve segments.
            </p>
          </div>

          {/* Rainfall Conditions */}
          <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700">Simulated Rain Intensity:</span>
              <span className="font-bold text-sky-700 px-2 py-0.5 bg-sky-50 rounded-md border border-sky-200">
                {rainfallMm} mm/h
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={rainfallMm}
              onChange={(e) => setRainfallMm(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
          </div>

          <button
            onClick={handleCalculateRoute}
            disabled={routing}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-2xs transition-colors"
          >
            {routing ? <LoadingSpinner message="Calculating..." /> : (
              <>
                <span>Recalculate Routes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Map & Route Details */}
        <div className="lg:col-span-2 space-y-4">
          <InteractiveMap
            height="500px"
            roads={roads}
            hospitals={hospitals}
            activeRoute={rec}
            alternativeRoute={alt}
            origin={{ lat: origin.lat, lon: origin.lon, label: origin.label }}
            destination={{ lat: destination.lat, lon: destination.lon, label: destination.label }}
            onMapClick={handleMapClick}
            showLayerToggle={true}
          />

          {/* Route Comparison Cards */}
          {rec && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recommended Route Card */}
              <div className="bg-white/95 p-4 rounded-2xl border-2 border-pink-300 shadow-xs text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-pink-700 text-sm flex items-center">
                    <span className="w-3 h-3 rounded-full bg-pink-500 inline-block mr-1.5 shadow-2xs"></span>
                    {rec.route_name}
                  </span>
                  <span className="bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    RECOMMENDED
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-1.5 border-y border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Distance</span>
                    <span className="font-bold text-slate-900 text-sm">{rec.total_distance_km} km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Transit Time</span>
                    <span className="font-bold text-pink-700 text-sm">{rec.total_time_minutes} min</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Flood Risk</span>
                    <span className="font-bold text-emerald-600 text-sm">{(rec.average_risk_probability * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {rec.recommendation_reason}
                </p>
                {rec.warnings?.length > 0 && (
                  <div className="p-2 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 space-y-1">
                    <div className="font-bold flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                      Route Warnings:
                    </div>
                    {rec.warnings.map((w: string, i: number) => (
                      <div key={i} className="pl-4">• {w}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Alternative Route Card */}
              {alt && (
                <div className="bg-white/95 p-4 rounded-2xl border border-sky-200 shadow-xs text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-800 text-sm flex items-center">
                      <span className="w-3 h-3 rounded-full bg-sky-500 inline-block mr-1.5 shadow-2xs"></span>
                      {alt.route_name}
                    </span>
                    <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ALTERNATIVE
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-1.5 border-y border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Distance</span>
                      <span className="font-bold text-slate-900 text-sm">{alt.total_distance_km} km</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Transit Time</span>
                      <span className="font-bold text-sky-800 text-sm">{alt.total_time_minutes} min</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Flood Risk</span>
                      <span className="font-bold text-slate-900 text-sm">{(alt.average_risk_probability * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Higher-elevation corridor bypass in case primary arterial experiences sudden backflow water accumulation.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

