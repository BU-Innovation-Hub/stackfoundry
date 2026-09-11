import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProjectCreateModal from '../ProjectCreateModal';
import { innovationService } from '../../../services/innovationService';

jest.mock('../../../services/innovationService', () => ({
  innovationService: {
    classifications: jest.fn(),
    createProject: jest.fn(),
  },
}));

const service = innovationService as jest.Mocked<typeof innovationService>;

describe('ProjectCreateModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    service.classifications.mockResolvedValue({
      categories: [{ _id: 'category-1', name: 'Health' }],
      stages: [{ _id: 'stage-1', name: 'Prototype' }],
    });
  });

  it('loads options and creates a project from the modal form', async () => {
    const onCreated = jest.fn();
    const project = { _id: 'project-1', title: 'Water monitor', status: 'draft' } as any;
    service.createProject.mockResolvedValue(project);
    render(<ProjectCreateModal onClose={jest.fn()} onCreated={onCreated} />);

    await screen.findByText('Create a project');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Water monitor' } });
    fireEvent.change(screen.getByLabelText('Problem statement'), { target: { value: 'Water is wasted.' } });
    fireEvent.change(screen.getByLabelText('Proposed solution'), { target: { value: 'Build a monitor.' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'category-1' } });
    fireEvent.change(screen.getByLabelText('Development stage'), { target: { value: 'stage-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));

    await waitFor(() => expect(service.createProject).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Water monitor',
      beneficiaries: [],
      tags: [],
      category: 'category-1',
      stage: 'stage-1',
    })));
    expect(onCreated).toHaveBeenCalledWith(project);
  });

  it('reports a failed create without closing the dialog', async () => {
    service.createProject.mockRejectedValue({ response: { data: { error: 'Project limit reached.' } } });
    render(<ProjectCreateModal onClose={jest.fn()} onCreated={jest.fn()} />);
    await screen.findByText('Create a project');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Water monitor' } });
    fireEvent.change(screen.getByLabelText('Problem statement'), { target: { value: 'Water is wasted.' } });
    fireEvent.change(screen.getByLabelText('Proposed solution'), { target: { value: 'Build a monitor.' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'category-1' } });
    fireEvent.change(screen.getByLabelText('Development stage'), { target: { value: 'stage-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));
    expect(await screen.findByText('Project limit reached.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
