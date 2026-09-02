import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { innovationService } from '../../services/innovationService';
import { Idea } from '../../types/innovation';
import Loader from '../../components/common/Loader';
import styles from './Innovation.module.css';

const teamRoles = ['viewer', 'researcher', 'developer', 'designer', 'business', 'advisor', 'co_owner'];

const IdeaDetail: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const base = location.pathname.startsWith('/admin/innovation') ? '/admin/innovation' : '/innovation';
  const [item, setItem] = useState<Idea | null>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');

  useEffect(() => {
    if (id) {
      Promise.all([innovationService.idea(id), innovationService.feedback(id)])
        .then(([i, f]) => { setItem(i); setFeedback(f); })
        .catch(() => setError('Could not load this idea.'));
    }
  }, [id]);

  if (!item) return error ? <p className={styles.error}>{error}</p> : <Loader />;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !email.trim()) return;
    setError('');
    setSuccess('');
    try {
      const updated = await innovationService.inviteIdeaMember(id, email.trim(), role);
      setItem(updated);
      setEmail('');
      setSuccess('Invitation sent successfully.');
    } catch (caught: any) {
      setError(caught.response?.data?.message || 'Invitation failed.');
    }
  };

  return (
    <>
      <div className={styles.title}>
        <div>
          <span className={styles.badge}>{item.status.replace('_', ' ')}</span>
          <h2>{item.title}</h2>
          <p>{item.problem}</p>
        </div>
        {(item.status === 'draft' || item.status === 'feedback_provided') && (
          <Link className={styles.button} to={`${base}/ideas/${id}/edit`}>Edit idea</Link>
        )}
      </div>

      {success && <p className={styles.notice}>{success}</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        <section className={styles.card}>
          <h3>Proposed solution</h3>
          <p>{item.solution || 'Not provided yet.'}</p>
          <div className={styles.actions}>
            {(item.status === 'draft' || item.status === 'feedback_provided') && (
              <button
                className={styles.button}
                onClick={() =>
                  innovationService.submitIdea(id!)
                    .then(x => setItem(x))
                    .catch(() => setError('Could not submit idea.'))
                }
              >
                Submit for review
              </button>
            )}
          </div>
        </section>

        <section className={styles.card}>
          <h3>Feedback and revisions</h3>
          {feedback.length ? feedback.map((f, i) => (
            <div className={styles.row} key={f._id || i}>
              <div>
                <strong>{f.author?.name || 'Reviewer'}</strong>
                <p>{f.message || f.recommendations || 'Feedback provided.'}</p>
              </div>
            </div>
          )) : <p className={styles.muted}>No feedback yet. Review notes will appear here.</p>}
        </section>

        <section className={styles.card}>
          <h3>Team and invitations</h3>
          {item.teamMembers?.map((member: any, index: number) => (
            <div className={styles.row} key={index}>
              <span>{member.user?.name || member.user || 'Member'} <span className={styles.badge}>{member.role}</span></span>
              <span className={styles.muted}>{member.accepted !== false ? 'Joined' : 'Pending'}</span>
            </div>
          ))}
          {(!item.teamMembers || item.teamMembers.length === 0) && <p className={styles.muted}>No team members yet.</p>}
          <form className={styles.form} onSubmit={handleInvite} style={{ marginTop: '1rem' }}>
            <label>
              Collaborator email
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@university.ac.bw" />
            </label>
            <label>
              Role
              <select value={role} onChange={e => setRole(e.target.value)}>
                {teamRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <button className={styles.button}>Invite</button>
          </form>
        </section>
      </div>
    </>
  );
};

export default IdeaDetail;
