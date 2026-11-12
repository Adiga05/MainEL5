import React, { useState, useEffect } from 'react';
import { gisService } from '../../services/gisService';
import { InteractiveMap } from '../../maps/InteractiveMap';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Route, Search, Filter } from 'lucide-react';

export const RoadNetwork: React.FC = () => {
  const [roads, setRoads] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRoads() {
      try {
        const res = await gisService.getRoadRisk(0.0);
        setRoads(res?.features || []);
      } catch (err) {
        console.error('Failed to load roads:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRoads();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Indexing road network centerlines for the corridor..." />;
  }

  const filteredRoads = roads.filter((r) => {
    const name = (r.properties?.road_name || '').toLowerCase();
    const type = (r.properties?.road_type || '').toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs">
        <h2 className="text-base font-bold text-slate-800">Corridor Road Network & Topology</h2>
        <p className="text-xs text-sky-800 font-medium mt-0.5">
          Filtered to the Bommanahalli–Marathahalli corridor • {roads.length} routable road segments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InteractiveMap height="550px" roads={filteredRoads} showLayerToggle={false} />
        </div>

        {/* Filterable Table */}
        <div className="bg-white/95 rounded-2xl border border-sky-100 p-4 shadow-xs flex flex-col h-[550px]">
          <div className="space-y-3 mb-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search road name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white text-slate-700"
              >
                <option value="all">All Road Classifications</option>
                <option value="primary">Primary Arterial</option>
                <option value="secondary">Secondary Arterial</option>
                <option value="trunk">Trunk / Outer Ring Road</option>
                <option value="tertiary">Tertiary Connector</option>
                <option value="residential">Residential Road</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredRoads.slice(0, 100).map((r) => (
              <div
                key={r.id}
                className="p-2.5 rounded-lg border border-slate-200/70 hover:border-blue-400 hover:bg-blue-50/20 text-xs transition-colors"
              >
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span className="truncate max-w-[180px]">{r.properties?.road_name}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                    {r.properties?.road_type}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                  <span>Length: {r.properties?.length_m}m</span>
                  <span>Speed: {r.properties?.speed_kmh} km/h</span>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            Showing {Math.min(100, filteredRoads.length)} of {filteredRoads.length} segments
          </div>
        </div>
      </div>
    </div>
  );
};

