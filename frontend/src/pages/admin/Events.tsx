import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Edit3, Trash2, Clock, Search, Eye } from 'lucide-react';
import { Event } from '../../types/admin';
import { getEvents, deleteEvent } from '../../services/adminService';
import { eventErrorMessage } from '../../services/adminEventService';
import Pagination, { PaginationMeta } from '../../components/common/Pagination';
import EventEditor from './EventEditor';
import styles from './Events.module.css';

const emptyMeta: PaginationMeta = { page: 1, limit: 25, total: 0, pages: 0 };
const typeColors: Record<Event['type'], string> = { workshop: '#2563eb', hackathon: '#D64A2A', meetup: '#16a34a', conference: '#d97706' };
const Events: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const filter = ['draft', 'published', 'archived'].includes(params.get('status') || '') ? params.get('status')! : 'all';
  const search = params.get('search') || '';
  const rawPage = Number(params.get('page') || 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = [10, 25, 50].includes(Number(params.get('limit'))) ? Number(params.get('limit')) : 25;
  const [events, setEvents] = useState<Event[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<{ event?: Event } | null>(null);
  const request = useRef(0);
  const invalidateRequests = useCallback(() => { ++request.current; }, []);
  const setListParams = (values: Record<string, string>, replace = false) => {
    setParams(previous => { const next = new URLSearchParams(previous); Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); }); return next; }, { replace });
  };
  const eventUrl = (id: string, tab = 'overview') => {
    const query = new URLSearchParams(params); query.set('tab', tab);
    return `/admin/events/${id}?${query}`;
  };
  const load = useCallback(async (quiet = false) => {
    const sequence = ++request.current;
    if (!quiet) { setLoading(true); setError(''); }
    try {
      const result = await getEvents({ page, limit, search, status: filter });
      if (sequence === request.current) { setEvents(result.data); setMeta(result.pagination); }
    } catch (cause) {
      if (sequence === request.current && !quiet) { setEvents([]); setError(eventErrorMessage(cause, 'Unable to load events. Please retry.')); }
    } finally { if (sequence === request.current) setLoading(false); }
  }, [page, limit, search, filter]);
  useEffect(() => {
    setLoading(true); setEvents([]);
    const timer = setTimeout(() => load(), search ? 350 : 0);
    return () => { clearTimeout(timer); invalidateRequests(); };
  }, [load, search, invalidateRequests]);
  const pending = events.some(event => event.calendarSyncStatus === 'pending');
  useEffect(() => {
    if (!pending) return;
    let stopped = false; let attempts = 0; let timer: ReturnType<typeof setTimeout>;
    const poll = async () => { await load(true); if (!stopped && ++attempts < 12) timer = setTimeout(poll, 5000); };
    timer = setTimeout(poll, 5000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [pending, load]);
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this event?')) return;
    try { await deleteEvent(id); await load(); }
    catch (cause) { setError(eventErrorMessage(cause, 'Unable to delete event. Please retry.')); }
  };
  const getStatusLabel = (status: Event['status']) => status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Events</h1>
          <p>Manage workshops, hackathons, meetups, and more</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => setEditor({})}>
          <Plus size={18} /> New Event
        </button>
      </div>

      {/* Filters */}
      <div className={styles.tabs}>
        {['all', 'draft', 'published', 'archived'].map(t => (
          <button key={t} className={`${styles.tab} ${filter === t ? styles.tabActive : ''}`} onClick={() => setListParams({ status: t, page: '1' })}>
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            {t === filter && meta.total > 0 && <span className={styles.tabCount}>{meta.total}</span>}
          </button>
        ))}
        <div className={styles.searchBox}>
          <Search size={15} />
          <input
            type="text"
            placeholder="Search events…"
            aria-label="Search events" value={search}
            onChange={e => setListParams({ search: e.target.value, page: '1' }, true)}
          />
        </div>
      </div>

      {error && <p role="alert" className={styles.editorError}>{error} <button onClick={() => load()}>Retry</button></p>}
      {loading && <p role="status">Loading events...</p>}
      {/* Grid */}
      <div className={styles.grid}>
        {events.map(event => (
            <div key={event._id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.typeBadge} style={{ background: typeColors[event.type] + '18', color: typeColors[event.type] }}>
                  {event.type}
                </span>
                <span className={`${styles.statusBadge} ${styles[`status_${event.status}`]}`}>
                  {getStatusLabel(event.status)}{event.calendarSyncStatus === 'pending' ? ' · Calendar syncing' : event.calendarSyncStatus === 'failed' ? ' · Calendar needs attention' : ''}
                </span>
              </div>
              <h3 className={styles.cardTitle}><Link className={styles.cardLink} to={eventUrl(event._id)}>{event.title}</Link></h3>
              <p className={styles.cardDesc}>{event.description}</p>
              <div className={styles.cardDetails}>
                <span><Clock size={14} /> {event.date} at {event.time}</span>
              </div>
              <div className={styles.cardDetails}>
                <span><Eye size={14} /> {event.views} views</span>
                <span>By {event.authorName}</span>
              </div>
              <div className={styles.cardDetails}>
                <span>Going: {event.attendeeCount || 0}{event.capacity ? ` / ${event.capacity}` : ''}</span>
                <Link className={styles.attendeesBtn} to={eventUrl(event._id, 'guests')}>Manage attendees</Link>
              </div>
              <div className={styles.cardFooter}>
                <button className={styles.editBtn} onClick={() => setEditor({ event })}><Edit3 size={15} /> Edit</button>
                <button aria-label={`Delete ${event.title}`} className={styles.deleteBtn} onClick={() => handleDelete(event._id)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        {!loading && !error && events.length === 0 && <p className={styles.empty}>No events found.</p>}
      </div>

      <Pagination
        meta={meta}
        onPageChange={p => setListParams({ page: String(p) })}
        onPageSizeChange={l => setListParams({ limit: String(l), page: '1' })}
        pageSizeOptions={[10, 25, 50]}
      />

      {editor && <EventEditor event={editor.event} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />}
    </div>
  );
};
export default Events;
