import { api } from './apiClient';
import { Collaborator, CommentItem, InnovationClassification, Mentor, Notification, Project, ProjectInvite, ReviewItem, Showcase, UploadResult } from '../types/innovation';

type Envelope<T> = { data: T };
type Paged<T> = { data: T; pagination?: { page: number; limit: number; total: number; pages: number } };
const data = <T,>(response: { data: Envelope<T> }) => response.data.data;
const pagedData = <T,>(response: { data: Paged<T> }) => response.data.data;
const innovationRoot = '/innovation';
const projectsRoot = '/projects';
const invitesRoot = '/invites';

export const innovationService = {
  classifications: () => api.get<Envelope<{ categories: InnovationClassification[]; stages: InnovationClassification[] }>>(`${innovationRoot}/categories-and-stages`).then(data),
  createClassification: (type: 'categories' | 'stages', name: string) => api.post<Envelope<InnovationClassification>>(`${innovationRoot}/categories-and-stages/${type}`, { name }).then(data),
  updateClassification: (type: string, id: string, body: Partial<InnovationClassification>) => api.patch<Envelope<InnovationClassification>>(`${innovationRoot}/categories-and-stages/${type}/${id}`, body).then(data),
  // Canonical Project repository API
  projects: (params?: Record<string, string>) => api.get<Paged<Project[]>>(`${projectsRoot}`, { params }).then(pagedData),
  myProjects: (params?: Record<string, string>) => api.get<Paged<Project[]>>(`${projectsRoot}/mine`, { params }).then(pagedData),
  exploreProjects: (params?: Record<string, string>) => api.get<Paged<Project[]>>(`${projectsRoot}/explore`, { params }).then(pagedData),
  project: (id: string) => api.get<Envelope<Project>>(`${projectsRoot}/${id}`).then(data),
  createProject: (body: Partial<Project>) => api.post<Envelope<Project>>(`${projectsRoot}`, body).then(data),
  updateProject: (id: string, body: Partial<Project>) => api.patch<Envelope<Project>>(`${projectsRoot}/${id}`, body).then(data),
  deleteProject: (id: string) => api.delete<Envelope<{ id: string }>>(`${projectsRoot}/${id}`).then(data),
  submitProject: (id: string) => api.post<Envelope<Project>>(`${projectsRoot}/${id}/submit`).then(data),
  projectInvites: (id: string) => api.get<Envelope<ProjectInvite[]>>(`${projectsRoot}/${id}/invites`).then(data),
  invite: (id: string, email: string, role: string) => api.post<Envelope<ProjectInvite>>(`${projectsRoot}/${id}/invites`, { email, role }).then(data),
  myInvites: () => api.get<Envelope<ProjectInvite[]>>(`${invitesRoot}/mine`).then(data),
  invitations: () => api.get<Envelope<ProjectInvite[]>>(`${invitesRoot}/mine`).then(data),
  respondInvitation: (id: string, accepted: boolean) => api.post<Envelope<Project>>(`${invitesRoot}/${id}/respond`, { accepted }).then(data),
  removeCollaborator: (projectId: string, userId: string) => api.delete<Envelope<Project>>(`${projectsRoot}/${projectId}/collaborators/${userId}`).then(data),
  changeCollaboratorRole: (projectId: string, userId: string, role: string) => api.patch<Envelope<Project>>(`${projectsRoot}/${projectId}/collaborators/${userId}`, { role }).then(data),
  comments: (id: string, params?: Record<string, string>) => api.get<Paged<CommentItem[]>>(`${projectsRoot}/${id}/comments`, { params }).then(pagedData),
  addComment: (id: string, body: string, parent?: string) => api.post<Envelope<CommentItem>>(`${projectsRoot}/${id}/comments`, { body, parent }).then(data),
  discussions: (id: string) => api.get<Paged<CommentItem[]>>(`${projectsRoot}/${id}/comments`).then(pagedData),
  addDiscussion: (id: string, message: string) => api.post<Envelope<CommentItem>>(`${projectsRoot}/${id}/comments`, { body: message }).then(data),
  reviews: (id: string) => api.get<Envelope<ReviewItem[]>>(`${projectsRoot}/${id}/reviews`).then(data),
  reviewProject: (id: string, body: { toStatus: string; decision: string; note?: string }) => api.post<Envelope<ReviewItem>>(`${projectsRoot}/${id}/reviews`, body).then(data),
  assignReviewer: (id: string, mentorId: string, note?: string) => api.post(`${innovationRoot}/projects/${id}/review-assignments`, { mentorId, note }).then(data),
  reviewAssignments: (all = false) => api.get<Envelope<any[]>>(`${innovationRoot}/review-assignments`, { params: all ? { all: 'true' } : undefined }).then(data),
  files: (id: string) => api.get<Envelope<any[]>>(`${innovationRoot}/projects/${id}/files`).then(data),
  uploadProjectFile: (id: string, file: File) => { const form = new FormData(); form.append('file', file); return api.post<Envelope<any>>(`${innovationRoot}/projects/${id}/files`, form).then(data); },
  upload: (file: Blob, name: string) => { const form = new FormData(); form.append('file', file, name); return api.post<Envelope<UploadResult>>(`${innovationRoot}/upload`, form).then(data); },
  collaborators: (q?: string) => api.get<Envelope<Collaborator[]>>(`${innovationRoot}/collaborators`, { params: q ? { q } : undefined }).then(data),
  mentors: (expertise?: string, includePending = false) => api.get<Envelope<Mentor[]>>(`${innovationRoot}/mentors`, { params: { ...(expertise ? { expertise } : {}), ...(includePending ? { includePending: 'true' } : {}) } }).then(data),
  mentorProfile: (body: Record<string, any>) => api.post(`${innovationRoot}/mentors/profile`, body).then(data),
  approveMentor: (id: string, approved: boolean) => api.patch<Envelope<Mentor>>(`${innovationRoot}/mentors/${id}/approval`, { approved }).then(data),
  requestMentor: (id: string, message: string) => api.post(`${innovationRoot}/mentors/${id}/requests`, { message }).then(data),
  updateMentorRequest: (id: string, body: Record<string, any>) => api.patch(`${innovationRoot}/mentor-requests/${id}`, body).then(data),
  replyMentorRequest: (id: string, message: string) => api.post(`${innovationRoot}/mentor-requests/${id}/replies`, { message }).then(data),
  sessions: () => api.get<Envelope<any[]>>(`${innovationRoot}/mentorship-sessions`).then(data),
  sessionMessage: (id: string, message: string) => api.post(`${innovationRoot}/mentorship-sessions/${id}/messages`, { message }).then(data),
  showcase: () => api.get<Envelope<Showcase[]>>(`${innovationRoot}/showcase`).then(data),
  adminShowcase: () => api.get<Envelope<Showcase[]>>(`${innovationRoot}/showcase/admin`).then(data),
  updateShowcase: (id: string, body: { approved: boolean; published: boolean }) => api.patch<Envelope<Showcase>>(`${innovationRoot}/showcase/${id}`, body).then(data),
  requestShowcase: (projectId: string, body: { title?: string; summary?: string }) => api.post<Envelope<Showcase>>(`${projectsRoot}/${projectId}/showcase`, body).then(data),
  notifications: () => api.get<Envelope<Notification[]>>(`${innovationRoot}/notifications`).then(data),
  readNotification: (id: string) => api.patch<Envelope<Notification>>(`${innovationRoot}/notifications/${id}/read`).then(data),
};

export const projectService = innovationService;
