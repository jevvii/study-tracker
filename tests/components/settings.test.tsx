/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsForm } from '@/components/settings-form';
vi.mock('@/lib/data', () => ({ updateSettings: vi.fn().mockResolvedValue({ ok: true }) }));

describe('SettingsForm', () => {
  it('calls updateSettings when toggling reduce-motion', async () => {
    const updateSettings = (await import('@/lib/data')).updateSettings as any;
    const user = userEvent.setup();
    render(<SettingsForm initial={{ user_id: 'u', theme: 'dark', reduce_motion: false }} />);
    await user.click(screen.getByRole('switch'));
    expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ reduce_motion: true }));
  });
});
