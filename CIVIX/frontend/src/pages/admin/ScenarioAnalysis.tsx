import React, { useState, useEffect } from 'react';
import { scenarioService } from '../../services/scenarioService';
import { gisService } from '../../services/gisService';
import { InteractiveMap } from '../../maps/InteractiveMap';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  Layers,
  CloudRain,
  Play,
  AlertTriangle,
  Hospital,
  MapPin,
  Navigation,
  ArrowRightLeft,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Compass
} from 'lucide-react';

interface LocationPreset {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export const ScenarioAnalysis: React.FC = () => {
  const [scenarioType, setScenarioType] = useState('heavy');
  const [rainfallMm, setRainfallMm] = useState(45);
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Map click assignment mode: 'none' | 'origin' | 'destination'
  const [mapClickMode, setMapClickMode] = useState<'none' | 'origin' | 'destination'>('none');

  // Origin & Destination Presets for the Bommanahalli–Marathahalli corridor
  const originPresets: LocationPreset[] = [
    { id: 'bommanahalli', name: 'Bommanahalli Junction (NH-44)', lat: 12.898, lon: 77.625 },
    { id: 'silkboard', name: 'Central Silk Board Junction', lat: 12.917, lon: 77.623 },
    { id: 'bellandur', name: 'Bellandur EcoSpace (ORR)', lat: 12.926, lon: 77.676 },
    { id: 'devarabee', name: 'Devarabeesanahalli (ORR)', lat: 12.936, lon: 77.690 },
    { id: 'kalamandir', name: 'Kalamandir Marathahalli', lat: 12.956, lon: 77.701 },
    { id: 'mahadevapura', name: 'Mahadevapura Ring Road', lat: 12.991, lon: 77.697 },
  ];

  const destinationPresets: LocationPreset[] = [
    { id: 'sakra', name: 'Sakra World Hospital (Devarabeesanahalli)', lat: 12.933, lon: 77.688 },
    { id: 'manipal', name: 'Manipal Hospital (Sarjapur Road / ORR link)', lat: 12.923, lon: 77.671 },
    { id: 'apollo', name: 'Apollo Clinic (Marathahalli)', lat: 12.954, lon: 77.703 },
    { id: 'rainbow', name: 'Rainbow Children\'s Hospital (Marathahalli)', lat: 12.949, lon: 77.698 },
    { id: 'brookefield', name: 'Brookefield Hospital', lat: 12.965, lon: 77.718 },
  ];

  // Active Origin and Destination State
  const [origin, setOrigin] = useState<LocationPreset>(originPresets[0]);
  const [destination, setDestination] = useState<LocationPreset>(destinationPresets[0]);
  const [enableRouting, setEnableRouting] = useState<boolean>(true);

  // Default roads and hospital layers
  const [roads, setRoads] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);

  useEffect(() => {
    async function initData() {
      try {
        const [rRes, hRes] = await Promise.all([
          gisService.getRoadRisk(0.0),
          gisService.getHospitals()
        ]);
        setRoads(rRes?.features || []);
        setHospitals(hRes?.features || []);
      } catch (err) {
        console.error('Failed to prefetch map layers:', err);
      }
    }
    initData();
  }, []);

  const scenariosPresets = [
    { id: 'moderate', name: 'Moderate Monsoon Shower (20 mm/h)', rain: 20 },
    { id: 'heavy', name: 'Intense Monsoon Downpour (45 mm/h)', rain: 45 },
    { id: 'extreme', name: 'Extreme Cloudburst Event (80 mm/h)', rain: 80 },
  ];

  const handleSelectPreset = (p: any) => {
    setScenarioType(p.id);
    setRainfallMm(p.rain);
  };

  const handleSwapPoints = () => {
    const temp = { ...origin };
    setOrigin({ ...destination });
    setDestination(temp);
  };

  const handleMapClick = (lat: number, lon: number) => {
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLon = Math.round(lon * 10000) / 10000;

    if (mapClickMode === 'origin') {
      setOrigin({
        id: 'custom_origin',
        name: `Custom Origin (${roundedLat}, ${roundedLon})`,
        lat: roundedLat,
        lon: roundedLon
      });
      setMapClickMode('none');
    } else if (mapClickMode === 'destination') {
      setDestination({
        id: 'custom_dest',
        name: `Custom Destination (${roundedLat}, ${roundedLon})`,
        lat: roundedLat,
        lon: roundedLon
      });
      setMapClickMode('none');
    }
  };

  const handleRunSimulation = async () => {
    setRunning(true);
    setErrorMsg(null);
    try {
      const payload: any = {
        scenario_name: `Simulated Scenario: ${rainfallMm} mm/h Event`,
        rainfall_1h_mm: rainfallMm,
        rainfall_3h_mm: rainfallMm * 1.5,
        description: 'Municipal what-if stress test for emergency corridor resilience'
      };

      if (enableRouting) {
        payload.origin_lon = origin.lon;
        payload.origin_lat = origin.lat;
        payload.dest_lon = destination.lon;
        payload.dest_lat = destination.lat;
        payload.origin_name = origin.name;
        payload.dest_name = destination.name;
      }

      const res = await scenarioService.runScenario(payload);
      setResult(res);
    } catch (err: any) {
      console.error('Failed to run scenario:', err);
      setErrorMsg(err.response?.data?.detail || 'Simulation execution encountered an error. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const routeComp = result?.route_comparison;

  return (
    <div className="space-y-6">
      {/* Top Banner with Academic Disclaimer */}
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs backdrop-blur-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100/90 border border-pink-300 flex items-center justify-center text-pink-600 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                What-If Flood Stress Testing & Scenario Simulation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulate intense precipitation events and infrastructure failures to test emergency network resilience
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[11px] rounded-full shadow-2xs">
            DEMO / SIMULATED SCENARIO
          </span>
        </div>
      </div>

      {/* Control Panel: Simulation Weather + Origin & Destination Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Weather Intensity Setup (5 cols) */}
        <div className="lg:col-span-5 bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-sky-800 uppercase tracking-wider">
            <CloudRain className="w-4 h-4 text-sky-600" />
            <span>1. Rainfall Stress Parameters</span>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2">
            {scenariosPresets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`w-full p-3 rounded-xl border text-left transition-all ${
                  scenarioType === p.id
                    ? 'border-sky-300 bg-sky-50 text-sky-900 ring-2 ring-sky-200 font-semibold shadow-2xs'
                    : 'border-slate-200/80 hover:border-sky-200 hover:bg-slate-50/60 bg-white text-slate-700'
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span>{p.name}</span>
                  <span className="font-bold text-sky-700">{p.rain} mm/h</span>
                </div>
              </button>
            ))}
          </div>

          {/* Custom Rainfall Slider */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-slate-700">Simulated Rainfall Intensity:</span>
              <span className="font-bold text-sky-700 px-2 py-0.5 bg-sky-50 rounded-md border border-sky-200">
                {rainfallMm} mm/hour
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={rainfallMm}
              onChange={(e) => {
                setRainfallMm(parseInt(e.target.value));
                setScenarioType('custom');
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>10 mm/h (Light)</span>
              <span>60 mm/h (Severe)</span>
              <span>120 mm/h (Extreme)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Origin & Destination Routing Configuration (7 cols) */}
        <div className="lg:col-span-7 bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-pink-800 uppercase tracking-wider">
              <Navigation className="w-4 h-4 text-pink-600" />
              <span>2. Emergency Trip Endpoints (Starting Point & Destination)</span>
            </div>
            <button
              type="button"
              onClick={handleSwapPoints}
              title="Swap starting point and destination"
              className="px-2.5 py-1 text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center space-x-1 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Swap</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Origin Card */}
            <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-900 flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-sky-600" />
                  Starting Point (Origin)
                </span>
                <button
                  type="button"
                  onClick={() => setMapClickMode(mapClickMode === 'origin' ? 'none' : 'origin')}
                  className={`px-2 py-0.5 text-[10px] rounded-md font-semibold transition-all ${
                    mapClickMode === 'origin'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-white text-sky-700 border border-sky-300 hover:bg-sky-100'
                  }`}
                >
                  {mapClickMode === 'origin' ? 'Click Map Now' : 'Pin on Map'}
                </button>
              </div>

              {/* Origin Dropdown */}
              <select
                value={origin.id}
                onChange={(e) => {
                  const sel = originPresets.find((p) => p.id === e.target.value);
                  if (sel) setOrigin(sel);
                }}
                className="w-full text-xs p-2 bg-white border border-sky-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              >
                {originPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                {origin.id === 'custom_origin' && (
                  <option value="custom_origin">{origin.name}</option>
                )}
              </select>

              {/* Coordinates Display */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 text-[10px]">Latitude:</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={origin.lat}
                    onChange={(e) =>
                      setOrigin({
                        ...origin,
                        id: 'custom_origin',
                        lat: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full p-1 bg-white border border-sky-200 rounded text-slate-800 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Longitude:</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={origin.lon}
                    onChange={(e) =>
                      setOrigin({
                        ...origin,
                        id: 'custom_origin',
                        lon: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full p-1 bg-white border border-sky-200 rounded text-slate-800 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Destination Card */}
            <div className="p-3.5 rounded-xl border border-pink-200 bg-pink-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-900 flex items-center">
                  <Hospital className="w-3.5 h-3.5 mr-1 text-pink-600" />
                  Destination (Target Hub)
                </span>
                <button
                  type="button"
                  onClick={() => setMapClickMode(mapClickMode === 'destination' ? 'none' : 'destination')}
                  className={`px-2 py-0.5 text-[10px] rounded-md font-semibold transition-all ${
                    mapClickMode === 'destination'
                      ? 'bg-pink-600 text-white shadow-2xs'
                      : 'bg-white text-pink-700 border border-pink-300 hover:bg-pink-100'
                  }`}
                >
                  {mapClickMode === 'destination' ? 'Click Map Now' : 'Pin on Map'}
                </button>
              </div>

              {/* Destination Dropdown */}
              <select
                value={destination.id}
                onChange={(e) => {
                  const sel = destinationPresets.find((p) => p.id === e.target.value);
                  if (sel) setDestination(sel);
                }}
                className="w-full text-xs p-2 bg-white border border-pink-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-pink-500"
              >
                {destinationPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                {destination.id === 'custom_dest' && (
                  <option value="custom_dest">{destination.name}</option>
                )}
              </select>

              {/* Coordinates Display */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 text-[10px]">Latitude:</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={destination.lat}
                    onChange={(e) =>
                      setDestination({
                        ...destination,
                        id: 'custom_dest',
                        lat: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full p-1 bg-white border border-pink-200 rounded text-slate-800 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Longitude:</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={destination.lon}
                    onChange={(e) =>
                      setDestination({
                        ...destination,
                        id: 'custom_dest',
                        lon: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full p-1 bg-white border border-pink-200 rounded text-slate-800 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Map click helper alert if active */}
          {mapClickMode !== 'none' && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2 animate-pulse">
              <Compass className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Interactive Map Click Active: Click anywhere on the map below to place the{' '}
                <strong>{mapClickMode === 'origin' ? 'Starting Point' : 'Destination'}</strong>.
              </span>
            </div>
          )}

          {/* Simulation Run Button */}
          <button
            onClick={handleRunSimulation}
            disabled={running}
            className="w-full py-3 bg-gradient-to-r from-sky-600 via-sky-700 to-pink-600 hover:from-sky-700 hover:to-pink-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md disabled:opacity-50"
          >
            {running ? (
              <LoadingSpinner message="Simulating pluvial inundation and emergency routing..." />
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Execute Scenario Simulation with Origin & Destination</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-pink-50 border border-pink-200 text-xs text-pink-700 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-pink-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Simulation Results Display */}
      {result && (
        <div className="space-y-6">
          {/* 1. Dedicated Origin to Destination Route Impact Card */}
          {routeComp && (
            <div className="bg-gradient-to-br from-pink-50/70 via-white to-sky-50/70 p-5 rounded-2xl border border-pink-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-pink-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <Navigation className="w-4 h-4 text-pink-600" />
                    <span>Simulated Emergency Route Accessibility Impact</span>
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-600 mt-1">
                    <span className="font-semibold text-sky-800">📍 {routeComp.origin_name}</span>
                    <span className="text-slate-400">➔</span>
                    <span className="font-semibold text-pink-800">🎯 {routeComp.dest_name}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {routeComp.rerouted_for_safety ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] rounded-full flex items-center space-x-1 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Rerouted via Safe Alternative</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px] rounded-full flex items-center space-x-1 shadow-2xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      <span>Traversing Waterlogged Corridor</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Baseline Travel Time</span>
                  <div className="text-xl font-bold text-sky-900 mt-1">
                    {routeComp.baseline_time_min} <span className="text-xs font-normal text-slate-500">mins</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Dry-weather conditions</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-pink-100 shadow-2xs">
                  <span className="text-[10px] text-pink-600 uppercase font-semibold">Simulated Flood Time</span>
                  <div className="text-xl font-bold text-pink-700 mt-1">
                    {routeComp.scenario_time_min} <span className="text-xs font-normal text-slate-500">mins</span>
                  </div>
                  <span className="text-[10px] text-pink-600">Under {result.parameters.rainfall_1h_mm} mm/h</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
                  <span className="text-[10px] text-amber-700 uppercase font-semibold">Added Water Delay</span>
                  <div className="text-xl font-bold text-amber-600 mt-1">
                    +{routeComp.added_delay_min} <span className="text-xs font-normal text-slate-500">mins</span>
                  </div>
                  <span className="text-[10px] text-amber-600">Transit obstruction delay</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] text-emerald-700 uppercase font-semibold">Transit Distance</span>
                  <div className="text-xl font-bold text-emerald-800 mt-1">
                    {routeComp.scenario_distance_km} <span className="text-xs font-normal text-slate-500">km</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Baseline: {routeComp.baseline_distance_km} km</span>
                </div>
              </div>

              {/* Visual Route Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs pt-2 border-t border-slate-100 text-slate-700">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-1.5 rounded-full bg-pink-600 inline-block shadow-2xs"></span>
                  <span className="font-medium text-pink-900">Simulated Safe Flood Route</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-1.5 rounded-full bg-sky-500 inline-block border border-sky-600 border-dashed"></span>
                  <span className="font-medium text-sky-900">Baseline Shortest Route</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                  <span>📍 Origin: Sky Blue Pin</span>
                  <span>•</span>
                  <span>🎯 Destination: Pink Pin</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Corridor High-Level Statistical Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-sky-50 to-white p-4 rounded-2xl border border-sky-200 shadow-xs">
              <span className="text-xs text-sky-800 uppercase font-semibold">Baseline High-Risk Roads</span>
              <div className="text-2xl font-bold text-sky-950 mt-1">
                {(result.baseline_summary.high || 0) + (result.baseline_summary.very_high || 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Dry-weather conditions</p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-white p-4 rounded-2xl border border-pink-200 shadow-xs">
              <span className="text-xs text-pink-800 uppercase font-semibold">Scenario High-Risk Roads</span>
              <div className="text-2xl font-bold text-pink-700 mt-1">
                {(result.scenario_summary.high || 0) + (result.scenario_summary.very_high || 0)}
              </div>
              <p className="text-[11px] text-pink-600 mt-0.5">
                Under {result.parameters.rainfall_1h_mm} mm/h downpour
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-white p-4 rounded-2xl border border-amber-200 shadow-xs">
              <span className="text-xs text-amber-800 uppercase font-semibold">Newly Disrupted Links</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                +{result.newly_vulnerable_segments} Segments
              </div>
              <p className="text-[11px] text-amber-700 mt-0.5">Requiring emergency bypass</p>
            </div>
          </div>

          {/* 3. Hospital Accessibility Impact List */}
          <div className="bg-white/95 rounded-2xl border border-sky-100 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center space-x-2">
              <Hospital className="w-4 h-4 text-pink-600" />
              <span>Simulated Impact on Emergency Hospital Transit Times</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.hospital_accessibility_impact?.map((h: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-sky-100 bg-gradient-to-br from-slate-50/60 to-sky-50/30 text-xs space-y-1.5 shadow-2xs"
                >
                  <div className="font-semibold text-slate-900">{h.hospital_name}</div>
                  <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                    <span>Normal Travel Time:</span>
                    <span>{h.normal_travel_time_min} mins</span>
                  </div>
                  <div className="flex justify-between font-bold text-pink-700">
                    <span>Scenario Travel Time:</span>
                    <span>{h.scenario_travel_time_min} mins</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1">
                    <span className="font-medium text-slate-700">Key Bottleneck:</span>{' '}
                    {h.critical_access_bottleneck}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Scenario Map with Routes and Pins */}
          <div className="bg-white/95 p-4 rounded-2xl border border-sky-100 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Interactive Corridor Simulation Map (Bommanahalli–Marathahalli)
              </span>
              <span className="text-[11px] text-slate-400">
                Click map when 'Pin on Map' is active to re-position endpoints
              </span>
            </div>
            <InteractiveMap
              height="580px"
              roads={result.road_network?.features || roads}
              hospitals={hospitals}
              activeRoute={result.simulated_route}
              alternativeRoute={result.baseline_route}
              origin={{ lat: origin.lat, lon: origin.lon, label: origin.name }}
              destination={{ lat: destination.lat, lon: destination.lon, label: destination.name }}
              onMapClick={handleMapClick}
            />
          </div>
        </div>
      )}

      {/* Map placeholder before simulation runs */}
      {!result && (
        <div className="bg-white/95 p-4 rounded-2xl border border-sky-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Interactive Corridor Baseline Map (Bommanahalli–Marathahalli)
            </span>
            <span className="text-[11px] text-sky-700 font-medium">
              Click 'Pin on Map' above to set custom origin or destination pins
            </span>
          </div>
          <InteractiveMap
            height="550px"
            roads={roads}
            hospitals={hospitals}
            origin={{ lat: origin.lat, lon: origin.lon, label: origin.name }}
            destination={{ lat: destination.lat, lon: destination.lon, label: destination.name }}
            onMapClick={handleMapClick}
          />
        </div>
      )}
    </div>
  );
};
