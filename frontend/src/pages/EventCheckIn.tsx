import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Loader from '../components/common/Loader';
import { IEvent } from '../types/event';
import { EventAttendance, getEventBySlug, getMyEventAttendance } from '../services/eventService';
import AttendanceCheckIn from '../components/events/AttendanceCheckIn';
import styles from './EventCheckIn.module.css';

const EventCheckIn: React.FC = () => {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [event, setEvent] = useState<IEvent | null>(null);
  const [attendance, setAttendance] = useState<EventAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [retry, setRetry] = useState(0);
  const storageKey = `event-check-in:${slug}`;
  const returnPath = `/events/${encodeURIComponent(slug)}/check-in`;

  useEffect(() => {
    const scanned = new URLSearchParams(location.hash.slice(1)).get('token');
    try {
      if (scanned !== null) {
        if (/^\d{1,12}\.[a-f0-9]{64}$/.test(scanned)) {
          sessionStorage.setItem(storageKey, JSON.stringify({ token: scanned, capturedAt: Date.now() }));
          setToken(scanned);
        } else { sessionStorage.removeItem(storageKey); setToken(''); setError('This scan is invalid. Scan the live QR again or enter the three-digit code.'); }
      } else {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
        if (saved && Date.now() - saved.capturedAt < 120000 && /^\d{1,12}\.[a-f0-9]{64}$/.test(saved.token)) setToken(saved.token);
        else { sessionStorage.removeItem(storageKey); setToken(''); }
      }
    } catch { setToken(scanned && /^\d{1,12}\.[a-f0-9]{64}$/.test(scanned) ? scanned : ''); }
    if (location.hash) navigate(returnPath, { replace: true });
  }, [location.hash, navigate, returnPath, storageKey]);

  useEffect(() => {
    let cancelled = false;
    if (isLoading) return;
    setLoading(true); setAttendance(null);
    (async () => {
      try {
        const found = await getEventBySlug(slug);
        const registration = isAuthenticated && user?.role === 'student' ? await getMyEventAttendance(found._id) : null;
        if (!cancelled) { setEvent(found); setAttendance(registration); }
      } catch (cause: any) { if (!cancelled) setError(cause.response?.data?.error || 'Unable to load attendance. Please retry.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [slug, isLoading, isAuthenticated, user?.id, user?.role, retry]);

  const signIn = () => {
    try { sessionStorage.setItem('redirectAfterLogin', returnPath); } catch { /* login also supports route state */ }
    navigate('/login', { state: { from: { pathname: returnPath } } });
  };
  const confirmedAt = attendance?.checkedInAt;
  const eligible = event?.locationType === 'physical' && !event.registrationLink;
  return <div className={styles.page}><Navbar /><main className={styles.card}>
    <Link to={`/events/${encodeURIComponent(slug)}`} className={styles.back}>Back to event</Link>
    <h1>{event ? `Attendance: ${event.title}` : 'Event attendance'}</h1>
    {error && <div className={styles.error} role="alert">{error}</div>}
    {isLoading || loading ? <Loader text="Loading attendance…" /> : !event ? <button onClick={() => { setError(''); setRetry(value => value + 1); }}>Retry</button>
      : !isAuthenticated ? <><p>Sign in with your student account to confirm attendance.</p><button onClick={signIn}>Sign in to check in</button></>
      : user?.role !== 'student' ? <p>Attendance check-in is available to students only.</p>
      : confirmedAt ? <div className={styles.success} role="status"><h2>Attendance confirmed</h2><p>Your attendance was recorded at {new Date(confirmedAt).toLocaleString()}.</p><p>You only need to check in once.</p></div>
      : !eligible ? <p>Check-in is only available for physical events with registration through this website.</p>
      : attendance?.status !== 'approved' ? <><p>{attendance?.status === 'pending' ? 'Your registration is awaiting organizer approval.' : 'You need an approved registration before checking in.'}</p><Link to={`/events/${encodeURIComponent(slug)}`}>View your registration</Link><button onClick={() => { setError(''); setRetry(value => value + 1); }}>Refresh registration</button></>
      : <AttendanceCheckIn eventId={event._id} slug={slug} initialToken={token} onConfirmed={() => {
        setToken('');
        try { sessionStorage.removeItem(storageKey); } catch { /* Attendance is still confirmed. */ }
      }} />}
  </main><Footer /></div>;
};
const EventCheckInRoute: React.FC = () => {
  const { slug } = useParams();
  return <EventCheckIn key={slug} />;
};
export default EventCheckInRoute;
