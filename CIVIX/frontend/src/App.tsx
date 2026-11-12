import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { AdminLayout } from './layouts/AdminLayout';
import { DriverLayout } from './layouts/DriverLayout';

// Admin Pages
import { Overview } from './pages/admin/Overview';
import { LiveRiskMap } from './pages/admin/LiveRiskMap';
import { RainfallMonitoring } from './pages/admin/RainfallMonitoring';
import { RoadNetwork } from './pages/admin/RoadNetwork';
import { DrainageInfrastructure } from './pages/admin/DrainageInfrastructure';
import { IncidentManagement } from './pages/admin/IncidentManagement';
import { EmergencyRouting } from './pages/admin/EmergencyRouting';
import { CriticalLinks } from './pages/admin/CriticalLinks';
import { ScenarioAnalysis } from './pages/admin/ScenarioAnalysis';
import { DatasetManagement } from './pages/admin/DatasetManagement';
import { ModelPerformance } from './pages/admin/ModelPerformance';
import { Settings } from './pages/admin/Settings';

// Driver Pages
import { DriverRouting } from './pages/driver/DriverRouting';
import { DriverMap } from './pages/driver/DriverMap';
import { ReportIncident } from './pages/driver/ReportIncident';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Admin / Municipal Authority Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="live-risk-map" element={<LiveRiskMap />} />
        <Route path="rainfall-monitoring" element={<RainfallMonitoring />} />
        <Route path="road-network" element={<RoadNetwork />} />
        <Route path="drainage-infrastructure" element={<DrainageInfrastructure />} />
        <Route path="incident-management" element={<IncidentManagement />} />
        <Route path="emergency-routing" element={<EmergencyRouting />} />
        <Route path="critical-links" element={<CriticalLinks />} />
        <Route path="scenario-analysis" element={<ScenarioAnalysis />} />
        <Route path="dataset-management" element={<DatasetManagement />} />
        <Route path="model-performance" element={<ModelPerformance />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Emergency Vehicle / Driver Routes */}
      <Route path="/driver" element={<DriverLayout />}>
        <Route index element={<Navigate to="/driver/routing" replace />} />
        <Route path="routing" element={<DriverRouting />} />
        <Route path="map" element={<DriverMap />} />
        <Route path="report" element={<ReportIncident />} />
      </Route>

      {/* Default fallback */}
      <Route path="/" element={<Navigate to="/admin/overview" replace />} />
      <Route path="*" element={<Navigate to="/admin/overview" replace />} />
    </Routes>
  );
};

export default App;

