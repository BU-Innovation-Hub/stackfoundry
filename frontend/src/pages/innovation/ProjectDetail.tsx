import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { innovationService } from '../../services/innovationService';
import { CommentItem, Project, ProjectInvite, ReviewItem } from '../../types/innovation';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import styles from './Innovation.module.css';
import InnovationModal from './InnovationModal';

type Tab = 'overview' | 'discussion' | 'reviews' | 'collaborators';

const inviteRoles = ['maintainer', 'contributor'];

const ProjectDetail: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const base = location.pathname.startsWith('/admin/innovation') ? '/admin/innovation' : '/innovation';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('contributor');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewTarget, setReviewTarget] = useState('under_review');
  const [reviewDecision, setReviewDecision] = useState('comment');
  const [error, setError] = useState('');
  const [discussionError, setDiscussionError] = useState('');
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [success, setSuccess] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [mutating, setMutating] = useState(false);

  useEffect(() => {
    if (!id) return;
    innovationService.project(id).then(setProject).catch(() => setError('Could not load this project.'));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (tab === 'discussion') {
      let active = true;
      setDiscussionLoading(true);
      setDiscussionError('');
      innovationService.comments(id)
        .then(items => { if (active) setComments(items); })
        .catch(() => { if (active) setDiscussionError('Discussion is temporarily unavailable. Try again.'); })
        .finally(() => { if (active) setDiscussionLoading(false); });
      return () => { active = false; };
    }
    if (tab === 'reviews') innovationService.reviews(id).then(setReviews).catch(() => setError('Could not load reviews.'));
    if (tab === 'collaborators') innovationService.projectInvites(id).then(setInvites).catch(() => undefined);
  }, [id, tab]);

  if (!project) return error ? <p className={styles.error}>{error}</p> : <Loader />;

  const isOwner = user && (project.owner === user.id || (project.owner as any)?._id === user.id);
  const myCollab = (project.collaborators || []).find(c => (c.user as any)?._id === user?.id || c.user === user?.id);
  const canModify = Boolean(isOwner || myCollab?.role === 'owner' || myCollab?.role === 'maintainer' || myCollab?.role === 'contributor');
  const canManage = Boolean(isOwner || myCollab?.role === 'owner' || myCollab?.role === 'maintainer');
  const canReview = Boolean(user && ['mentor', 'system_admin', 'innovation_hub_admin'].includes(user.role));
  const canComment = Boolean(canModify || canReview);

  const reload = async () => {
    if (id) setProject(await innovationService.project(id));
  };

  const postComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !message.trim()) return;
    setDiscussionError('');
    setCommentSubmitting(true);
    try {
      const item = await innovationService.addComment(id, message.trim());
      setComments([...comments, item]);
      setMessage('');
    } catch (caught: any) {
      setDiscussionError(caught.response?.data?.error || 'Unable to post your comment. Please try again.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const loadDiscussion = async () => {
    if (!id) return;
    setDiscussionLoading(true);
    setDiscussionError('');
    try {
      setComments(await innovationService.comments(id));
    } catch {
      setDiscussionError('Discussion is temporarily unavailable. Try again.');
    } finally {
      setDiscussionLoading(false);
    }
  };

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !email.trim()) return;
    setInviteError('');
    setSuccess('');
    setInviteSubmitting(true);
    try {
      await innovationService.invite(id, email.trim(), role);
      setEmail('');
      setShowInvite(false);
      setSuccess('Invite sent successfully.');
      setInvites(await innovationService.projectInvites(id));
      await reload();
    } catch (caught: any) {
      setInviteError(caught.response?.data?.error || 'Invite failed. Please check the email and try again.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const submit = async () => {
    if (!id) return;
    setMutating(true);
    setError('');
    try {
      setProject(await innovationService.submitProject(id));
      setSuccess('Project submitted for review.');
    } catch (caught: any) {
      setError(caught.response?.data?.error || 'Could not submit project.');
    } finally {
      setMutating(false);
    }
  };

  const remove = async () => {
    if (!id || !window.confirm('Delete this project? This action cannot be undone.')) return;
    setMutating(true);
    setError('');
    try {
      await innovationService.deleteProject(id);
      navigate(`${base}/my-projects`, { replace: true });
    } catch (caught: any) {
      setError(caught.response?.data?.error || 'Could not delete project.');
      setMutating(false);
    }
  };

  const postReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    try {
      await innovationService.reviewProject(id, { toStatus: reviewTarget, decision: reviewDecision, note: reviewNote });
      setReviewNote('');
      setReviews(await innovationService.reviews(id));
      await reload();
      setSuccess('Review recorded.');
    } catch (caught: any) {
      setError(caught.response?.data?.error || 'Could not record review.');
    }
  };

  return (
    <>
      <div className={styles.title}>
        <div>
          <span className={styles.badge}>{project.status?.replace(/_/g, ' ')}</span>{' '}
          <span className={styles.badge}>{project.visibility}</span>
          <h2>{project.title}</h2>
          <p>Owner: {typeof project.owner === 'object' ? `${project.owner?.name || ''} ${project.owner?.surname || ''}` : 'Unknown'} · {project.collaboratorCount ?? project.collaborators?.length ?? 0} collaborators</p>
        </div>
        {(canModify || canReview) && (
          <span className={styles.actions}>
            {canModify && (project.status === 'draft' || project.status === 'feedback_provided') && <Link className={styles.button} to={`${base}/projects/${id}/edit`}>Edit project</Link>}
            {canReview && <button className={styles.button} type="button" onClick={() => setTab('reviews')}>Review</button>}
            {canModify && <button className={`${styles.button} ${styles.secondary}`} type="button" onClick={remove} disabled={mutating}>Delete</button>}
          </span>
        )}
      </div>

      {success && <p className={styles.notice}>{success}</p>}
      {error && <p className={styles.error}>{error}</p>}

      <nav className={styles.nav} style={{ marginBottom: '1rem' }}>
        {(['overview', 'discussion', 'reviews', 'collaborators'] as Tab[]).map(t => (
          <button key={t} type="button" className={tab === t ? styles.active : ''} onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined} style={{ textTransform: 'capitalize', padding: '0.5rem 0.75rem' }}>{t}</button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className={styles.grid}>
          <section className={styles.card}>
            <h3>Overview</h3>
            <p><strong>Problem:</strong> {project.problem || 'Not provided yet.'}</p>
            <p><strong>Solution:</strong> {project.solution || 'Not provided yet.'}</p>
            {project.tags?.length ? <p className={styles.muted}>Tags: {project.tags.join(', ')}</p> : null}
            <div className={styles.actions}>
              {(project.status === 'draft' || project.status === 'feedback_provided') && canModify && (
                <button className={styles.button} onClick={submit} disabled={mutating}>{mutating ? 'Submitting...' : 'Submit for review'}</button>
              )}
            </div>
          </section>
          <section className={styles.card}>
            <h3>Attachments</h3>
            {project.media?.length ? project.media.map((m, i) => <div className={styles.row} key={i}><span>{m.name || m.url}</span></div>) : <p className={styles.muted}>No attachments yet.</p>}
          </section>
        </div>
      )}

      {tab === 'discussion' && (
        <section className={styles.card}>
          <h3>Discussion</h3>
          {discussionError && <div className={styles.alertError} role="alert"><span>{discussionError}</span><button type="button" className={styles.retryButton} onClick={loadDiscussion} disabled={discussionLoading}>{discussionLoading ? 'Retrying...' : 'Retry'}</button></div>}
          {discussionLoading ? <p className={styles.muted}>Loading discussion...</p> : comments.length ? comments.map(item => (
            <div className={styles.row} key={item._id}>
              <span><strong>{item.author?.name || 'Collaborator'}</strong><br />{item.body || item.message}</span>
            </div>
          )) : <p className={styles.muted}>No comments yet. Start the discussion.</p>}
          {canComment ? (
            <form className={styles.actions} onSubmit={postComment}>
              <input required value={message} onChange={e => setMessage(e.target.value)} placeholder="Write a comment..." disabled={commentSubmitting} />
              <button type="submit" className={styles.button} disabled={commentSubmitting}>{commentSubmitting ? 'Posting...' : 'Post'}</button>
            </form>
          ) : <p className={styles.muted}>You can read this discussion, but only project members, assigned mentors, and admins can post.</p>}
        </section>
      )}

      {tab === 'reviews' && (
        <section className={styles.card}>
          <h3>Reviews</h3>
          {reviews.length ? reviews.map(r => (
            <div className={styles.row} key={r._id}>
              <span><strong>{r.reviewer?.name || 'Reviewer'}</strong> → {r.toStatus} ({r.decision})<br />{r.note || ''}</span>
            </div>
          )) : <p className={styles.muted}>No mentor reviews yet.</p>}
          {canReview && (
            <form className={styles.form} onSubmit={postReview} style={{ marginTop: '1rem' }}>
              <label>Decision<select value={reviewTarget} onChange={e => setReviewTarget(e.target.value)}>
                <option value="under_review">under_review</option>
                <option value="feedback_provided">feedback_provided</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
                <option value="incubation">incubation</option>
                <option value="archived">archived</option>
              </select></label>
              <label>Type<select value={reviewDecision} onChange={e => setReviewDecision(e.target.value)}>
                <option value="comment">comment</option>
                <option value="approve">approve</option>
                <option value="request_changes">request_changes</option>
                <option value="reject">reject</option>
              </select></label>
              <label>Note<textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Mentor feedback" /></label>
              <button className={styles.button}>Record review</button>
            </form>
          )}
        </section>
      )}

      {tab === 'collaborators' && (
        <section className={styles.card}>
          <h3>Collaborators</h3>
          {(project.collaborators || []).map((member: any, index: number) => (
            <div className={styles.row} key={index}>
              <span>{member.user?.name || member.user || 'Collaborator'} <span className={styles.badge}>{member.role}</span></span>
              {canManage && member.role !== 'owner' && (
                <span className={styles.actions}>
                  <button className={styles.button} onClick={() => innovationService.changeCollaboratorRole(id!, String(member.user?._id || member.user), member.role === 'maintainer' ? 'contributor' : 'maintainer').then(reload)}>
                    Make {member.role === 'maintainer' ? 'contributor' : 'maintainer'}
                  </button>
                  <button className={styles.button} onClick={() => innovationService.removeCollaborator(id!, String(member.user?._id || member.user)).then(reload)}>Remove</button>
                </span>
              )}
            </div>
          ))}
          {(!project.collaborators || project.collaborators.length === 0) && <p className={styles.muted}>No collaborators yet.</p>}
          {invites.length > 0 && canManage && (
            <>
              <h3 style={{ marginTop: '1rem' }}>Pending invites</h3>
              {invites.filter(i => i.status === 'pending').map(i => (
                <div className={styles.row} key={i._id}><span>{i.email} <span className={styles.badge}>{i.role}</span></span><span className={styles.muted}>{i.status}</span></div>
              ))}
            </>
          )}
          {canManage && <button className={styles.button} type="button" onClick={() => { setInviteError(''); setShowInvite(true); }} style={{ marginTop: '1rem' }}>Invite collaborator</button>}
        </section>
      )}
      {showInvite && canManage && (
        <InnovationModal title="Invite collaborator" description="Invite someone to contribute to this project." onClose={() => setShowInvite(false)} busy={inviteSubmitting} labelledBy="invite-collaborator-title">
          <form className={styles.modalForm} onSubmit={invite}>
            {inviteError && <p className={styles.error} role="alert">{inviteError}</p>}
            <label>Collaborator email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@university.ac.bw" /></label>
            <label>Role<select value={role} onChange={e => setRole(e.target.value)}>{inviteRoles.map(r => <option key={r} value={r}>{r}</option>)}</select></label>
            <footer className={styles.modalFooter}><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => setShowInvite(false)} disabled={inviteSubmitting}>Cancel</button><button type="submit" className={styles.button} disabled={inviteSubmitting}>{inviteSubmitting ? 'Sending...' : 'Send invite'}</button></footer>
          </form>
        </InnovationModal>
      )}
    </>
  );
};

export default ProjectDetail;
