import type { ResultDetail, Timeframe } from './trading-types';

const STORAGE_KEY = 'trading_global_results';
const MAX_RECORDS = 500;

export interface GlobalResult {
  timestamp: number;
  resultDetail: ResultDetail;
  asset: string;
  timeframe: Timeframe;
  source: 'live' | 'backtest';
}

function load(): GlobalResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GlobalResult[];
    // Migrate old records without source field — treat as backtest (unknown origin)
    return parsed.map(r => ({ ...r, source: r.source || 'backtest' }));
  } catch {
    return [];
  }
}

function save(results: GlobalResult[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(-MAX_RECORDS)));
}

export function recordResult(detail: ResultDetail, asset: string, timeframe: Timeframe) {
  const results = load();
  const now = Date.now();
  const isDupe = results.some(r => r.asset === asset && r.resultDetail === detail && Math.abs(r.timestamp - now) < 5000);
  if (isDupe) return;
  results.push({ timestamp: now, resultDetail: detail, asset, timeframe, source: 'live' });
  save(results);
}

export function recordBacktestResults(signals: Array<{ timestamp: Date; resultDetail?: ResultDetail; asset: string }>, timeframe: Timeframe) {
  const results = load();
  const existingKeys = new Set(results.map(r => `${r.timestamp}_${r.asset}`));
  let added = 0;
  for (const s of signals) {
    if (!s.resultDetail) continue;
    const ts = s.timestamp.getTime();
    const key = `${ts}_${s.asset}`;
    if (existingKeys.has(key)) continue;
    results.push({ timestamp: ts, resultDetail: s.resultDetail, asset: s.asset, timeframe, source: 'backtest' });
    existingKeys.add(key);
    added++;
  }
  if (added > 0) save(results);
}

export function getResultsSince(sinceMs: number, sourceFilter?: 'live' | 'backtest'): GlobalResult[] {
  const all = load().filter(r => r.timestamp >= sinceMs);
  if (sourceFilter) return all.filter(r => r.source === sourceFilter);
  return all;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

function startOfMonth(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.getTime();
}

export interface PeriodStats {
  total: number;
  wins: number;
  losses: number;
  winRateWithMG: number;
  winRateWithoutMG: number;
  winsDirect: number;
  winsMG1: number;
  winsMG2: number;
}

function calcStats(results: GlobalResult[]): PeriodStats {
  let winsDirect = 0, winsMG1 = 0, winsMG2 = 0, lossesMG1 = 0, lossesMG2 = 0, lossesDirect = 0;
  for (const r of results) {
    if (r.resultDetail === 'WIN_DIRECT') winsDirect++;
    else if (r.resultDetail === 'WIN_MG1') winsMG1++;
    else if (r.resultDetail === 'WIN_MG2') winsMG2++;
    else if (r.resultDetail === 'LOSS_MG1') lossesMG1++;
    else if (r.resultDetail === 'LOSS_MG2') lossesMG2++;
    else if (r.resultDetail === 'LOSS_DIRECT') lossesDirect++;
  }
  const total = winsDirect + winsMG1 + winsMG2 + lossesMG1 + lossesMG2 + lossesDirect;
  const wins = winsDirect + winsMG1 + winsMG2;
  const losses = lossesMG1 + lossesMG2 + lossesDirect;
  const directOnly = winsDirect + lossesDirect;
  return {
    total,
    wins,
    losses,
    winRateWithMG: total > 0 ? (wins / total) * 100 : 0,
    winRateWithoutMG: directOnly > 0 ? (winsDirect / directOnly) * 100 : 0,
    winsDirect,
    winsMG1,
    winsMG2,
  };
}

export function getTodayStats(source?: 'live' | 'backtest'): PeriodStats {
  return calcStats(getResultsSince(startOfToday(), source));
}

export function getWeekStats(source?: 'live' | 'backtest'): PeriodStats {
  return calcStats(getResultsSince(startOfWeek(), source));
}

export function getMonthStats(source?: 'live' | 'backtest'): PeriodStats {
  return calcStats(getResultsSince(startOfMonth(), source));
}
