import React, { useState, useEffect } from 'react';
import { routingService } from '../../services/routingService';
import { rainfallService } from '../../services/rainfallService';
import { gisService } from '../../services/gisService';
import { InteractiveMap } from '../../maps/InteractiveMap';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  Navigation2,
  AlertTriangle,
  MapPin,
  LocateFixed,
  ArrowRightLeft,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Compass,
  CornerDownRight
} from 'lucide-react';

interface LocationItem {
  name: string;
  lat: number;
  lon: number;
}

const PRESET_SOURCES: LocationItem[] = [
  { name: 'Bommanahalli Junction', lat: 12.898, lon: 77.625 },
  { name: 'Central Silk Board', lat: 12.917, lon: 77.623 },
  { name: 'HSR Layout Sector 2', lat: 12.912, lon: 77.644 },
  { name: 'Bellandur ORR Station', lat: 12.926, lon: 77.676 },
  { name: 'Marathahalli Bridge', lat: 12.956, lon: 77.701 },
  { name: 'Sarjapur Road Junction', lat: 12.923, lon: 77.662 },
];

const PRESET_DESTINATIONS: LocationItem[] = [
  { name: 'Sakra World Hospital, Devarabeesanahalli', lat: 12.933, lon: 77.688 },
  { name: 'Manipal Hospital, Sarjapur Road', lat: 12.921, lon: 77.671 },
  { name: 'Cloudnine Hospital, Bellandur', lat: 12.929, lon: 77.682 },
  { name: 'Manipal Hospital, Whitefield', lat: 12.960, lon: 77.718 },
  { name: 'Apollo Cradle, Marathahalli', lat: 12.955, lon: 77.702 },
  { name: 'Narayana Multispeciality Hospital, HSR', lat: 12.911, lon: 77.639 },
  { name: 'Foster Healthcare, Begur', lat: 12.887, lon: 77.632 },
];

export const DriverRouting: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [routing, setRouting] = useState(false);
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Source / Origin
  const [origin, setOrigin] = useState<LocationItem>(PRESET_SOURCES[0]);
  const [sourceText, setSourceText] = useState(PRESET_SOURCES[0].name);

  // Destination
  const [dest, setDest] = useState<LocationItem>(PRESET_DESTINATIONS[0]);
  const [destText, setDestText] = useState(PRESET_DESTINATIONS[0].name);

  // Live rainfall telemetry
  const [rainfallRate, setRainfallRate] = useState<number>(0.0);

  // Routes
  const [routeList, setRouteList] = useState<any[]>([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize and load real-time telemetry
  useEffect(() => {
    async function init() {
      let liveRain = 0.0;
      try {
        const weather = await rainfallService.getLiveWeather();
        if (weather) {
          liveRain = weather.rainfall_1h_mm ?? weather.current_rainfall_mmh ?? 0.0;
          setRainfallRate(liveRain);
        }
      } catch (err) {
        console.warn('Could not fetch real-time weather for driver routing, using 0 mm/h default (clear)');
      } finally {
        setLoading(false);
        handleCalculateRoutes(origin.lat, origin.lon, dest.lat, dest.lon, liveRain);
      }
    }
    init();
  }, []);

  // Compute best 2-3 routes
  const handleCalculateRoutes = async (
    sLat: number = origin.lat,
    sLon: number = origin.lon,
    dLat: number = dest.lat,
    dLon: number = dest.lon,
    rainMm: number = rainfallRate
  ) => {
    setRouting(true);
    setErrorMsg(null);
    try {
      const res = await routingService.getRecommendedRoute({
        origin_lon: sLon,
        origin_lat: sLat,
        dest_lon: dLon,
        dest_lat: dLat,
        risk_weight: 3.0,
        vehicle_type: 'ambulance',
        rainfall_1h_mm: rainMm,
      });

      // Extract up to 3 candidate routes
      let extracted: any[] = [];
      if (res.routes && Array.isArray(res.routes) && res.routes.length > 0) {
        extracted = res.routes;
      } else {
        if (res.recommended_route) extracted.push(res.recommended_route);
        if (res.alternative_route && res.alternative_route.route_name !== res.recommended_route?.route_name) {
          extracted.push(res.alternative_route);
        }
        if (res.fastest_route && !extracted.some(r => r.geometry === res.fastest_route.geometry)) {
          extracted.push(res.fastest_route);
        }
      }

      setRouteList(extracted.slice(0, 3));
      setSelectedRouteIdx(0);
    } catch (err: any) {
      console.error('Route calculation error:', err);
      setErrorMsg(err.response?.data?.detail || 'Route calculation failed. Verify that origin and destination are connected.');
    } finally {
      setRouting(false);
    }
  };

  // Use Current Location via Browser GPS
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported by your browser. Using Bommanahalli entry hub.');
      setOrigin(PRESET_SOURCES[0]);
      setSourceText(PRESET_SOURCES[0].name);
      return;
    }

    setGpsDetecting(true);
    setGpsStatus('Detecting GPS location...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsDetecting(false);

        // Corridor bounding box: lat 12.85-13.05, lon 77.55-77.75
        const isInCorridor = latitude >= 12.85 && latitude <= 13.05 && longitude >= 77.55 && longitude <= 77.75;

        if (isInCorridor) {
          const currentLoc: LocationItem = {
            name: `My Current GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            lat: latitude,
            lon: longitude,
          };
          setOrigin(currentLoc);
          setSourceText(currentLoc.name);
          setGpsStatus(`GPS fix acquired: [${latitude.toFixed(4)}, ${longitude.toFixed(4)}]`);
          handleCalculateRoutes(latitude, longitude, dest.lat, dest.lon);
        } else {
          // Detected outside corridor, snap to nearest dispatch hub
          const snapped = PRESET_SOURCES[0];
          setOrigin(snapped);
          setSourceText(`${snapped.name} (Snapped from ${latitude.toFixed(2)}°N)`);
          setGpsStatus(`Detected location is outside Bengaluru corridor. Snapped to ${snapped.name}.`);
          handleCalculateRoutes(snapped.lat, snapped.lon, dest.lat, dest.lon);
        }
      },
      (err) => {
        setGpsDetecting(false);
        setGpsStatus('GPS permission denied or unavailable. Fallback: Bommanahalli Junction.');
        const fallback = PRESET_SOURCES[0];
        setOrigin(fallback);
        setSourceText(fallback.name);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle manual source input parsing
  const handleSelectSourcePreset = (item: LocationItem) => {
    setOrigin(item);
    setSourceText(item.name);
    setGpsStatus(null);
    handleCalculateRoutes(item.lat, item.lon, dest.lat, dest.lon);
  };

  // Handle manual destination input parsing
  const handleSelectDestPreset = (item: LocationItem) => {
    setDest(item);
    setDestText(item.name);
    handleCalculateRoutes(origin.lat, origin.lon, item.lat, item.lon);
  };

  // Swap source and destination
  const handleSwap = () => {
    const prevOrigin = { ...origin };
    const prevOriginText = sourceText;
    setOrigin({ ...dest });
    setSourceText(destText);
    setDest(prevOrigin);
    setDestText(prevOriginText);
    handleCalculateRoutes(dest.lat, dest.lon, prevOrigin.lat, prevOrigin.lon);
  };

  // Parse typed text or coordinates
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if source matches coordinates: "lat, lon"
    const parseCoord = (str: string) => {
      const parts = str.split(',').map(s => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        // If user typed lon, lat vs lat, lon
        if (parts[0] > 70) return { lon: parts[0], lat: parts[1] };
        return { lat: parts[0], lon: parts[1] };
      }
      return null;
    };

    const sCoord = parseCoord(sourceText);
    const dCoord = parseCoord(destText);

    const sItem: LocationItem = sCoord
      ? { name: sourceText, lat: sCoord.lat, lon: sCoord.lon }
      : origin;

    const dItem: LocationItem = dCoord
      ? { name: destText, lat: dCoord.lat, lon: dCoord.lon }
      : dest;

    setOrigin(sItem);
    setDest(dItem);
    handleCalculateRoutes(sItem.lat, sItem.lon, dItem.lat, dItem.lon);
  };

  if (loading) {
    return <LoadingSpinner message="Initializing emergency vehicle dispatch and routing engine..." />;
  }

  const activeRoute = routeList[selectedRouteIdx] || routeList[0];

  return (
    <div className="space-y-4">
      {/* Top Banner: Dispatch Guidance & Current Corridor Weather */}
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <Navigation2 className="w-5 h-5 text-sky-600" />
            <span>Emergency Vehicle Flood-Safe Navigation</span>
          </h2>
          <p className="text-xs text-sky-800 font-medium mt-0.5">
            Real-time flood-risk avoidance • Bypasses waterlogged roads and overflowing Raja Kaluves
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className={`px-2.5 py-1 rounded-xl border font-semibold flex items-center space-x-1.5 ${
            rainfallRate > 25
              ? 'bg-pink-50 border-pink-200 text-pink-700'
              : 'bg-sky-50 border-sky-200 text-sky-800'
          }`}>
            <Compass className="w-3.5 h-3.5" />
            <span>
              Live Rainfall: {rainfallRate.toFixed(1)} mm/h {rainfallRate === 0 ? '(Clear / Road Passable)' : rainfallRate <= 25 ? '(Roads Passable)' : '(Flood Inundation Risk)'}
            </span>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ambulance Fast-Track</span>
          </span>
        </div>
      </div>

      {/* Navigation Controls: Source & Destination Selection */}
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs space-y-4">
        <form onSubmit={handleManualSearch} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          {/* Source Input */}
          <div className="lg:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Source (Starting Location)</span>
              </label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={gpsDetecting}
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 flex items-center space-x-1 transition-colors"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${gpsDetecting ? 'animate-spin text-sky-500' : ''}`} />
                <span>{gpsDetecting ? 'Detecting GPS...' : '📍 Use Current Location'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Enter address, landmark, or coordinates..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:border-sky-500 transition-all"
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="lg:col-span-1 flex items-center justify-center pb-0.5">
            <button
              type="button"
              onClick={handleSwap}
              title="Swap Source and Destination"
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 text-slate-600 hover:text-sky-700 transition-all shadow-2xs"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Input */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              <span>Destination (Hospital / Landmark)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={destText}
                onChange={(e) => setDestText(e.target.value)}
                placeholder="Enter destination hospital or coordinates..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:border-sky-500 transition-all"
              />
            </div>
          </div>

          {/* Find Routes Button */}
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={routing}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              <Search className="w-4 h-4" />
              <span>{routing ? 'Calculating...' : 'Find Routes'}</span>
            </button>
          </div>
        </form>

        {/* GPS Status Message if present */}
        {gpsStatus && (
          <div className="text-[11px] font-medium text-sky-800 bg-sky-50/80 px-3 py-1.5 rounded-lg border border-sky-200/80 flex items-center justify-between">
            <span>{gpsStatus}</span>
            <button onClick={() => setGpsStatus(null)} className="text-slate-400 hover:text-slate-600 ml-2">×</button>
          </div>
        )}

        {/* Quick Selection Preset Chips */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 text-[11px] mr-1">Source Presets:</span>
            {PRESET_SOURCES.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSourcePreset(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  origin.name === s.name
                    ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                📍 {s.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 text-[11px] mr-1">Destination Hospitals:</span>
            {PRESET_DESTINATIONS.map((d, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectDestPreset(d)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  dest.name === d.name
                    ? 'bg-rose-600 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                🏥 {d.name.split(',')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Navigation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Top 2-3 Route Comparison Cards */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Best Routes Found ({routeList.length})
            </h3>
            <span className="text-[11px] text-sky-700 font-semibold">Click to Highlight</span>
          </div>

          {routeList.length === 0 && !routing && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 space-y-2">
              <Compass className="w-8 h-8 mx-auto text-slate-400" />
              <p className="font-semibold text-slate-700">No route calculated yet</p>
              <p className="text-[11px] text-slate-500">
                Enter your destination above and click <strong>Find Routes</strong>.
              </p>
            </div>
          )}

          {routeList.map((route, idx) => {
            const isSelected = selectedRouteIdx === idx;
            const defaultColors = ['#2563eb', '#0891b2', '#d97706'];
            const strokeColor = route.color || defaultColors[idx % defaultColors.length];

            return (
              <div
                key={idx}
                onClick={() => setSelectedRouteIdx(idx)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2.5 ${
                  isSelected
                    ? 'bg-white shadow-md'
                    : 'bg-white/80 hover:bg-white border-slate-200 hover:border-slate-300'
                }`}
                style={{
                  borderColor: isSelected ? strokeColor : undefined,
                }}
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ backgroundColor: strokeColor }}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {route.route_name || `Route ${idx + 1}`}
                    </span>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: `${strokeColor}20`, color: strokeColor }}
                  >
                    {route.badge || (idx === 0 ? 'Safest' : 'Alternative')}
                  </span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 text-center py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <div className="text-[9px] text-slate-400 font-medium">Est. Time</div>
                    <div className="text-base font-bold text-slate-900">
                      {route.total_time_minutes} <span className="text-[10px] font-normal text-slate-500">min</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400 font-medium">Distance</div>
                    <div className="text-base font-bold text-slate-900">
                      {route.total_distance_km} <span className="text-[10px] font-normal text-slate-500">km</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400 font-medium">Flood Risk</div>
                    <div className="text-base font-bold text-emerald-600">
                      {((route.average_risk_probability || 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                {route.recommendation_reason && (
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {route.recommendation_reason}
                  </p>
                )}

                {/* Warnings if any */}
                {route.warnings && route.warnings.length > 0 && (
                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[10px] space-y-0.5">
                    <div className="font-bold flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                      Caution on segment:
                    </div>
                    <div>• {route.warnings[0]}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column: Clean Route-Only Interactive Map */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs">
            <InteractiveMap
              height="620px"
              routes={routeList}
              selectedRouteIndex={selectedRouteIdx}
              onSelectRoute={(idx) => setSelectedRouteIdx(idx)}
              origin={{ lat: origin.lat, lon: origin.lon, label: origin.name }}
              destination={{ lat: dest.lat, lon: dest.lon, label: dest.name }}
              routesOnly={true}
              showLayerToggle={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
