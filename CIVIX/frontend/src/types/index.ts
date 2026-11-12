// ========== GIS Types ==========
export interface Road {
  id: number;
  osm_id?: string;
  road_name: string;
  road_type: string;
  geometry_json: GeoJSON.Geometry | null;
  length_m: number;
  lat: number;
  lon: number;
  centroid_lat?: number;
  centroid_lon?: number;
  risk_probability?: number;
  risk_category?: RiskCategory;
}

export type RiskCategory = 'low' | 'moderate' | 'high' | 'very_high';

export interface Drainage {
  id: number;
  drainage_type: 'primary' | 'secondary' | 'tertiary';
  geometry_json: GeoJSON.Geometry | null;
  attributes_json?: Record<string, unknown>;
  source_file?: string;
}

export interface RainfallObservation {
  id: number;
  station_id: string;
  station_name: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  rainfall_mm: number;
  source: 'observed' | 'manual' | 'simulated' | 'forecast';
  quality_flag?: string;
}

export interface RainfallStation {
  id: number;
  station_id: string;
  station_name: string;
  latitude: number;
  longitude: number;
  source?: string;
}

export interface Complaint {
  id: number;
  complaint_id_original?: string;
  category: string;
  sub_category?: string;
  complaint_date?: string;
  ward_name?: string;
  status?: string;
  latitude: number;
  longitude: number;
  source_file?: string;
  year?: number;
}

export interface Prediction {
  id: number;
  road_id: number;
  prediction_timestamp: string;
  prediction_horizon?: string;
  probability: number;
  risk_category: RiskCategory;
  model_version?: string;
}

export type IncidentType = 'waterlogging' | 'blocked' | 'partial' | 'drainage_overflow' | 'other';
export type VerificationStatus = 'reported' | 'under_verification' | 'verified' | 'rejected' | 'resolved';

export interface Incident {
  id: number;
  road_id?: number;
  incident_type: IncidentType;
  description?: string;
  reported_by?: number;
  reported_at: string;
  verification_status: VerificationStatus;
  resolution_status?: string;
  latitude: number;
  longitude: number;
  photo_path?: string;
  verified_by?: number;
  verified_at?: string;
  comments?: string;
  road_name?: string;
}

export interface Hospital {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  category?: string;
  osm_id?: string;
  address?: string;
}

export interface FloodProneLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  source_file?: string;
}

export interface LowLyingArea {
  id: number;
  name: string;
  geometry_json: GeoJSON.Geometry | null;
  source_file?: string;
}

export interface VulnerablePoint {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  source_file?: string;
}

// ========== Routing Types ==========
export interface Route {
  path: [number, number][];
  distance_m: number;
  estimated_time_min: number;
  risk_exposure: number;
  high_risk_segments: number;
  road_ids: number[];
  warnings?: RouteWarning[];
}

export interface RouteWarning {
  road_id: number;
  road_name: string;
  risk_category: RiskCategory;
  message: string;
}

// ========== Scenario Types ==========
export interface Scenario {
  id: number;
  name: string;
  description?: string;
  scenario_type: string;
  parameters_json: Record<string, unknown>;
  results_json?: ScenarioResults;
  created_at: string;
  created_by?: number;
}

export interface ScenarioResults {
  affected_roads: number;
  high_risk_roads: number;
  affected_hospitals: string[];
  critical_links: number[];
  risk_distribution: Record<RiskCategory, number>;
}

// ========== User & Auth Types ==========
export interface User {
  id: number;
  username: string;
  role: 'admin' | 'driver';
  created_at?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ========== Dataset Types ==========
export interface Dataset {
  id: number;
  filename: string;
  original_filename: string;
  dataset_type: string;
  upload_timestamp: string;
  processing_status: 'uploaded' | 'processing' | 'processed' | 'error';
  metadata_json?: DatasetMetadata;
  file_path?: string;
}

export interface DatasetMetadata {
  columns?: string[];
  missing_values?: Record<string, number>;
  geometry_type?: string;
  feature_count?: number;
  coverage?: string;
}

// ========== Dashboard Types ==========
export interface DashboardOverview {
  total_roads: number;
  high_risk_roads: number;
  active_incidents: number;
  verified_closures: number;
  total_hospitals: number;
  critical_roads: number;
  rainfall_summary?: RainfallSummary;
  recent_incidents: Incident[];
  risk_distribution: Record<RiskCategory, number>;
}

export interface RainfallSummary {
  latest_rainfall_mm: number;
  average_24h: number;
  max_24h: number;
  station_count: number;
  last_update?: string;
}

// ========== Model Types ==========
export interface ModelPerformance {
  model_name: string;
  training_timestamp: string;
  metrics: ModelMetrics;
  feature_importance: FeatureImportance[];
  confusion_matrix?: number[][];
  dataset_stats?: DatasetStats;
  is_active: boolean;
}

export interface ModelMetrics {
  precision: number;
  recall: number;
  f1_score: number;
  pr_auc: number;
  accuracy?: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface DatasetStats {
  total_samples: number;
  positive_samples: number;
  negative_samples: number;
  features_count: number;
}

// ========== GeoJSON Feature Collections ==========
export interface RoadFeature extends GeoJSON.Feature {
  properties: {
    id: number;
    road_name: string;
    road_type: string;
    length_m: number;
    risk_probability?: number;
    risk_category?: RiskCategory;
    nearby_drains?: number;
    complaints_count?: number;
  };
}

export interface DrainageFeature extends GeoJSON.Feature {
  properties: {
    id: number;
    drainage_type: string;
    [key: string]: unknown;
  };
}

// ========== Critical Links ==========
export interface CriticalLink {
  road_id: number;
  road_name: string;
  betweenness_centrality: number;
  hospital_accessibility_impact: number;
  geometry_json?: GeoJSON.Geometry;
}

// ========== API Response Types ==========
export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}
