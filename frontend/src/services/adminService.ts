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
  try {
    const response = await apiClient.get('/courses');
    const lmsCourses = response.data.data || [];
    // Map LMS courses to the existing Course interface for backward compat
    return lmsCourses.map((c: any) => ({
      id: c._id,
      title: c.title,
      description: c.description || '',
      coverImage: '',
      language: '',
      level: 'beginner' as const,
      duration: 0,
      lessons: [],
      quiz: [],
      enrolledCount: 0,
      completionRate: 0,
      status: 'published' as const,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  } catch {
    // Fallback to mock if API not ready
    await delay();
    return [...mockCourses];
  }
};

export const createCourse = async (data: Omit<Course, 'id' | 'enrolledCount' | 'completionRate' | 'createdAt' | 'updatedAt'>): Promise<Course> => {
  try {
    const response = await apiClient.post('/courses', {
      title: data.title,
      description: data.description,
    });
    const c = response.data.data;
    return {
      id: c._id,
      title: c.title,
      description: c.description || '',
      coverImage: data.coverImage || '',
      language: data.language || '',
      framework: data.framework,
      level: data.level || 'beginner',
      duration: data.duration || 0,
      lessons: data.lessons || [],
      quiz: data.quiz || [],
      enrolledCount: 0,
      completionRate: 0,
      status: data.status || 'draft',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  } catch {
    // Fallback to mock
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
  }
};

export const updateCourse = async (id: string, data: Partial<Course>): Promise<Course> => {
  try {
    const response = await apiClient.put(`/courses/${id}`, {
      title: data.title,
      description: data.description,
    });
    const c = response.data.data;
    return {
      id: c._id,
      title: c.title,
      description: c.description || '',
      coverImage: data.coverImage || '',
      language: data.language || '',
      framework: data.framework,
      level: data.level || 'beginner',
      duration: data.duration || 0,
      lessons: data.lessons || [],
      quiz: data.quiz || [],
      enrolledCount: data.enrolledCount || 0,
      completionRate: data.completionRate || 0,
      status: data.status || 'published',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  } catch {
    await delay();
    const course = mockCourses.find(c => c.id === id);
    if (!course) throw new Error('Course not found');
    Object.assign(course, data, { updatedAt: new Date().toISOString() });
    return { ...course };
  }
};

export const deleteCourse = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/courses/${id}`);
  } catch {
    await delay();
    const idx = mockCourses.findIndex(c => c.id === id);
    if (idx !== -1) mockCourses.splice(idx, 1);
  }
};
