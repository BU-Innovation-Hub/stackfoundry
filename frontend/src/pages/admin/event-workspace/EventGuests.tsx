import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { AdminEvent, decideEventGuest, eventErrorMessage, getEventGuests } from '../../../services/adminEventService';
import { useAdminEventResource } from '../../../hooks/useAdminEventResource';
import Pagination from '../../../components/common/Pagination';
import styles from '../EventWorkspace.module.css';

const EventGuests: React.FC<{ event: AdminEvent; version: number; onChanged: () => void }> = ({ event, version, onChanged }) => {
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const pending = useRef(new Set<string>());
  const [decisionError, setDecisionError] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const fetchGuests = useCallback((signal: AbortSignal) => getEventGuests(event._id, page, signal), [event._id, page]);
  const { data, loading, error, reload } = useAdminEventResource(fetchGuests, version, 'Unable to load guests. Please retry.');
  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    if (pending.current.has(id)) return;
    pending.current.add(id); setBusy(new Set(pending.current)); setDecisionError('');
    try { await decideEventGuest(event._id, id, decision); }
    catch (cause) { if (alive.current) setDecisionError(eventErrorMessage(cause, 'Unable to update this guest. Please retry.')); }
    finally {
      pending.current.delete(id);
      if (alive.current) { setBusy(new Set(pending.current)); onChanged(); }
    }
  };
  return <div className={styles.panel}>
    <div className={styles.panelHeading}><div><h2>Guests {data && <span className={styles.count}>{data.pagination.total}</span>}</h2><p>Everyone who has requested a place at your event.</p></div><Users size={23} /></div>
    {decisionError && <div role="alert" className={styles.error}>{decisionError}</div>}
    {error && <div role="alert" className={styles.error}>{error} <button onClick={reload}>Retry guests</button></div>}
    {loading ? <div className={styles.state} role="status">Loading guests…</div> : !error && data && <>
      {data.data.length === 0 ? <div className={styles.state}><Users size={30} /><h3>No guests yet</h3><p>Registration requests will appear here.</p></div> : <div className={styles.tableWrap}><table className={styles.guestTable}>
        <thead><tr><th>Guest</th><th>Requested</th><th>Status</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead>
        <tbody>{data.data.map(guest => {
          const name = [guest.user?.name, guest.user?.surname].filter(Boolean).join(' ') || 'Unavailable user';
          const date = new Date(guest.requestedAt || '');
          return <tr key={guest._id}><td><div className={styles.person}><span className={styles.avatar} aria-hidden="true">{name.charAt(0)}</span><div><strong>{name}</strong><small>{guest.user?.email || 'Email unavailable'}</small></div></div></td>
            <td>{Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            <td><span className={styles.badge} data-status={guest.status}>{guest.status}</span></td>
            <td>{event.requireApproval && guest.status === 'pending' && <div className={styles.rowActions} aria-label={`Actions for ${name}`}><button disabled={busy.has(guest._id)} className={styles.approve} onClick={() => decide(guest._id, 'approved')}>{busy.has(guest._id) ? 'Saving…' : 'Approve'}</button><button disabled={busy.has(guest._id)} className={styles.button} onClick={() => decide(guest._id, 'rejected')}>Reject</button></div>}</td>
          </tr>;
        })}</tbody>
      </table></div>}
      <Pagination meta={data.pagination} onPageChange={setPage} />
    </>}
  </div>;
};
export default EventGuests;
