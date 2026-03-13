import { describe, it, expect } from 'vitest';
import { toChartTime } from '@/components/trading/CandlestickChart';

describe('toChartTime — BRT timezone conversion', () => {
  it('converts UTC 15:00 to BRT 12:00 (UTC-3)', () => {
    // 2024-06-15 15:00:00 UTC
    const utcTs = new Date('2024-06-15T15:00:00Z').getTime();
    const chartTime = toChartTime(utcTs);

    // The chart time should represent 12:00:00 in seconds
    const resultDate = new Date(chartTime * 1000);
    expect(resultDate.getUTCHours()).toBe(12);
    expect(resultDate.getUTCMinutes()).toBe(0);
  });

  it('handles midnight UTC → 21:00 BRT previous day', () => {
    // 2024-06-15 00:00:00 UTC → 2024-06-14 21:00:00 BRT
    const utcTs = new Date('2024-06-15T00:00:00Z').getTime();
    const chartTime = toChartTime(utcTs);

    const resultDate = new Date(chartTime * 1000);
    expect(resultDate.getUTCHours()).toBe(21);
    expect(resultDate.getUTCDate()).toBe(14);
  });

  it('handles 03:00 UTC → 00:00 BRT same day', () => {
    const utcTs = new Date('2024-06-15T03:00:00Z').getTime();
    const chartTime = toChartTime(utcTs);

    const resultDate = new Date(chartTime * 1000);
    expect(resultDate.getUTCHours()).toBe(0);
    expect(resultDate.getUTCDate()).toBe(15);
  });

  it('returns a number (seconds)', () => {
    const chartTime = toChartTime(Date.now());
    expect(typeof chartTime).toBe('number');
    // Should be in seconds, not milliseconds
    expect(chartTime).toBeLessThan(Date.now());
    expect(chartTime).toBeGreaterThan(Date.now() / 1000 - 86400);
  });
});
