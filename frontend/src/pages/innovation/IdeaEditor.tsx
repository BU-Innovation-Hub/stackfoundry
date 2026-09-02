import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { innovationService } from '../../services/innovationService';
import { InnovationClassification } from '../../types/innovation';
import styles from './Innovation.module.css';

const IdeaEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const base = useLocation().pathname.startsWith('/admin/innovation') ? '/admin/innovation' : '/innovation';
  const [form, setForm] = useState<{ title: string; problem: string; solution: string; beneficiaries: string; category: string; stage: string; visibility: 'public' | 'private' }>({ title: '', problem: '', solution: '', beneficiaries: '', category: '', stage: '', visibility: 'public' });
  const [classifications, setClassifications] = useState<{ categories: InnovationClassification[]; stages: InnovationClassification[] }>({ categories: [], stages: [] });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    innovationService.classifications().then(setClassifications).catch(() => setError('Could not load categories and stages.'));
    if (id) innovationService.idea(id).then(item => setForm({ title: item.title || '', problem: item.problem || '', solution: item.solution || '', beneficiaries: (item.beneficiaries || []).join(', '), category: typeof item.category === 'string' ? item.category : item.category?._id || '', stage: typeof item.stage === 'string' ? item.stage : item.stage?._id || '', visibility: item.visibility || 'public' })).catch(() => setError('Idea not found.'));
  }, [id]);

  const update = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      await (id
        ? innovationService.updateIdea(id, { ...form, beneficiaries: form.beneficiaries.split(',').map(value => value.trim()).filter(Boolean) })
        : innovationService.createIdea({ ...form, beneficiaries: form.beneficiaries.split(',').map(value => value.trim()).filter(Boolean) }));
      setSuccess(id ? 'Idea updated successfully.' : 'Idea submitted successfully.');
      setTimeout(() => {
        navigate(`${base}/my-ideas`);
      }, 1500);
    } catch (caught: any) {
      setError(caught.response?.data?.message || 'Could not save idea.');
    }
  };

  return (
    <>
      <div className={styles.title}>
        <div>
          <h2>{id ? 'Edit idea' : 'Create an idea'}</h2>
          <p>Capture the problem, solution, beneficiaries, and who should be able to see it.</p>
        </div>
      </div>
      {success && <p className={styles.notice}>{success}</p>}
      {error && <p className={styles.error}>{error}</p>}
      <form className={styles.form} onSubmit={save}>
        <label>Title<input required maxLength={200} value={form.title} onChange={event => update('title', event.target.value)} /></label>
        <label>Problem statement<textarea required value={form.problem} onChange={event => update('problem', event.target.value)} /></label>
        <label>Proposed solution<textarea required value={form.solution} onChange={event => update('solution', event.target.value)} /></label>
        <label>Beneficiaries<input value={form.beneficiaries} onChange={event => update('beneficiaries', event.target.value)} placeholder="Students, researchers, local businesses" /></label>
        <label>Category<select required value={form.category} onChange={event => update('category', event.target.value)}><option value="">Select a category</option>{classifications.categories.map(item => <option value={item._id} key={item._id}>{item.name}</option>)}</select></label>
        <label>Development stage<select required value={form.stage} onChange={event => update('stage', event.target.value)}><option value="">Select a stage</option>{classifications.stages.map(item => <option value={item._id} key={item._id}>{item.name}</option>)}</select></label>
        <label>Visibility<select value={form.visibility} onChange={event => update('visibility', event.target.value)}><option value="public">Public: visible to the innovation community</option><option value="private">Private: owner, team, assigned mentors, and admins</option></select></label>
        <button className={styles.button}>{id ? 'Update idea' : 'Save idea'}</button>
      </form>
    </>
  );
};

export default IdeaEditor;
