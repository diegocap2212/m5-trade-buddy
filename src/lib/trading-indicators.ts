import type { CandleData } from './trading-types';

// --- EMA (Exponential Moving Average) ---
export function calculateEMA(candles: CandleData[], period: number): number[] {
  if (candles.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [candles[0].close];
  for (let i = 1; i < candles.length; i++) {
    ema.push(candles[i].close * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

export function getLastEMA(candles: CandleData[], period: number): number {
  const ema = calculateEMA(candles, period);
  return ema[ema.length - 1] ?? 0;
}

// --- RSI (Relative Strength Index) ---
export function calculateRSI(candles: CandleData[], period: number = 7): number {
  if (candles.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  if (losses === 0) return 100;
  if (gains === 0) return 0;

  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

// --- Stochastic Oscillator (K, D) ---
export function calculateStochastic(
  candles: CandleData[],
  kPeriod: number = 5,
  dPeriod: number = 3,
): { k: number; d: number } {
  if (candles.length < kPeriod) return { k: 50, d: 50 };

  const recentCandles = candles.slice(-kPeriod);
  const highestHigh = Math.max(...recentCandles.map((c) => c.high));
  const lowestLow = Math.min(...recentCandles.map((c) => c.low));
  const range = highestHigh - lowestLow;

  const k = range === 0 ? 50 : ((candles[candles.length - 1].close - lowestLow) / range) * 100;

  // Simple %D as SMA of last dPeriod %K values
  const kValues: number[] = [];
  for (let i = Math.max(0, candles.length - dPeriod); i <= candles.length - 1; i++) {
    const slice = candles.slice(Math.max(0, i - kPeriod + 1), i + 1);
    const hh = Math.max(...slice.map((c) => c.high));
    const ll = Math.min(...slice.map((c) => c.low));
    const r = hh - ll;
    kValues.push(r === 0 ? 50 : ((candles[i].close - ll) / r) * 100);
  }

  const d = kValues.reduce((a, b) => a + b, 0) / kValues.length;
  return { k, d };
}

// --- VWAP (Volume Weighted Average Price) ---
export function calculateVWAP(candles: CandleData[]): number {
  if (candles.length === 0) return 0;

  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = c.volume || 1;
    cumulativeTPV += typicalPrice * vol;
    cumulativeVolume += vol;
  }

  return cumulativeVolume === 0 ? 0 : cumulativeTPV / cumulativeVolume;
}

// --- Bollinger Bands ---
export function calculateBollingerBands(
  candles: CandleData[],
  period: number = 20,
  stdDevMultiplier: number = 2,
): { upper: number; middle: number; lower: number; squeeze: boolean } {
  if (candles.length < period) {
    const price = candles[candles.length - 1]?.close ?? 0;
    return { upper: price, middle: price, lower: price, squeeze: false };
  }

  const slice = candles.slice(-period);
  const closes = slice.map((c) => c.close);
  const sma = closes.reduce((a, b) => a + b, 0) / period;

  const variance = closes.reduce((sum, c) => sum + (c - sma) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = sma + stdDevMultiplier * stdDev;
  const lower = sma - stdDevMultiplier * stdDev;

  // Keltner Channel for squeeze detection
  const atr = calculateATR(candles, period);
  const keltnerUpper = sma + 1.5 * atr;
  const keltnerLower = sma - 1.5 * atr;
  const squeeze = upper < keltnerUpper && lower > keltnerLower;

  return { upper, middle: sma, lower, squeeze };
}

// --- ATR (Average True Range) ---
export function calculateATR(candles: CandleData[], period: number = 14): number {
  if (candles.length < 2) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }

  const recent = trueRanges.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

// --- Candle Pattern Detection (enhanced) ---
export interface CandlePattern {
  name: string;
  bullish: boolean;
  strength: number; // 1-3
}

export function detectCandlePatterns(candles: CandleData[]): CandlePattern | null {
  if (candles.length < 3) return null;

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const body = Math.abs(last.close - last.open);
  const upperWick = last.high - Math.max(last.open, last.close);
  const lowerWick = Math.min(last.open, last.close) - last.low;
  const range = last.high - last.low;

  if (range === 0) return null;

  // Pin Bar / Hammer
  if (lowerWick > body * 2 && upperWick < body * 0.5) {
    return { name: 'Martelo (Hammer)', bullish: true, strength: 2 };
  }
  // Shooting Star
  if (upperWick > body * 2 && lowerWick < body * 0.5) {
    return { name: 'Estrela Cadente', bullish: false, strength: 2 };
  }

  // Engulfing
  const prevBody = Math.abs(prev.close - prev.open);
  if (body > prevBody * 1.3) {
    if (last.close > last.open && prev.close < prev.open) {
      const vol = last.volume && prev.volume ? last.volume / prev.volume : 1;
      return { name: 'Engolfo de Alta', bullish: true, strength: vol > 2 ? 3 : 2 };
    }
    if (last.close < last.open && prev.close > prev.open) {
      const vol = last.volume && prev.volume ? last.volume / prev.volume : 1;
      return { name: 'Engolfo de Baixa', bullish: false, strength: vol > 2 ? 3 : 2 };
    }
  }

  // Doji
  if (body / range < 0.1) {
    return { name: 'Doji', bullish: lowerWick > upperWick, strength: 1 };
  }

  // Spring (false breakout below recent low)
  const recentLows = candles.slice(-10, -1).map((c) => c.low);
  const recentLow = Math.min(...recentLows);
  if (last.low < recentLow && last.close > recentLow) {
    return { name: 'Spring (Wyckoff)', bullish: true, strength: 3 };
  }

  return null;
}

// --- Support/Resistance from candle data ---
export function calculateSupportResistance(candles: CandleData[]): { support: number; resistance: number } {
  if (candles.length === 0) return { support: 0, resistance: 0 };
  return {
    support: Math.min(...candles.map((c) => c.low)),
    resistance: Math.max(...candles.map((c) => c.high)),
  };
}
