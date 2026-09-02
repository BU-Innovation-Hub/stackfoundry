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
            <p>Ideas becoming real-world impact.</p>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.ideaGrid}>
          {items.length ? items.map(s => (
            <div className={styles.ideaCard} key={s._id}>
              <div className={styles.ideaCardHeader}>
                <span className={styles.badge}>Showcase</span>
              </div>
              <h3 className={styles.ideaCardTitle}>{s.title || s.idea?.title}</h3>
              <p className={styles.ideaCardDesc}>{s.summary || s.idea?.solution || s.idea?.problem}</p>
              <div className={styles.ideaCardFooter}>
                <span className={styles.ideaCardOwner}>Published</span>
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
              <h2>{s.title || s.idea?.title}</h2>
              <p>{s.summary || s.idea?.solution}</p>
            </div>
            <article className={styles.card}>
              <h3>The opportunity</h3>
              <p>{s.idea?.problem}</p>
            </article>
          </>
        ) : (
          <p className={styles.empty}>Loading showcase item...</p>
        )}
      </main>
    </div>
  );
};
