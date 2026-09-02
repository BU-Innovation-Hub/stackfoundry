import React, { useEffect, useState } from 'react';
import { innovationService } from '../../services/innovationService';
import styles from '../innovation/Innovation.module.css';

const MentorProfileEditor: React.FC = () => {
  const [bio, setBio] = useState('');
  const [expertise, setExpertise] = useState('');
  const [availability, setAvailability] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    innovationService.mentors()
      .then(items => {
        const profile = items[0];
        if (profile) {
          setBio(profile.bio || '');
          setExpertise((profile.expertise || []).join(', '));
          setAvailability(profile.availability || '');
        }
      })
      .catch(() => setError('Could not load profile.'));
  }, []);

  return (
    <div>
      <div className={styles.title}>
        <div>
          <h2>Mentor Profile</h2>
          <p>Keep your expertise and availability visible to innovators.</p>
        </div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {saved && <p className={styles.notice}>Profile submitted for approval.</p>}
      <form
        className={styles.form}
        onSubmit={async event => {
          event.preventDefault();
          setError('');
          try {
            await innovationService.mentorProfile({ bio, expertise, availability });
            setSaved(true);
          } catch {
            setError('Could not save profile.');
          }
        }}
      >
        <label>Bio<textarea value={bio} onChange={event => setBio(event.target.value)} /></label>
        <label>Expertise<input value={expertise} onChange={event => setExpertise(event.target.value)} placeholder="AI, fintech, product design" /></label>
        <label>Availability<input value={availability} onChange={event => setAvailability(event.target.value)} placeholder="Office hours or response time" /></label>
        <button className={styles.button}>Save profile</button>
      </form>
    </div>
  );
};

export default MentorProfileEditor;
