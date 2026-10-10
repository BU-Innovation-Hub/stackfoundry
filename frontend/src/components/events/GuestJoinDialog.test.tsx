import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GuestJoinDialog from './GuestJoinDialog';

it('collects a guest name and email before creating the temporary identity', async () => {
  const onGuest = jest.fn().mockResolvedValue(undefined);
  render(<GuestJoinDialog onClose={jest.fn()} onMember={jest.fn()} onGuest={onGuest} />);
  fireEvent.click(screen.getByRole('button', { name: /Join as a guest/i }));
  expect(screen.getByLabelText('Name')).toHaveFocus();
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Rethabile Lebele' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'rethabile@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue as guest' }));
  await waitFor(() => expect(onGuest).toHaveBeenCalledWith('Rethabile Lebele', 'rethabile@example.com'));
});

it('returns keyboard focus to the page and closes when Escape is pressed', () => {
  const trigger = document.createElement('button'); document.body.appendChild(trigger); trigger.focus();
  const onClose = jest.fn();
  const view = render(<GuestJoinDialog onClose={onClose} onMember={jest.fn()} onGuest={jest.fn()} />);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
  view.unmount();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});
