import React, { useState, useEffect } from 'react';
import { gisService } from '../../services/gisService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Settings as SettingsIcon, Globe, MapPin, Sliders, ExternalLink } from 'lucide-react';

export const Settings: React.FC = () => {
  const [studyArea, setStudyArea] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArea() {
      try {
        const res = await gisService.getStudyArea();
        setStudyArea(res);
      } catch (err) {
        console.error('Failed to load study area metadata:', err);
      } finally {
        setLoading(false);
      }
    }
    loadArea();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading system configuration and study area parameters..." />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs">
        <h2 className="text-base font-bold text-slate-800">Study Area & Expandable Geographic Architecture</h2>
        <p className="text-xs text-sky-800 font-medium mt-0.5">
          Configurable spatial boundaries, study corridor parameters, and system defaults
        </p>
      </div>

      {/* Active Corridor Configuration */}
      <div className="bg-white/95 rounded-2xl border border-sky-100 p-5 shadow-xs space-y-4">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-sky-600" />
          <h3 className="text-sm font-bold text-slate-800">Active Study Corridor</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-200 space-y-2">
            <div className="text-sky-900 font-semibold">Corridor Identifier:</div>
            <div className="font-bold text-slate-900 text-sm">{studyArea?.name}</div>
            <div className="text-slate-600">Location: {studyArea?.city}, {studyArea?.state}, {studyArea?.country}</div>
            <div className="text-slate-600">Center Coordinates: {studyArea?.center?.lat}° N, {studyArea?.center?.lon}° E</div>
          </div>

          <div className="p-4 bg-pink-50/40 rounded-xl border border-pink-200 space-y-2">
            <div className="text-pink-900 font-semibold">Geographic Extent (Bounding Coordinates):</div>
            <div className="font-mono text-slate-800 space-y-0.5">
              <div>Min Latitude: {studyArea?.bbox?.min_lat}° N (Bommanahalli / Begur)</div>
              <div>Max Latitude: {studyArea?.bbox?.max_lat}° N (Mahadevapura)</div>
              <div>Min Longitude: {studyArea?.bbox?.min_lon}° E (Hosur Road Link)</div>
              <div>Max Longitude: {studyArea?.bbox?.max_lon}° E (Marathahalli / ORR)</div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Key Monitored Nodes in Corridor:</h4>
          <div className="flex flex-wrap gap-2">
            {studyArea?.key_corridors?.map((loc: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-sky-50 text-sky-800 text-xs rounded-lg border border-sky-200 font-medium shadow-2xs">
                {loc}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Expandable Architecture - Future Corridors */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Geographic Expansion Framework</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          The system architecture stores study area spatial metadata separately from application logic. Additional Bengaluru urban drainage basins can be activated by supplying bounding coordinates without rewriting routing or GIS pipelines:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
            <div className="font-semibold text-slate-900">Phase 2: Whitefield – K.R. Puram</div>
            <div className="text-[11px] text-slate-500 mt-1">Varthur lake downstream & ITPL tech corridor</div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">BBox: [12.980..13.040, 77.700..77.780]</div>
          </div>
          <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
            <div className="font-semibold text-slate-900">Phase 3: Koramangala – Electronic City</div>
            <div className="text-[11px] text-slate-500 mt-1">Silk Board junction & South Hosur Road SWDs</div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">BBox: [12.830..12.930, 77.610..77.690]</div>
          </div>
          <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
            <div className="font-semibold text-slate-900">Phase 4: Hebbal – Yelahanka Basin</div>
            <div className="text-[11px] text-slate-500 mt-1">North Bengaluru airport corridor & Hebbal lake series</div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">BBox: [13.020..13.120, 77.560..77.640]</div>
          </div>
        </div>
      </div>

      {/* API Reference & System Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">FastAPI REST Documentation</h3>
          <p className="text-xs text-slate-500 mt-0.5">Interactive Swagger UI specification with all 34 endpoints</p>
        </div>
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <span>Open API Docs</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

