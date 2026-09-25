import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Edit3, Trash2, X, MapPin, Clock, Upload, Search, Eye } from 'lucide-react';
import { Event } from '../../types/admin';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../../services/adminService';
import { api as apiClient } from '../../services/apiClient';
import Loader from '../../components/common/Loader';
import Pagination, { PaginationMeta } from '../../components/common/Pagination';
import styles from './Events.module.css';

type EventForm = {
  title: string;
  description: string;
  image: string;
  startDate: string;
  endDate: string;
  location: string;
  locationType: 'physical' | 'virtual';
  requireApproval: boolean;
  capacity: string;
  type: Event['type'];
  registrationLink: string;
  status: Event['status'];
};

const emptyForm: EventForm = { title: '', description: '', image: '', startDate: '', endDate: '', location: '', locationType: 'physical', requireApproval: false, capacity: '', type: 'workshop', registrationLink: '', status: 'draft' };
const emptyMeta: PaginationMeta = { page: 1, limit: 25, total: 0, pages: 0, hasNext: false, hasPrevious: false };

const toDateTimeLocal = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

const typeColors: Record<Event['type'], string> = {
  workshop: '#2563eb',
  hackathon: '#D64A2A',
  meetup: '#16a34a',
  conference: '#d97706',
};

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [uploading, setUploading] = useState(false);
  const [attendeeEvent, setAttendeeEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const result = await getEvents({
        page: targetPage,
        limit,
        search,
        status: filter,
      });
      setEvents(result.data);
      setMeta(result.pagination);
    } catch {
      setEvents([]);
      setMeta(emptyMeta);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filter]);

  useEffect(() => { load(); }, [load]);

  const resetPage = () => setPage(1);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(resetPage, 350);
  };

  const handleTab = (t: string) => { setFilter(t); resetPage(); };

  const handleOpen = (event?: Event) => {
    if (event) {
      setEditId(event._id);
      setForm({
        title: event.title,
        description: event.description,
        image: event.image || '',
        startDate: (event.startDate || event.eventDate) ? toDateTimeLocal(event.startDate || event.eventDate) : '',
        endDate: event.endDate ? toDateTimeLocal(event.endDate) : '',
        location: event.location || '',
        locationType: event.locationType || 'physical',
        requireApproval: event.requireApproval || false,
        capacity: event.capacity ? String(event.capacity) : '',
        type: event.type,
        registrationLink: event.registrationLink || '',
        status: event.status,
      });
    } else {
      setEditId(null);
      setForm(emptyForm);
    }
    setModalOpen(true);
  };

  const handleClose = () => { setModalOpen(false); setEditId(null); setForm(emptyForm); };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Error: File is too large. Maximum size is 10MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await apiClient.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(prev => ({ ...prev, image: response.data.data.url }));
    } catch (error: any) {
      console.error('Image upload failed:', error);
      const message = error.response?.data?.error || 'Image upload failed. Please try again.';
      alert(`Error: ${message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    const startDate = form.startDate ? new Date(form.startDate) : null;
    if (!startDate || Number.isNaN(startDate.getTime())) {
      alert('Please choose a valid start date and time.');
      return;
    }
    const endDate = form.endDate ? new Date(form.endDate) : startDate;
    const payload = {
      ...form,
      date: startDate.toISOString().substring(0, 10),
      time: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
      eventDate: startDate.toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      capacity: form.capacity ? Number(form.capacity) : null,
    };

    try {
      if (editId) {
        await updateEvent(editId, payload);
      } else {
        await createEvent(payload);
      }
      handleClose();
      load();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to save event';
      alert(`Error: ${message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this event?')) return;
    await deleteEvent(id);
    load();
  };

  const openAttendees = async (event: Event) => {
    setAttendeeEvent(event);
    try { const response = await apiClient.get(`/events/${event._id}/attendees`); setAttendees(response.data.data || []); }
    catch { setAttendees([]); }
  };

  const decideAttendee = async (attendanceId: string, decision: 'approved' | 'rejected') => {
    if (!attendeeEvent) return;
    try {
      await apiClient.patch(`/events/${attendeeEvent._id}/attendees/${attendanceId}`, { decision });
      setAttendees(prev => prev.map(item => item._id === attendanceId ? { ...item, status: decision } : item));
    } catch (error: any) { alert(error.response?.data?.error || 'Unable to update attendee'); }
  };

  const filtered = events;

  const getStatusLabel = (status: Event['status']) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'published': return 'Published';
      case 'archived': return 'Archived';
    }
  };

  if (loading && events.length === 0) return <Loader text="Loading events..." />;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Events</h1>
          <p>Manage workshops, hackathons, meetups, and more</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => handleOpen()}>
          <Plus size={18} /> New Event
        </button>
      </div>

      {/* Filters */}
      <div className={styles.tabs}>
        {['all', 'draft', 'published', 'archived'].map(t => (
          <button key={t} className={`${styles.tab} ${filter === t ? styles.tabActive : ''}`} onClick={() => handleTab(t)}>
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            {t === filter && meta.total > 0 && <span className={styles.tabCount}>{meta.total}</span>}
          </button>
        ))}
        <div className={styles.searchBox}>
          <Search size={15} />
          <input
            type="text"
            placeholder="Search events…"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {filtered.map(event => (
            <div key={event._id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.typeBadge} style={{ background: typeColors[event.type] + '18', color: typeColors[event.type] }}>
                  {event.type}
                </span>
                <span className={`${styles.statusBadge} ${styles[`status_${event.status}`]}`}>
                  {getStatusLabel(event.status)}
                </span>
              </div>
              <h3 className={styles.cardTitle}>{event.title}</h3>
              <p className={styles.cardDesc}>{event.description}</p>
              <div className={styles.cardDetails}>
                <span><Clock size={14} /> {event.date} at {event.time}</span>
                {event.location && <span><MapPin size={14} /> {event.location}</span>}
              </div>
              <div className={styles.cardDetails}>
                <span><Eye size={14} /> {event.views} views</span>
                <span>By: {event.authorName}</span>
              </div>
              <div className={styles.cardDetails}>
                <span>Going: {event.attendeeCount || 0}{event.capacity ? ` / ${event.capacity}` : ''}</span>
                <button className={styles.attendeesBtn} onClick={() => openAttendees(event)}>Manage attendees</button>
              </div>
              <div className={styles.cardFooter}>
                <button className={styles.editBtn} onClick={() => handleOpen(event)}><Edit3 size={15} /> Edit</button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(event._id)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        {filtered.length === 0 && <p className={styles.empty}>No events found.</p>}
      </div>

      <Pagination
        meta={meta}
        onPageChange={setPage}
        onPageSizeChange={(l) => { setLimit(l); setPage(1); }}
      />

      {/* Modal */}
      {modalOpen && (
        <div className={styles.overlay} onClick={handleClose}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editId ? 'Edit Event' : 'New Event'}</h2>
              <button className={styles.closeBtn} onClick={handleClose}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.field}>
                <span>Title</span>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Event title" />
              </label>
              <label className={styles.field}>
                <span>Description</span>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Event description…" rows={3} />
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
              <label className={styles.field}>
                <span>Location</span>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Venue or link" />
              </label>
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
                <span>Require approval for student requests</span>
              </label>
              <div className={styles.field}>
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
                ) : (
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload size={20} />
                    {uploading ? 'Uploading…' : 'Choose Image'}
                  </button>
                )}
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
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={handleClose}>Cancel</button>
              <button className={styles.primaryBtn} onClick={handleSave} disabled={!form.title.trim() || !form.startDate}>
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {attendeeEvent && (
        <div className={styles.overlay} onClick={() => setAttendeeEvent(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}><h2>Attendees: {attendeeEvent.title}</h2><button className={styles.closeBtn} onClick={() => setAttendeeEvent(null)}><X size={20} /></button></div>
            <div className={styles.attendeeList}>
              {attendees.length === 0 ? <p className={styles.empty}>No attendance requests yet.</p> : attendees.map(item => {
                const person = item.user || {};
                return <div className={styles.attendeeRow} key={item._id}><div><strong>{person.name} {person.surname}</strong><small>{person.email}</small></div><span className={styles[`status_${item.status}`]}>{item.status}</span>{attendeeEvent.requireApproval && item.status === 'pending' && <div><button className={styles.approveBtn} onClick={() => decideAttendee(item._id, 'approved')}>Approve</button><button className={styles.rejectBtn} onClick={() => decideAttendee(item._id, 'rejected')}>Reject</button></div>}</div>;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
