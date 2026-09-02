import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { innovationService } from '../../services/innovationService';
import { Mentor } from '../../types/innovation';
import styles from './Innovation.module.css';

const Mentors: React.FC = () => {
  const [items, setItems] = useState<Mentor[]>([]);
  useEffect(() => {
    innovationService.mentors().then(setItems).catch(() => {});
  }, []);

  const location = useLocation();
  const base = location.pathname.startsWith('/admin/innovation') ? '/admin/innovation' : '/innovation';

  return (
    <>
      <div className={styles.title}>
        <div>
          <h2>Mentors</h2>
          <p>Find guidance from approved mentors in the hub.</p>
        </div>
      </div>
      <div className={styles.ideaGrid}>
        {items.length ? items.map(m => (
          <div className={styles.ideaCard} key={m._id}>
            <div className={styles.ideaCardHeader}>
              <span className={styles.badge}>Mentor</span>
            </div>
            <h3 className={styles.ideaCardTitle}>{m.user?.name} {m.user?.surname}</h3>
            <p className={styles.ideaCardDesc}>{m.bio || 'Experienced innovation mentor.'}</p>
            <p className={styles.muted}>{(m.expertise || []).join(' \u00b7 ')}</p>
            <div className={styles.ideaCardFooter}>
              <span className={styles.ideaCardOwner}>{m.user?.faculty || ''}</span>
              <Link className={styles.manageBtn} to={`${base}/mentors/${m._id}`}>View profile</Link>
            </div>
          </div>
        )) : <p className={styles.empty}>No mentors are available yet.</p>}
      </div>
    </>
  );
};

export default Mentors;
