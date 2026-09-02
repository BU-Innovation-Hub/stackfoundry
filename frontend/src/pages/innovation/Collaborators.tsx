import React, { useEffect, useState } from 'react';
import { Search, Mail } from 'lucide-react';
import { innovationService } from '../../services/innovationService';
import { Collaborator } from '../../types/innovation';
import styles from './Innovation.module.css';

const Collaborators: React.FC = () => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const search = async (value = '') => { setLoading(true); try { setItems(await innovationService.collaborators(value)); } catch { setItems([]); } finally { setLoading(false); } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { search(); }, []);

  return (
    <>
      <div className={styles.title}>
        <div>
          <h2>Find collaborators</h2>
          <p>Only members who opt in to collaboration appear here.</p>
        </div>
      </div>
      <form className={styles.actions} onSubmit={e => { e.preventDefault(); search(query); }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by skill, faculty or interest" />
        <button className={styles.button}><Search size={16} /> Search</button>
      </form>
      {loading ? <p className={styles.empty}>Searching...</p> : (
        <div className={styles.ideaGrid}>
          {items.length ? items.map(item => (
            <div className={styles.ideaCard} key={item._id}>
              <div className={styles.ideaCardHeader}>
                <span className={styles.badge}>Collaborator</span>
              </div>
              <h3 className={styles.ideaCardTitle}>{item.name} {item.surname}</h3>
              <p className={styles.ideaCardDesc}>{item.faculty || item.department || 'Innovation community member'}</p>
              <p className={styles.muted}>{(item.skills || []).join(' \u00b7 ')}</p>
              <div className={styles.ideaCardFooter}>
                <span className={styles.ideaCardOwner}><Mail size={12} /> {item.email}</span>
                <a className={styles.manageBtn} href={`mailto:${item.email}`}>Contact</a>
              </div>
            </div>
          )) : <p className={styles.empty}>No opted-in collaborators found.</p>}
        </div>
      )}
    </>
  );
};

export default Collaborators;
