import { useState, useCallback, useRef } from 'react';
import type { TradingSignal, Timeframe } from '@/lib/trading-types';
import type { MG1Stats } from './use-trading-engine';

export interface SessionData {
  signals: TradingSignal[];
  stats: MG1Stats;
}

const emptyStats: MG1Stats = { winsDirect: 0, winsMG1: 0, lossesMG1: 0, lossesDirect: 0 };

function makeKey(asset: string, timeframe: Timeframe) {
  return `${asset}_${timeframe}`;
}

export function useSessionHistory() {
  const sessionsRef = useRef<Map<string, SessionData>>(new Map());
  const [currentKey, setCurrentKey] = useState('');

  const getSession = useCallback((asset: string, timeframe: Timeframe): SessionData => {
    const key = makeKey(asset, timeframe);
    return sessionsRef.current.get(key) ?? { signals: [], stats: { ...emptyStats } };
  }, []);

  const saveSession = useCallback((asset: string, timeframe: Timeframe, signals: TradingSignal[], stats: MG1Stats) => {
    const key = makeKey(asset, timeframe);
    sessionsRef.current.set(key, { signals: [...signals], stats: { ...stats } });
    setCurrentKey(key); // trigger re-render
  }, []);

  const switchSession = useCallback((asset: string, timeframe: Timeframe): SessionData => {
    const key = makeKey(asset, timeframe);
    setCurrentKey(key);
    return sessionsRef.current.get(key) ?? { signals: [], stats: { ...emptyStats } };
  }, []);

  const getAllSessions = useCallback(() => {
    return new Map(sessionsRef.current);
  }, []);

  return { getSession, saveSession, switchSession, getAllSessions, currentKey };
}
