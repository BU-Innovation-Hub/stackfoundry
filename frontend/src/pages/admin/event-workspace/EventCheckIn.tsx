import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CircleCheck, CircleOff, Clock3, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AdminEvent, eventErrorMessage, eventErrorStatus } from '../../../services/adminEventService';
import { CheckInSession, getCheckInSession, setCheckInSession } from '../../../services/eventCheckInService';
import styles from '../EventWorkspace.module.css';
import checkInStyles from './EventCheckIn.module.css';

const EventCheckIn: React.FC<{ event: AdminEvent; onChanged: () => void; onGuests?: () => void }> = ({ event, onChanged, onGuests = () => undefined }) => {
  const [data, setData] = useState<CheckInSession | null>(null);
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [visible, setVisible] = useState(document.visibilityState !== 'hidden');
  const offset = useRef(0);
  const alive = useRef(true);
  const pending = useRef(false);
  const request = useRef(0);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const visibility = () => {
      const shown = document.visibilityState !== 'hidden';
      setVisible(shown);
      if (shown) { setData(null); setReload(value => value + 1); }
      else { request.current += 1; setData(null); }
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    if (!visible || busy) return;
    const controller = new AbortController();
    const sequence = ++request.current;
    setLoading(true); setError(''); setErrorStatus(undefined);
    const listen = async () => {
      try {
        let revision: string | undefined;
        while (!controller.signal.aborted && sequence === request.current) {
          const result = await getCheckInSession(event._id, controller.signal, revision);
          if (controller.signal.aborted || sequence !== request.current) return;
          // Stop instead of issuing immediate repeat requests if a stale API
          // instance does not yet support live attendance revisions.
          if (typeof result.revision !== 'string' || !/^\d{1,16}:\d{1,16}$/.test(result.revision)) throw new Error('Invalid attendance response');
          offset.current = new Date(result.serverTime).getTime() - Date.now();
          setNow(Date.now() + offset.current); setData(result); setLoading(false);
          revision = result.revision;
        }
      } catch (cause) {
        if (!controller.signal.aborted && sequence === request.current) {
          setData(null); setError(eventErrorMessage(cause, 'Unable to refresh attendance. Please retry.')); setErrorStatus(eventErrorStatus(cause));
          setLoading(false);
        }
      }
    };
    void listen();
    return () => controller.abort();
  }, [event._id, event.revision, reload, visible, busy]);
  useEffect(() => {
    if (!visible) return;
    const timer = window.setInterval(() => setNow(Date.now() + offset.current), 1000);
    return () => window.clearInterval(timer);
  }, [visible]);

  const toggle = async () => {
    if (pending.current || !data) return;
    pending.current = true; setBusy(true); setError(''); setData(null); request.current += 1;
    let saved = false;
    try {
      const result = await setCheckInSession(event._id, !data.enabled);
      if (alive.current && visible) {
        offset.current = new Date(result.serverTime).getTime() - Date.now();
        setNow(Date.now() + offset.current); setData(result); onChanged(); saved = true;
      }
    } catch (cause) {
      if (alive.current) { setData(null); setError(eventErrorMessage(cause, 'Unable to update check-in. Please retry.')); setErrorStatus(eventErrorStatus(cause)); }
    } finally {
      pending.current = false;
      if (alive.current) { setBusy(false); if (!saved && visible) setReload(value => value + 1); }
    }
  };

  const start = new Date(event.startDate || event.eventDate).getTime();
  const end = new Date(event.endDate || '').getTime();
  const validSchedule = Number.isFinite(start) && Number.isFinite(end) && end > start;
  const current = Boolean(visible && !loading && data?.enabled && data.qrUrl && data.refreshAt && now < new Date(data.refreshAt).getTime());
  const statusLabel = loading ? 'Refreshing' : error ? errorStatus === 403 ? 'Permission required' : errorStatus === 401 ? 'Session expired' : 'Connection error' : !validSchedule ? 'Schedule incomplete' : !data?.available ? (data?.reason?.includes('ended') ? 'Ended' : data?.reason?.includes('opens') ? 'Scheduled' : 'Unavailable') : data.enabled ? 'Check-in open' : 'Check-in closed';
  const statusIcon = data?.enabled ? <CircleCheck size={15} /> : !validSchedule || error ? <AlertCircle size={15} /> : <CircleOff size={15} />;

  return <div className={styles.panel}>
    <div className={styles.panelHeading}>
      <div><div className={checkInStyles.titleRow}><h2>Take attendance</h2><span className={checkInStyles.status} data-state={error ? errorStatus === 403 ? 'permission' : 'error' : data?.enabled ? 'open' : !validSchedule ? 'warning' : 'closed'}>{statusIcon}{statusLabel}</span></div>
        <p>Approved students scan the code at the venue to confirm attendance.</p></div>
      <button className={styles.button} onClick={onGuests}><Users size={16} /> View Guests</button>
    </div>
    {error && <div className={styles.error} role="alert">{error} {errorStatus !== 401 && errorStatus !== 403 && <button onClick={() => setReload(value => value + 1)}>Retry attendance</button>}</div>}
    {loading && <p role="status">Refreshing attendance…</p>}
    {!validSchedule && !loading && <div className={checkInStyles.scheduleWarning} role="status">Add an end date and time later than the start in event details before taking attendance.</div>}
    {data && <>
      <div className={checkInStyles.controls}>
        {data.opensAt && data.closesAt && <div className={checkInStyles.window}>
          <Clock3 size={19} aria-hidden="true" />
          <div><strong>Check-in window</strong>
            <div className={checkInStyles.windowDates}>
              <span><span className={checkInStyles.windowLabel}>Opens</span><time dateTime={data.opensAt}>{new Date(data.opensAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}<span className={checkInStyles.windowTime}>{new Date(data.opensAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</span></time></span>
              <span><span className={checkInStyles.windowLabel}>Closes</span><time dateTime={data.closesAt}>{new Date(data.closesAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}<span className={checkInStyles.windowTime}>{new Date(data.closesAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</span></time></span>
            </div>
          </div>
        </div>}
        {(data.available || data.enabled) && <button className={styles.primaryButton} disabled={busy || loading} onClick={toggle}>{busy ? 'Saving...' : data.enabled ? 'Close check-in' : 'Open check-in'}</button>}
      </div>
      {!data.available && <p role="status">{data.reason}</p>}
      {data.available && !data.enabled && <p>Check-in is closed. Open it when students are ready to check in.</p>}
      {current && <div className={checkInStyles.display}>
        <div className={checkInStyles.qr}><QRCodeSVG value={data.qrUrl!} size={280} marginSize={4} level="M" title={`Attendance QR for ${event.title}`} /></div>
        <div><h3>Camera not working?</h3><p>Open this event on your phone, select <strong>Enter code manually</strong>, and enter:</p>
          <p className={checkInStyles.code} aria-label={`Manual attendance code: ${data.code}`}>{data.code}</p>
          <p role="timer">New code in {Math.max(0, Math.ceil((new Date(data.refreshAt!).getTime() - now) / 1000))} seconds</p>
          <p>Students have five manual submissions per event. QR scanning remains available.</p></div>
      </div>}
      {data.enabled && <p className={checkInStyles.live} role="status">Check-in is live. Keep this screen visible at the venue; a new QR and code appear after every successful check-in.</p>}
      <p className={checkInStyles.note}>Students can scan the QR code or enter the three-digit code from their event page. Check-in records appear in Guests.</p>
    </>}
  </div>;
};
export default EventCheckIn;
