import React, { FormEvent, useEffect, useState } from 'react';
import { ChevronLeft, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleHome } from '../utils/roleRouting';
import { User } from '../types/auth';
import { profileService, ProfileUpdateData } from '../services/profileService';
import Loader from '../components/common/Loader';
import styles from './Profile.module.css';

const emptyForm: ProfileUpdateData = {
  bio: '',
  skills: [],
  interests: [],
  department: '',
  programme: '',
};

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [form, setForm] = useState<ProfileUpdateData>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    profileService.get()
      .then(user => {
        setProfile(user);
        setForm({
          bio: user.bio || '',
          skills: user.skills || [],
          interests: user.interests || [],
          department: user.department || '',
          programme: user.programme || '',
        });
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load your profile'))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (name: keyof ProfileUpdateData, value: string) => {
    setForm(prev => ({ ...prev, [name]: value } as ProfileUpdateData));
  };

  const updateList = (name: 'skills' | 'interests', value: string) => {
    setForm(prev => ({
      ...prev,
      [name]: value.split(',').map(item => item.trim()).filter(Boolean),
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await profileService.update(form);
      setProfile(prev => ({ ...prev, ...updated } as User));
      setMessage('Profile updated successfully.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update your profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setMessage('');
    try {
      const updated = await profileService.uploadPicture(file);
      setProfile(prev => ({ ...prev, ...updated } as User));
      setMessage('Profile picture updated successfully.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload profile picture');
    }
  };

  if (loading) return <Loader text="Loading profile..." />;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={user ? getRoleHome(user.role) : '/dashboard'} className={styles.logo}>StackFoundry</Link>
        <Link to={user ? getRoleHome(user.role) : '/dashboard'} className={styles.backBtn}><ChevronLeft size={18} /> Back to Dashboard</Link>
      </header>
      <main className={styles.main}>
        <div className={styles.heading}>
          <div>
            <h1>My Profile</h1>
            <p>Keep your profile details up to date for the innovation hub.</p>
          </div>
          <div className={styles.avatarWrap}>
            {profile?.profilePicture ? <img src={profile.profilePicture} alt="Profile" className={styles.avatar} /> : <div className={styles.avatar}>{profile?.name?.charAt(0)}{profile?.surname?.charAt(0)}</div>}
            <label className={styles.pictureBtn} htmlFor="profile-picture"><Camera size={15} /> Change photo</label>
            <input id="profile-picture" type="file" accept="image/*" onChange={handlePictureChange} className={styles.fileInput} />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.identity}><strong>{profile?.name} {profile?.surname}</strong><span>{profile?.email}</span></div>
          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.success}>{message}</div>}
          <form onSubmit={handleSubmit}>
            <div className={styles.field}><label htmlFor="profile-bio">Bio</label><textarea id="profile-bio" value={form.bio} onChange={e => updateField('bio', e.target.value)} rows={4} placeholder="Tell the community a little about yourself" /></div>
            <div className={styles.grid}>
              <div className={styles.field}><label htmlFor="profile-department">Department</label><input id="profile-department" value={form.department} onChange={e => updateField('department', e.target.value)} /></div>
              <div className={styles.field}><label htmlFor="profile-programme">Programme</label><input id="profile-programme" value={form.programme} onChange={e => updateField('programme', e.target.value)} /></div>
            </div>
            <div className={styles.grid}>
              <div className={styles.field}><label htmlFor="profile-skills">Skills</label><input id="profile-skills" value={form.skills.join(', ')} onChange={e => updateList('skills', e.target.value)} placeholder="React, Research, Design" /></div>
              <div className={styles.field}><label htmlFor="profile-interests">Interests</label><input id="profile-interests" value={form.interests.join(', ')} onChange={e => updateList('interests', e.target.value)} placeholder="Startups, AI, Community" /></div>
            </div>
            <button type="submit" className={styles.submitBtn} disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Profile;
