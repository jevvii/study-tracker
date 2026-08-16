import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsForm } from '@/components/settings-form';

const mocks = vi.hoisted(() => ({
  updateSettings: vi.fn().mockResolvedValue({ ok: true }),
  exportUserData: vi.fn().mockResolvedValue('{}'),
  resetUserData: vi.fn().mockResolvedValue({ ok: true }),
}));

const { updateSettings } = mocks;

vi.mock('@/lib/data', () => ({
  updateSettings: mocks.updateSettings,
  exportUserData: mocks.exportUserData,
  resetUserData: mocks.resetUserData,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({ auth: { signOut: vi.fn().mockResolvedValue({}) } }),
}));

const base = { user_id: 'u', theme: 'dark' as const, reduce_motion: false, weekly_target_minutes: 600, starfield_on: true, confetti_on: true };

describe('SettingsForm', () => {
  beforeEach(() => {
    updateSettings.mockClear();
  });

  it('calls updateSettings when toggling reduce-motion', async () => {
    const user = userEvent.setup();
    render(<SettingsForm initial={base} email="a@b.com" />);
    await user.click(screen.getByRole('switch', { name: 'Reduce motion' }));
    expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ reduce_motion: true }));
  });

  it('saves the weekly target only when Save settings is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsForm initial={base} email="a@b.com" />);
    const input = screen.getByLabelText('Weekly target hours') as HTMLInputElement;
    // Save is disabled until the weekly target actually changes.
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();
    await user.clear(input);
    await user.type(input, '8');
    // Editing alone does not persist (no blur auto-save anymore).
    expect(updateSettings).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ weekly_target_minutes: 480 }));
  });

  it('clamps the weekly target into the 1–80 hour range on save', async () => {
    const user = userEvent.setup();
    render(<SettingsForm initial={base} email="a@b.com" />);
    const input = screen.getByLabelText('Weekly target hours') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '999');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ weekly_target_minutes: 80 * 60 }));
  });

  it('toggles confetti via the confetti switch', async () => {
    const user = userEvent.setup();
    render(<SettingsForm initial={base} email="a@b.com" />);
    await user.click(screen.getByRole('switch', { name: 'Confetti' }));
    expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ confetti_on: false }));
  });

  it('shows the signed-in email', () => {
    render(<SettingsForm initial={base} email="study@example.com" />);
    expect(screen.getByText('study@example.com')).toBeInTheDocument();
  });
});