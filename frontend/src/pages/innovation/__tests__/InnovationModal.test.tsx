import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import InnovationModal from '../InnovationModal';

describe('InnovationModal', () => {
  it('renders an accessible dialog and closes with Escape', () => {
    const onClose = jest.fn();
    render(
      <InnovationModal title="Invite collaborator" onClose={onClose}>
        <p>Invite form</p>
      </InnovationModal>
    );

    expect(screen.getByRole('dialog', { name: 'Invite collaborator' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close while busy', () => {
    const onClose = jest.fn();
    render(
      <InnovationModal title="Saving project" onClose={onClose} busy>
        <p>Project form</p>
      </InnovationModal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
