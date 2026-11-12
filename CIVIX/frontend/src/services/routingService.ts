import api from './api';

export interface RouteRequest {
  origin_lon: number;
  origin_lat: number;
  dest_lon: number;
  dest_lat: number;
  risk_weight?: number;
  vehicle_type?: string;
  rainfall_1h_mm?: number;
}

export const routingService = {
  async getRecommendedRoute(req: RouteRequest) {
    const res = await api.post('/routes/recommend', req);
    return res.data;
  },

  async getCriticalLinks() {
    const res = await api.get('/routes/critical-links');
    return res.data;
  }
};

