import React, { useState, useEffect } from 'react';
import { gisService } from '../../services/gisService';
import { incidentService } from '../../services/incidentService';
import { InteractiveMap } from '../../maps/InteractiveMap';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const DriverMap: React.FC = () => {
  const [roads, setRoads] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [rk, hp, inc] = await Promise.all([
          gisService.getRoadRisk(10.0),
          gisService.getHospitals(),
          incidentService.getIncidents()
        ]);
        setRoads(rk?.features || []);
        setHospitals(hp?.features || []);
        setIncidents(inc || []);
      } catch (err) {
        console.error('Failed to load driver map:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading live road risk network..." />;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs">
        <h2 className="text-base font-bold text-slate-800">Driver Live Road Conditions Map</h2>
        <p className="text-xs text-sky-800 font-medium mt-0.5">
          Real-time color-coded disruption risk, reported hazards, and hospital locations across Bommanahalli–Marathahalli corridor
        </p>
      </div>

      <InteractiveMap
        height="680px"
        roads={roads}
        hospitals={hospitals}
        incidents={incidents}
        showLayerToggle={true}
      />
    </div>
  );
};

