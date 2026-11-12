import api from './api';

export interface ScenarioRunParams {
  scenario_name: string;
  rainfall_1h_mm: number;
  rainfall_3h_mm?: number;
  closed_road_ids?: number[];
  description?: string;
  origin_lon?: number;
  origin_lat?: number;
  dest_lon?: number;
  dest_lat?: number;
  origin_name?: string;
  dest_name?: string;
}

export const scenarioService = {
  async runScenario(params: ScenarioRunParams) {
    const res = await api.post('/scenarios/run', params);
    return res.data;
  }
};
