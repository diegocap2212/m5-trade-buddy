import type { CandleData, SignalDirection } from './trading-types';
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

/**
 * Exhaustion Reversal Strategy
 * 
 * CALL: price closes below lower Bollinger (2.0 dev) AND RSI < 35
 * PUT:  price closes above upper Bollinger (2.0 dev) AND RSI > 65
 * 
 * Confidence is calculated from how deep the price penetrates the band
 * and how extreme the RSI is. This produces rare but high-quality signals.
 */
export function analyzeMarket(candles: CandleData[], asset: string): SignalAnalysis | null {
  if (candles.length < 20) return null;

  const price = candles[candles.length - 1].close;

  // Indicators (informational)
  const ema200 = getLastEMA(candles, Math.min(200, candles.length));
  let ema200Bias: MacroBias = 'NEUTRAL';
  if (price > ema200 * 1.001) ema200Bias = 'BULL';
  else if (price < ema200 * 0.999) ema200Bias = 'BEAR';

  const { support, resistance } = calculateSupportResistance(candles.slice(-20));
  const vwap = calculateVWAP(candles.slice(-30));
  const bb = calculateBollingerBands(candles, Math.min(20, candles.length), 2.0);
  const atr = calculateATR(candles);
  const rsi = calculateRSI(candles, 14);
  const stoch = calculateStochastic(candles, 5, 3);
  const pattern = detectCandlePatterns(candles);

  // --- Exhaustion Reversal Logic ---
  const confluences: string[] = [];
  let direction: SignalDirection = 'WAIT';
  let confidence = 0;

  const belowLower = price < bb.lower;
  const aboveUpper = price > bb.upper;
  const rsiOversold = rsi < 35;
  const rsiOverbought = rsi > 65;

  if (belowLower && rsiOversold) {
    // CALL signal: exhaustion to the downside
    direction = 'CALL';
    
    // Confidence from band penetration depth + RSI extremity
    const bandPenetration = bb.lower > 0 ? ((bb.lower - price) / (atr || 1)) * 100 : 0;
    const rsiExtremity = (35 - rsi) / 35; // 0 to 1
    confidence = Math.min(95, Math.max(60, 55 + bandPenetration * 5 + rsiExtremity * 25));

    confluences.push('Preço abaixo da Bollinger Inferior');
    confluences.push(`RSI Sobrevendido (${rsi.toFixed(1)})`);
    if (ema200Bias === 'BULL') {
      confluences.push('Tendência macro de alta (EMA200)');
      confidence = Math.min(95, confidence + 5);
    }
    if (stoch.k < 20) confluences.push('Stochastic sobrevendido');
    if (pattern?.bullish) confluences.push(`Padrão: ${pattern.name}`);

  } else if (aboveUpper && rsiOverbought) {
    // PUT signal: exhaustion to the upside
    direction = 'PUT';

    const bandPenetration = bb.upper > 0 ? ((price - bb.upper) / (atr || 1)) * 100 : 0;
    const rsiExtremity = (rsi - 65) / 35;
    confidence = Math.min(95, Math.max(60, 55 + bandPenetration * 5 + rsiExtremity * 25));

    confluences.push('Preço acima da Bollinger Superior');
    confluences.push(`RSI Sobrecomprado (${rsi.toFixed(1)})`);
    if (ema200Bias === 'BEAR') {
      confluences.push('Tendência macro de baixa (EMA200)');
      confidence = Math.min(95, confidence + 5);
    }
    if (stoch.k > 80) confluences.push('Stochastic sobrecomprado');
    if (pattern && !pattern.bullish) confluences.push(`Padrão: ${pattern.name}`);
  }

  // Add informational confluences even for WAIT
  if (direction === 'WAIT') {
    confidence = 0;
    if (bb.squeeze) confluences.push('Bollinger Squeeze (aguardando rompimento)');
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
    confluences,
  };
}
