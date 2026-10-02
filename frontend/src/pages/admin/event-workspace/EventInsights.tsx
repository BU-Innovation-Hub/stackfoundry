import React, { useCallback } from 'react';
import { Eye, Users, Clock, PieChart } from 'lucide-react';
import { getEventInsights } from '../../../services/adminEventService';
import { useAdminEventResource } from '../../../hooks/useAdminEventResource';
import styles from '../EventWorkspace.module.css';

const statuses = ['approved', 'pending', 'rejected', 'cancelled'] as const;
const EventInsights: React.FC<{ eventId: string; version: number }> = ({ eventId, version }) => {
  const fetchInsights = useCallback((signal: AbortSignal) => getEventInsights(eventId, signal), [eventId]);
  const { data, loading, error, reload } = useAdminEventResource(fetchInsights, version, 'Unable to load insights. Please retry.');
  const total = data ? statuses.reduce((sum, status) => sum + data.attendance[status], 0) : 0;
  return <>
    {error && <div role="alert" className={styles.error}>{error} <button onClick={reload}>Retry insights</button></div>}
    {loading ? <div role="status" className={styles.state}>Loading insights…</div> : !error && data && <>
      <div className={styles.metrics}>
        <div><Eye size={21} /><span>Page views</span><strong>{data.views.toLocaleString()}</strong><small>Recorded page views</small></div>
        <div><Users size={21} /><span>Approved guests</span><strong>{data.attendance.approved.toLocaleString()}</strong><small>Currently going</small></div>
        <div><Clock size={21} /><span>Pending requests</span><strong>{data.attendance.pending.toLocaleString()}</strong><small>Awaiting a decision</small></div>
        <div><PieChart size={21} /><span>Capacity utilization</span><strong>{data.capacity ? `${Math.round(data.attendance.approved / data.capacity * 100)}%` : 'Unlimited'}</strong><small>{data.capacity ? `${data.attendance.approved} of ${data.capacity} places filled` : 'Unlimited capacity'}</small></div>
      </div>
      <div className={styles.panel}><div className={styles.panelHeading}><div><h2>Registration breakdown</h2><p>Current registration statuses across all {total} guests.</p></div></div>
        <div className={styles.breakdown}>{statuses.map(status => <div key={status} className={styles.barRow}><div><span className={styles.badge} data-status={status}>{status}</span><strong>{data.attendance[status]} <small>({total ? Math.round(data.attendance[status] / total * 100) : 0}%)</small></strong></div><div className={styles.barTrack} aria-hidden="true"><span data-status={status} style={{ width: `${total ? data.attendance[status] / total * 100 : 0}%` }} /></div></div>)}</div>
        {!total && <p className={styles.muted}>No registrations yet. These totals will update as guests register.</p>}
      </div>
    </>}
  </>;
};
export default EventInsights;
