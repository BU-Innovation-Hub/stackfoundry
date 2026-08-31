import { api } from './apiClient';
import { AuthResponse, RegisterData, LoginData, User } from '../types/auth';

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

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

  changePassword: async (data: ChangePasswordData): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },

  // ---- Password Reset (OTP) ----

  requestPasswordReset: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  verifyResetOtp: async (email: string, otp: string): Promise<{ resetToken: string }> => {
    const response = await api.post('/auth/forgot-password/verify', { email, otp });
    return { resetToken: response.data.data.resetToken };
  },

  resetPassword: async (token: string, newPassword: string, confirmNewPassword: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/reset-password', { token, newPassword, confirmNewPassword });
    return response.data;
  },
};
