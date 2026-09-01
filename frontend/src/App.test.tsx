import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('./services/authService', () => ({
  authService: {
    getMe: jest.fn().mockRejectedValue(new Error('not authenticated')),
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
  },
}));

// Stub all API calls made by landing-page sections (blogs, events, etc.)
jest.mock('./services/apiClient', () => ({
  api: {
    get: jest.fn().mockResolvedValue({ data: { data: [] } }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

// lenis ships ESM-only; stub it for Jest (used by ScrollStack on the Home page).
// Note: CRA sets resetMocks:true, so the mock must be a plain function, not a
// jest.fn() with mockImplementation (which would be cleared before each test).
jest.mock('lenis', () => {
  function MockLenis(this: any) {
    return {
      on: jest.fn(),
      raf: jest.fn(),
      destroy: jest.fn(),
      stop: jest.fn(),
      start: jest.fn(),
      scrollTo: jest.fn(),
    };
  }
  return { __esModule: true, default: MockLenis };
});

test('renders the app shell with the StackFoundry brand', async () => {
  render(<App />);
  await waitFor(() => {
    expect(screen.getAllByText(/StackFoundry/i).length).toBeGreaterThan(0);
  });
});
