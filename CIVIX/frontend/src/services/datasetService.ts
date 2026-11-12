import api from './api';

export const datasetService = {
  async getDatasets() {
    const res = await api.get('/datasets');
    return res.data;
  },

  async uploadDataset(file: File, datasetType: string = 'road_network') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataset_type', datasetType);
    const res = await api.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  async deleteDataset(id: number) {
    const res = await api.delete(`/datasets/${id}`);
    return res.data;
  }
};

