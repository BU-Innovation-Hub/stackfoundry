import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AttendanceCheckIn from './AttendanceCheckIn';
import { submitCheckIn } from '../../services/eventCheckInService';
import jsQR from 'jsqr';

jest.mock('../../services/eventCheckInService', () => ({ submitCheckIn: jest.fn() }));
jest.mock('jsqr', () => ({ __esModule: true, default: jest.fn() }));
const token = `12345678.${'a'.repeat(64)}`;
const mount = () => render(<AttendanceCheckIn eventId="event" slug="workshop" />);
beforeEach(() => {
  jest.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  (submitCheckIn as jest.Mock).mockResolvedValue({ checkedInAt: new Date().toISOString(), checkInMethod: 'manual', alreadyCheckedIn: false });
});
afterEach(() => jest.restoreAllMocks());

it('opens code entry only on request, focuses the input and restores focus on cancel', () => {
  mount();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const trigger = screen.getByRole('button', { name: 'Enter code manually' });
  trigger.focus(); fireEvent.click(trigger);
  expect(screen.getByRole('dialog', { name: 'Enter attendance code' })).toBeInTheDocument();
  expect(screen.getByLabelText('Three-digit attendance code')).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(submitCheckIn).not.toHaveBeenCalled();
});

it('keeps manual entry available after camera permission is denied', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: jest.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')) } });
  mount(); fireEvent.click(screen.getByRole('button', { name: 'Open camera' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Camera access was denied');
  fireEvent.click(screen.getByRole('button', { name: 'Enter code manually' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it('stops a late camera stream when the user has already closed the scanner', async () => {
  let resolveStream!: (stream: MediaStream) => void;
  const stop = jest.fn();
  const getUserMedia = jest.fn(() => new Promise<MediaStream>(resolve => { resolveStream = resolve; }));
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  mount(); fireEvent.click(screen.getByRole('button', { name: 'Open camera' }));
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'Close camera' }));
  await act(async () => { resolveStream({ getTracks: () => [{ stop }] } as unknown as MediaStream); });
  expect(stop).toHaveBeenCalled();
});

it('reads the event QR, releases the camera and waits for explicit confirmation', async () => {
  const stop = jest.fn();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  jest.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(2);
  jest.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(640);
  jest.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(480);
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: jest.fn(), getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }) } as any);
  (jsQR as jest.Mock).mockReturnValue({ data: `${window.location.origin}/events/workshop/check-in#token=${token}` });
  mount(); fireEvent.click(screen.getByRole('button', { name: 'Open camera' }));
  const confirm = await screen.findByRole('button', { name: 'Confirm attendance' });
  expect(stop).toHaveBeenCalled();
  expect(submitCheckIn).not.toHaveBeenCalled();
  fireEvent.click(confirm);
  expect(await screen.findByText('Attendance confirmed')).toBeInTheDocument();
  expect(submitCheckIn).toHaveBeenCalledWith('event', { token });
});

it('rejects a QR for a different event without submitting attendance', async () => {
  const stop = jest.fn();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  jest.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(2);
  jest.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(640);
  jest.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(480);
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: jest.fn(), getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }) } as any);
  (jsQR as jest.Mock).mockReturnValue({ data: `${window.location.origin}/events/another/check-in#token=${token}` });
  const view = mount(); fireEvent.click(screen.getByRole('button', { name: 'Open camera' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('not for this event');
  expect(submitCheckIn).not.toHaveBeenCalled();
  view.unmount(); expect(stop).toHaveBeenCalled();
});
