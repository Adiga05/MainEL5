import React, { useState, useEffect } from 'react';
import { incidentService, Incident } from '../../services/incidentService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, CheckCheck, Clock } from 'lucide-react';

export const IncidentManagement: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await incidentService.getIncidents(statusFilter === 'all' ? undefined : statusFilter);
      setIncidents(data);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  const handleVerify = async (id: number) => {
    try {
      await incidentService.verifyIncident(id, 'BBMP Assistant Executive Engineer', 'Confirmed waterlogging; road closure enforced.');
      setActionMessage(`Incident #${id} verified! Closure applied to emergency routing.`);
      fetchIncidents();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error('Error verifying incident:', err);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await incidentService.rejectIncident(id, 'Inspected by patrol; road is passable.');
      setActionMessage(`Incident #${id} rejected.`);
      fetchIncidents();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error('Error rejecting incident:', err);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await incidentService.resolveIncident(id, 'Water pumped out by municipal dewatering crew; road reopened.');
      setActionMessage(`Incident #${id} marked resolved! Road reopened in routing.`);
      fetchIncidents();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error('Error resolving incident:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/95 p-5 rounded-2xl border border-sky-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Incident Verification & Municipal Redressal</h2>
          <p className="text-xs text-sky-800 font-medium mt-0.5">
            Review driver hazard reports, confirm waterlogging closures, and dispatch dewatering teams
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-semibold">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-sky-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Incidents</option>
            <option value="under_verification">Under Verification</option>
            <option value="verified">Verified Closures</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 font-medium shadow-2xs">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Fetching incident logs..." />
      ) : (
        <div className="bg-white/95 rounded-2xl border border-sky-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Hazard Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Reported By</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Municipal Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {incidents.length > 0 ? (
                  incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900">#{inc.id}</td>
                      <td className="py-3 px-4 font-medium text-slate-800 capitalize flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>{inc.incident_type.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                        {inc.description || 'Road obstruction reported'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{inc.reported_by}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {inc.reported_at ? new Date(inc.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          inc.verification_status === 'verified' ? 'bg-rose-100 text-rose-800' :
                          inc.verification_status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                          inc.verification_status === 'rejected' ? 'bg-slate-100 text-slate-600' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {inc.verification_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {inc.verification_status === 'under_verification' && (
                          <>
                            <button
                              onClick={() => handleVerify(inc.id)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[11px] font-semibold transition-colors"
                            >
                              Verify & Close
                            </button>
                            <button
                              onClick={() => handleReject(inc.id)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[11px] font-semibold transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {inc.verification_status === 'verified' && (
                          <button
                            onClick={() => handleResolve(inc.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold transition-colors"
                          >
                            Mark Reopened
                          </button>
                        )}
                        {(inc.verification_status === 'resolved' || inc.verification_status === 'rejected') && (
                          <span className="text-slate-400 text-[11px] italic">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No incidents matching the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

