import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, MailCheck } from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import OtpModal from '../components/common/OtpModal';
import styles from './ChangePassword.module.css';

const RESET_TOKEN_KEY = 'prf_reset_token';

/**
 * Change Password (authenticated users)
 * Flow: click "Send Code" -> OTP emailed -> verify via OtpModal -> redirected to
 * /reset-password to set the new password.
 */
const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [showOtp, setShowOtp] = useState(false);

  const email = user?.email || '';

  const handleSendCode = async () => {
    if (!email) {
      setError('Could not determine your account email. Please log in again.');
      return;
    }
    setError('');
    setSending(true);
    try {
      await authService.requestPasswordReset(email);
      setShowOtp(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send verification code. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleVerified = (resetToken: string) => {
    sessionStorage.setItem(RESET_TOKEN_KEY, resetToken);
    navigate('/reset-password', { state: { email } });
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
          <p>
            For your security, we'll email a 5-digit verification code to
            {' '}<strong>{email || 'your account email'}</strong>.
            Once verified, you'll be able to set a new password.
          </p>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleSendCode}
            disabled={sending}
          >
            {sending ? 'Sending code…' : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <MailCheck size={16} />
                Send Verification Code
              </span>
            )}
          </button>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: '#666' }}>
            This will sign you out on all devices once your password is changed.
          </p>
        </div>
      </main>

      {showOtp && (
        <OtpModal
          email={email}
          onClose={() => setShowOtp(false)}
          onVerified={handleVerified}
        />
      )}
    </div>
  );
};

export default ChangePassword;
