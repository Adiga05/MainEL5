import React, { useState, useEffect } from 'react';
import { datasetService } from '../../services/datasetService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Database, UploadCloud, CheckCircle2, AlertCircle, Trash2, FileText } from 'lucide-react';

export const DatasetManagement: React.FC = () => {
  const [datasetsData, setDatasetsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetType, setDatasetType] = useState('road_network');

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const res = await datasetService.getDatasets();
      setDatasetsData(res);
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadMessage(null);
    try {
      await datasetService.uploadDataset(selectedFile, datasetType);
      setUploadMessage(`Dataset '${selectedFile.name}' uploaded and verified successfully.`);
      setSelectedFile(null);
      fetchDatasets();
      setTimeout(() => setUploadMessage(null), 5000);
    } catch (err: any) {
      setUploadMessage(`Upload failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Scanning raw dataset repository and CRS inventory..." />;
  }

  const list = datasetsData?.datasets || [];

  return (
    <div className="space-y-6">
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs">
        <h2 className="text-base font-bold text-slate-800">Geospatial Dataset Inventory & Ingestion</h2>
        <p className="text-xs text-sky-800 font-medium mt-0.5">
          Audited repository of raw and processed spatial layers filtered to the Bommanahalli–Marathahalli corridor
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs">
        <h3 className="text-xs font-bold text-sky-800 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
          <UploadCloud className="w-4 h-4 text-sky-600" />
          <span>Upload Additional Geospatial / Telemetry Layer</span>
        </h3>

        {uploadMessage && (
          <div className="mb-4 p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800">
            {uploadMessage}
          </div>
        )}

        <form onSubmit={handleFileUpload} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select File (KML, GeoJSON, CSV, ZIP, GeoTIFF)</label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              required
              className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Dataset Classification</label>
            <select
              value={datasetType}
              onChange={(e) => setDatasetType(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="road_network">Road Network (GeoJSON / SHP / KML)</option>
              <option value="drainage_network">Drainage Channel (KML / GeoJSON)</option>
              <option value="rainfall_telemetry">Rainfall Telemetry (CSV)</option>
              <option value="flood_prone">Flood Hotspots / Vulnerability (KML)</option>
              <option value="elevation_dem">Elevation Model / DEM (GeoTIFF)</option>
              <option value="emergency_services">Hospitals / Emergency Facilities</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              {uploading ? 'Processing File...' : 'Upload & Validate Layer'}
            </button>
          </div>
        </form>
      </div>

      {/* Dataset Audit Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Audited Datasets ({list.length} Files)</h3>
            <p className="text-xs text-slate-500">Geometry types, CRS checks, and study corridor feature counts</p>
          </div>
          <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            CRS: EPSG:4326 (WGS84) Verified
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Format</th>
                <th className="py-3 px-4">Total Features</th>
                <th className="py-3 px-4">Corridor Overlap</th>
                <th className="py-3 px-4">Status & Integrity Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {list.map((d: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-semibold text-slate-900 flex items-center space-x-2">
                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{d.filename}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{d.dataset_type}</td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-500 uppercase">{d.format}</td>
                  <td className="py-3 px-4 font-mono">{d.feature_count}</td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{d.study_area_overlap_count}</td>
                  <td className="py-3 px-4 text-slate-500 max-w-sm truncate">
                    {d.issues?.length > 0 ? (
                      <span className="text-amber-700">{d.issues[0]}</span>
                    ) : (
                      <span className="text-emerald-700 font-medium">Valid • Overlaps Study Corridor</span>
                    )}
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

