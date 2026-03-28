import { useState, useEffect, useRef, useCallback } from 'react';
import type { TradingSignal, CandleData, Timeframe, ResultDetail } from '@/lib/trading-types';
import { CRYPTO_ASSETS } from '@/lib/trading-types';
import { analyzeMarket, backtestCandles } from '@/lib/signal-engine';
import { useMarketData } from './use-market-data';
import { playCallAlert, playPutAlert, playWinSound, playLossSound, playMG1Alert, playMG2Alert } from '@/lib/sound-alerts';
import { useSessionHistory } from './use-session-history';
import { recordResult, recordBacktestResults } from '@/lib/global-stats';
import type { ScannerOpportunity } from './use-multi-scanner';

// ─── Feature constants ───────────────────────────────────────────────────────
/** Minimum signal confidence to allow MG2 escalation */
const MG_CONFIDENCE_THRESHOLD = 88;
/** Maximum cumulative daily loss as % of capital before day stop */
const MAX_DAILY_LOSS_PERCENT = 5.0;
// ─────────────────────────────────────────────────────────────────────────────

export interface MG1Stats {
  winsDirect: number;
  winsMG1: number;
  winsMG2: number;
  lossesMG1: number;
  lossesMG2: number;
  lossesDirect: number;
}

interface PendingValidation {
  signal: TradingSignal;
  entryPrice: number;
  entryCandleTimestamp: number;
  state: 'waiting_first' | 'waiting_mg1' | 'waiting_mg2';
  firstCandleClose?: number;
  mg1CandleClose?: number;
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
  if (last.timestamp >= currentCandleTs) {
    return candles.slice(0, -1);
  }
  return candles;
}

export function useTradingEngine(selectedAsset: string, timeframe: Timeframe, capital: number = 1000) {
  const [currentSignal, setCurrentSignal] = useState<TradingSignal | null>(null);
  const [signalHistory, setSignalHistory] = useState<TradingSignal[]>([]);
  const [mg1Stats, setMG1Stats] = useState<MG1Stats>({ winsDirect: 0, winsMG1: 0, winsMG2: 0, lossesMG1: 0, lossesMG2: 0, lossesDirect: 0 });

  // ── Feature 4: Bank-based daily stop ──
  const capitalRef = useRef(capital);
  capitalRef.current = capital;
  const [dailyLossPercent, setDailyLossPercent] = useState(0);
  const [dailyStopTriggered, setDailyStopTriggered] = useState(false);
  const dailyLossRef = useRef(0);
  const dailyResetDate = useRef(new Date().toDateString());

  // Reset daily counters at midnight
  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== dailyResetDate.current) {
        dailyResetDate.current = today;
        dailyLossRef.current = 0;
        setDailyLossPercent(0);
        setDailyStopTriggered(false);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  /** Accumulate a realised loss into the daily counter */
  const addDailyLoss = useCallback((type: 'LOSS_MG1' | 'LOSS_MG2') => {
    const cap = capitalRef.current;
    if (cap <= 0) return;
    const asset = CRYPTO_ASSETS.find(a => a.pair === selectedAsset);
    const payout = (asset?.payout ?? 85) / 100;
    const base = cap * 0.02;
    const mg1 = (base * (1 + payout)) / payout;
    const mg2 = ((base + mg1) * (1 + payout)) / payout;
    const lost = type === 'LOSS_MG1' ? base + mg1 : base + mg1 + mg2;
    const lostPct = (lost / cap) * 100;
    dailyLossRef.current += lostPct;
    setDailyLossPercent(Math.round(dailyLossRef.current * 100) / 100);
    if (dailyLossRef.current >= MAX_DAILY_LOSS_PERCENT) {
      setDailyStopTriggered(true);
    }
  }, [selectedAsset]);
  // ────────────────────────────────────────

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
   */
  const commitOpportunity = useCallback((opp: ScannerOpportunity) => {
    if (pendingValidation.current || dailyStopTriggered) return;

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
      mgAllowed: opp.analysis.confidence >= MG_CONFIDENCE_THRESHOLD,
    };

    setCurrentSignal(signal);
    setSignalHistory(prev => [signal, ...prev].slice(0, 50));

    if (signal.direction === 'CALL') playCallAlert();
    else if (signal.direction === 'PUT') playPutAlert();

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

    if (dailyStopTriggered) return; // Daily stop active — no new signals

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
      mgAllowed: analysis.confidence >= MG_CONFIDENCE_THRESHOLD,
    };

    setCurrentSignal(signal);
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

  // Validate signal results using CLOSED candles — 3-phase: DIRECT → MG1 → MG2
  useEffect(() => {
    const pv = pendingValidation.current;
    if (!pv || candles.length < 2) return;

    const closedCandles = getClosedCandles(candles, timeframe);

    if (pv.state === 'waiting_first') {
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
        updateSignalById(pv.signal.id, { result: 'PENDING' as const, resultDetail: 'LOSS_DIRECT' as ResultDetail });
        playMG1Alert();
        console.log(`[Engine] ⚠️ LOSS_DIRECT → MG1 for ${pv.signal.asset} ${pv.signal.direction} | entry=${pv.entryPrice} close=${closePrice}`);
      }
    } else if (pv.state === 'waiting_mg1') {
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
      } else if (!pv.signal.mgAllowed) {
        // ── MG Confidence Guard: signal confidence < 88% → stop at MG1, no MG2 ──
        const updates = { result: 'LOSS' as const, resultDetail: 'LOSS_MG1' as ResultDetail, resolvedTimestamp: new Date(mg1Candle.timestamp) };
        updateSignalById(pv.signal.id, updates);
        setCurrentSignal(prev => prev?.id === pv.signal.id ? null : prev);
        setMG1Stats(prev => ({ ...prev, lossesMG1: prev.lossesMG1 + 1 }));
        recordResult('LOSS_MG1', selectedAsset, timeframe);
        addDailyLoss('LOSS_MG1');
        playLossSound();
        console.log(`[Engine] 🔒 LOSS_MG1 final (MG2 bloqueado, conf<${MG_CONFIDENCE_THRESHOLD}%) for ${pv.signal.asset} ${pv.signal.direction}`);
      } else {
        // LOSS on MG1 → go to MG2
        pv.state = 'waiting_mg2';
        pv.mg1CandleClose = mg1Candle.close;
        updateSignalById(pv.signal.id, { result: 'PENDING' as const, resultDetail: 'LOSS_MG1' as ResultDetail });
        playMG2Alert();
        console.log(`[Engine] ⚠️ LOSS_MG1 → MG2 for ${pv.signal.asset} ${pv.signal.direction} | mg1Entry=${mg1EntryPrice} close=${mg1Candle.close}`);
      }
      if (pv.state !== 'waiting_mg2') pendingValidation.current = null;
    } else if (pv.state === 'waiting_mg2') {
      const candlesAfterEntry = closedCandles.filter(c => c.timestamp > pv.entryCandleTimestamp);
      if (candlesAfterEntry.length < 3) return;

      const mg2Candle = candlesAfterEntry[2];
      const mg2EntryPrice = pv.mg1CandleClose ?? pv.firstCandleClose ?? pv.entryPrice;
      const isWinMG2 = pv.signal.direction === 'CALL'
        ? mg2Candle.close > mg2EntryPrice
        : mg2Candle.close < mg2EntryPrice;

      if (isWinMG2) {
        const updates = { result: 'WIN' as const, resultDetail: 'WIN_MG2' as ResultDetail, resolvedTimestamp: new Date(mg2Candle.timestamp) };
        updateSignalById(pv.signal.id, updates);
        setCurrentSignal(prev => prev?.id === pv.signal.id ? null : prev);
        setMG1Stats(prev => ({ ...prev, winsMG2: prev.winsMG2 + 1 }));
        recordResult('WIN_MG2', selectedAsset, timeframe);
        playWinSound();
        console.log(`[Engine] 🔥 WIN_MG2 for ${pv.signal.asset} ${pv.signal.direction} | mg2Entry=${mg2EntryPrice} close=${mg2Candle.close}`);
      } else {
        const updates = { result: 'LOSS' as const, resultDetail: 'LOSS_MG2' as ResultDetail, resolvedTimestamp: new Date(mg2Candle.timestamp) };
        updateSignalById(pv.signal.id, updates);
        setCurrentSignal(prev => prev?.id === pv.signal.id ? null : prev);
        setMG1Stats(prev => ({ ...prev, lossesMG2: prev.lossesMG2 + 1 }));
        recordResult('LOSS_MG2', selectedAsset, timeframe);
        addDailyLoss('LOSS_MG2');
        playLossSound();
        console.log(`[Engine] 💀 LOSS_MG2 for ${pv.signal.asset} ${pv.signal.direction} | mg2Entry=${mg2EntryPrice} close=${mg2Candle.close}`);
      }
      pendingValidation.current = null;
    }
  }, [candles, timeframe, selectedAsset, updateSignalById]);

  // Backtest removed from live engine — use dedicated Backtest page instead

  const totalDecided = mg1Stats.winsDirect + mg1Stats.winsMG1 + mg1Stats.winsMG2 + mg1Stats.lossesMG1 + mg1Stats.lossesMG2 + mg1Stats.lossesDirect;
  const wins = mg1Stats.winsDirect + mg1Stats.winsMG1 + mg1Stats.winsMG2;
  const losses = mg1Stats.lossesMG1 + mg1Stats.lossesMG2 + mg1Stats.lossesDirect;
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
    dataSourceLabel,
    // Feature 4: bank-based daily stop
    dailyLossPercent,
    maxDailyLossPercent: MAX_DAILY_LOSS_PERCENT,
    dailyStopTriggered,
  };
}
