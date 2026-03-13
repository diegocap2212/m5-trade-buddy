import { useState, useEffect, useRef } from 'react';
import type { TradingSignal, CandleData, Timeframe } from '@/lib/trading-types';
import { analyzeMarket, backtestCandles } from '@/lib/signal-engine';
import { useBinanceWebSocket } from './use-binance-ws';

interface MG1Stats {
  winsDirect: number;
  winsMG1: number;
  lossesReal: number;
}

interface PendingValidation {
  signal: TradingSignal;
  entryPrice: number;
  entryCandleTimestamp: number;
  state: 'waiting_first' | 'waiting_mg1';
  firstCandleClose?: number;
}

export function useTradingEngine(selectedAsset: string, timeframe: Timeframe) {
  const [currentSignal, setCurrentSignal] = useState<TradingSignal | null>(null);
  const [signalHistory, setSignalHistory] = useState<TradingSignal[]>([]);
  const [mg1Stats, setMG1Stats] = useState<MG1Stats>({ winsDirect: 0, winsMG1: 0, lossesReal: 0 });

  // Signal lock: track the candle timestamp that produced the current signal
  const lockedCandleTimestamp = useRef<number | null>(null);
  const pendingValidation = useRef<PendingValidation | null>(null);

  const { candles, status } = useBinanceWebSocket(selectedAsset, timeframe);
  const connected = status === 'connected';

  // Analyze market — only emit new signal when a NEW candle forms
  useEffect(() => {
    if (candles.length < 20) return;

    const lastCandle = candles[candles.length - 1];
    const lastTimestamp = lastCandle.timestamp;

    // Signal lock: don't re-emit if we already have a signal for this candle
    if (lockedCandleTimestamp.current === lastTimestamp) return;

    const analysis = analyzeMarket(candles, selectedAsset);
    if (!analysis) return;

    // Only emit CALL/PUT signals (WAIT means no exhaustion detected)
    if (analysis.direction === 'WAIT') {
      // If no active signal, show WAIT state
      if (!currentSignal || currentSignal.direction === 'WAIT') {
        setCurrentSignal({
          id: crypto.randomUUID(),
          asset: selectedAsset,
          direction: 'WAIT',
          confidence: 0,
          price: analysis.price,
          support: analysis.support,
          resistance: analysis.resistance,
          pattern: analysis.pattern,
          timestamp: new Date(),
          result: 'PENDING',
          ema200Bias: analysis.ema200Bias,
          rsi: analysis.rsi,
          stochK: analysis.stochK,
          stochD: analysis.stochD,
          confluences: analysis.confluences,
        });
      }
      return;
    }

    // Lock signal to this candle — no more changes until next candle
    lockedCandleTimestamp.current = lastTimestamp;

    const signal: TradingSignal = {
      id: crypto.randomUUID(),
      asset: selectedAsset,
      direction: analysis.direction,
      confidence: analysis.confidence,
      price: analysis.price,
      support: analysis.support,
      resistance: analysis.resistance,
      pattern: analysis.pattern,
      timestamp: new Date(),
      result: 'PENDING',
      ema200Bias: analysis.ema200Bias,
      rsi: analysis.rsi,
      stochK: analysis.stochK,
      stochD: analysis.stochD,
      confluences: analysis.confluences,
    };

    setCurrentSignal(signal);

    // Set up pending validation — will resolve on next candle(s)
    pendingValidation.current = {
      signal,
      entryPrice: analysis.price,
      entryCandleTimestamp: lastTimestamp,
      state: 'waiting_first',
    };
  }, [candles, selectedAsset]);

  // Validate signal results using real price data
  useEffect(() => {
    const pv = pendingValidation.current;
    if (!pv || candles.length < 2) return;

    const lastCandle = candles[candles.length - 1];
    const lastTimestamp = lastCandle.timestamp;

    if (pv.state === 'waiting_first') {
      // We need at least 1 candle AFTER the entry candle
      if (lastTimestamp <= pv.entryCandleTimestamp) return;

      const closePrice = lastCandle.close;
      const isWin = pv.signal.direction === 'CALL'
        ? closePrice > pv.entryPrice
        : closePrice < pv.entryPrice;

      if (isWin) {
        // Direct win
        const resolvedSignal = { ...pv.signal, result: 'WIN' as const };
        setSignalHistory(prev => [resolvedSignal, ...prev].slice(0, 50));
        setMG1Stats(prev => ({ ...prev, winsDirect: prev.winsDirect + 1 }));
        pendingValidation.current = null;
      } else {
        // First candle lost — wait for MG1 (next candle)
        pv.state = 'waiting_mg1';
        pv.firstCandleClose = closePrice;
      }
    } else if (pv.state === 'waiting_mg1') {
      // We need 2 candles after entry
      const candlesSinceEntry = candles.filter(c => c.timestamp > pv.entryCandleTimestamp);
      if (candlesSinceEntry.length < 2) return;

      const mg1Candle = candlesSinceEntry[1];
      const isWinMG1 = pv.signal.direction === 'CALL'
        ? mg1Candle.close > (pv.firstCandleClose ?? pv.entryPrice)
        : mg1Candle.close < (pv.firstCandleClose ?? pv.entryPrice);

      if (isWinMG1) {
        const resolvedSignal = { ...pv.signal, result: 'WIN' as const };
        setSignalHistory(prev => [resolvedSignal, ...prev].slice(0, 50));
        setMG1Stats(prev => ({ ...prev, winsMG1: prev.winsMG1 + 1 }));
      } else {
        const resolvedSignal = { ...pv.signal, result: 'LOSS' as const };
        setSignalHistory(prev => [resolvedSignal, ...prev].slice(0, 50));
        setMG1Stats(prev => ({ ...prev, lossesReal: prev.lossesReal + 1 }));
      }
      pendingValidation.current = null;
    }
  }, [candles]);

  // Run backtest when initial candles load
  const backtestRan = useRef(false);
  useEffect(() => {
    if (candles.length >= 23 && !backtestRan.current) {
      backtestRan.current = true;
      const result = backtestCandles(candles, selectedAsset);
      if (result.signals.length > 0) {
        setSignalHistory(result.signals);
        setMG1Stats(result.stats);
      }
    }
  }, [candles, selectedAsset]);

  // Reset signal lock when asset changes
  useEffect(() => {
    lockedCandleTimestamp.current = null;
    pendingValidation.current = null;
    backtestRan.current = false;
    setCurrentSignal(null);
    setSignalHistory([]);
    setMG1Stats({ winsDirect: 0, winsMG1: 0, lossesReal: 0 });
  }, [selectedAsset]);

  const totalDecided = mg1Stats.winsDirect + mg1Stats.winsMG1 + mg1Stats.lossesReal;
  const wins = mg1Stats.winsDirect + mg1Stats.winsMG1;
  const losses = mg1Stats.lossesReal;
  const winRate = totalDecided > 0 ? (wins / totalDecided) * 100 : 0;

  let consecutiveLosses = 0;
  for (const s of signalHistory) {
    if (s.result === 'LOSS') consecutiveLosses++;
    else break;
  }

  // Calculate entry times based on timeframe
  const intervalMs = timeframe === 'M1' ? 60_000 : 300_000;
  const now = Date.now();
  const nextCandleClose = Math.ceil(now / intervalMs) * intervalMs;
  const entryTime = new Date(nextCandleClose - 1000);
  const martingaleTime = consecutiveLosses >= 1 ? new Date(nextCandleClose + intervalMs - 1000) : null;

  return {
    currentSignal,
    signalHistory,
    candles,
    connected,
    connectionStatus: status,
    wins,
    losses,
    totalSignals: signalHistory.length,
    winRate,
    consecutiveLosses,
    entryTime,
    martingaleTime,
    mg1Stats,
  };
}
