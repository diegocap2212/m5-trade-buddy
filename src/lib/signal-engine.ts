import type { CandleData, SignalDirection, TradingSignal } from './trading-types';
import {
  getLastEMA,
  calculateRSI,
  calculateStochastic,
  calculateVWAP,
  calculateBollingerBands,
  calculateATR,
  detectCandlePatterns,
  calculateSupportResistance,
} from './trading-indicators';

export type MacroBias = 'BULL' | 'BEAR' | 'NEUTRAL';

export interface Confluence {
  label: string;
  weight: number;
  layer: 1 | 2 | 3;
}

export interface SignalAnalysis {
  direction: SignalDirection;
  confidence: number;
  price: number;
  support: number;
  resistance: number;
  pattern: string;
  ema200Bias: MacroBias;
  rsi: number;
  stochK: number;
  stochD: number;
  vwap: number;
  bollingerSqueeze: boolean;
  atr: number;
  confluences: string[];
}

export function analyzeMarket(candles: CandleData[], asset: string): SignalAnalysis | null {
  if (candles.length < 10) return null;

  const price = candles[candles.length - 1].close;

  // Layer 1: Macro Bias (EMA 200)
  const ema200 = getLastEMA(candles, Math.min(200, candles.length));
  const ema9 = getLastEMA(candles, 9);
  const ema21 = getLastEMA(candles, 21);
  let ema200Bias: MacroBias = 'NEUTRAL';
  if (price > ema200 * 1.001) ema200Bias = 'BULL';
  else if (price < ema200 * 0.999) ema200Bias = 'BEAR';

  // Layer 2: Zones
  const { support, resistance } = calculateSupportResistance(candles.slice(-20));
  const vwap = calculateVWAP(candles.slice(-30));
  const bb = calculateBollingerBands(candles, Math.min(20, candles.length));
  const atr = calculateATR(candles);

  // Layer 3: Triggers
  const rsi = calculateRSI(candles, 7);
  const stoch = calculateStochastic(candles, 5, 3);
  const pattern = detectCandlePatterns(candles);

  // --- Confluence scoring ---
  const confluences: Confluence[] = [];
  const range = resistance - support;

  // Layer 1 confluences
  if (ema200Bias === 'BULL') {
    confluences.push({ label: 'EMA200 Bull', weight: 15, layer: 1 });
  } else if (ema200Bias === 'BEAR') {
    confluences.push({ label: 'EMA200 Bear', weight: 15, layer: 1 });
  }

  if (ema9 > ema21) {
    confluences.push({ label: 'EMA9 > EMA21 (Bull)', weight: 10, layer: 1 });
  } else if (ema9 < ema21) {
    confluences.push({ label: 'EMA9 < EMA21 (Bear)', weight: 10, layer: 1 });
  }

  // Layer 2 confluences
  const distToSupport = range > 0 ? (price - support) / range : 0.5;
  const distToResistance = range > 0 ? (resistance - price) / range : 0.5;

  if (distToSupport < 0.25) {
    confluences.push({ label: 'Preço em zona de Suporte', weight: 20, layer: 2 });
  }
  if (distToResistance < 0.25) {
    confluences.push({ label: 'Preço em zona de Resistência', weight: 20, layer: 2 });
  }

  const vwapDist = Math.abs(price - vwap) / (atr || 1);
  if (vwapDist < 0.5) {
    confluences.push({ label: 'Próximo da VWAP', weight: 15, layer: 2 });
  }

  if (price <= bb.lower * 1.002) {
    confluences.push({ label: 'Toque Bollinger Inferior', weight: 10, layer: 2 });
  }
  if (price >= bb.upper * 0.998) {
    confluences.push({ label: 'Toque Bollinger Superior', weight: 10, layer: 2 });
  }

  if (bb.squeeze) {
    confluences.push({ label: 'Bollinger Squeeze (rompimento iminente)', weight: 8, layer: 2 });
  }

  // Layer 3 confluences
  if (rsi < 30) {
    confluences.push({ label: 'RSI Sobrevendido (<30)', weight: 15, layer: 3 });
  } else if (rsi > 70) {
    confluences.push({ label: 'RSI Sobrecomprado (>70)', weight: 15, layer: 3 });
  }

  if (stoch.k < 20 && stoch.k > stoch.d) {
    confluences.push({ label: 'Stoch cruzamento alta (<20)', weight: 10, layer: 3 });
  } else if (stoch.k > 80 && stoch.k < stoch.d) {
    confluences.push({ label: 'Stoch cruzamento baixa (>80)', weight: 10, layer: 3 });
  }

  if (pattern) {
    confluences.push({
      label: `Padrão: ${pattern.name}`,
      weight: pattern.strength * 5 + 5,
      layer: 3,
    });
  }

  // --- Direction decision ---
  const bullConfluences = confluences.filter(
    (c) =>
      c.label.includes('Bull') ||
      c.label.includes('Suporte') ||
      c.label.includes('Sobrevendido') ||
      c.label.includes('cruzamento alta') ||
      c.label.includes('Inferior') ||
      (c.label.includes('Padrão') && pattern?.bullish),
  );
  const bearConfluences = confluences.filter(
    (c) =>
      c.label.includes('Bear') ||
      c.label.includes('Resistência') ||
      c.label.includes('Sobrecomprado') ||
      c.label.includes('cruzamento baixa') ||
      c.label.includes('Superior') ||
      (c.label.includes('Padrão') && pattern && !pattern.bullish),
  );

  const bullScore = bullConfluences.reduce((s, c) => s + c.weight, 0);
  const bearScore = bearConfluences.reduce((s, c) => s + c.weight, 0);

  const layersHit = new Set(confluences.map((c) => c.layer));
  const multiLayer = layersHit.size >= 2;

  let direction: SignalDirection = 'WAIT';
  let confidence = 30 + Math.floor(Math.random() * 10);

  if (multiLayer && bullScore > bearScore && bullScore >= 30) {
    direction = 'CALL';
    confidence = Math.min(95, 50 + bullScore);
    // Penalize if against macro bias
    if (ema200Bias === 'BEAR') confidence = Math.max(40, confidence - 20);
  } else if (multiLayer && bearScore > bullScore && bearScore >= 30) {
    direction = 'PUT';
    confidence = Math.min(95, 50 + bearScore);
    if (ema200Bias === 'BULL') confidence = Math.max(40, confidence - 20);
  }

  return {
    direction,
    confidence,
    price,
    support,
    resistance,
    pattern: pattern?.name || 'Sem padrão claro',
    ema200Bias,
    rsi: Math.round(rsi * 10) / 10,
    stochK: Math.round(stoch.k * 10) / 10,
    stochD: Math.round(stoch.d * 10) / 10,
    vwap,
    bollingerSqueeze: bb.squeeze,
    atr,
    confluences: confluences.map((c) => c.label),
  };
}
