export interface InnovationClassification { _id: string; name: string; slug?: string; active?: boolean; order?: number; }
export type ProjectStatus = 'draft' | 'submitted' | 'under_review' | 'feedback_provided' | 'resubmitted' | 'approved' | 'rejected' | 'incubation' | 'archived';
export type ProjectVisibility = 'public' | 'private';
export type CollaboratorRole = 'owner' | 'maintainer' | 'contributor';
export type InviteRole = 'maintainer' | 'contributor';
export interface CollaboratorEntry { user: any; role: CollaboratorRole; joinedAt?: string; }
export interface Project {
  _id: string;
  title: string;
  problem?: string;
  solution?: string;
  beneficiaries?: string[];
  impact?: string;
  category?: InnovationClassification | string;
  stage?: InnovationClassification | string;
  tags?: string[];
  media?: Array<{ url?: string; publicId?: string; type?: string; name?: string }>;
  owner?: any;
  collaborators?: CollaboratorEntry[];
  collaboratorCount?: number;
  visibility?: ProjectVisibility;
  status: ProjectStatus;
  reviewHistory?: Array<{ reviewer?: any; fromStatus?: string; toStatus?: string; note?: string; at?: string }>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}
export interface ProjectInvite { _id: string; project: Project | string; email: string; role: InviteRole; status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired'; invitedBy?: any; expiresAt?: string; createdAt?: string; }
export interface CommentItem { _id: string; project?: string; author?: any; parent?: string | null; body: string; message?: string; createdAt?: string; }
export interface ReviewItem { _id: string; project?: string; reviewer?: any; fromStatus?: string; toStatus?: string; decision?: string; note?: string; createdAt?: string; }
export interface Collaborator { _id: string; name: string; surname: string; email?: string; faculty?: string; department?: string; skills?: string[]; interests?: string[]; collaborationOptIn: boolean; profilePictureUrl?: string; }
export interface Mentor { _id: string; user: { _id?: string; name: string; surname: string; email?: string; faculty?: string; department?: string }; expertise?: string[]; bio?: string; availability?: string; approved?: boolean; }
export interface Showcase { _id: string; project?: Project; title?: string; summary?: string; imageUrl?: string; approved?: boolean; published?: boolean; }
export interface Notification { _id: string; title: string; message: string; readAt?: string; createdAt?: string; }
export interface Discussion extends CommentItem {}
export interface UploadResult { url: string; name: string; mimeType: string; bytes: number; publicId: string; }
