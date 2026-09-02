import { api } from './apiClient';
import { User } from '../types/auth';

export interface ProfileUpdateData {
  bio: string;
  skills: string[];
  interests: string[];
  faculty: string;
  department: string;
  programme: string;
  collaborationOptIn: boolean;
}

export const profileService = {
  get: async (): Promise<User> => {
    const response = await api.get('/users/profile');
    const user = response.data.data;
    return { ...user, profilePicture: user.profilePictureUrl };
  },

  update: async (data: ProfileUpdateData): Promise<User> => {
    const response = await api.patch('/users/profile', data);
    const user = response.data.data;
    return { ...user, profilePicture: user.profilePictureUrl };
  },

  uploadPicture: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/upload/profile-picture', formData);
    const data = response.data.data;
    return { profilePicture: data.url, profilePictureUrl: data.url } as User;
  },
};
