import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from './Login';
const mockLogin = jest.fn();
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ login: mockLogin }) }));
beforeEach(() => { sessionStorage.clear(); mockLogin.mockReset(); mockLogin.mockResolvedValue({ role: 'student' }); });
const signIn = async (state?: object) => {
  render(<MemoryRouter initialEntries={[{ pathname: '/login', state }]}><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/events/workshop/check-in" element={<p>Continue attendance</p>} />
    <Route path="/dashboard" element={<p>Student dashboard</p>} />
  </Routes></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'student@bothouniversity.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
};
it('returns the student to attendance using the existing stored redirect', async () => {
  sessionStorage.setItem('redirectAfterLogin', '/events/workshop/check-in');
  await signIn(); expect(await screen.findByText('Continue attendance')).toBeInTheDocument();
  expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull();
});
it('supports a route-state return when no stored redirect exists', async () => {
  await signIn({ from: { pathname: '/events/workshop/check-in' } });
  expect(await screen.findByText('Continue attendance')).toBeInTheDocument();
});
it.each(['//attacker.test', '/\\attacker.test', 'https://attacker.test', '/admin/events'])('rejects unsafe or unauthorized redirect %s', async path => {
  sessionStorage.setItem('redirectAfterLogin', path);
  await signIn(); expect(await screen.findByText('Student dashboard')).toBeInTheDocument();
});
