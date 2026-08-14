import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/(auth)/login/page';

vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  }),
}));

describe('LoginPage', () => {
  it('renders GitHub sign-in and email magic link', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
  it('sends a magic link on valid email submit', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), 'me@example.com');
    await user.click(screen.getByRole('button', { name: /send magic link/i }));
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });
});