import api from './api';

export const dashboardService = {
  async getOverview() {
    const res = await api.get('/dashboard/overview');
    return res.data;
  },

  async getModelPerformance() {
    const res = await api.get('/model/performance');
    return res.data;
  },

  async getModelStatus() {
    const res = await api.get('/model/status');
    return res.data;
  }
};

