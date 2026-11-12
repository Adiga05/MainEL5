import React, { useState, useEffect } from 'react';
import { rainfallService } from '../../services/rainfallService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { CloudRain, Radio, Plus, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const RainfallMonitoring: React.FC = () => {
  const [latestData, setLatestData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Manual entry form state
  const [stationName, setStationName] = useState('Bellandur Telemetry Post');
  const [rainfallAmount, setRainfallAmount] = useState('28.5');
  const [sourceType, setSourceType] = useState('manual');

  useEffect(() => {
    async function loadRainfall() {
      try {
        const [latest, hist] = await Promise.all([
          rainfallService.getLatest(),
          rainfallService.getHistory()
        ]);
        setLatestData(latest);
        setHistory(hist || []);
      } catch (err) {
        console.error('Failed to load rainfall:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRainfall();
  }, []);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rainfallService.recordManual({
        station_id: stationName.toLowerCase().replace(/\s+/g, '_'),
        station_name: stationName,
        latitude: 12.935,
        longitude: 77.685,
        rainfall_mm: parseFloat(rainfallAmount),
        source_type: sourceType
      });
      setSubmitSuccess(true);
      setManualFormOpen(false);
      // Reload latest
      const updated = await rainfallService.getLatest();
      setLatestData(updated);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err) {
      console.error('Error submitting manual rainfall:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Fetching meteorological telemetry data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-800">Meteorological Telemetry & Rainfall Monitoring</h2>
          <p className="text-xs text-sky-800 font-medium mt-0.5">
            Automated sensor feeds from Karnataka State Natural Disaster Monitoring Centre (KSNDMC) & manual ingest
          </p>
        </div>
        <button
          onClick={() => setManualFormOpen(!manualFormOpen)}
          className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Record Rainfall Observation</span>
        </button>
      </div>

      {submitSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>New rainfall observation recorded. Road-segment risk values recalculated.</span>
        </div>
      )}

      {/* Manual Entry Modal Form */}
      {manualFormOpen && (
        <div className="bg-white/95 p-5 rounded-2xl border border-sky-200 shadow-md">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Record Manual / Simulated Rainfall Observation</h3>
          <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Station / Location Name</label>
              <input
                type="text"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Observed Rainfall (mm)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="250"
                value={rainfallAmount}
                onChange={(e) => setRainfallAmount(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Source Classification</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="manual">Manual Ground Truth Entry</option>
                <option value="simulated">Simulated Cloudburst Test</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Ingest Reading
              </button>
              <button
                type="button"
                onClick={() => setManualFormOpen(false)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Telemetry Sensor Station Cards */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Telemetry Stations & Latest Readings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {latestData?.stations?.map((st: any) => (
            <div
              key={st.station_id}
              className={`bg-white rounded-xl border p-4 shadow-2xs ${
                st.in_corridor ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-900 text-sm">{st.station_name}</span>
                <Radio className={`w-4 h-4 ${st.rainfall_1h_mm > 0 ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`} />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-2">
                {st.rainfall_1h_mm} <span className="text-xs font-normal text-slate-500">mm (1h)</span>
              </div>
              <div className="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-2">
                <div className="flex justify-between">
                  <span>3-Hour Accumulation:</span>
                  <span className="font-medium text-slate-700">{st.rainfall_3h_mm} mm</span>
                </div>
                <div className="flex justify-between">
                  <span>24-Hour Total:</span>
                  <span className="font-medium text-slate-700">{st.rainfall_24h_mm} mm</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[10px] pt-1">
                  <span>Source: {st.source}</span>
                  <span>{st.timestamp?.split(' ')[0]}</span>
                </div>
              </div>
              {st.in_corridor && (
                <div className="mt-2 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-sm inline-block">
                  Corridor Bordering Telemetry Station
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Historical Telemetry Observations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Historical Telemetry Readings Log</h3>
            <p className="text-xs text-slate-500">Hourly observations recorded in Karnataka telemetry archive</p>
          </div>
          <span className="text-xs text-slate-500">{history.length} records displayed</span>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider sticky top-0 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Station</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Hourly Rainfall (mm)</th>
                <th className="py-2.5 px-4">Latitude</th>
                <th className="py-2.5 px-4">Longitude</th>
                <th className="py-2.5 px-4">Severity Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {history.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="py-2 px-4 font-medium text-slate-900">{row.station_name}</td>
                  <td className="py-2 px-4 text-slate-600">{row.timestamp}</td>
                  <td className="py-2 px-4 font-bold text-slate-900">{row.rainfall_mm} mm</td>
                  <td className="py-2 px-4 text-slate-500">{row.latitude.toFixed(4)}° N</td>
                  <td className="py-2 px-4 text-slate-500">{row.longitude.toFixed(4)}° E</td>
                  <td className="py-2 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      row.rainfall_mm > 30 ? 'bg-rose-100 text-rose-700' :
                      row.rainfall_mm > 10 ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {row.rainfall_mm > 30 ? 'Intense Downpour' : row.rainfall_mm > 10 ? 'Moderate Rain' : 'Light / Dry'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

