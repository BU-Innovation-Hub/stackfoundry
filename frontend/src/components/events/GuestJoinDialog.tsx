import React, { useEffect, useRef, useState } from 'react';
import styles from './GuestJoinDialog.module.css';

interface Props { onClose: () => void; onMember: () => void; onGuest: (name: string, email: string) => Promise<void>; }
const GuestJoinDialog: React.FC<Props> = ({ onClose, onMember, onGuest }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const priorFocus = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null);
  const [step, setStep] = useState<'choice' | 'guest'>('choice');
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const restoreFocus = priorFocus.current;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') || [];
    focusable()[0]?.focus();
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const items = Array.from(focusable()); if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', handleKeys);
    return () => { document.body.style.overflow = priorOverflow; document.removeEventListener('keydown', handleKeys); restoreFocus?.focus(); };
  }, [onClose]);

  useEffect(() => {
    const nextFocus = step === 'guest'
      ? dialogRef.current?.querySelector<HTMLElement>('#guest-name')
      : dialogRef.current?.querySelector<HTMLElement>('[data-choice]');
    nextFocus?.focus();
  }, [step]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    try { await onGuest(name.trim(), email.trim()); }
    catch (cause: any) { setError(cause.response?.data?.error || 'Unable to create a guest account. Please try again.'); }
    finally { setBusy(false); }
  };

  return <div className={styles.backdrop} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="guest-dialog-title" ref={dialogRef}>
      <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>×</button>
      <h2 id="guest-dialog-title">Join this event</h2>
      {step === 'choice' ? <>
        <p>Choose how you would like to register.</p>
        <button data-choice className={styles.choice} onClick={onMember}><strong>Innovation Hub member</strong><span>Sign in to your account, then return to this event.</span></button>
        <button className={styles.choice} onClick={() => setStep('guest')}><strong>Join as a guest</strong><span>Use your name and email to get a temporary event account.</span></button>
      </> : <form onSubmit={submit}>
        <p>Your guest account stays active in this browser until the event ends.</p>
        {error && <div className={styles.error} role="alert">{error}</div>}
        <label htmlFor="guest-name">Name</label><input id="guest-name" value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={100} autoComplete="name" />
        <label htmlFor="guest-email">Email</label><input id="guest-email" type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} autoComplete="email" />
        <div className={styles.buttons}><button type="button" className={styles.secondary} onClick={() => setStep('choice')}>Back</button><button type="submit" disabled={busy}>{busy ? 'Joining…' : 'Continue as guest'}</button></div>
      </form>}
    </div>
  </div>;
};
export default GuestJoinDialog;
