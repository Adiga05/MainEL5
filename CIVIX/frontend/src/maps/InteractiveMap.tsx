import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Marker,
  Popup,
  useMapEvents,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import { RiskLegend } from '../components/RiskLegend';
import { Layers, Eye, EyeOff } from 'lucide-react';

// Fix Leaflet standard icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface InteractiveMapProps {
  center?: [number, number];
  zoom?: number;
  roads?: any[];
  drainage?: any[];
  hospitals?: any[];
  floodProne?: any[];
  lowLying?: any[];
  vulnerablePoints?: any[];
  rainGauges?: any[];
  incidents?: any[];
  activeRoute?: any;
  alternativeRoute?: any;
  origin?: { lat: number; lon: number; label?: string };
  destination?: { lat: number; lon: number; label?: string };
  onMapClick?: (lat: number, lon: number) => void;
  height?: string;
  showLayerToggle?: boolean;
}

// Click listener inside Leaflet context
const MapClickHandler: React.FC<{ onMapClick?: (lat: number, lon: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

// Fit bounds helper
const FitBounds: React.FC<{ bounds?: L.LatLngBoundsExpression }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  center = [12.938, 77.675], // Bommanahalli–Marathahalli corridor center
  zoom = 13,
  roads = [],
  drainage = [],
  hospitals = [],
  floodProne = [],
  lowLying = [],
  vulnerablePoints = [],
  rainGauges = [],
  incidents = [],
  activeRoute,
  alternativeRoute,
  origin,
  destination,
  onMapClick,
  height = '600px',
  showLayerToggle = true,
}) => {
  // Layer visibility toggles
  const [layers, setLayers] = useState({
    roads: true,
    drainage: true,
    hospitals: true,
    floodProne: true,
    lowLying: true,
    vulnerablePoints: true,
    rainGauges: true,
    incidents: true,
  });

  const [panelOpen, setPanelOpen] = useState(false);

  const getRiskColor = (prob?: number, category?: string) => {
    // Pastel color palette for risk visualization
    if (category === 'very_high' || (prob && prob >= 0.75)) return '#f87171'; // Pastel Coral
    if (category === 'high' || (prob && prob >= 0.50)) return '#fb923c'; // Pastel Peach
    if (category === 'moderate' || (prob && prob >= 0.25)) return '#facc15'; // Pastel Yellow
    return '#4ade80'; // Pastel Mint/Green
  };

  const getDrainageColor = (type?: string) => {
    if (type === 'primary') return '#1d4ed8'; // Dark blue (Primary canal/SWD)
    if (type === 'secondary') return '#0284c7'; // Medium blue
    return '#38bdf8'; // Light sky blue
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onMapClick={onMapClick} />

        {/* 1. Drainage Layer */}
        {layers.drainage &&
          drainage.map((drain, idx) => {
            const coords = drain.geometry?.coordinates || [];
            if (!coords || coords.length < 2) return null;
            // Leaflet expects [lat, lon]
            const latlngs = coords.map((c: number[]) => [c[1], c[0]]);
            const dType = drain.properties?.drainage_type || 'primary';
            return (
              <Polyline
                key={`drain-${idx}`}
                positions={latlngs}
                pathOptions={{
                  color: getDrainageColor(dType),
                  weight: dType === 'primary' ? 4 : dType === 'secondary' ? 2.5 : 1.5,
                  opacity: 0.8,
                  dashArray: dType === 'tertiary' ? '4, 4' : undefined,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold text-blue-900 capitalize">{dType} Stormwater Drain</p>
                    <p className="text-slate-600">{drain.properties?.name || 'SWD / Raja Kaluve'}</p>
                    <p className="text-slate-500">Length: {drain.properties?.length_m}m</p>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

        {/* 2. Road Network & Risk Layer */}
        {layers.roads &&
          roads.map((road, idx) => {
            const coords = road.geometry?.coordinates || [];
            if (!coords || coords.length < 2) return null;
            const latlngs = coords.map((c: number[]) => [c[1], c[0]]);
            const prob = road.properties?.probability ?? 0.05;
            const cat = road.properties?.risk_category ?? 'low';
            const color = getRiskColor(prob, cat);
            const isBlocked = road.properties?.is_blocked;

            return (
              <Polyline
                key={`road-${road.id || idx}`}
                positions={latlngs}
                pathOptions={{
                  color: isBlocked ? '#0f172a' : color,
                  weight: isBlocked ? 5 : cat === 'very_high' ? 4.5 : cat === 'high' ? 3.5 : 2.5,
                  opacity: isBlocked ? 0.95 : 0.85,
                  dashArray: isBlocked ? '6, 6' : undefined,
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-slate-900">{road.properties?.road_name || 'Road Segment'}</p>
                    <p className="text-slate-600">Type: <span className="capitalize">{road.properties?.road_type}</span></p>
                    <p className="text-slate-600">Length: {road.properties?.length_m}m</p>
                    <div className="pt-1 border-t border-slate-100">
                      <span className="font-semibold">Disruption Risk: </span>
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white capitalize inline-block"
                        style={{ backgroundColor: color }}
                      >
                        {cat.replace('_', ' ')} ({(prob * 100).toFixed(0)}%)
                      </span>
                    </div>
                    {road.properties?.explanation && (
                      <p className="text-[11px] text-slate-500 italic mt-1">{road.properties.explanation}</p>
                    )}
                    {isBlocked && (
                      <p className="text-rose-600 font-bold text-[11px]">⚠️ VERIFIED ROAD CLOSURE</p>
                    )}
                  </div>
                </Popup>
              </Polyline>
            );
          })}

        {/* 3. Hospitals & Emergency Facilities */}
        {layers.hospitals &&
          hospitals.map((hosp, idx) => {
            const coords = hosp.geometry?.coordinates || [];
            if (coords.length < 2) return null;
            return (
              <CircleMarker
                key={`hosp-${idx}`}
                center={[coords[1], coords[0]]}
                radius={7}
                pathOptions={{
                  fillColor: '#dc2626',
                  color: '#ffffff',
                  weight: 2,
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-red-700">🏥 {hosp.properties?.name || 'Emergency Facility'}</p>
                    <p className="text-slate-600">{hosp.properties?.address}</p>
                    <p className="text-slate-500 mt-1">Emergency Care: {hosp.properties?.emergency_service || '24/7'}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* 4. Flood-Prone Points */}
        {layers.floodProne &&
          floodProne.map((pt, idx) => {
            const c = pt.geometry?.coordinates || [];
            if (c.length < 2) return null;
            return (
              <CircleMarker
                key={`fp-${idx}`}
                center={[c[1], c[0]]}
                radius={6}
                pathOptions={{ fillColor: '#ef4444', color: '#991b1b', weight: 1.5, fillOpacity: 0.85 }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold text-rose-700">⚠️ Flood-Prone Location</p>
                    <p className="text-slate-800">{pt.properties?.name}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* 5. Low-Lying Areas */}
        {layers.lowLying &&
          lowLying.map((pt, idx) => {
            const c = pt.geometry?.coordinates || [];
            if (c.length < 2) return null;
            return (
              <CircleMarker
                key={`ll-${idx}`}
                center={[c[1], c[0]]}
                radius={5}
                pathOptions={{ fillColor: '#f59e0b', color: '#b45309', weight: 1.5, fillOpacity: 0.8 }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold text-amber-700">Depression / Low-Lying Area</p>
                    <p className="text-slate-800">{pt.properties?.name}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* 6. Rain Gauge Stations */}
        {layers.rainGauges &&
          rainGauges.map((rg, idx) => {
            const c = rg.geometry?.coordinates || [];
            if (c.length < 2) return null;
            return (
              <CircleMarker
                key={`rg-${idx}`}
                center={[c[1], c[0]]}
                radius={6}
                pathOptions={{ fillColor: '#3b82f6', color: '#1d4ed8', weight: 2, fillOpacity: 0.9 }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold text-blue-700">📡 Rain Gauge Telemetry</p>
                    <p className="text-slate-800">{rg.properties?.name}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* 7. Reported Incidents */}
        {layers.incidents &&
          incidents.map((inc, idx) => {
            if (!inc.latitude || !inc.longitude) return null;
            const isVerified = inc.verification_status === 'verified';
            return (
              <CircleMarker
                key={`inc-${inc.id || idx}`}
                center={[inc.latitude, inc.longitude]}
                radius={8}
                pathOptions={{
                  fillColor: isVerified ? '#7f1d1d' : '#f97316',
                  color: '#ffffff',
                  weight: 2,
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-slate-900">
                      Incident #{inc.id}: <span className="capitalize">{inc.incident_type}</span>
                    </p>
                    <p className="text-slate-600">{inc.description || 'No additional details provided'}</p>
                    <p className="text-[11px] font-semibold text-slate-700">
                      Status: <span className="capitalize">{inc.verification_status}</span>
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* 8. Active Emergency Route (Recommended / Scenario Simulated) */}
        {activeRoute?.geometry?.coordinates && (
          <Polyline
            positions={activeRoute.geometry.coordinates.map((c: number[]) => [c[1], c[0]])}
            pathOptions={{ color: '#db2777', weight: 6, opacity: 0.95 }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-pink-700">{activeRoute.route_name}</p>
                <p>Distance: {activeRoute.total_distance_km} km</p>
                <p>Estimated Time: {activeRoute.total_time_minutes} mins</p>
                <p className="text-slate-500 mt-1">{activeRoute.recommendation_reason}</p>
              </div>
            </Popup>
          </Polyline>
        )}

        {/* 9. Alternative Safe Route / Baseline Route */}
        {alternativeRoute?.geometry?.coordinates && (
          <Polyline
            positions={alternativeRoute.geometry.coordinates.map((c: number[]) => [c[1], c[0]])}
            pathOptions={{ color: '#0284c7', weight: 5, opacity: 0.9, dashArray: '6, 6' }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-sky-700">{alternativeRoute.route_name}</p>
                <p>Distance: {alternativeRoute.total_distance_km} km</p>
                <p>Estimated Time: {alternativeRoute.total_time_minutes} mins</p>
              </div>
            </Popup>
          </Polyline>
        )}

        {/* 10. Origin Starting Point Pin */}
        {origin && origin.lat && origin.lon && (
          <CircleMarker
            center={[origin.lat, origin.lon]}
            radius={9}
            pathOptions={{
              fillColor: '#0284c7',
              color: '#ffffff',
              weight: 3,
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold text-sky-800">📍 Starting Point (Origin)</p>
                <p className="text-slate-700">{origin.label || 'Specified Origin'}</p>
                <p className="text-[10px] text-slate-400 font-mono">[{origin.lat.toFixed(4)}, {origin.lon.toFixed(4)}]</p>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* 11. Destination Target Pin */}
        {destination && destination.lat && destination.lon && (
          <CircleMarker
            center={[destination.lat, destination.lon]}
            radius={9}
            pathOptions={{
              fillColor: '#ec4899',
              color: '#ffffff',
              weight: 3,
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold text-pink-700">🎯 Destination</p>
                <p className="text-slate-700">{destination.label || 'Specified Destination'}</p>
                <p className="text-[10px] text-slate-400 font-mono">[{destination.lat.toFixed(4)}, {destination.lon.toFixed(4)}]</p>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {/* Floating Layer Control Button */}
      {showLayerToggle && (
        <div className="absolute top-4 right-4 z-10 flex flex-col items-end">
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="bg-white/95 backdrop-blur-xs px-3 py-2 rounded-lg border border-slate-200 shadow-md text-xs font-semibold text-slate-700 flex items-center space-x-1.5 hover:bg-slate-50 transition-colors"
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Map Layers</span>
          </button>

          {panelOpen && (
            <div className="mt-2 bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-slate-200 shadow-xl text-xs space-y-2 w-52">
              <div className="font-bold text-slate-800 border-b border-slate-100 pb-1">Toggle Layers</div>
              {Object.entries(layers).map(([key, val]) => (
                <label key={key} className="flex items-center justify-between cursor-pointer py-0.5 text-slate-700 hover:text-slate-900">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <RiskLegend />
      </div>
    </div>
  );
};

