import React, { useState, useEffect } from 'react';
import { gisService } from '../../services/gisService';
import { incidentService } from '../../services/incidentService';
import { InteractiveMap } from '../../maps/InteractiveMap';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { CloudRain, Sliders, RefreshCw, AlertCircle } from 'lucide-react';

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

  // Rainfall intensity control for live updating
  const [rainfallMm, setRainfallMm] = useState<number>(0.0);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function loadAllLayers() {
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
      } catch (err) {
        console.error('Failed to load GIS layers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllLayers();
  }, []);

  // Update road risk dynamically when rainfall slider moves
  useEffect(() => {
    async function updateRisk() {
      setUpdating(true);
      try {
        const res = await gisService.getRoadRisk(rainfallMm, rainfallMm * 1.5, rainfallMm > 0);
        setRoads(res?.features || []);
      } catch (err) {
        console.error('Failed to update road risk:', err);
      } finally {
        setUpdating(false);
      }
    }
    const timer = setTimeout(updateRisk, 250);
    return () => clearTimeout(timer);
  }, [rainfallMm]);

  if (loading) {
    return <LoadingSpinner message="Rendering corridor GIS layers & drainage topology..." />;
  }

  return (
    <div className="space-y-4">
      {/* Top Banner with Dynamic Rainfall Controller */}
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Corridor Live GIS Risk Map</h2>
          <p className="text-xs text-sky-800 font-medium mt-0.5">
            Bommanahalli–Marathahalli corridor • Roads, Raja Kaluves (SWDs), flood hotspots, and hospital links
          </p>
        </div>

        {/* Dynamic Rainfall Slider */}
        <div className="flex items-center space-x-3 bg-sky-50/70 p-2.5 rounded-xl border border-sky-200 shadow-2xs">
          <div className="flex items-center space-x-2 text-xs">
            <CloudRain className="w-4 h-4 text-sky-600" />
            <span className="font-semibold text-slate-700">Rainfall Input:</span>
            <span className="font-bold text-sky-700 px-2 py-0.5 bg-white rounded-md border border-sky-200">{rainfallMm} mm/h</span>
          </div>
          <input
            type="range"
            min="0"
            max="80"
            step="5"
            value={rainfallMm}
            onChange={(e) => setRainfallMm(parseFloat(e.target.value))}
            className="w-36 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
          />
          {updating && <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />}
          {rainfallMm > 0 && (
            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-300 font-bold px-2 py-0.5 rounded-full">
              SIMULATED PREDICTION
            </span>
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

