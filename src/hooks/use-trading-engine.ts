import { useState, useEffect, useRef, useCallback } from 'react';
import type { TradingSignal, CandleData, Timeframe, ResultDetail } from '@/lib/trading-types';
import { analyzeMarket, backtestCandles } from '@/lib/signal-engine';
import { useMarketData } from './use-market-data';
import { playCallAlert, playPutAlert, playWinSound, playLossSound, playMG1Alert } from '@/lib/sound-alerts';
import { useSessionHistory } from './use-session-history';
import { recordResult, recordBacktestResults } from '@/lib/global-stats';
import type { ScannerOpportunity } from './use-multi-scanner';

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

/**
 * Get closed candles only (exclude the currently forming candle).
 */
function getClosedCandles(candles: CandleData[], timeframe: Timeframe): CandleData[] {
  if (candles.length < 2) return candles;
  const intervalMs = timeframe === 'M1' ? 60_000 : 300_000;
  const now = Date.now();
  const currentCandleTs = Math.floor(now / intervalMs) * intervalMs;
  const last = candles[candles.length - 1];
  // If the last candle's timestamp matches the current forming candle, exclude it
  if (last.timestamp >= currentCandleTs) {
    return candles.slice(0, -1);
  }
  return candles;
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

  const { candles, status, dataSourceLabel } = useMarketData(selectedAsset, timeframe);
  const connected = status === 'connected';

  const sessionHistory = useSessionHistory();

  // Handle asset/timeframe change — persist and restore
  useEffect(() => {
    const newKey = `${selectedAsset}_${timeframe}`;
    if (prevKeyRef.current && prevKeyRef.current !== newKey) {
      const [prevAsset, prevTf] = prevKeyRef.current.split('_') as [string, Timeframe];
      sessionHistory.saveSession(prevAsset, prevTf, signalHistoryRef.current, mg1StatsRef.current);

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

  // Helper: update a signal in history by ID
  const updateSignalById = useCallback((id: string, updates: Partial<TradingSignal>) => {
    setSignalHistory(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  /**
   * Commit an external opportunity as a PENDING signal.
   * Called when user clicks "ABRIR" on the scanner banner.
   */
  const commitOpportunity = useCallback((opp: ScannerOpportunity) => {
    // Don't commit if we already have a pending validation
    if (pendingValidation.current) return;

    const signalId = crypto.randomUUID();
    const signal: TradingSignal = {
      id: signalId,
      asset: opp.asset,
      direction: opp.analysis.direction,
      confidence: opp.analysis.confidence,
      price: opp.analysis.price,
      support: opp.analysis.support,
      resistance: opp.analysis.resistance,
      pattern: opp.analysis.pattern,
      timestamp: new Date(opp.entryTimestamp),
      result: 'PENDING',
      ema200Bias: opp.analysis.ema200Bias,
      rsi: opp.analysis.rsi,
      stochK: opp.analysis.stochK,
      stochD: opp.analysis.stochD,
      confluences: opp.analysis.confluences,
    };

    setCurrentSignal(signal);
    setSignalHistory(prev => [signal, ...prev].slice(0, 50));

    if (signal.direction === 'CALL') playCallAlert();
    else if (signal.direction === 'PUT') playPutAlert();

    // Use closeTimestamp as entry candle reference for validation
    lockedCandleTimestamp.current = opp.closeTimestamp;
    pendingValidation.current = {
      signal,
      entryPrice: opp.analysis.price,
      entryCandleTimestamp: opp.closeTimestamp,
      state: 'waiting_first',
    };
  }, []);

  // Analyze market using CLOSED candles only
  useEffect(() => {
    const closedCandles = getClosedCandles(candles, timeframe);
    if (closedCandles.length < 20) return;

    const lastCandle = closedCandles[closedCandles.length - 1];
    const lastTimestamp = lastCandle.timestamp;

    if (lockedCandleTimestamp.current === lastTimestamp) return;

    const analysis = analyzeMarket(closedCandles, selectedAsset);
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
          timestamp: new Date(lastTimestamp),
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

    const signalId = crypto.randomUUID();
    const signal: TradingSignal = {
      id: signalId,
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
    // Immediately add PENDING signal to history so it's visible
    setSignalHistory(prev => [signal, ...prev].slice(0, 50));
    
    if (signal.direction === 'CALL') playCallAlert();
    else if (signal.direction === 'PUT') playPutAlert();
    pendingValidation.current = {
      signal,
      entryPrice: analysis.price,
      entryCandleTimestamp: lastTimestamp,
      state: 'waiting_first',
    };
  }, [candles, selectedAsset, timeframe]);

  // Validate signal results using CLOSED candles
  useEffect(() => {
    const pv = pendingValidation.current;
    if (!pv || candles.length < 2) return;

    // Use closed candles for validation
    const closedCandles = getClosedCandles(candles, timeframe);

    if (pv.state === 'waiting_first') {
      // Find first closed candle after entry
      const validationCandle = closedCandles.find(c => c.timestamp > pv.entryCandleTimestamp);
      if (!validationCandle) return;

      const closePrice = validationCandle.close;
      const isDoji = closePrice === pv.entryPrice;
      const isWin = !isDoji && (pv.signal.direction === 'CALL'
        ? closePrice > pv.entryPrice
        : closePrice < pv.entryPrice);

      if (isWin) {
        const updates = { result: 'WIN' as const, resultDetail: 'WIN_DIRECT' as ResultDetail, resolvedTimestamp: new Date(validationCandle.timestamp) };
        updateSignalById(pv.signal.id, updates);
        setCurrentSignal(prev => prev?.id === pv.signal.id ? { ...prev, ...updates } : prev);
        setMG1Stats(prev => ({ ...prev, winsDirect: prev.winsDirect + 1 }));
        recordResult('WIN_DIRECT', selectedAsset, timeframe);
        pendingValidation.current = null;
        playWinSound();
        console.log(`[Engine] ✅ WIN_DIRECT for ${pv.signal.asset} ${pv.signal.direction} | entry=${pv.entryPrice} close=${closePrice}`);
      } else {
        // LOSS on first candle → go to MG1
        pv.state = 'waiting_mg1';
        pv.firstCandleClose = closePrice;
        // Update signal to show it's in MG1 phase
        updateSignalById(pv.signal.id, { result: 'PENDING' as const, resultDetail: 'LOSS_DIRECT' as ResultDetail });
        playMG1Alert();
        console.log(`[Engine] ⚠️ LOSS_DIRECT → MG1 for ${pv.signal.asset} ${pv.signal.direction} | entry=${pv.entryPrice} close=${closePrice}`);
      }
    } else if (pv.state === 'waiting_mg1') {
      // Find two closed candles after entry
      const candlesAfterEntry = closedCandles.filter(c => c.timestamp > pv.entryCandleTimestamp);
      if (candlesAfterEntry.length < 2) return;

      const mg1Candle = candlesAfterEntry[1];
      const mg1EntryPrice = pv.firstCandleClose ?? pv.entryPrice;
      const isWinMG1 = pv.signal.direction === 'CALL'
        ? mg1Candle.close > mg1EntryPrice
        : mg1Candle.close < mg1EntryPrice;

      if (isWinMG1) {
        const updates = { result: 'WIN' as const, resultDetail: 'WIN_MG1' as ResultDetail, resolvedTimestamp: new Date(mg1Candle.timestamp) };
        updateSignalById(pv.signal.id, updates);
        setCurrentSignal(prev => prev?.id === pv.signal.id ? null : prev);
        setMG1Stats(prev => ({ ...prev, winsMG1: prev.winsMG1 + 1 }));
        recordResult('WIN_MG1', selectedAsset, timeframe);
        playWinSound();
        console.log(`[Engine] ⚡ WIN_MG1 for ${pv.signal.asset} ${pv.signal.direction} | mg1Entry=${mg1EntryPrice} close=${mg1Candle.close}`);
      } else {
        const updates = { result: 'LOSS' as const, resultDetail: 'LOSS_MG1' as ResultDetail, resolvedTimestamp: new Date(mg1Candle.timestamp) };
        updateSignalById(pv.signal.id, updates);
        setCurrentSignal(prev => prev?.id === pv.signal.id ? null : prev);
        setMG1Stats(prev => ({ ...prev, lossesMG1: prev.lossesMG1 + 1 }));
        recordResult('LOSS_MG1', selectedAsset, timeframe);
        playLossSound();
        console.log(`[Engine] 💀 LOSS_MG1 for ${pv.signal.asset} ${pv.signal.direction} | mg1Entry=${mg1EntryPrice} close=${mg1Candle.close}`);
      }
      pendingValidation.current = null;
    }
  }, [candles, timeframe, selectedAsset, updateSignalById]);

  // Backtest
  useEffect(() => {
    if (candles.length >= 23 && (!backtestRan.current || backtestAssetRef.current !== selectedAsset)) {
      backtestRan.current = true;
      backtestAssetRef.current = selectedAsset;
      const result = backtestCandles(candles, selectedAsset);
      if (result.signals.length > 0) {
        setSignalHistory(prev => {
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
    commitOpportunity,
  };
}
