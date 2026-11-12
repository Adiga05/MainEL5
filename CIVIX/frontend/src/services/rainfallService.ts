import api from './api';

export const rainfallService = {
  async getLiveWeather() {
    try {
      // First attempt direct browser fetch to Open-Meteo for true real-time weather
      const directUrl =
        'https://api.open-meteo.com/v1/forecast?latitude=12.938&longitude=77.675&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&hourly=precipitation_probability,precipitation,rain&timezone=Asia%2FKolkata';
      const response = await fetch(directUrl);
      if (response.ok) {
        const data = await response.json();
        const current = data.current || {};
        const hourly = data.hourly || {};
        const precip = Number(current.precipitation ?? current.rain ?? 0.0);
        const precipHourly = hourly.precipitation || [];
        const rain1h = precipHourly.length > 0 ? Number(precipHourly[0]) : precip;
        const rain3h =
          precipHourly.slice(0, 3).reduce((acc: number, v: number) => acc + Number(v), 0) || Math.round(rain1h * 1.8 * 10) / 10;
        const wCode = Number(current.weather_code ?? 0);

        const conditionsMap: Record<number, string> = {
          0: 'Clear Sky',
          1: 'Mainly Clear',
          2: 'Partly Cloudy',
          3: 'Overcast',
          45: 'Foggy',
          48: 'Rime Fog',
          51: 'Light Drizzle',
          53: 'Moderate Drizzle',
          55: 'Dense Drizzle',
          61: 'Slight Rain',
          63: 'Moderate Rain',
          65: 'Heavy Rain Downpour',
          80: 'Rain Showers',
          81: 'Moderate Showers',
          82: 'Violent Showers',
          95: 'Thunderstorm'
        };

        return {
          status: 'success',
          is_live_telemetry: true,
          source: 'Open-Meteo Live Meteorological Telemetry (Bengaluru)',
          location: 'Bommanahalli–Marathahalli Corridor, Bengaluru',
          current_rainfall_mmh: Math.round(precip * 10) / 10,
          rainfall_1h_mm: Math.round(rain1h * 10) / 10,
          rainfall_3h_mm: Math.round(rain3h * 10) / 10,
          temperature_c: current.temperature_2m ?? 24.5,
          humidity_pct: current.relative_humidity_2m ?? 72,
          wind_speed_kmh: current.wind_speed_10m ?? 12,
          weather_code: wCode,
          condition: conditionsMap[wCode] || (precip > 0 ? 'Precipitation' : 'Partly Cloudy'),
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST'
        };
      }
    } catch {
      // Fallback to backend live-weather endpoint
    }

    const res = await api.get('/rainfall/live-weather');
    return res.data;
  },

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

