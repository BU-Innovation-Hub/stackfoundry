// ============================================
// Admin Service Layer
// Currently uses mock data. To connect backend:
//   1. Import apiClient instead of mockData
//   2. Replace function bodies with API calls
//   3. Keep the same function signatures
// ============================================

import { Member, BlogPost, Event, Course, DashboardStats } from '../types/admin';
import { mockMembers, mockBlogs, mockEvents, mockCourses, mockDashboardStats } from './mockData';

// Simulate async delay (remove when using real API)
const delay = (ms = 300) => new Promise(res => setTimeout(res, ms));

// ---- Dashboard ----
export const getDashboardStats = async (): Promise<DashboardStats> => {
  await delay();
  return { ...mockDashboardStats };
  // TODO: return (await apiClient.get('/admin/dashboard')).data;
};

// ---- Members ----
export const getMembers = async (): Promise<Member[]> => {
  await delay();
  return [...mockMembers];
  // TODO: return (await apiClient.get('/admin/members')).data;
};

export const updateMemberRole = async (id: string, role: Member['role']): Promise<Member> => {
  await delay();
  const member = mockMembers.find(m => m.id === id);
  if (!member) throw new Error('Member not found');
  member.role = role;
  return { ...member };
  // TODO: return (await apiClient.patch(`/admin/members/${id}/role`, { role })).data;
};

export const toggleMemberStatus = async (id: string): Promise<Member> => {
  await delay();
  const member = mockMembers.find(m => m.id === id);
  if (!member) throw new Error('Member not found');
  member.isActive = !member.isActive;
  return { ...member };
  // TODO: return (await apiClient.patch(`/admin/members/${id}/status`)).data;
};

export const deleteMember = async (id: string): Promise<void> => {
  await delay();
  const idx = mockMembers.findIndex(m => m.id === id);
  if (idx !== -1) mockMembers.splice(idx, 1);
  // TODO: await apiClient.delete(`/admin/members/${id}`);
};

// ---- Blogs ----
export const getBlogs = async (): Promise<BlogPost[]> => {
  await delay();
  return [...mockBlogs];
  // TODO: return (await apiClient.get('/admin/blogs')).data;
};

export const createBlog = async (data: Omit<BlogPost, 'id' | 'slug' | 'createdAt' | 'updatedAt'>): Promise<BlogPost> => {
  await delay();
  const blog: BlogPost = {
    ...data,
    id: String(Date.now()),
    slug: data.title.toLowerCase().replace(/\s+/g, '-'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockBlogs.push(blog);
  return blog;
  // TODO: return (await apiClient.post('/admin/blogs', data)).data;
};

export const updateBlog = async (id: string, data: Partial<BlogPost>): Promise<BlogPost> => {
  await delay();
  const blog = mockBlogs.find(b => b.id === id);
  if (!blog) throw new Error('Blog not found');
  Object.assign(blog, data, { updatedAt: new Date().toISOString() });
  return { ...blog };
  // TODO: return (await apiClient.put(`/admin/blogs/${id}`, data)).data;
};

export const deleteBlog = async (id: string): Promise<void> => {
  await delay();
  const idx = mockBlogs.findIndex(b => b.id === id);
  if (idx !== -1) mockBlogs.splice(idx, 1);
  // TODO: await apiClient.delete(`/admin/blogs/${id}`);
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
