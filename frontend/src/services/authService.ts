import { api } from './apiClient';
import { AuthResponse, RegisterData, LoginData, User } from '../types/auth';

export const authService = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  logoutAll: async (): Promise<void> => {
    await api.post('/auth/logout-all');
  },

  refresh: async (): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/refresh');
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<AuthResponse>('/auth/me');
    return response.data.user;
  },
};
