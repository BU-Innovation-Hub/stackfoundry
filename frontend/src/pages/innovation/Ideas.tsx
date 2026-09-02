import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { innovationService } from '../../services/innovationService';
import { Idea } from '../../types/innovation';
import Loader from '../../components/common/Loader';
import styles from './Innovation.module.css';
import { useAuth } from '../../context/AuthContext';

const Ideas: React.FC = () => {
  const [items, setItems] = useState<Idea[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const location = useLocation();
  const base = location.pathname.startsWith('/admin/innovation') ? '/admin/innovation' : '/innovation';
  const mine = location.pathname.endsWith('/my-ideas');

  const load = async (search = '') => {
    setLoading(true);
    try {
      setItems(await innovationService.ideas({
        ...(search ? { q: search } : {}),
        ...(mine ? { owner: 'me' } : {}),
        ...(user && ['innovation_hub_admin', 'system_admin'].includes(user.role) ? { moderation: 'true', visibility: 'all' } : {})
      }));
    } catch {
      setError('Could not load ideas.');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [mine, user?.role]);

  return (
    <>
      <div className={styles.title}>
        <div>
          <h2>{mine ? 'My Ideas' : 'Ideas'}</h2>
          <p>{mine ? 'Your innovation submissions and drafts.' : 'Explore your ideas and the wider innovation community.'}</p>
        </div>
        <Link className={styles.button} to={`${base}/ideas/new`}><Plus size={16} /> New idea</Link>
      </div>

      <form className={styles.actions} onSubmit={e => { e.preventDefault(); load(query); }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search ideas" />
        <button className={styles.button}><Search size={16} /> Search</button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <Loader text="Loading ideas..." />
      ) : (
        <div className={styles.ideaGrid}>
          {items.length ? items.map(item => (
            <div className={styles.ideaCard} key={item._id}>
              <div className={styles.ideaCardHeader}>
                <div className={styles.ideaCardMeta}>
                  <span className={styles.badge}>{item.status.replace('_', ' ')}</span>
                  {typeof item.category === 'object' && item.category?.name && (
                    <span className={styles.ideaCardCategory}>{item.category.name}</span>
                  )}
                </div>
              </div>
              <h3 className={styles.ideaCardTitle}>{item.title}</h3>
              <p className={styles.ideaCardDesc}>{item.problem || 'No problem statement yet.'}</p>
              <div className={styles.ideaCardFooter}>
                <span className={styles.ideaCardOwner}>
                  {typeof item.owner === 'object' ? `${item.owner?.name || ''} ${item.owner?.surname || ''}` : 'Unknown'}
                </span>
                <Link className={styles.manageBtn} to={`${base}/ideas/${item._id}`}>Manage</Link>
              </div>
            </div>
          )) : <p className={styles.empty}>No ideas found.</p>}
        </div>
      )}
    </>
  );
};

export default Ideas;
