import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { authService } from '../../services/authService';
import styles from './OtpModal.module.css';

interface Props {
  email: string;
  onClose: () => void;
  /** Called with the single-use reset token once the OTP is verified */
  onVerified: (resetToken: string) => void;
}

const RESEND_COOLDOWN_SECONDS = 60;

const OtpModal: React.FC<Props> = ({ email, onClose, onVerified }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for the resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setOtp(value);
    if (error) setError('');
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.length !== 5) {
      setError('Please enter the full 5-digit code');
      return;
    }
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const { resetToken } = await authService.verifyResetOtp(email, otp);
      onVerified(resetToken);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
      setOtp('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    setResending(true);
    try {
      await authService.requestPasswordReset(email);
      setOtp('');
      setNotice('A new code has been sent to your email.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      inputRef.current?.focus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Enter Verification Code</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleVerify}>
          <div className={styles.body}>
            <div className={styles.iconWrap}>
              <ShieldCheck size={40} />
            </div>
            <p className={styles.description}>
              We've sent a 5-digit code to <strong>{email}</strong>.
              Enter it below to continue.
            </p>

            {error && <div className={styles.error}>{error}</div>}
            {notice && <div className={styles.success}>{notice}</div>}

            <div className={styles.otpField}>
              <label htmlFor="otp-input" className={styles.srOnly}>5-digit verification code</label>
              <input
                ref={inputRef}
                id="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="•••••"
                value={otp}
                onChange={handleOtpChange}
                maxLength={5}
                className={styles.otpInput}
                disabled={submitting}
              />
            </div>

            <p className={styles.resendRow}>
              Didn't receive the code?{' '}
              {cooldown > 0 ? (
                <span className={styles.resendDisabled}>
                  Resend in {cooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  className={styles.resendBtn}
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? 'Sending…' : 'Resend code'}
                </button>
              )}
            </p>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting || otp.length !== 5}
            >
              {submitting ? 'Verifying…' : 'Verify Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OtpModal;
