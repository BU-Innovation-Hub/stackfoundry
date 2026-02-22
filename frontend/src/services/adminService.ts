// ============================================
// Admin Service Layer
// Connected to backend API. Courses remain mock.
// ============================================

import { Member, Event, Course, DashboardStats } from '../types/admin';
import { BlogPost, IBlog } from '../types/blog';
import { mockCourses } from './mockData';
import { api as apiClient } from './apiClient';

// Simulate async delay (only for mock courses)
const delay = (ms = 300) => new Promise(res => setTimeout(res, ms));

// ---- Dashboard ----
export const getDashboardStats = async (): Promise<DashboardStats> => {
  // Fetch real data from multiple endpoints in parallel
  const [dashRes, blogStatsRes, eventStatsRes, membersRes] = await Promise.all([
    apiClient.get('/admin/dashboard'),
    apiClient.get('/blogs/stats').catch(() => ({ data: { data: { total: 0, published: 0 } } })),
    apiClient.get('/events/stats').catch(() => ({ data: { data: { total: 0, upcoming: 0 } } })),
    apiClient.get('/admin/users?limit=4').catch(() => ({ data: { data: { users: [], pagination: { total: 0 } } } })),
  ]);

  const adminStats = dashRes.data.data.stats;
  const blogStats = blogStatsRes.data.data;
  const eventStats = eventStatsRes.data.data;
  const usersData = membersRes.data.data;

  // Map backend users to Member type for recent registrations
  const recentMembers: Member[] = (usersData.users || []).map((u: any) => ({
    id: u._id,
    studentId: u.studentId,
    name: u.name,
    surname: u.surname,
    email: u.email,
    role: u.roles?.[0]?.name || 'student',
    isActive: u.isActive,
    joinedAt: u.createdAt,
    lastLogin: u.lastLogin,
  }));

  return {
    totalMembers: adminStats.totalUsers || 0,
    activeMembers: adminStats.activeUsers || 0,
    totalBlogs: blogStats.total || 0,
    publishedBlogs: blogStats.published || 0,
    totalEvents: eventStats.total || 0,
    upcomingEvents: eventStats.upcoming || 0,
    totalCourses: mockCourses.length,
    publishedCourses: mockCourses.filter(c => c.status === 'published').length,
    recentRegistrations: recentMembers,
    popularCourses: mockCourses.filter(c => c.status === 'published').sort((a, b) => b.enrolledCount - a.enrolledCount).slice(0, 3),
  };
};

// ---- Members ----
export const getMembers = async (): Promise<Member[]> => {
  const response = await apiClient.get('/admin/users?limit=100');
  return (response.data.data.users || []).map((u: any) => ({
    id: u._id,
    studentId: u.studentId,
    name: u.name,
    surname: u.surname,
    email: u.email,
    role: u.roles?.[0]?.name || 'student',
    isActive: u.isActive,
    joinedAt: u.createdAt,
    lastLogin: u.lastLogin,
  }));
};

export const updateMemberRole = async (id: string, role: Member['role']): Promise<Member> => {
  // Backend doesn't have a role update endpoint yet — keep local update
  const members = await getMembers();
  const member = members.find(m => m.id === id);
  if (!member) throw new Error('Member not found');
  member.role = role;
  return member;
};

export const toggleMemberStatus = async (id: string): Promise<Member> => {
  // Toggle active status
  await apiClient.patch(`/admin/users/${id}/toggle-active`);
  // Re-fetch the full user to return updated data
  const response = await apiClient.get(`/admin/users/${id}`);
  const u = response.data.data;
  return {
    id: u._id,
    studentId: u.studentId,
    name: u.name,
    surname: u.surname,
    email: u.email,
    role: u.roles?.[0]?.name || 'student',
    isActive: u.isActive,
    joinedAt: u.createdAt,
    lastLogin: u.lastLogin,
  };
};

export const deleteMember = async (id: string): Promise<void> => {
  // Note: No backend delete endpoint yet — toggle inactive instead
  await apiClient.patch(`/admin/users/${id}/toggle-active`);
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
  const response = await apiClient.get('/events/admin');
  return response.data.data.map((e: any) => ({ ...e, id: e._id }));
};

export const createEvent = async (data: any): Promise<Event> => {
  const response = await apiClient.post('/events', data);
  const event = response.data.data;
  return { ...event, id: event._id };
};

export const updateEvent = async (id: string, data: Partial<Event>): Promise<Event> => {
  const response = await apiClient.put(`/events/${id}`, data);
  const event = response.data.data;
  return { ...event, id: event._id };
};

export const deleteEvent = async (id: string): Promise<void> => {
  await apiClient.delete(`/events/${id}`);
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
