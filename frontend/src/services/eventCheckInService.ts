import { api } from './apiClient';

export interface CheckInSession {
  revision: string;
  available: boolean;
  reason: string | null;
  enabled: boolean;
  opensAt: string | null;
  closesAt: string | null;
  serverTime: string;
  qrUrl: string | null;
  code: string | null;
  refreshAt: string | null;
  expiresAt: string | null;
}
export interface CheckInResult {
  checkedInAt: string;
  checkInMethod: 'qr' | 'manual';
  alreadyCheckedIn: boolean;
}
export const getCheckInSession = async (id: string, signal?: AbortSignal, afterRevision?: string): Promise<CheckInSession> =>
  (await api.get(`/events/${id}/check-in/session`, { signal, params: afterRevision === undefined ? undefined : { after: afterRevision }, timeout: 35000 })).data.data;
export const setCheckInSession = async (id: string, enabled: boolean): Promise<CheckInSession> =>
  (await api.post(`/events/${id}/check-in/session`, { enabled })).data.data;
export const submitCheckIn = async (id: string, proof: { token: string } | { code: string }): Promise<CheckInResult> =>
  (await api.post(`/events/${id}/check-in`, proof)).data.data;
