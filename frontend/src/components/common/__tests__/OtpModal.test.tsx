import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OtpModal from '../OtpModal';
import { authService } from '../../../services/authService';

jest.mock('../../../services/authService', () => ({
  authService: {
    verifyResetOtp: jest.fn(),
    requestPasswordReset: jest.fn(),
  },
}));

const mockedAuth = authService as jest.Mocked<typeof authService>;

const renderModal = (overrides: Partial<React.ComponentProps<typeof OtpModal>> = {}) => {
  const props = {
    email: 'user@bothouniversity.ac.bw',
    onClose: jest.fn(),
    onVerified: jest.fn(),
    ...overrides,
  };
  render(<OtpModal {...props} />);
  return props;
};

describe('OtpModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the email and a 5-digit input', () => {
    renderModal();
    expect(screen.getByText(/user@bothouniversity\.ac\.bw/)).toBeInTheDocument();
    expect(screen.getByLabelText(/5-digit verification code/i)).toBeInTheDocument();
  });

  it('accepts digits only and caps at 5 characters', () => {
    renderModal();
    const input = screen.getByLabelText(/5-digit verification code/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'a1b2c3d4e5f6' } });
    expect(input.value).toBe('12345');
  });

  it('disables verify until 5 digits are entered', () => {
    renderModal();
    const input = screen.getByLabelText(/5-digit verification code/i);
    const verifyBtn = screen.getByRole('button', { name: /verify code/i });

    expect(verifyBtn).toBeDisabled();
    fireEvent.change(input, { target: { value: '1234' } });
    expect(verifyBtn).toBeDisabled();
    fireEvent.change(input, { target: { value: '12345' } });
    expect(verifyBtn).toBeEnabled();
  });

  it('calls onVerified with the reset token on successful verification', async () => {
    mockedAuth.verifyResetOtp.mockResolvedValue({ resetToken: 'tok-123' });
    const { onVerified } = renderModal();

    fireEvent.change(screen.getByLabelText(/5-digit verification code/i), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => {
      expect(mockedAuth.verifyResetOtp).toHaveBeenCalledWith('user@bothouniversity.ac.bw', '12345');
      expect(onVerified).toHaveBeenCalledWith('tok-123');
    });
  });

  it('shows an error and clears the input when verification fails', async () => {
    mockedAuth.verifyResetOtp.mockRejectedValue({
      response: { data: { error: 'Invalid OTP. 4 attempts remaining.' } },
    });
    renderModal();

    const input = screen.getByLabelText(/5-digit verification code/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '99999' } });
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid otp/i)).toBeInTheDocument();
      expect(input.value).toBe('');
    });
  });

  it('shows the resend cooldown instead of a resend button initially', () => {
    renderModal();
    expect(screen.getByText(/resend in \d+s/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /resend code/i })).not.toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
