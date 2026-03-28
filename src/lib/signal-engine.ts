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
 * CALL: price closes below lower Bollinger (2.0 dev) AND RSI < 30
 * PUT:  price closes above upper Bollinger (2.0 dev) AND RSI > 70
 * 
 * Confidence is calculated from how deep the price penetrates the band
 * and how extreme the RSI is. This produces rare but high-quality signals.
 */
export function analyzeMarket(candles: CandleData[], asset: string): SignalAnalysis | null {
  if (candles.length < 20) return null;

  const price = candles[candles.length - 1].close;

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

  const confluences: string[] = [];
  let direction: SignalDirection = 'WAIT';
  let confidence = 0;

  const belowLower = price < bb.lower;
  const aboveUpper = price > bb.upper;
  const rsiOversold = rsi < 30;
  const rsiOverbought = rsi > 70;

  if (belowLower && rsiOversold) {
    direction = 'CALL';
    const bandPenetration = bb.lower > 0 ? ((bb.lower - price) / (atr || 1)) * 100 : 0;
    const rsiExtremity = (30 - rsi) / 30;
    confidence = Math.min(95, Math.max(55, 50 + bandPenetration * 5 + rsiExtremity * 25));

    confluences.push('Preço abaixo da Bollinger Inferior');
    confluences.push(`RSI Sobrevendido (${rsi.toFixed(1)})`);
    if (ema200Bias === 'BULL') {
      confluences.push('Tendência macro de alta (EMA200)');
      confidence = Math.min(95, confidence + 5);
    }
    if (stoch.k < 20) {
      confluences.push('Stochastic sobrevendido');
      confidence = Math.min(95, confidence + 5);
    }
    if (price < vwap) {
      confluences.push('Preço abaixo do VWAP');
      confidence = Math.min(95, confidence + 3);
    }
    if (pattern?.bullish) {
      confluences.push(`Padrão: ${pattern.name}`);
      confidence = Math.min(95, confidence + 8);
    }

  } else if (aboveUpper && rsiOverbought) {
    direction = 'PUT';
    const bandPenetration = bb.upper > 0 ? ((price - bb.upper) / (atr || 1)) * 100 : 0;
    const rsiExtremity = (rsi - 70) / 30;
    confidence = Math.min(95, Math.max(55, 50 + bandPenetration * 5 + rsiExtremity * 25));

    confluences.push('Preço acima da Bollinger Superior');
    confluences.push(`RSI Sobrecomprado (${rsi.toFixed(1)})`);
    if (ema200Bias === 'BEAR') {
      confluences.push('Tendência macro de baixa (EMA200)');
      confidence = Math.min(95, confidence + 5);
    }
    if (stoch.k > 80) {
      confluences.push('Stochastic sobrecomprado');
      confidence = Math.min(95, confidence + 5);
    }
    if (price > vwap) {
      confluences.push('Preço acima do VWAP');
      confidence = Math.min(95, confidence + 3);
    }
    if (pattern && !pattern.bullish) {
      confluences.push(`Padrão: ${pattern.name}`);
      confidence = Math.min(95, confidence + 8);
    }
  }

  // Confiança mínima de 70% — padrão de vela NÃO é obrigatório
  if (direction !== 'WAIT' && confidence < 70) {
    direction = 'WAIT';
    confidence = 0;
    confluences.length = 0;
  }

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

export interface BacktestResult {
  signals: import('./trading-types').TradingSignal[];
  stats: { winsDirect: number; winsMG1: number; winsMG2: number; lossesMG1: number; lossesMG2: number; lossesDirect: number };
}

/**
 * Run the exhaustion reversal strategy on historical candles.
 * For each candle i (from 20 to length-4), run analyzeMarket.
 * Validate with candle i+1 (direct), i+2 (MG1), i+3 (MG2).
 */
export function backtestCandles(candles: CandleData[], asset: string): BacktestResult {
  const signals: import('./trading-types').TradingSignal[] = [];
  const stats = { winsDirect: 0, winsMG1: 0, winsMG2: 0, lossesMG1: 0, lossesMG2: 0, lossesDirect: 0 };

  if (candles.length < 24) return { signals, stats };

  // Cooldown: after a signal, skip at least 4 candles (entry + 3 validation candles)
  let cooldownUntil = 0;

  for (let i = 20; i < candles.length - 3; i++) {
    if (i < cooldownUntil) continue;

    const slice = candles.slice(0, i + 1);
    const analysis = analyzeMarket(slice, asset);
    if (!analysis || analysis.direction === 'WAIT') continue;

    const entryPrice = analysis.price;
    const nextCandle = candles[i + 1];
    const mg1Candle = candles[i + 2];
    const mg2Candle = candles[i + 3];

    const isDirectWin = analysis.direction === 'CALL'
      ? nextCandle.close > entryPrice
      : nextCandle.close < entryPrice;

    let result: 'WIN' | 'LOSS';
    let resultDetail: import('./trading-types').ResultDetail;
    let resolvedCandleIndex: number;

    if (isDirectWin) {
      result = 'WIN';
      resultDetail = 'WIN_DIRECT';
      stats.winsDirect++;
      resolvedCandleIndex = i + 1;
    } else {
      // MG1: re-enter at nextCandle.close
      const isMG1Win = analysis.direction === 'CALL'
        ? mg1Candle.close > nextCandle.close
        : mg1Candle.close < nextCandle.close;

      if (isMG1Win) {
        result = 'WIN';
        resultDetail = 'WIN_MG1';
        stats.winsMG1++;
        resolvedCandleIndex = i + 2;
      } else {
        // MG2: re-enter at mg1Candle.close
        const isMG2Win = analysis.direction === 'CALL'
          ? mg2Candle.close > mg1Candle.close
          : mg2Candle.close < mg1Candle.close;

        if (isMG2Win) {
          result = 'WIN';
          resultDetail = 'WIN_MG2';
          stats.winsMG2++;
          resolvedCandleIndex = i + 3;
        } else {
          result = 'LOSS';
          resultDetail = 'LOSS_MG2';
          stats.lossesMG2++;
          resolvedCandleIndex = i + 3;
        }
      }
    }

    // Set cooldown: skip next 4 candles (entry + 3 validation)
    cooldownUntil = i + 4;

    signals.push({
      id: crypto.randomUUID(),
      asset,
      direction: analysis.direction,
      confidence: analysis.confidence,
      price: entryPrice,
      support: analysis.support,
      resistance: analysis.resistance,
      pattern: analysis.pattern,
      timestamp: new Date(candles[i].timestamp),
      result,
      resultDetail,
      resolvedTimestamp: new Date(candles[resolvedCandleIndex].timestamp),
      ema200Bias: analysis.ema200Bias,
      rsi: analysis.rsi,
      stochK: analysis.stochK,
      stochD: analysis.stochD,
      confluences: analysis.confluences,
    });
  }

  return { signals, stats };
}
