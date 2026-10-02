import React, { useEffect, useRef, useState } from 'react';
import { X, Upload } from 'lucide-react';
import { Event } from '../../types/admin';
import { createEvent, updateEvent } from '../../services/adminService';
import { AdminEvent, eventErrorMessage, eventErrorStatus, getAdminEvent } from '../../services/adminEventService';
import { api } from '../../services/apiClient';
import styles from './Events.module.css';

type EventForm = {
  title: string; description: string; image: string; startDate: string; endDate: string;
  locationType: 'physical' | 'virtual'; requireApproval: boolean; capacity: string;
  type: Event['type']; registrationLink: string; status: Event['status'];
};
const toLocal = (value?: string) => {
  const parsed = new Date(value || '');
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};
const toForm = (event?: AdminEvent): EventForm => ({
  title: event?.title || '', description: event?.description || '', image: event?.image || '',
  startDate: toLocal(event?.startDate || event?.eventDate), endDate: toLocal(event?.endDate),
  locationType: event?.locationType || 'physical', requireApproval: event?.requireApproval || false,
  capacity: event?.capacity ? String(event.capacity) : '', type: event?.type || 'workshop',
  registrationLink: event?.registrationLink || '', status: event?.status || 'draft',
});

interface Props { event?: AdminEvent; focusImage?: boolean; onClose: () => void; onSaved: () => void; }
const EventEditor: React.FC<Props> = ({ event, focusImage, onClose, onSaved }) => {
  const editId = event?._id;
  const [form, setForm] = useState(() => toForm(event));
  const [revision, setRevision] = useState(event?.revision ?? 0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFieldRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement as HTMLElement | null;
    const target = focusImage ? imageFieldRef.current : dialogRef.current?.querySelector<HTMLInputElement>('input');
    target?.focus();
    target?.scrollIntoView?.({ block: 'nearest' });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { alive.current = false; document.body.style.overflow = overflow; previous?.focus(); };
  }, [focusImage]);
  useEffect(() => {
    // Keep focus inside the modal when the currently focused control becomes disabled.
    if (saving || uploading) dialogRef.current?.focus();
  }, [saving, uploading]);
  const handleClose = () => { if (!busy.current) onClose(); };
  const handleKeys = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); handleClose(); }
    if (e.key !== 'Tab') return;
    const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="file"]), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]') || []).filter(node => !node.closest('fieldset:disabled'));
    const first = nodes[0]; const last = nodes[nodes.length - 1];
    if (!first) { e.preventDefault(); return; }
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { e.preventDefault(); first.focus(); }
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || busy.current) return;
    if (file.size > 10 * 1024 * 1024 || !file.type.startsWith('image/')) {
      setError('Choose an image no larger than 10MB.'); e.target.value = ''; return;
    }
    busy.current = true; setUploading(true); setError('');
    try {
      const data = new FormData(); data.append('image', file);
      const response = await api.post<{ data: { url: string } }>('/upload/image', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (alive.current) setForm(prev => ({ ...prev, image: response.data.data.url }));
    } catch (cause) { if (alive.current) setError(eventErrorMessage(cause, 'Image upload failed. Please try again.')); }
    finally { busy.current = false; if (alive.current) setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };
  const reloadLatest = async () => {
    if (!editId || busy.current) return;
    busy.current = true; setSaving(true);
    try {
      const latest = await getAdminEvent(editId);
      if (alive.current) { setForm(toForm(latest)); setRevision(latest.revision ?? 0); setConflict(false); setError(''); }
    } catch (cause) { if (alive.current) setError(eventErrorMessage(cause, 'Unable to reload the event. Please retry.')); }
    finally { busy.current = false; if (alive.current) setSaving(false); }
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current || conflict) return;
    const start = new Date(form.startDate); const end = form.endDate ? new Date(form.endDate) : start;
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) { setError('Choose valid dates with the end at or after the start.'); return; }
    if (form.capacity && (!Number.isSafeInteger(Number(form.capacity)) || Number(form.capacity) < 1)) { setError('Capacity must be a positive whole number.'); return; }
    const payload = { ...form, title: form.title.trim(), revision, date: start.toISOString().substring(0, 10),
      time: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
      eventDate: start.toISOString(), startDate: start.toISOString(), endDate: end.toISOString(), capacity: form.capacity ? Number(form.capacity) : null };
    busy.current = true; setSaving(true); setError('');
    try {
      if (editId) await updateEvent(editId, payload); else await createEvent(payload);
      if (alive.current) onSaved();
    } catch (cause) {
      if (alive.current) { setConflict(eventErrorStatus(cause) === 409); setError(eventErrorMessage(cause, 'Unable to save the event. Please try again.')); }
    } finally { busy.current = false; if (alive.current) setSaving(false); }
  };
  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div ref={dialogRef} tabIndex={-1} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="event-editor-title" onKeyDown={handleKeys} onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSave}>
          <div className={styles.modalHeader}>
            <h2 id="event-editor-title">{editId ? 'Edit Event' : 'New Event'}</h2>
            <button type="button" className={styles.closeBtn} onClick={handleClose} disabled={saving || uploading} aria-label="Close editor"><X size={20} /></button>
          </div>
          {error && <div className={styles.editorError} role="alert">{error}</div>}
          {conflict && <div className={styles.editorError}><p>Your changes are kept here. Reloading replaces them with the latest saved event.</p><button type="button" onClick={reloadLatest} disabled={saving}>Reload latest event</button></div>}
            <fieldset className={styles.modalBody} disabled={saving || uploading}>
              <label className={styles.field}>
                <span>Title</span>
                <input required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Event title" />
              </label>
              <label className={styles.field}>
                <span>Description</span>
                <textarea required maxLength={2000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Event description…" rows={3} />
              </label>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Start date and time</span>
                  <input type="datetime-local" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </label>
                <label className={styles.field}>
                  <span>End date and time</span>
                  <input type="datetime-local" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </label>
              </div>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Location type</span>
                  <select value={form.locationType} onChange={e => setForm({ ...form, locationType: e.target.value as EventForm['locationType'] })}>
                    <option value="physical">Physical</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Capacity (optional)</span>
                  <input type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="Unlimited" />
                </label>
              </div>
              <label className={styles.switchField}>
                <input type="checkbox" checked={form.requireApproval} onChange={e => setForm({ ...form, requireApproval: e.target.checked })} />
                <span className={styles.switchTrack}><span className={styles.switchThumb} /></span>
                <span>Require approval</span>
              </label>
              <div className={styles.field} ref={imageFieldRef} tabIndex={-1}>
                <span>Event Image</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  id="event-image-upload"
                />
                {form.image ? (
                  <div className={styles.imagePreview}>
                    <img src={form.image} alt="Event preview" />
                    <button type="button" className={styles.imageRemoveBtn} onClick={() => setForm({ ...form, image: '' })} title="Remove image">
                      <X size={16} />
                    </button>
                  </div>
                ) : null}
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload size={20} />
                    {uploading ? 'Uploading...' : form.image ? 'Replace Image' : 'Choose Image'}
                  </button>
              </div>
              <label className={styles.field}>
                <span>Registration Link (optional, external URL)</span>
                <input value={form.registrationLink} onChange={e => setForm({ ...form, registrationLink: e.target.value })} placeholder="https://..." />
              </label>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Type</span>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Event['type'] })}>
                    <option value="workshop">Workshop</option>
                    <option value="hackathon">Hackathon</option>
                    <option value="meetup">Meetup</option>
                    <option value="conference">Conference</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Status</span>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Event['status'] })}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>
            </fieldset>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose} disabled={saving || uploading}>Cancel</button>
            <button type="submit" className={styles.primaryBtn} disabled={saving || uploading || conflict || !form.title.trim() || !form.startDate}>
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default EventEditor;
