export type RoleName =
  | 'student'
  | 'system_admin'
  | 'innovation_hub_admin'
  | 'mentor'
  | 'member';

export interface User {
  id: string;
  studentId?: string;
  email: string;
  name: string;
  surname: string;
  role: RoleName;
  bio?: string;
  skills?: string[];
  interests?: string[];
  faculty?: string;
  department?: string;
  programme?: string;
  collaborationOptIn?: boolean;
  profilePicture?: string;
  profilePictureUrl?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
}

export interface AuthError {
  success: false;
  error: string;
  details?: string[];
  code?: string;
}

export interface RegisterData {
  studentId: string;
  email: string;
  password: string;
  name: string;
  surname: string;
}

export interface LoginData {
  email: string;
  password: string;
}
