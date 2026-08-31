import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { authService } from '../services/authService';
import OtpModal from '../components/common/OtpModal';
import styles from './ChangePassword.module.css';

const RESET_TOKEN_KEY = 'prf_reset_token';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showOtp, setShowOtp] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authService.requestPasswordReset(email.trim());
      setShowOtp(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerified = (resetToken: string) => {
    sessionStorage.setItem(RESET_TOKEN_KEY, resetToken);
    navigate('/reset-password', { state: { email: email.trim() } });
  };

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
          <h2>Forgot Password</h2>
          <p>Enter your email address and we'll send you a 5-digit verification code.</p>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="fp-email">Email Address</label>
              <input
                id="fp-email"
                name="email"
                type="email"
                placeholder="you@bothouniversity.ac.bw"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? 'Sending code…' : 'Send Reset Code'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: '#666' }}>
            Remembered your password?{' '}
            <Link to="/login" style={{ color: '#D64A2A', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </main>

      {showOtp && (
        <OtpModal
          email={email.trim()}
          onClose={() => setShowOtp(false)}
          onVerified={handleVerified}
        />
      )}
    </div>
  );
};

export default ForgotPassword;
