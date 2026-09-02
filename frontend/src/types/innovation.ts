export interface InnovationClassification { _id: string; name: string; slug?: string; active?: boolean; order?: number; }
export type IdeaStatus = 'draft' | 'submitted' | 'under_review' | 'feedback_provided' | 'resubmitted' | 'approved' | 'rejected' | 'incubation' | 'archived';
export interface Idea { _id: string; title: string; problem?: string; solution?: string; beneficiaries?: string[]; visibility?: 'public' | 'private'; category?: InnovationClassification | string; stage?: InnovationClassification | string; status: IdeaStatus; owner?: any; teamMembers?: Array<{ user: any; role: string; accepted?: boolean }>; feedback?: any[]; [key: string]: any; }
export interface Project { _id: string; name: string; description?: string; visibility?: 'public' | 'private'; owner?: any; team?: Array<{ user: any; role: string; accepted: boolean }>; collaborationRequired?: boolean; tags?: string[]; }
export interface Collaborator { _id: string; name: string; surname: string; email?: string; faculty?: string; department?: string; skills?: string[]; interests?: string[]; collaborationOptIn: boolean; profilePictureUrl?: string; }
export interface Mentor { _id: string; user: { _id?: string; name: string; surname: string; email?: string; faculty?: string; department?: string }; expertise?: string[]; bio?: string; availability?: string; approved?: boolean; }
export interface Showcase { _id: string; idea: Idea; title?: string; summary?: string; imageUrl?: string; approved?: boolean; published?: boolean; }
export interface Notification { _id: string; title: string; message: string; readAt?: string; createdAt?: string; }
export interface Discussion { _id: string; message: string; author?: any; createdAt?: string; }
export interface UploadResult { url: string; name: string; mimeType: string; bytes: number; publicId: string; }
