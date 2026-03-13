import { useState, useEffect, useRef, useCallback } from 'react';
import type { TradingSignal, CandleData, Timeframe, ResultDetail } from '@/lib/trading-types';
import { analyzeMarket, backtestCandles } from '@/lib/signal-engine';
import { useMarketData } from './use-market-data';
import { playCallAlert, playPutAlert, playWinSound, playLossSound, playMG1Alert } from '@/lib/sound-alerts';
import { useSessionHistory } from './use-session-history';
import { recordResult, recordBacktestResults } from '@/lib/global-stats';

export interface MG1Stats {
  winsDirect: number;
  winsMG1: number;
  lossesMG1: number;
  lossesDirect: number;
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
  const [mg1Stats, setMG1Stats] = useState<MG1Stats>({ winsDirect: 0, winsMG1: 0, lossesMG1: 0, lossesDirect: 0 });

  const lockedCandleTimestamp = useRef<number | null>(null);
  const pendingValidation = useRef<PendingValidation | null>(null);
  const prevKeyRef = useRef<string>('');
  const backtestRan = useRef(false);
  const backtestAssetRef = useRef('');
  const signalHistoryRef = useRef(signalHistory);
  const mg1StatsRef = useRef(mg1Stats);
  signalHistoryRef.current = signalHistory;
  mg1StatsRef.current = mg1Stats;

  const { candles, status } = useMarketData(selectedAsset, timeframe);
  const connected = status === 'connected';

  const sessionHistory = useSessionHistory();

  // Handle asset/timeframe change — persist and restore
  useEffect(() => {
    const newKey = `${selectedAsset}_${timeframe}`;
    if (prevKeyRef.current && prevKeyRef.current !== newKey) {
      // Save outgoing session using refs to avoid stale closures
      const [prevAsset, prevTf] = prevKeyRef.current.split('_') as [string, Timeframe];
      sessionHistory.saveSession(prevAsset, prevTf, signalHistoryRef.current, mg1StatsRef.current);

      // Load incoming session
      const restored = sessionHistory.switchSession(selectedAsset, timeframe);
      setSignalHistory(restored.signals);
      setMG1Stats(restored.stats);
      
      lockedCandleTimestamp.current = null;
      pendingValidation.current = null;
      backtestRan.current = restored.signals.length > 0;
      setCurrentSignal(null);
    }
    prevKeyRef.current = newKey;
  }, [selectedAsset, timeframe]);

  // Analyze market
  useEffect(() => {
    if (candles.length < 20) return;

    const lastCandle = candles[candles.length - 1];
    const lastTimestamp = lastCandle.timestamp;

    if (lockedCandleTimestamp.current === lastTimestamp) return;

    const analysis = analyzeMarket(candles, selectedAsset);
    if (!analysis) return;

    if (analysis.direction === 'WAIT' || pendingValidation.current) {
      if (analysis.direction === 'WAIT' && (!currentSignal || currentSignal.direction === 'WAIT')) {
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
      timestamp: new Date(lastTimestamp),
      result: 'PENDING',
      ema200Bias: analysis.ema200Bias,
      rsi: analysis.rsi,
      stochK: analysis.stochK,
      stochD: analysis.stochD,
      confluences: analysis.confluences,
    };

    setCurrentSignal(signal);
    
    if (signal.direction === 'CALL') playCallAlert();
    else if (signal.direction === 'PUT') playPutAlert();
    pendingValidation.current = {
      signal,
      entryPrice: analysis.price,
      entryCandleTimestamp: lastTimestamp,
      state: 'waiting_first',
    };
  }, [candles, selectedAsset]);

  // Validate signal results
  useEffect(() => {
    const pv = pendingValidation.current;
    if (!pv || candles.length < 2) return;

    const lastCandle = candles[candles.length - 1];
    const lastTimestamp = lastCandle.timestamp;

    if (pv.state === 'waiting_first') {
      if (lastTimestamp <= pv.entryCandleTimestamp) return;

      const closePrice = lastCandle.close;
      const isWin = pv.signal.direction === 'CALL'
        ? closePrice > pv.entryPrice
        : closePrice < pv.entryPrice;

      if (isWin) {
        const resolvedSignal = { ...pv.signal, result: 'WIN' as const, resultDetail: 'WIN_DIRECT' as ResultDetail };
        setSignalHistory(prev => [resolvedSignal, ...prev].slice(0, 50));
        setMG1Stats(prev => ({ ...prev, winsDirect: prev.winsDirect + 1 }));
        recordResult('WIN_DIRECT', selectedAsset, timeframe);
        pendingValidation.current = null;
        playWinSound();
      } else {
        pv.state = 'waiting_mg1';
        pv.firstCandleClose = closePrice;
        playMG1Alert();
      }
    } else if (pv.state === 'waiting_mg1') {
      const candlesSinceEntry = candles.filter(c => c.timestamp > pv.entryCandleTimestamp);
      if (candlesSinceEntry.length < 2) return;

      const mg1Candle = candlesSinceEntry[1];
      const isWinMG1 = pv.signal.direction === 'CALL'
        ? mg1Candle.close > (pv.firstCandleClose ?? pv.entryPrice)
        : mg1Candle.close < (pv.firstCandleClose ?? pv.entryPrice);

      if (isWinMG1) {
        const resolvedSignal = { ...pv.signal, result: 'WIN' as const, resultDetail: 'WIN_MG1' as ResultDetail };
        setSignalHistory(prev => [resolvedSignal, ...prev].slice(0, 50));
        setMG1Stats(prev => ({ ...prev, winsMG1: prev.winsMG1 + 1 }));
        recordResult('WIN_MG1', selectedAsset, timeframe);
        playWinSound();
      } else {
        const resolvedSignal = { ...pv.signal, result: 'LOSS' as const, resultDetail: 'LOSS_MG1' as ResultDetail };
        setSignalHistory(prev => [resolvedSignal, ...prev].slice(0, 50));
        setMG1Stats(prev => ({ ...prev, lossesMG1: prev.lossesMG1 + 1 }));
        recordResult('LOSS_MG1', selectedAsset, timeframe);
        playLossSound();
      }
      pendingValidation.current = null;
    }
  }, [candles]);

  // Backtest
  useEffect(() => {
    if (candles.length >= 23 && (!backtestRan.current || backtestAssetRef.current !== selectedAsset)) {
      backtestRan.current = true;
      backtestAssetRef.current = selectedAsset;
      // Verify candles belong to current asset by checking we have fresh data
      const result = backtestCandles(candles, selectedAsset);
      if (result.signals.length > 0) {
        setSignalHistory(prev => {
          // Merge: keep existing real-time signals, add backtest signals that don't overlap
          const existingTimes = new Set(prev.map(s => s.timestamp.getTime()));
          const newSignals = result.signals.filter(s => !existingTimes.has(s.timestamp.getTime()));
          if (newSignals.length === 0) return prev;
          return [...newSignals, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 50);
        });
        setMG1Stats(prev => ({
          winsDirect: prev.winsDirect + result.stats.winsDirect,
          winsMG1: prev.winsMG1 + result.stats.winsMG1,
          lossesMG1: prev.lossesMG1 + result.stats.lossesMG1,
          lossesDirect: prev.lossesDirect + result.stats.lossesDirect,
        }));
        recordBacktestResults(result.signals, timeframe);
      }
    }
  }, [candles, selectedAsset]);

  const totalDecided = mg1Stats.winsDirect + mg1Stats.winsMG1 + mg1Stats.lossesMG1 + mg1Stats.lossesDirect;
  const wins = mg1Stats.winsDirect + mg1Stats.winsMG1;
  const losses = mg1Stats.lossesMG1 + mg1Stats.lossesDirect;
  const winRate = totalDecided > 0 ? (wins / totalDecided) * 100 : 0;

  let consecutiveLosses = 0;
  for (const s of signalHistory) {
    if (s.result === 'LOSS') consecutiveLosses++;
    else break;
  }

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
    sessionHistory,
  };
}
