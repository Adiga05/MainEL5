import React, { useState, useEffect } from 'react';
import { gisService } from '../../services/gisService';
import { incidentService } from '../../services/incidentService';
import { rainfallService } from '../../services/rainfallService';
import { InteractiveMap } from '../../maps/InteractiveMap';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  CloudRain,
  RefreshCw,
  Thermometer,
  Droplets,
  Wind,
  Radio,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export const LiveRiskMap: React.FC = () => {
  const [roads, setRoads] = useState<any[]>([]);
  const [drainage, setDrainage] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [floodProne, setFloodProne] = useState<any[]>([]);
  const [lowLying, setLowLying] = useState<any[]>([]);
  const [vulnerablePoints, setVulnerablePoints] = useState<any[]>([]);
  const [rainGauges, setRainGauges] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time meteorological telemetry & weather forecast state
  const [liveWeather, setLiveWeather] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  // Fetch real-time weather and calculate road disruption risk
  const fetchWeatherAndRoadRisk = async () => {
    setUpdating(true);
    try {
      const weather = await rainfallService.getLiveWeather();
      setLiveWeather(weather);

      const rain1h = weather.rainfall_1h_mm ?? weather.current_rainfall_mmh ?? 0.0;
      const rain3h = weather.rainfall_3h_mm ?? (rain1h * 1.5);

      // Evaluate road disruption risk based on actual real-time precipitation
      const res = await gisService.getRoadRisk(rain1h, rain3h, false);
      setRoads(res?.features || []);
    } catch (err) {
      console.error('Failed to update live weather and road risk:', err);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    async function loadAllData() {
      try {
        const [dr, hp, fp, ll, vp, rg, inc] = await Promise.all([
          gisService.getDrainage(),
          gisService.getHospitals(),
          gisService.getFloodProne(),
          gisService.getLowLying(),
          gisService.getVulnerablePoints(),
          gisService.getRainGauges(),
          incidentService.getIncidents()
        ]);

        setDrainage(dr?.features || []);
        setHospitals(hp?.features || []);
        setFloodProne(fp?.features || []);
        setLowLying(ll?.features || []);
        setVulnerablePoints(vp?.features || []);
        setRainGauges(rg?.features || []);
        setIncidents(inc || []);

        await fetchWeatherAndRoadRisk();
      } catch (err) {
        console.error('Failed to load GIS layers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Connecting to live meteorological telemetry and rendering corridor GIS layers..." />;
  }

  return (
    <div className="space-y-4">
      {/* Top Banner with Real-Time Weather & Telemetry Feed */}
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Corridor Live GIS Risk Map</h2>
          <p className="text-xs text-sky-800 font-medium mt-0.5">
            Bommanahalli–Marathahalli corridor • Roads, Raja Kaluves (SWDs), flood hotspots, and hospital links
          </p>
        </div>

        {/* Real-Time Meteorological Telemetry Widget (No manual slider) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {liveWeather && (
            <div className="flex flex-wrap items-center gap-2.5 bg-gradient-to-r from-sky-50/80 via-white to-sky-50/60 p-2 rounded-xl border border-sky-200 shadow-2xs text-xs">
              {/* Telemetry Status Indicator */}
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-semibold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Telemetry</span>
              </div>

              {/* Weather Condition & Temperature */}
              <div className="flex items-center space-x-1.5 text-slate-700 px-2">
                <Thermometer className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-bold text-slate-800">{liveWeather.temperature_c}°C</span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-700">{liveWeather.condition}</span>
              </div>

              {/* Actual Precipitation Rate */}
              <div
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border font-bold shadow-2xs ${
                  liveWeather.current_rainfall_mmh > 0
                    ? 'bg-pink-50 text-pink-700 border-pink-200'
                    : 'bg-sky-50 text-sky-800 border-sky-200'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5" />
                <span>Rainfall: {liveWeather.current_rainfall_mmh} mm/h</span>
              </div>

              {/* Humidity & Wind Speed */}
              <div className="hidden sm:flex items-center space-x-2 text-[11px] text-slate-500 px-1">
                <span className="flex items-center">
                  <Droplets className="w-3 h-3 text-sky-500 mr-0.5" /> {liveWeather.humidity_pct}%
                </span>
                <span>•</span>
                <span className="flex items-center">
                  <Wind className="w-3 h-3 text-sky-500 mr-0.5" /> {liveWeather.wind_speed_kmh} km/h
                </span>
              </div>

              {/* Refresh Telemetry Button */}
              <button
                onClick={fetchWeatherAndRoadRisk}
                disabled={updating}
                title="Refresh real-time meteorological observations"
                className="p-1.5 bg-white hover:bg-sky-50 border border-sky-200 rounded-lg text-sky-700 hover:text-sky-900 transition-colors shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${updating ? 'animate-spin text-sky-600' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Interactive Map */}
      <InteractiveMap
        height="700px"
        roads={roads}
        drainage={drainage}
        hospitals={hospitals}
        floodProne={floodProne}
        lowLying={lowLying}
        vulnerablePoints={vulnerablePoints}
        rainGauges={rainGauges}
        incidents={incidents}
      />
    </div>
  );
};
