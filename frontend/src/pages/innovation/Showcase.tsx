import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { innovationService } from '../../services/innovationService';
import { Showcase as ShowcaseItem } from '../../types/innovation';
import styles from './Innovation.module.css';

export const Showcase: React.FC = () => {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  useEffect(() => {
    innovationService.showcase().then(setItems).catch(() => {});
  }, []);

  return (
    <div className={styles.layout}>
      <header className={styles.top}>
        <div className={styles.brand}>
          <div>
            <h1>Innovation showcase</h1>
            <p>Projects becoming real-world impact.</p>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.projectGrid}>
          {items.length ? items.map(s => (
            <div className={styles.projectCard} key={s._id}>
              <div className={styles.projectCardHeader}>
                <span className={styles.badge}>Showcase</span>
              </div>
              <h3 className={styles.projectCardTitle}>{s.title || s.project?.title}</h3>
              <p className={styles.projectCardDesc}>{s.summary || s.project?.solution || s.project?.problem}</p>
              <div className={styles.projectCardFooter}>
                <span className={styles.projectCardOwner}>Published</span>
                <Link className={styles.manageBtn} to={`/showcase/${s._id}`}>View</Link>
              </div>
            </div>
          )) : <p className={styles.empty}>The showcase is being curated.</p>}
        </div>
      </main>
    </div>
  );
};

export const ShowcaseDetail: React.FC = () => {
  const { id } = useParams();
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  useEffect(() => {
    innovationService.showcase().then(setItems).catch(() => {});
  }, []);
  const s = items.find(x => x._id === id);

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        {s ? (
          <>
            <Link to="/showcase" className={styles.homeLink}>Back to showcase</Link>
            <div className={styles.hero}>
              <h2>{s.title || s.project?.title}</h2>
              <p>{s.summary || s.project?.solution}</p>
            </div>
            <article className={styles.card}>
              <h3>The opportunity</h3>
              <p>{s.project?.problem}</p>
            </article>
          </>
        ) : (
          <p className={styles.empty}>Loading showcase item...</p>
        )}
      </main>
    </div>
  );
};
