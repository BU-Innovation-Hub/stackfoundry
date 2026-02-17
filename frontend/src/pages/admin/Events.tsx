import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Edit3, Trash2, X, MapPin, Clock, Users as UsersIcon } from 'lucide-react';
import { Event } from '../../types/admin';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../../services/adminService';
import styles from './Events.module.css';

type EventForm = {
  title: string;
  description: string;
  coverImage: string;
  date: string;
  time: string;
  location: string;
  type: Event['type'];
  capacity: number;
  status: Event['status'];
};

const emptyForm: EventForm = { title: '', description: '', coverImage: '', date: '', time: '', location: '', type: 'workshop', capacity: 50, status: 'upcoming' };

const typeColors: Record<Event['type'], string> = {
  workshop: '#2563eb',
  hackathon: '#D64A2A',
  meetup: '#16a34a',
  webinar: '#7c3aed',
  conference: '#d97706',
};

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getEvents();
    setEvents(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOpen = (event?: Event) => {
    if (event) {
      setEditId(event.id);
      setForm({ title: event.title, description: event.description, coverImage: event.coverImage, date: event.date, time: event.time, location: event.location, type: event.type, capacity: event.capacity, status: event.status });
    } else {
      setEditId(null);
      setForm(emptyForm);
    }
    setModalOpen(true);
  };

  const handleClose = () => { setModalOpen(false); setEditId(null); setForm(emptyForm); };

  const handleSave = async () => {
    if (editId) {
      const updated = await updateEvent(editId, form);
      setEvents(prev => prev.map(e => e.id === editId ? updated : e));
    } else {
      const created = await createEvent(form);
      setEvents(prev => [...prev, created]);
    }
    handleClose();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this event?')) return;
    await deleteEvent(id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const filtered = filter === 'all' ? events : events.filter(e => e.status === filter);

  const getStatusLabel = (status: Event['status']) => {
    switch (status) {
      case 'upcoming': return 'Upcoming';
      case 'ongoing': return 'Ongoing';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
    }
  };

  if (loading) return <div className={styles.loading}>Loading events…</div>;

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
        {['all', 'upcoming', 'ongoing', 'completed', 'cancelled'].map(t => (
          <button key={t} className={`${styles.tab} ${filter === t ? styles.tabActive : ''}`} onClick={() => setFilter(t)}>
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            <span className={styles.tabCount}>{t === 'all' ? events.length : events.filter(e => e.status === t).length}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {filtered.map(event => {
          const fillPercent = event.capacity > 0 ? Math.round((event.registered / event.capacity) * 100) : 0;
          return (
            <div key={event.id} className={styles.card}>
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
                <span><Clock size={14} /> {new Date(event.date).toLocaleDateString()} at {event.time}</span>
                <span><MapPin size={14} /> {event.location}</span>
              </div>
              <div className={styles.capacity}>
                <div className={styles.capacityHeader}>
                  <span><UsersIcon size={14} /> {event.registered} / {event.capacity} registered</span>
                  <span>{fillPercent}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${fillPercent}%`, background: fillPercent > 90 ? '#dc2626' : '#D64A2A' }} />
                </div>
              </div>
              <div className={styles.cardFooter}>
                <button className={styles.editBtn} onClick={() => handleOpen(event)}><Edit3 size={15} /> Edit</button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(event.id)}><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className={styles.empty}>No events found.</p>}
      </div>

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
                  <span>Date</span>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </label>
                <label className={styles.field}>
                  <span>Time</span>
                  <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                </label>
              </div>
              <label className={styles.field}>
                <span>Location</span>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Venue or link" />
              </label>
              <label className={styles.field}>
                <span>Cover Image URL</span>
                <input value={form.coverImage} onChange={e => setForm({ ...form, coverImage: e.target.value })} placeholder="https://..." />
              </label>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Type</span>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Event['type'] })}>
                    <option value="workshop">Workshop</option>
                    <option value="hackathon">Hackathon</option>
                    <option value="meetup">Meetup</option>
                    <option value="webinar">Webinar</option>
                    <option value="conference">Conference</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Capacity</span>
                  <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} min={1} />
                </label>
              </div>
              <label className={styles.field}>
                <span>Status</span>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Event['status'] })}>
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={handleClose}>Cancel</button>
              <button className={styles.primaryBtn} onClick={handleSave} disabled={!form.title.trim() || !form.date}>
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
