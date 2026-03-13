import { describe, it, expect, vi, afterEach } from 'vitest';
import { getActiveSessions } from '@/components/trading/MarketSession';

function mockSPHour(hour: number) {
  // Create a date where São Paulo time (UTC-3) resolves to the desired hour
  const utcHour = (hour + 3) % 24;
  const date = new Date(`2025-06-15T${String(utcHour).padStart(2, '0')}:30:00Z`);
  vi.setSystemTime(date);
}

describe('getActiveSessions', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns Tóquio session during late night BRT (22h)', () => {
    vi.useFakeTimers();
    mockSPHour(22);
    const sessions = getActiveSessions();
    expect(sessions.some(s => s.name === 'Tóquio')).toBe(true);
    expect(sessions.some(s => s.name === 'Londres')).toBe(false);
  });

  it('returns Londres session during morning BRT (8h)', () => {
    vi.useFakeTimers();
    mockSPHour(8);
    const sessions = getActiveSessions();
    expect(sessions.some(s => s.name === 'Londres')).toBe(true);
    expect(sessions.some(s => s.name === 'São Paulo')).toBe(false);
  });

  it('returns São Paulo (not Nova York) during afternoon BRT (15h)', () => {
    vi.useFakeTimers();
    mockSPHour(15);
    const sessions = getActiveSessions();
    expect(sessions.some(s => s.name === 'São Paulo')).toBe(true);
    expect(sessions.some(s => s.name === 'Nova York')).toBe(false);
  });

  it('returns Overlap LDN/SP during overlap hours (11h BRT)', () => {
    vi.useFakeTimers();
    mockSPHour(11);
    const sessions = getActiveSessions();
    expect(sessions.some(s => s.name === 'Overlap LDN/SP')).toBe(true);
    expect(sessions.some(s => s.name === 'Overlap LDN/NY')).toBe(false);
    expect(sessions.some(s => s.name === 'Londres')).toBe(true);
    expect(sessions.some(s => s.name === 'São Paulo')).toBe(true);
  });

  it('returns "Fora de sessão" when no session is active (20h BRT)', () => {
    vi.useFakeTimers();
    mockSPHour(20);
    const sessions = getActiveSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].name).toBe('Fora de sessão');
    expect(sessions[0].active).toBe(false);
  });

  it('all active sessions have quality property', () => {
    vi.useFakeTimers();
    mockSPHour(11);
    const sessions = getActiveSessions();
    sessions.forEach(s => {
      expect(['alta', 'média', 'baixa']).toContain(s.quality);
    });
  });
});
