import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { innovationService } from '../../services/innovationService';
import { Project } from '../../types/innovation';
import Loader from '../../components/common/Loader';
import styles from './Innovation.module.css';
import { useAuth } from '../../context/AuthContext';
import ProjectCreateModal from './ProjectCreateModal';

const avatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${hash}, 45%, 55%)`;
};

const initials = (user: any) => `${user?.name?.[0] || '?'}${user?.surname?.[0] || ''}`;

const ownerName = (project: Project) => {
  const o = project.owner;
  if (o && typeof o === 'object') return `${o.name || ''} ${o.surname || ''}`.trim() || 'Unknown';
  return 'Unknown';
};

const Projects: React.FC<{ mine?: boolean }> = ({ mine: mineProp }) => {
  const [items, setItems] = useState<Project[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [category] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const requestId = useRef(0);
  const { user } = useAuth();
  const location = useLocation();
  const base = location.pathname.startsWith('/admin/innovation') ? '/admin/innovation' : '/innovation';
  const mine = mineProp ?? location.pathname.endsWith('/my-projects');
  const canCreate = mine && (user?.role === 'student' || user?.role === 'member');

  const load = async (search = '') => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { ...(search ? { q: search } : {}), ...(category ? { category } : {}) };
      const data = mine ? await innovationService.myProjects(params) : await innovationService.exploreProjects(params);
      const pendingInvites = mine ? await innovationService.myInvites() : [];
      if (currentRequest !== requestId.current) return;
      setItems(data);
      if (mine) setInvites(pendingInvites);
    } catch {
      if (currentRequest === requestId.current) setError('Could not load projects.');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [mine, user?.role]);

  const respond = async (inviteId: string, accepted: boolean) => {
    setError('');
    try {
      await innovationService.respondInvitation(inviteId, accepted);
      setInvites(current => current.filter(item => item._id !== inviteId));
      await load(query);
    } catch (caught: any) {
      setError(caught.response?.data?.error || 'Could not update the invitation.');
    }
  };

  return (
    <>
      <div className={styles.title}>
        <div>
          <h2>{mine ? 'My Projects' : 'Explore'}</h2>
          <p>{mine ? 'Projects you own or collaborate on.' : 'Published projects from the community.'}</p>
        </div>
        {canCreate && <button className={styles.button} type="button" onClick={() => setShowCreate(true)}><Plus size={16} /> New project</button>}
      </div>

      <form className={styles.actions} onSubmit={e => { e.preventDefault(); load(query); }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects" />
        <button className={styles.button}><Search size={16} /> Search</button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {mine && invites.length > 0 && (
        <section className={styles.card} style={{ marginBottom: '1.5rem' }}>
          <h3>Pending invites</h3>
          {invites.map(item => (
            <div className={styles.row} key={item._id}>
              <span>
                <strong>{typeof item.project === 'object' ? item.project.title : 'Project'}</strong>
                <br />
                <span className={styles.muted}>Role: {item.role}</span>
              </span>
              <span className={styles.actions}>
                <button className={styles.button} onClick={() => respond(item._id, true)}>Accept</button>
                <button className={styles.button} onClick={() => respond(item._id, false)}>Decline</button>
              </span>
            </div>
          ))}
        </section>
      )}

      {loading ? (
        <Loader text="Loading projects..." />
      ) : (
        <section className={styles.projectSection} aria-label={mine ? 'My project cards' : 'Explore project cards'}><div className={styles.projectGrid}>
          {items.length ? items.map(item => (
            <div className={styles.projectCard} key={item._id}>
              <div className={styles.projectCardHeader}>
                <div className={styles.projectCardMeta}>
                  <span className={styles.badge}>{item.status?.replace(/_/g, ' ')}</span>
                  <span className={styles.badge}>{item.visibility}</span>
                  {typeof item.category === 'object' && item.category?.name && (
                    <span className={styles.projectCardCategory}>{item.category.name}</span>
                  )}
                </div>
              </div>
              <h3 className={styles.projectCardTitle}>{item.title}</h3>
              <p className={styles.projectCardDesc}>{item.problem || 'No problem statement yet.'}</p>
              <div className={styles.projectCardFooter} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                <span className={styles.projectCardOwner}>Owner: {ownerName(item)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {(item.collaborators || []).slice(0, 5).map((c, i) => (
                    <span
                      key={i}
                      title={`${c.user?.name || ''} ${c.user?.surname || ''} (${c.role})`}
                      style={{ width: 26, height: 26, borderRadius: '50%', background: avatarColor(`${c.user?.name || c.role}${i}`), color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}
                    >
                      {typeof c.user === 'object' ? initials(c.user) : c.role[0]?.toUpperCase()}
                    </span>
                  ))}
                  <span className={styles.muted}>{item.collaboratorCount ?? item.collaborators?.length ?? 0} collaborators</span>
                </div>
                <Link className={styles.manageBtn} to={`${base}/projects/${item._id}`}>Open</Link>
              </div>
            </div>
          )) : <p className={styles.empty}>{mine ? 'No projects yet. Create your first project.' : 'No published projects found.'}</p>}
        </div></section>
      )}
      {showCreate && <ProjectCreateModal onClose={() => setShowCreate(false)} onCreated={project => { setItems(current => [project, ...current]); setShowCreate(false); }} />}
    </>
  );
};

export default Projects;
