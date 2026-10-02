import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { getAdminEvent } from '../../services/adminEventService';
import { useAdminEventResource } from '../../hooks/useAdminEventResource';
import EventEditor from './EventEditor';
import EventOverview from './event-workspace/EventOverview';
import EventGuests from './event-workspace/EventGuests';
import EventInsightsPanel from './event-workspace/EventInsights';
import styles from './EventWorkspace.module.css';

const tabs = ['overview', 'guests', 'insights'] as const;
type Tab = typeof tabs[number];

const Workspace: React.FC<{ eventId: string }> = ({ eventId }) => {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = tabs.includes(requested as Tab) ? requested as Tab : 'overview';
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set([tab]));
  const [version, setVersion] = useState(0);
  const [editor, setEditor] = useState<'details' | 'photo' | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const fetchEvent = useCallback((signal: AbortSignal) => getAdminEvent(eventId, signal), [eventId]);
  const { data: event, loading, error, reload } = useAdminEventResource(fetchEvent, version, 'Unable to load the event. Please retry.');
  useEffect(() => { setVisited(previous => new Set([...Array.from(previous), tab])); }, [tab]);
  const pending = event?.calendarSyncStatus === 'pending';
  useEffect(() => {
    if (!pending) return;
    let attempts = 0;
    const timer = setInterval(() => { reload(); if (++attempts >= 12) clearInterval(timer); }, 5000);
    return () => clearInterval(timer);
  }, [pending, reload]);
  const selectTab = (next: Tab) => setParams(previous => {
    const query = new URLSearchParams(previous); query.set('tab', next); return query;
  });
  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    let next: number;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault(); selectTab(tabs[next]); tabRefs.current[next]?.focus();
  };
  const backParams = new URLSearchParams();
  ['search', 'status', 'page', 'limit'].forEach(key => { const value = params.get(key); if (value) backParams.set(key, value); });
  const backUrl = `/admin/events${backParams.toString() ? `?${backParams}` : ''}`;
  const changed = useCallback(() => setVersion(previous => previous + 1), []);
  const publicUrl = event?.slug && event.status !== 'draft' ? `/events/${encodeURIComponent(event.slug)}` : null;

  return <div className={styles.workspace}>
    <Link to={backUrl} className={styles.back}><ArrowLeft size={16} /> Back to Events</Link>
    {!event ? <div className={styles.state}>
      {loading ? <p role="status">Loading event workspace…</p> : <div role="alert"><h1>Event unavailable</h1><p>{error}</p><button className={styles.button} onClick={reload}>Retry</button></div>}
    </div> : <>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>Event workspace <span className={styles.badge} data-status={event.status}>{event.status}</span></div><h1>{event.title}</h1><p>Hosted by {event.authorName || 'Event organizer'}</p></div>
        {publicUrl ? <a className={styles.button} href={publicUrl} target="_blank" rel="noopener noreferrer">Event Page <ArrowUpRight size={16} /></a> : <div className={styles.draftNote}><button className={styles.button} disabled>Event Page <ArrowUpRight size={16} /></button><small>Publish this draft to share it.</small></div>}
      </header>
      {error && <div className={styles.error} role="alert">{error} <button onClick={reload}>Retry</button></div>}
      <div className={styles.tabs} role="tablist" aria-label="Event management">
        {tabs.map((item, index) => <button key={item} ref={node => { tabRefs.current[index] = node; }} id={`tab-${item}`} role="tab" aria-selected={item === tab} aria-controls={`panel-${item}`} tabIndex={item === tab ? 0 : -1} onKeyDown={e => onTabKey(e, index)} onClick={() => selectTab(item)}>{item.charAt(0).toUpperCase() + item.slice(1)}</button>)}
      </div>
      <section id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" hidden={tab !== 'overview'} tabIndex={0}>
        <EventOverview event={event} onGuests={() => selectTab('guests')} onEdit={() => setEditor('details')} onPhoto={() => setEditor('photo')} />
      </section>
      <section id="panel-guests" role="tabpanel" aria-labelledby="tab-guests" hidden={tab !== 'guests'} tabIndex={0}>
        {(tab === 'guests' || visited.has('guests')) && <EventGuests event={event} version={version} onChanged={changed} />}
      </section>
      <section id="panel-insights" role="tabpanel" aria-labelledby="tab-insights" hidden={tab !== 'insights'} tabIndex={0}>
        {(tab === 'insights' || visited.has('insights')) && <EventInsightsPanel eventId={eventId} version={version} />}
      </section>
      {editor && <EventEditor event={event} focusImage={editor === 'photo'} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); changed(); }} />}
    </>}
  </div>;
};

const EventWorkspace: React.FC = () => {
  const { eventId = '' } = useParams();
  return <Workspace key={eventId} eventId={eventId} />;
};
export default EventWorkspace;
