// ============================================
// Admin Service Layer
// Currently uses mock data. To connect backend:
//   1. Import apiClient instead of mockData
//   2. Replace function bodies with API calls
//   3. Keep the same function signatures
// ============================================

import { Member, Event, Course, DashboardStats } from '../types/admin';
import { BlogPost, IBlog } from '../types/blog';
import { mockEvents, mockCourses, mockDashboardStats } from './mockData';
import { api as apiClient } from './apiClient';

// Simulate async delay (remove when using real API)
const delay = (ms = 300) => new Promise(res => setTimeout(res, ms));

// ---- Dashboard ----
export const getDashboardStats = async (): Promise<DashboardStats> => {
  await delay();
  return { ...mockDashboardStats };
  // TODO: return (await apiClient.get('/admin/dashboard')).data;
};

// ---- Members ----

/** Map backend user object to frontend Member shape */
const mapUserToMember = (user: any): Member => ({
  id: user._id || user.id,
  studentId: user.studentId,
  name: user.name,
  surname: user.surname,
  email: user.email,
  role: user.roles?.[0]?.name || user.role || 'student',
  isActive: user.isActive,
  joinedAt: user.createdAt,
  lastLogin: user.lastLogin,
});

export const getMembers = async (): Promise<Member[]> => {
  const response = await apiClient.get('/admin/users', { params: { limit: 200 } });
  return response.data.data.users.map(mapUserToMember);
};

export const updateMemberRole = async (id: string, role: Member['role']): Promise<Member> => {
  const response = await apiClient.patch(`/admin/users/${id}/role`, { role });
  return { ...response.data.data, id } as Member;
};

export const toggleMemberStatus = async (id: string): Promise<{ id: string; isActive: boolean }> => {
  const response = await apiClient.patch(`/admin/users/${id}/toggle-active`);
  return response.data.data;
};

export const deleteMember = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/users/${id}`);
};

/** Admin-only: create a new user with a role */
export interface CreateMemberData {
  studentId: string;
  email: string;
  password: string;
  name: string;
  surname: string;
  role: Member['role'];
}

export const createMember = async (data: CreateMemberData): Promise<Member> => {
  const response = await apiClient.post('/admin/users', data);
  return response.data.data as Member;
};

// ---- Blogs ----
const mapBackendToBlogPost = (blog: IBlog): BlogPost => ({
  ...blog,
  // We can keep an 'id' alias if needed, but components are being updated to use _id
});

export const getBlogs = async (): Promise<BlogPost[]> => {
  const response = await apiClient.get('/blogs/admin');
  return response.data.data.map(mapBackendToBlogPost);
};

export const createBlog = async (data: any): Promise<BlogPost> => {
  try {
    const response = await apiClient.post('/blogs', data);
    return mapBackendToBlogPost(response.data.data);
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.error('Blog creation validation failed:', error.response.data);
    }
    throw error;
  }
};

export const updateBlog = async (id: string, data: any): Promise<BlogPost> => {
  const response = await apiClient.put(`/blogs/${id}`, data);
  return mapBackendToBlogPost(response.data.data);
};

export const deleteBlog = async (id: string): Promise<void> => {
  await apiClient.delete(`/blogs/${id}`);
};

// ---- Events ----
export const getEvents = async (): Promise<Event[]> => {
  await delay();
  return [...mockEvents];
  // TODO: return (await apiClient.get('/admin/events')).data;
};

export const createEvent = async (data: Omit<Event, 'id' | 'registered' | 'createdAt'>): Promise<Event> => {
  await delay();
  const event: Event = {
    ...data,
    id: String(Date.now()),
    registered: 0,
    createdAt: new Date().toISOString(),
  };
  mockEvents.push(event);
  return event;
  // TODO: return (await apiClient.post('/admin/events', data)).data;
};

export const updateEvent = async (id: string, data: Partial<Event>): Promise<Event> => {
  await delay();
  const event = mockEvents.find(e => e.id === id);
  if (!event) throw new Error('Event not found');
  Object.assign(event, data);
  return { ...event };
  // TODO: return (await apiClient.put(`/admin/events/${id}`, data)).data;
};

export const deleteEvent = async (id: string): Promise<void> => {
  await delay();
  const idx = mockEvents.findIndex(e => e.id === id);
  if (idx !== -1) mockEvents.splice(idx, 1);
  // TODO: await apiClient.delete(`/admin/events/${id}`);
};

// ---- Courses ----
export const getCourses = async (): Promise<Course[]> => {
  await delay();
  return [...mockCourses];
  // TODO: return (await apiClient.get('/admin/courses')).data;
};

export const createCourse = async (data: Omit<Course, 'id' | 'enrolledCount' | 'completionRate' | 'createdAt' | 'updatedAt'>): Promise<Course> => {
  await delay();
  const course: Course = {
    ...data,
    id: String(Date.now()),
    enrolledCount: 0,
    completionRate: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockCourses.push(course);
  return course;
  // TODO: return (await apiClient.post('/admin/courses', data)).data;
};

export const updateCourse = async (id: string, data: Partial<Course>): Promise<Course> => {
  await delay();
  const course = mockCourses.find(c => c.id === id);
  if (!course) throw new Error('Course not found');
  Object.assign(course, data, { updatedAt: new Date().toISOString() });
  return { ...course };
  // TODO: return (await apiClient.put(`/admin/courses/${id}`, data)).data;
};

export const deleteCourse = async (id: string): Promise<void> => {
  await delay();
  const idx = mockCourses.findIndex(c => c.id === id);
  if (idx !== -1) mockCourses.splice(idx, 1);
  // TODO: await apiClient.delete(`/admin/courses/${id}`);
};
