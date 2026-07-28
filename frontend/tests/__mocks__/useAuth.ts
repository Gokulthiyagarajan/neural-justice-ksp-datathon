// Shared mock for the useAuth hook used across copilot tests.
// Provides a default mock that can be overridden per test via
// vi.mocked(useAuth).mockImplementation(...).

import { vi } from 'vitest';

export const mockUseAuth = vi.fn(() => ({
  user: { name: 'Test Officer', roles: ['IO'] },
  getPrimaryRole: () => 'INVESTIGATOR' as const,
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}));
