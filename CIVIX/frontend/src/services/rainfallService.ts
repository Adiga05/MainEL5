import api from './api';

export const rainfallService = {
  async getStations() {
    const res = await api.get('/rainfall/stations');
    return res.data;
  },

  async getLatest() {
    const res = await api.get('/rainfall/latest');
    return res.data;
  },

  async getHistory(stationId?: string) {
    const params = stationId ? { station_id: stationId } : {};
    const res = await api.get('/rainfall/history', { params });
    return res.data;
  },

  async recordManual(entry: {
    station_id: string;
    station_name: string;
    latitude: number;
    longitude: number;
    rainfall_mm: number;
    source_type?: string;
  }) {
    const res = await api.post('/rainfall/manual', entry);
    return res.data;
  }
};

