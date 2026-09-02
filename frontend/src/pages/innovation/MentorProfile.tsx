import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { innovationService } from '../../services/innovationService';
import { Mentor } from '../../types/innovation';
import styles from './Innovation.module.css';

const MentorProfilePage: React.FC = () => {
  const { id } = useParams();
  const [m, setM] = useState<Mentor | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    innovationService.mentors()
      .then(xs => setM(xs.find(x => x._id === id) || null))
      .catch(() => setError('Could not load mentor profile.'));
  }, [id]);

  if (!m) return error ? <p className={styles.error}>{error}</p> : <p className={styles.empty}>Loading mentor profile...</p>;

  return (
    <>
      <div className={styles.hero}>
        <h2>{m.user.name} {m.user.surname}</h2>
        <p>{m.bio || 'Mentor profile'}</p>
        <p>{(m.expertise || []).join(' \u00b7 ')}</p>
      </div>
      <div className={styles.card}>
        <h3>Request mentorship</h3>
        {sent ? (
          <p className={styles.notice}>Request sent. You will be notified when the mentor responds.</p>
        ) : (
          <form
            className={styles.form}
            onSubmit={async e => {
              e.preventDefault();
              setError('');
              try {
                await innovationService.requestMentor(id!, message);
                setSent(true);
              } catch {
                setError('Could not send request.');
              }
            }}
          >
            {error && <p className={styles.error}>{error}</p>}
            <label>
              Message
              <textarea required value={message} onChange={e => setMessage(e.target.value)} placeholder="What would you like help with?" />
            </label>
            <button className={styles.button}>Send request</button>
          </form>
        )}
      </div>
    </>
  );
};

export default MentorProfilePage;
