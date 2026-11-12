import api from './api';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'driver';
  created_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', { username, password });
    localStorage.setItem('auth_token', response.data.access_token);
    localStorage.setItem('auth_user', JSON.stringify(response.data.user));
    return response.data;
  },

  async register(username: string, password: string, role: string = 'driver'): Promise<User> {
    const response = await api.post<User>('/auth/register', { username, password, role });
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
  },

  getStoredUser(): User | null {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  },
};
