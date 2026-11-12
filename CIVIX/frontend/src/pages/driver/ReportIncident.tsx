import React, { useState } from 'react';
import { incidentService } from '../../services/incidentService';
import { AlertTriangle, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { InteractiveMap } from '../../maps/InteractiveMap';

export const ReportIncident: React.FC = () => {
  const [incidentType, setIncidentType] = useState('waterlogging');
  const [description, setDescription] = useState('');
  const [passable, setPassable] = useState('impassable');
  const [lat, setLat] = useState(12.935);
  const [lon, setLon] = useState(77.685);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);
    try {
      await incidentService.reportIncident({
        incident_type: incidentType,
        description: `${description} [Status: ${passable.toUpperCase()}]`,
        reported_by: 'Emergency Vehicle Driver (Ambulance 108)',
        latitude: lat,
        longitude: lon,
      });
      setSuccessMsg('Road hazard report submitted successfully to BBMP Municipal Control Center for verification.');
      setDescription('');
    } catch (err: any) {
      console.error('Error reporting incident:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMapClick = (clickLat: number, clickLon: number) => {
    setLat(Math.round(clickLat * 10000) / 10000);
    setLon(Math.round(clickLon * 10000) / 10000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs">
        <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-pink-600" />
          <span>Report Road Waterlogging or Blockage</span>
        </h2>
        <p className="text-xs text-sky-800 font-medium mt-0.5">
          Emergency responders can report flooded underpasses, deep water accumulation, and impassable roads
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center space-x-2 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white/95 rounded-2xl border border-sky-100 p-5 shadow-xs">
          <h3 className="text-xs font-bold text-sky-800 uppercase tracking-wider mb-4">
            Hazard Report Details
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Hazard Classification</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              >
                <option value="waterlogging">Waterlogging (Water accumulated on carriageway)</option>
                <option value="blocked">Road Completely Blocked (Submerged / Closed)</option>
                <option value="partial">Partial Obstruction (Single lane flooded)</option>
                <option value="drainage_overflow">Raja Kaluve / SWD Overflow onto Road</option>
                <option value="other">Other Flood-Related Obstruction</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Emergency Passability Status</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPassable('impassable')}
                  className={`py-2 px-3 rounded-xl font-semibold text-center border transition-all ${
                    passable === 'impassable'
                      ? 'bg-pink-600 text-white border-pink-600 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-pink-50'
                  }`}
                >
                  Impassable (Ambulance Cannot Pass)
                </button>
                <button
                  type="button"
                  onClick={() => setPassable('passable')}
                  className={`py-2 px-3 rounded-xl font-semibold text-center border transition-all ${
                    passable === 'passable'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-amber-50'
                  }`}
                >
                  Slow Passable (High Clearance Only)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Description & Landmark</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g., Bellandur EcoSpace underpass submerged under ~2.5 feet of water. Traffic halted."
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-400 focus:outline-hidden"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                  required
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e) => setLon(parseFloat(e.target.value))}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-mono"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              💡 Tip: Click anywhere on the map to set coordinates directly.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-2xs"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{submitting ? 'Submitting Report...' : 'Submit Road Hazard Report'}</span>
            </button>
          </form>
        </div>

        {/* Pin Location Map */}
        <div className="bg-white/95 rounded-2xl border border-sky-100 p-4 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-800">Pin Location on Map</span>
            <span className="text-sky-700 font-mono font-medium">Pinned: {lat.toFixed(4)}° N, {lon.toFixed(4)}° E</span>
          </div>
          <InteractiveMap
            height="460px"
            origin={{ lat, lon, label: 'Pinned Hazard Location' }}
            onMapClick={handleMapClick}
            showLayerToggle={false}
          />
        </div>
      </div>
    </div>
  );
};

