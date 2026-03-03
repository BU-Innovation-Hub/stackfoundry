import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { authService, ChangePasswordData } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import styles from './ChangePassword.module.css';

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [form, setForm] = useState<ChangePasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [error, setError] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setDetails([]);
    setSuccess('');

    // Client-side confirmation match check
    if (form.newPassword !== form.confirmNewPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    setSubmitting(true);
    try {
      const result = await authService.changePassword(form);
      setSuccess(result.message || 'Password updated successfully.');
      // After successful password change, force logout after a short delay
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      const data = err.response?.data;
      setError(data?.error || 'Failed to change password');
      if (Array.isArray(data?.details)) {
        setDetails(data.details);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/dashboard" className={styles.logo}>
          StackFoundry
        </Link>
        <Link to="/dashboard" className={styles.backBtn}>
          <ChevronLeft size={18} />
          Back to Dashboard
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h2>Change Password</h2>
          <p>Enter your current password and choose a new one.</p>

          {error && (
            <div className={styles.error}>
              {error}
              {details.length > 0 && (
                <ul className={styles.errorList}>
                  {details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {success && <div className={styles.success}>{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="cp-current">Current Password</label>
              <input
                id="cp-current"
                name="currentPassword"
                type="password"
                value={form.currentPassword}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="cp-new">New Password</label>
              <input
                id="cp-new"
                name="newPassword"
                type="password"
                value={form.newPassword}
                onChange={handleChange}
                required
                minLength={8}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="cp-confirm">Confirm New Password</label>
              <input
                id="cp-confirm"
                name="confirmNewPassword"
                type="password"
                value={form.confirmNewPassword}
                onChange={handleChange}
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting || !!success}
            >
              {submitting ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ChangePassword;
