import React, { useEffect, useId, useRef, useState } from 'react';
import { Camera, CheckCircle, Keyboard, QrCode, X } from 'lucide-react';
import { CheckInResult, submitCheckIn } from '../../services/eventCheckInService';
import styles from './AttendanceCheckIn.module.css';

interface Props {
  eventId: string;
  slug: string;
  initialToken?: string;
  checkedInAt?: string | null;
  onConfirmed?: (result: CheckInResult) => void;
}

const AttendanceCheckIn: React.FC<Props> = ({ eventId, slug, initialToken = '', checkedInAt, onConfirmed }) => {
  const id = useId();
  const [manualOpen, setManualOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [token, setToken] = useState(initialToken);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [manualLocked, setManualLocked] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const pending = useRef(false);
  const alive = useRef(true);
  const confirmedAt = result?.checkedInAt || checkedInAt;

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setToken(initialToken); }, [initialToken]);
  useEffect(() => {
    if (!manualOpen) return;
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    input.current?.focus();
    return () => { element?.close(); previousFocus?.focus(); };
  }, [manualOpen]);

  useEffect(() => {
    if (!cameraOpen || confirmedAt) return;
    let cancelled = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const stop = () => stream?.getTracks().forEach(track => track.stop());
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        const { default: decode } = await import('jsqr');
        if (cancelled) return;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled) { stop(); return; }
        const player = video.current;
        if (!player) { stop(); return; }
        player.srcObject = stream;
        await player.play();
        if (cancelled) { stop(); return; }
        setCameraReady(true);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('unsupported');
        const scan = () => {
          if (cancelled) return;
          try {
            if (player.readyState >= 2 && player.videoWidth) {
              canvas.width = Math.min(640, player.videoWidth);
              canvas.height = Math.round(player.videoHeight * canvas.width / player.videoWidth);
              context.drawImage(player, 0, 0, canvas.width, canvas.height);
              const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
              const found = decode(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'dontInvert' });
              if (found) {
                const url = new URL(found.data, window.location.origin);
                const scanned = new URLSearchParams(url.hash.slice(1)).get('token') || '';
                if (url.origin === window.location.origin && url.pathname === `/events/${encodeURIComponent(slug)}/check-in` && /^\d{1,12}\.[a-f0-9]{64}$/.test(scanned)) {
                  stop(); setToken(scanned); setCameraOpen(false); setError(''); return;
                }
                setError('This QR code is not for this event. Scan the live attendance QR shown by the organizer.');
              }
            }
          } catch { /* Keep scanning when a frame or unrelated QR cannot be read. */ }
          timer = setTimeout(scan, 200);
        };
        scan();
      } catch (cause) {
        stop();
        if (!cancelled) {
          setCameraOpen(false);
          setError(cause instanceof Error && cause.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow camera access in your browser, or enter the code manually.'
            : 'Unable to open the camera. Try your phone camera to scan the QR, or enter the code manually.');
        }
      }
    };
    void start();
    const hide = () => { if (document.hidden) { stop(); setCameraOpen(false); } };
    document.addEventListener('visibilitychange', hide);
    return () => { cancelled = true; clearTimeout(timer); stop(); document.removeEventListener('visibilitychange', hide); };
  }, [cameraOpen, confirmedAt, slug]);

  const submit = async (method: 'qr' | 'manual') => {
    if (pending.current || (method === 'manual' && (manualLocked || !/^\d{3}$/.test(code)))) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const confirmed = await submitCheckIn(eventId, method === 'qr' ? { token } : { code });
      if (alive.current) {
        setResult(confirmed); setManualOpen(false); setCameraOpen(false); setToken(''); setCode('');
        onConfirmed?.(confirmed);
      }
    } catch (cause: any) {
      if (alive.current) {
        setError(cause.response?.data?.error || 'Attendance could not be confirmed. Check your connection and retry.');
        if (cause.response?.status === 429 && method === 'manual') setManualLocked(true);
      }
    } finally { pending.current = false; if (alive.current) setBusy(false); }
  };

  if (confirmedAt) return <section className={styles.success} role="status"><CheckCircle size={24} /><div><h3>Attendance confirmed</h3><p>Checked in {new Date(confirmedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}. You only need to check in once.</p></div></section>;

  return <section className={styles.card} aria-labelledby={`${id}-title`}>
    <div className={styles.heading}><span className={styles.icon}><QrCode size={23} /></span><div><h3 id={`${id}-title`}>Confirm your attendance</h3><p>At the venue? Scan the organizer’s live QR code or enter the three-digit code.</p></div></div>
    {error && !manualOpen && <p className={styles.error} role="alert">{error}</p>}
    {token && <div className={styles.scanResult}><p role="status">QR code ready. Confirm to record your attendance.</p><button className={styles.primary} disabled={busy} onClick={() => submit('qr')}>{busy ? 'Confirming…' : 'Confirm attendance'}</button></div>}
    {cameraOpen && <div className={styles.camera}><video ref={video} muted playsInline aria-label="Attendance QR scanner" /><p role="status">{cameraReady ? 'Point your camera at the live QR code.' : 'Opening camera…'}</p></div>}
    <div className={styles.actions}>
      <button className={styles.primary} disabled={busy} onClick={() => { setError(''); setCameraReady(false); setCameraOpen(value => !value); }}><Camera size={17} />{cameraOpen ? 'Close camera' : 'Open camera'}</button>
      <button className={styles.secondary} disabled={busy} onClick={() => { setCameraOpen(false); setError(''); setCode(''); setManualOpen(true); }}><Keyboard size={17} />Enter code manually</button>
    </div>
    <p className={styles.note}>Check-in opens 15 minutes before the event and closes at its scheduled end. The organizer must open check-in.</p>
    {manualOpen && <dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-modal-title`} aria-describedby={`${id}-help`} onCancel={e => { e.preventDefault(); if (!busy) setManualOpen(false); }} onClick={e => { if (e.target === e.currentTarget && !busy) setManualOpen(false); }}>
      <div className={styles.modalHeader}><h2 id={`${id}-modal-title`}>Enter attendance code</h2><button type="button" className={styles.close} disabled={busy} aria-label="Close code entry" onClick={() => setManualOpen(false)}><X size={20} /></button></div>
      <p id={`${id}-help`}>Ask the organizer for the current three-digit code. You have five manual submissions per event.</p>
      <form onSubmit={e => { e.preventDefault(); void submit('manual'); }}>
        <label htmlFor={`${id}-code`}>Three-digit attendance code</label>
        <input ref={input} id={`${id}-code`} className={styles.codeInput} inputMode="numeric" autoComplete="off" pattern="[0-9]{3}" maxLength={3} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="000" disabled={busy || manualLocked} aria-describedby={`${id}-help`} required />
        {error && <p className={styles.error} role="alert">{error}</p>}
        {manualLocked && <p role="status">Manual entry is locked for this event. Close this dialog and scan the live QR to check in.</p>}
        <div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={() => setManualOpen(false)}>Cancel</button><button className={styles.primary} type="submit" disabled={busy || manualLocked || !/^\d{3}$/.test(code)}>{busy ? 'Confirming…' : 'Submit code'}</button></div>
      </form>
    </dialog>}
  </section>;
};

export default AttendanceCheckIn;
