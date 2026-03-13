import { describe, it, expect } from 'vitest';
import { CRYPTO_ASSETS, ALL_PAIRS, CRYPTO_PAIRS, FOREX_PAIRS, getAssetSource, getAssetCategory } from '@/lib/trading-types';

describe('Trading types catalog', () => {
  it('all assets have source and category defined', () => {
    for (const asset of CRYPTO_ASSETS) {
      expect(asset.source).toBeDefined();
      expect(asset.category).toBeDefined();
      expect(['binance', 'forex-api']).toContain(asset.source);
      expect(['crypto', 'forex']).toContain(asset.category);
    }
  });

  it('no duplicate pairs', () => {
    const pairs = CRYPTO_ASSETS.map(a => a.pair);
    const unique = new Set(pairs);
    expect(unique.size).toBe(pairs.length);
  });

  it('ALL_PAIRS = CRYPTO_PAIRS + FOREX_PAIRS', () => {
    expect(ALL_PAIRS.length).toBe(CRYPTO_PAIRS.length + FOREX_PAIRS.length);
    for (const p of CRYPTO_PAIRS) expect(ALL_PAIRS).toContain(p);
    for (const p of FOREX_PAIRS) expect(ALL_PAIRS).toContain(p);
  });

  it('getAssetSource returns binance for crypto', () => {
    expect(getAssetSource('BTC/USD')).toBe('binance');
    expect(getAssetSource('ETH/USD')).toBe('binance');
    expect(getAssetSource('SOL/USD')).toBe('binance');
  });

  it('getAssetSource returns forex-api for forex', () => {
    expect(getAssetSource('EUR/USD')).toBe('forex-api');
    expect(getAssetSource('GBP/USD')).toBe('forex-api');
    expect(getAssetSource('USD/JPY')).toBe('forex-api');
  });

  it('getAssetCategory returns correct categories', () => {
    expect(getAssetCategory('BTC/USD')).toBe('crypto');
    expect(getAssetCategory('EUR/USD')).toBe('forex');
  });

  it('crypto pairs have payout >= 80', () => {
    for (const asset of CRYPTO_ASSETS) {
      expect(asset.payout).toBeGreaterThanOrEqual(80);
    }
  });

  it('all assets have positive basePrice', () => {
    for (const asset of CRYPTO_ASSETS) {
      expect(asset.basePrice).toBeGreaterThan(0);
    }
  });
});
