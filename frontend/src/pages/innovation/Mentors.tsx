import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { innovationService } from '../../services/innovationService';
import { Mentor } from '../../types/innovation';
import styles from './Innovation.module.css';
import InnovationModal from './InnovationModal';

const Mentors: React.FC = () => {
  const [items, setItems] = useState<Mentor[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [message, setMessage] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  useEffect(() => {
    innovationService.mentors().then(setItems).catch(() => {});
  }, []);

  const location = useLocation();
  const base = location.pathname.startsWith('/admin/innovation') ? '/admin/innovation' : '/innovation';

  const closeRequest = () => {
    if (requestSubmitting) return;
    setSelectedMentor(null);
    setMessage('');
    setRequestError('');
    setRequestSent(false);
  };

  const requestMentorship = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedMentor || !message.trim()) {
      setRequestError('Please describe what you would like help with.');
      return;
    }
    setRequestError('');
    setRequestSubmitting(true);
    try {
      await innovationService.requestMentor(selectedMentor._id, message.trim());
      setRequestSent(true);
    } catch (caught: any) {
      setRequestError(caught.response?.data?.error || 'Could not send the mentorship request. Please try again.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.title}>
        <div>
          <h2>Mentors</h2>
          <p>Find guidance from approved mentors in the hub.</p>
        </div>
      </div>
      <div className={styles.projectGrid}>
        {items.length ? items.map(m => (
          <div className={styles.projectCard} key={m._id}>
            <div className={styles.projectCardHeader}>
              <span className={styles.badge}>Mentor</span>
            </div>
            <h3 className={styles.projectCardTitle}>{m.user?.name} {m.user?.surname}</h3>
            <p className={styles.projectCardDesc}>{m.bio || 'Experienced innovation mentor.'}</p>
              <p className={styles.muted}>{(m.expertise || []).join(' \u00b7 ')}</p>
              <div className={styles.projectCardFooter}>
                <span className={styles.projectCardOwner}>{m.user?.faculty || ''}</span>
                <span className={styles.actions}>
                  <button className={styles.manageBtn} type="button" onClick={() => setSelectedMentor(m)}>Request mentorship</button>
                  <Link className={styles.manageBtn} to={`${base}/mentors/${m._id}`}>View profile</Link>
                </span>
              </div>
          </div>
        )) : <p className={styles.empty}>No mentors are available yet.</p>}
      </div>
      {selectedMentor && (
        <InnovationModal title={`Request mentorship from ${selectedMentor.user?.name || 'mentor'}`} description="Tell the mentor what you would like help with." onClose={closeRequest} busy={requestSubmitting} labelledBy="request-mentorship-title">
          {requestSent ? (
            <div className={styles.modalForm}><p className={styles.notice}>Request sent. You will be notified when the mentor responds.</p><footer className={styles.modalFooter}><button type="button" className={styles.button} onClick={closeRequest}>Close</button></footer></div>
          ) : (
            <form className={styles.modalForm} onSubmit={requestMentorship}>
              {requestError && <p className={styles.error} role="alert">{requestError}</p>}
              <label>Message<textarea required value={message} onChange={event => setMessage(event.target.value)} placeholder="What would you like help with?" /></label>
              <footer className={styles.modalFooter}><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={closeRequest} disabled={requestSubmitting}>Cancel</button><button type="submit" className={styles.button} disabled={requestSubmitting}>{requestSubmitting ? 'Sending...' : 'Send request'}</button></footer>
            </form>
          )}
        </InnovationModal>
      )}
    </>
  );
};

export default Mentors;
