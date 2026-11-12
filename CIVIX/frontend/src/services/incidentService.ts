import api from './api';

export interface Incident {
  id: number;
  road_id?: number;
  incident_type: string;
  description?: string;
  reported_by?: string;
  reported_at?: string;
  verification_status: 'reported' | 'under_verification' | 'verified' | 'rejected' | 'resolved';
  resolution_status?: string;
  latitude: number;
  longitude: number;
  verified_by?: string;
  verified_at?: string;
  comments?: string;
}

export const incidentService = {
  async getIncidents(status?: string): Promise<Incident[]> {
    const params = status ? { status_filter: status } : {};
    const res = await api.get<Incident[]>('/incidents', { params });
    return res.data;
  },

  async reportIncident(data: {
    road_id?: number;
    incident_type: string;
    description?: string;
    reported_by?: string;
    latitude: number;
    longitude: number;
  }) {
    const res = await api.post('/incidents', data);
    return res.data;
  },

  async verifyIncident(incidentId: number, verifiedBy: string = 'BBMP Engineer', comments?: string) {
    const res = await api.patch(`/incidents/${incidentId}/verify`, {
      verified_by: verifiedBy,
      comments: comments
    });
    return res.data;
  },

  async rejectIncident(incidentId: number, reason?: string) {
    const res = await api.patch(`/incidents/${incidentId}/reject`, null, {
      params: { reason }
    });
    return res.data;
  },

  async resolveIncident(incidentId: number, comments?: string) {
    const res = await api.patch(`/incidents/${incidentId}/resolve`, {
      resolution_status: 'resolved',
      comments: comments
    });
    return res.data;
  }
};

