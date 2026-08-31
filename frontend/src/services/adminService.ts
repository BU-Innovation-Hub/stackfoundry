// ============================================
// Admin Service Layer
// Connected to backend API. All data is live — no mock fallbacks.
// ============================================

import { Member, Event, Course, DashboardStats } from '../types/admin';
import { BlogPost, IBlog } from '../types/blog';
import { api as apiClient } from './apiClient';
import { RoleName } from '../types/auth';
import { LmsCourse } from '../types/lms';

// ---- Dashboard ----

/**
 * Map a live LMS course (with real enrolledCount from the backend) to the
 * legacy admin Course shape used by the dashboard's "Popular Courses" card.
 * Fields the LMS backend does not track (language, completionRate, etc.)
 * are filled with honest defaults — never fabricated numbers.
 */
const mapLmsCourseToAdminCourse = (c: LmsCourse): Course => ({
  id: c._id,
  title: c.title,
  description: c.description || '',
  coverImage: c.coverImage || '',
  language: '',
  framework: undefined,
  level: 'beginner',
  duration: 0,
  lessons: [],
  quiz: [],
  enrolledCount: c.enrolledCount ?? 0,
  completionRate: 0,
  status: 'published',
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

export const getDashboardStats = async (role?: RoleName): Promise<DashboardStats> => {
  if (role === 'mentor' || role === 'system_admin') {
    const response = await apiClient.get('/admin/dashboard');
    const stats = response.data?.data?.stats ?? {};
    if (role === 'mentor') {
      return {
        totalCourses: stats.totalCourses || 0,
        publishedCourses: stats.publishedCourses || 0,
        popularCourses: [],
      };
    }
    return {
      totalMembers: stats.totalUsers || 0,
      activeMembers: stats.activeUsers || 0,
      totalCourses: 0,
      publishedCourses: 0,
      recentRegistrations: [],
      popularCourses: [],
    };
  }
  // Fetch real data from multiple endpoints in parallel
  const [dashRes, blogStatsRes, eventStatsRes, membersRes, coursesRes] = await Promise.all([
    apiClient.get('/admin/dashboard').catch(() => ({ data: { data: { stats: {} } } })),
    apiClient.get('/blogs/stats').catch(() => ({ data: { data: { total: 0, published: 0 } } })),
    apiClient.get('/events/stats').catch(() => ({ data: { data: { total: 0, upcoming: 0 } } })),
    apiClient.get('/admin/users?limit=4').catch(() => ({ data: { data: { users: [], pagination: { total: 0 } } } })),
    apiClient.get('/courses').catch(() => ({ data: { data: [] } })),
  ]);

  const adminStats = dashRes.data?.data?.stats ?? {};
  const blogStats = blogStatsRes.data.data;
  const eventStats = eventStatsRes.data.data;
  const usersData = membersRes.data.data;
  const liveCourses: LmsCourse[] = coursesRes.data.data || [];
  const courses: Course[] = liveCourses.map(mapLmsCourseToAdminCourse);

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
    totalCourses: courses.length,
    // The LMS has no draft/published concept — every persisted course is live
    publishedCourses: courses.length,
    recentRegistrations: recentMembers,
    // Real enrollment counts, highest first
    popularCourses: [...courses].sort((a, b) => b.enrolledCount - a.enrolledCount).slice(0, 3),
  };
};

// ---- Members ----

export interface CreateMemberData {
  studentId?: string;
  email: string;
  password: string;
  name: string;
  surname: string;
  role: RoleName;
}

export interface UpdateMemberData {
  studentId?: string;
  email?: string;
  name?: string;
  surname?: string;
}

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

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
  };
}

export const getMembers = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
} = {}): Promise<PaginatedResult<Member>> => {
  const { page = 1, limit = 25, search = '', role = 'all', status = 'all' } = params;
  const query: Record<string, string | number> = { page, limit, sort: '-createdAt' };
  if (search.trim()) query.search = search.trim();
  if (role && role !== 'all') query.role = role;
  if (status && status !== 'all') query.status = status;

  const response = await apiClient.get('/admin/users', { params: query });
  const users = (response.data.data.users || []).map((u: any) => ({
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
  const pagination = response.data.data.pagination || {
    page, limit, total: users.length, pages: users.length ? 1 : 0,
  };
  return {
    data: users,
    pagination: {
      ...pagination,
      hasNext: page * limit < pagination.total,
      hasPrevious: page > 1,
    },
  };
};

export const createMember = async (data: CreateMemberData): Promise<Member> => {
  const response = await apiClient.post('/admin/users', data);
  return mapUserToMember(response.data.data);
};

export const updateMemberRole = async (id: string, role: Member['role']): Promise<Member> => {
  const response = await apiClient.patch(`/admin/users/${id}/role`, { role });
  return mapUserToMember(response.data.data);
};

export const updateMemberProfile = async (id: string, data: UpdateMemberData): Promise<Member> => {
  const response = await apiClient.patch(`/admin/users/${id}/profile`, data);
  return mapUserToMember(response.data.data);
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
  await apiClient.delete(`/admin/users/${id}`);
};

// ---- Blogs ----
const mapBackendToBlogPost = (blog: IBlog): BlogPost => ({
  ...blog,
  // We can keep an 'id' alias if needed, but components are being updated to use _id
});

export const getBlogs = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
} = {}): Promise<PaginatedResult<BlogPost>> => {
  const { page = 1, limit = 25, search = '', status = 'all' } = params;
  const query: Record<string, string | number> = { page, limit };
  if (search.trim()) query.search = search.trim();
  if (status && status !== 'all') query.status = status;

  const response = await apiClient.get('/blogs/admin', { params: query });
  const blogs = (response.data.data || []).map(mapBackendToBlogPost);
  const pagination = response.data.pagination || {
    page, limit, total: blogs.length, pages: blogs.length ? 1 : 0,
  };
  return {
    data: blogs,
    pagination: {
      ...pagination,
      hasNext: page * limit < pagination.total,
      hasPrevious: page > 1,
    },
  };
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
export const getEvents = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
} = {}): Promise<PaginatedResult<Event>> => {
  const { page = 1, limit = 25, search = '', status = 'all' } = params;
  const query: Record<string, string | number> = { page, limit };
  if (search.trim()) query.search = search.trim();
  if (status && status !== 'all') query.status = status;

  const response = await apiClient.get('/events/admin', { params: query });
  const events = (response.data.data || []).map((e: any) => ({ ...e, id: e._id }));
  const pagination = response.data.pagination || {
    page, limit, total: events.length, pages: events.length ? 1 : 0,
  };
  return {
    data: events,
    pagination: {
      ...pagination,
      hasNext: page * limit < pagination.total,
      hasPrevious: page > 1,
    },
  };
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
