import React, { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { authService } from '../services/authService';
import styles from './ChangePassword.module.css';

const RESET_TOKEN_KEY = 'prf_reset_token';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();

  const [token, setToken] = useState<string | null>(null);
  const [form, setForm] = useState({ newPassword: '', confirmNewPassword: '' });
  const [error, setError] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load the single-use reset token stored by the OTP step
  useEffect(() => {
    const stored = sessionStorage.getItem(RESET_TOKEN_KEY);
    if (!stored) {
      navigate('/forgot-password', { replace: true });
      return;
    }
    setToken(stored);
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setDetails([]);

    if (form.newPassword !== form.confirmNewPassword) {
      setError('New password and confirmation do not match');
      return;
    }
    if (!token) {
      setError('Reset session expired. Please restart the password reset flow.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await authService.resetPassword(token, form.newPassword, form.confirmNewPassword);
      sessionStorage.removeItem(RESET_TOKEN_KEY);
      setSuccess(result.message || 'Password reset successfully. Redirecting to login…');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      const data = err.response?.data;
      setError(data?.error || 'Failed to reset password. Please try again.');
      if (Array.isArray(data?.details)) {
        setDetails(data.details);
      }
      // If the token became invalid, clear it so the user restarts cleanly
      if (data?.error?.toLowerCase().includes('token')) {
        sessionStorage.removeItem(RESET_TOKEN_KEY);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return null; // redirecting
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          StackFoundry
        </Link>
        <Link to="/login" className={styles.backBtn}>
          <ChevronLeft size={18} />
          Back to Login
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h2>Set New Password</h2>
          <p>Choose a strong new password for your account.</p>

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
              <label htmlFor="rp-new">New Password</label>
              <input
                id="rp-new"
                name="newPassword"
                type="password"
                value={form.newPassword}
                onChange={handleChange}
                required
                minLength={8}
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="rp-confirm">Confirm New Password</label>
              <input
                id="rp-confirm"
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
              {submitting ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
