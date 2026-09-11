import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { innovationService } from '../../services/innovationService';
import { Mentor } from '../../types/innovation';
import styles from './Innovation.module.css';
import InnovationModal from './InnovationModal';

const MentorProfilePage: React.FC = () => {
  const { id } = useParams();
  const [m, setM] = useState<Mentor | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    innovationService.mentors()
      .then(xs => setM(xs.find(x => x._id === id) || null))
      .catch(() => setError('Could not load mentor profile.'));
  }, [id]);

  if (!m) return error ? <p className={styles.error}>{error}</p> : <p className={styles.empty}>Loading mentor profile...</p>;

  const closeRequest = () => {
    if (submitting) return;
    setShowRequest(false);
    setMessage('');
    setError('');
    setSent(false);
  };

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !message.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      await innovationService.requestMentor(id, message.trim());
      setSent(true);
    } catch (caught: any) {
      setError(caught.response?.data?.error || 'Could not send request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.hero}>
        <h2>{m.user.name} {m.user.surname}</h2>
        <p>{m.bio || 'Mentor profile'}</p>
        <p>{(m.expertise || []).join(' \u00b7 ')}</p>
        <button className={styles.button} type="button" onClick={() => setShowRequest(true)}>Request mentorship</button>
      </div>
      {showRequest && <InnovationModal title={`Request mentorship from ${m.user.name}`} description="Tell the mentor what you would like help with." onClose={closeRequest} busy={submitting} labelledBy="mentor-profile-request-title">
        {sent ? <div className={styles.modalForm}><p className={styles.notice}>Request sent. You will be notified when the mentor responds.</p><footer className={styles.modalFooter}><button type="button" className={styles.button} onClick={closeRequest}>Close</button></footer></div> : <form className={styles.modalForm} onSubmit={submitRequest}>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <label>Message<textarea required value={message} onChange={e => setMessage(e.target.value)} placeholder="What would you like help with?" /></label>
          <footer className={styles.modalFooter}><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={closeRequest} disabled={submitting}>Cancel</button><button type="submit" className={styles.button} disabled={submitting}>{submitting ? 'Sending...' : 'Send request'}</button></footer>
        </form>}
      </InnovationModal>}
    </>
  );
};

export default MentorProfilePage;
