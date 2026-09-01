import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Members from '../Members';
import { getMembers } from '../../../services/adminService';
import { Member } from '../../../types/admin';

jest.mock('../../../services/adminService', () => ({
  getMembers: jest.fn(),
  updateMemberRole: jest.fn(),
  toggleMemberStatus: jest.fn(),
  deleteMember: jest.fn(),
}));

const mockedGetMembers = getMembers as jest.MockedFunction<typeof getMembers>;

const sampleMembers: Member[] = [
  {
    id: 'u1',
    studentId: 'STU-1',
    name: 'Alice',
    surname: 'Student',
    email: 'alice@bothouniversity.ac.bw',
    role: 'student',
    isActive: true,
    joinedAt: '2026-01-01',
  },
];

const openRowMenu = async () => {
  mockedGetMembers.mockResolvedValue({
    data: sampleMembers,
    pagination: { page: 1, limit: 25, total: sampleMembers.length, pages: 1, hasNext: false, hasPrevious: false },
  });
  render(<Members />);
  // Wait for the table row to render, then open the row action menu
  await screen.findByText('alice@bothouniversity.ac.bw');
  const menuButtons = screen.getAllByRole('button').filter(
    (btn) => btn.querySelector('svg') && !btn.textContent?.trim()
  );
  fireEvent.click(menuButtons[menuButtons.length - 1]);
};

describe('Members page - role change dropdown', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not offer system_admin as an assignable role', async () => {
    await openRowMenu();

    const dropdown = document.querySelector('[class*="dropdown"]') as HTMLElement;
    expect(dropdown).toBeInTheDocument();

    const roleButtons = Array.from(dropdown.querySelectorAll('button')).map((b) => b.textContent);
    expect(roleButtons).toContain('student');
    expect(roleButtons).toContain('innovation_hub_admin');
    expect(roleButtons).toContain('mentor');
    expect(roleButtons).toContain('member');
    expect(roleButtons).not.toContain('system_admin');
  });

  it('offers the Edit Profile action', async () => {
    await openRowMenu();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('calls updateMemberRole with an allowed role only', async () => {
    const { updateMemberRole } = jest.requireMock('../../../services/adminService') as {
      updateMemberRole: jest.Mock;
    };
    updateMemberRole.mockResolvedValue({});
    await openRowMenu();

    fireEvent.click(screen.getByText('mentor'));

    await waitFor(() => {
      expect(updateMemberRole).toHaveBeenCalledWith('u1', 'mentor');
    });
    // system_admin must never be sent through this UI
    expect(updateMemberRole).not.toHaveBeenCalledWith('u1', 'system_admin');
  });
});
