import api from './api';

export const gisService = {
  async getStudyArea() {
    const res = await api.get('/gis/study-area');
    return res.data;
  },

  async getDrainage(type?: string) {
    const params = type ? { drainage_type: type } : {};
    const res = await api.get('/gis/drainage', { params });
    return res.data;
  },

  async getRoads() {
    const res = await api.get('/gis/roads');
    return res.data;
  },

  async getHospitals() {
    const res = await api.get('/gis/hospitals');
    return res.data;
  },

  async getFloodProne() {
    const res = await api.get('/gis/flood-prone');
    return res.data;
  },

  async getLowLying() {
    const res = await api.get('/gis/low-lying');
    return res.data;
  },

  async getVulnerablePoints() {
    const res = await api.get('/gis/vulnerable-points');
    return res.data;
  },

  async getRainGauges() {
    const res = await api.get('/gis/rain-gauges');
    return res.data;
  },

  async getComplaints() {
    const res = await api.get('/gis/complaints');
    return res.data;
  },

  async getRoadRisk(rainfall1h: number = 0.0, rainfall3h: number = 0.0, isSimulated: boolean = false) {
    const res = await api.get('/gis/road-risk', {
      params: {
        rainfall_1h_mm: rainfall1h,
        rainfall_3h_mm: rainfall3h,
        rainfall_intensity_mmh: rainfall1h,
        is_simulated: isSimulated
      }
    });
    return res.data;
  }
};

