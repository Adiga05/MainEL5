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
  thirdRoute?: any;
  routes?: any[];
  selectedRouteIndex?: number;
  onSelectRoute?: (index: number) => void;
  origin?: { lat: number; lon: number; label?: string };
  destination?: { lat: number; lon: number; label?: string };
  onMapClick?: (lat: number, lon: number) => void;
  height?: string;
  showLayerToggle?: boolean;
  routesOnly?: boolean;
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
  thirdRoute,
  routes,
  selectedRouteIndex,
  onSelectRoute,
  origin,
  destination,
  onMapClick,
  height = '600px',
  showLayerToggle = true,
  routesOnly = false,
}) => {
  // Aggregate routes (supports either `routes` array or individual props)
  const routeList = routes && routes.length > 0 
    ? routes 
    : [activeRoute, alternativeRoute, thirdRoute].filter(Boolean);

  // Compute bounding box for auto-framing
  const allRouteCoords: [number, number][] = [];
  if (origin?.lat && origin?.lon) allRouteCoords.push([origin.lat, origin.lon]);
  if (destination?.lat && destination?.lon) allRouteCoords.push([destination.lat, destination.lon]);
  routeList.forEach((r) => {
    if (r?.geometry?.coordinates) {
      r.geometry.coordinates.forEach((c: number[]) => {
        allRouteCoords.push([c[1], c[0]]);
      });
    }
  });
  const routeBounds = allRouteCoords.length > 1 ? L.latLngBounds(allRouteCoords) : undefined;
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
        {routeBounds && <FitBounds bounds={routeBounds} />}

        {/* 1. Drainage Layer */}
        {!routesOnly && layers.drainage &&
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
        {!routesOnly && layers.roads &&
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
        {!routesOnly && layers.hospitals &&
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
        {!routesOnly && layers.floodProne &&
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
        {!routesOnly && layers.lowLying &&
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
        {!routesOnly && layers.rainGauges &&
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
        {!routesOnly && layers.incidents &&
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

        {/* 8. Candidate Emergency Routes (Top 2-3 Routes) */}
        {routeList.map((route, idx) => {
          if (!route?.geometry?.coordinates) return null;
          const isSelected = selectedRouteIndex === idx;
          const defaultColors = ['#2563eb', '#0891b2', '#d97706', '#7c3aed'];
          const strokeColor = route.color || defaultColors[idx % defaultColors.length];
          const weight = isSelected ? 8 : (idx === 0 ? 6 : 5);
          const opacity = isSelected ? 1.0 : (selectedRouteIndex !== undefined ? 0.7 : 0.9);
          const dashArray = idx === 0 ? undefined : (idx === 1 ? '7, 6' : '4, 6');

          return (
            <Polyline
              key={`route-poly-${route.id || idx}`}
              positions={route.geometry.coordinates.map((c: number[]) => [c[1], c[0]])}
              pathOptions={{ color: strokeColor, weight, opacity, dashArray }}
              eventHandlers={{
                click: () => onSelectRoute && onSelectRoute(idx),
              }}
            >
              <Popup>
                <div className="text-xs space-y-1.5 min-w-[200px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="font-bold text-slate-900">{route.route_name || `Route ${idx + 1}`}</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{ backgroundColor: `${strokeColor}20`, color: strokeColor }}
                    >
                      {route.badge || `Option ${idx + 1}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 py-1 text-center bg-slate-50 rounded-lg">
                    <div>
                      <div className="text-[9px] text-slate-400">Distance</div>
                      <div className="font-bold text-slate-800">{route.total_distance_km} km</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400">Duration</div>
                      <div className="font-bold text-slate-800">{route.total_time_minutes} min</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400">Risk</div>
                      <div className="font-bold text-emerald-600">
                        {((route.average_risk_probability || 0) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  {route.recommendation_reason && (
                    <p className="text-slate-600 text-[10px] leading-tight">{route.recommendation_reason}</p>
                  )}
                  {route.warnings?.length > 0 && (
                    <div className="p-1.5 bg-amber-50 rounded text-amber-800 text-[10px]">
                      ⚠️ {route.warnings[0]}
                    </div>
                  )}
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* 9. Origin Starting Point Pin */}
        {origin && origin.lat && origin.lon && (
          <CircleMarker
            center={[origin.lat, origin.lon]}
            radius={9}
            pathOptions={{
              fillColor: '#16a34a',
              color: '#ffffff',
              weight: 3,
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold text-emerald-700">🟢 Origin (Source)</p>
                <p className="text-slate-700 font-semibold">{origin.label || 'Specified Starting Location'}</p>
                <p className="text-[10px] text-slate-400 font-mono">[{origin.lat.toFixed(4)}, {origin.lon.toFixed(4)}]</p>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* 10. Destination Target Pin */}
        {destination && destination.lat && destination.lon && (
          <CircleMarker
            center={[destination.lat, destination.lon]}
            radius={9}
            pathOptions={{
              fillColor: '#dc2626',
              color: '#ffffff',
              weight: 3,
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold text-rose-700">🔴 Destination</p>
                <p className="text-slate-700 font-semibold">{destination.label || 'Specified Destination'}</p>
                <p className="text-[10px] text-slate-400 font-mono">[{destination.lat.toFixed(4)}, {destination.lon.toFixed(4)}]</p>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {/* Floating Layer Control Button (Hidden in routes-only clean navigation mode) */}
      {!routesOnly && showLayerToggle && (
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

      {/* Floating Legend: Clean Route Legend in routesOnly mode, else Standard Risk Legend */}
      {routesOnly ? (
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-sky-100 shadow-md text-xs space-y-2 max-w-xs">
          <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center justify-between">
            <span>Navigation Routes ({routeList.length})</span>
            <span className="text-[10px] text-emerald-700 font-semibold">Clean View</span>
          </div>
          <div className="space-y-1 text-[11px]">
            {routeList.map((r, i) => {
              const defaultColors = ['#2563eb', '#0891b2', '#d97706', '#7c3aed'];
              const c = r.color || defaultColors[i % defaultColors.length];
              const isSel = selectedRouteIndex === i;
              return (
                <div
                  key={i}
                  onClick={() => onSelectRoute && onSelectRoute(i)}
                  className={`flex items-center justify-between p-1 rounded cursor-pointer transition-colors ${
                    isSel ? 'bg-sky-50 font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-3.5 h-1 rounded" style={{ backgroundColor: c }}></span>
                    <span className="text-slate-800 truncate">{r.badge || `Route ${i + 1}`}</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">{r.total_time_minutes}m • {r.total_distance_km}km</span>
                </div>
              );
            })}
          </div>
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600 font-medium">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
              <span>Source Pin</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
              <span>Destination Pin</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-4 left-4 z-10">
          <RiskLegend />
        </div>
      )}
    </div>
  );
};

