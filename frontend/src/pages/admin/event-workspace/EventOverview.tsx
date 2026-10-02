import React, { useState } from 'react';
import { CalendarDays, MapPin, Video, Users, Share2, Edit3, ImagePlus, ArrowUpRight, Copy, ShieldCheck } from 'lucide-react';
import { AdminEvent } from '../../../services/adminEventService';
import styles from '../EventWorkspace.module.css';

export const scheduleLabel = (event: AdminEvent) => {
  const start = new Date(event.startDate || event.eventDate);
  const end = new Date(event.endDate || '');
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (Number.isNaN(start.getTime())) return { date: event.date || 'Date to be announced', time: `${event.time || 'Time to be announced'} · ${zone}`, day: '—', month: 'DATE' };
  const sameDay = !Number.isNaN(end.getTime()) && start.toDateString() === end.toDateString();
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  const endLabel = Number.isNaN(end.getTime()) || end.getTime() === start.getTime() ? '' : ` – ${sameDay ? '' : `${end.toLocaleDateString()} `}${time.format(end)}`;
  return { date: start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), time: `${time.format(start)}${endLabel} · ${zone}`, day: String(start.getDate()), month: start.toLocaleDateString(undefined, { month: 'short' }) };
};

interface Props { event: AdminEvent; onGuests: () => void; onEdit: () => void; onPhoto: () => void; }
const EventOverview: React.FC<Props> = ({ event, onGuests, onEdit, onPhoto }) => {
  const [share, setShare] = useState<'copied' | 'fallback' | null>(null);
  const [brokenImage, setBrokenImage] = useState<string | null>(null);
  const schedule = scheduleLabel(event);
  const shareable = event.status !== 'draft' && Boolean(event.slug);
  const url = `${window.location.origin}/events/${encodeURIComponent(event.slug)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setShare('copied'); }
    catch { setShare('fallback'); }
  };
  const meetingLink = event.googleMeetLink && /^https?:\/\//i.test(event.googleMeetLink) ? event.googleMeetLink : null;
  return <>
    <div className={styles.actions}>
      <button onClick={onGuests}><span className={styles.actionIcon}><Users size={21} /></span><span>Manage Guests<small>Review your guest list</small></span><ArrowUpRight size={17} /></button>
      <button onClick={copy} disabled={!shareable}><span className={styles.actionIcon}><Share2 size={21} /></span><span>Share Event<small>{shareable ? 'Bring people together' : 'Publish to enable sharing'}</small></span><ArrowUpRight size={17} /></button>
      <button onClick={onEdit}><span className={styles.actionIcon}><Edit3 size={21} /></span><span>Edit Event<small>Fine-tune the details</small></span><ArrowUpRight size={17} /></button>
    </div>
    <div className={styles.overview}>
      <article className={styles.preview}>
        <div className={styles.artwork}>
          {event.image && brokenImage !== event.image ? <img src={event.image} alt={`${event.title} cover`} onError={() => setBrokenImage(event.image || null)} /> : <div className={styles.placeholder}><CalendarDays size={44} strokeWidth={1.3} /><span>Ideas meet opportunity.</span><small>{event.type}</small></div>}
          <button className={styles.photoButton} onClick={onPhoto}><ImagePlus size={16} /> Change Photo</button>
        </div>
        <div className={styles.previewBody}><span className={styles.eyebrow}>{event.type}</span><h2>{event.title}</h2><p>Hosted by <strong>{event.authorName || 'Event organizer'}</strong></p>
          <div className={styles.registration}><ShieldCheck size={19} /><div><strong>{event.requireApproval ? 'Approval required' : 'Open registration'}</strong><small>{event.requireApproval ? 'Review requests in the Guests tab.' : 'Guests can register directly.'}</small></div></div>
        </div>
        {shareable && <div className={styles.shareBar}><span>{url.replace(/^https?:\/\//, '')}</span><button onClick={copy} aria-label="Copy event link"><Copy size={16} /> Copy</button></div>}
      </article>
      <div className={styles.details}>
        <h2>When &amp; Where</h2>
        <div className={styles.detailRow}><div className={styles.dateTile}><small>{schedule.month}</small><strong>{schedule.day}</strong></div><div><h3>{schedule.date}</h3><p>{schedule.time}</p></div></div>
        <div className={styles.detailRow}><span className={styles.detailIcon}>{event.locationType === 'virtual' ? <Video size={23} /> : <MapPin size={23} />}</span><div><h3>{event.locationType === 'virtual' ? 'Virtual event' : 'Physical event'}</h3>
          {event.locationType === 'physical' ? <p>Venue details not provided.</p> : <>{meetingLink ? <a href={meetingLink} target="_blank" rel="noopener noreferrer">Open meeting <ArrowUpRight size={14} /></a> : <p>Meeting link not available yet.</p>}</>}
        </div></div>
        {event.calendarSyncStatus === 'pending' && <p className={styles.notice} role="status">Calendar syncing. Updates will appear here when ready.</p>}
        {event.calendarSyncStatus === 'failed' && <p className={styles.notice} role="status">Calendar needs attention. Your event is saved; calendar synchronization failed.</p>}
        <div className={styles.capacity}><Users size={20} /><div><strong>{event.attendeeCount || 0} going{event.capacity ? ` / ${event.capacity} places` : ''}</strong><small>{event.capacity ? 'Approved guests count toward capacity.' : 'Unlimited capacity'}</small></div></div>
        <button className={styles.primaryButton} onClick={onGuests}>Manage Guests <ArrowUpRight size={16} /></button>
        <div className={styles.about}><h2>About this event</h2><p>{event.description || 'No description provided yet.'}</p></div>
      </div>
    </div>
    {share && shareable && <div className={styles.shareFeedback} role="status">{share === 'copied' ? 'Event link copied.' : <label>Copy this event link:<input readOnly value={url} onFocus={e => e.currentTarget.select()} autoFocus /></label>}</div>}
  </>;
};
export default EventOverview;
