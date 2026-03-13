import type { ResultDetail, Timeframe } from './trading-types';

const STORAGE_KEY = 'trading_global_results';
const MAX_RECORDS = 500;

export interface GlobalResult {
  timestamp: number; // epoch ms
  resultDetail: ResultDetail;
  asset: string;
  timeframe: Timeframe;
}

function load(): GlobalResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(results: GlobalResult[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(-MAX_RECORDS)));
}

export function recordResult(detail: ResultDetail, asset: string, timeframe: Timeframe) {
  const results = load();
  results.push({ timestamp: Date.now(), resultDetail: detail, asset, timeframe });
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
    results.push({ timestamp: ts, resultDetail: s.resultDetail, asset: s.asset, timeframe });
    existingKeys.add(key);
    added++;
  }
  if (added > 0) save(results);
}

export function getResultsSince(sinceMs: number): GlobalResult[] {
  return load().filter(r => r.timestamp >= sinceMs);
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
}

function calcStats(results: GlobalResult[]): PeriodStats {
  let winsDirect = 0, winsMG1 = 0, lossesMG1 = 0, lossesDirect = 0;
  for (const r of results) {
    if (r.resultDetail === 'WIN_DIRECT') winsDirect++;
    else if (r.resultDetail === 'WIN_MG1') winsMG1++;
    else if (r.resultDetail === 'LOSS_MG1') lossesMG1++;
    else if (r.resultDetail === 'LOSS_DIRECT') lossesDirect++;
  }
  const total = winsDirect + winsMG1 + lossesMG1 + lossesDirect;
  const wins = winsDirect + winsMG1;
  const losses = lossesMG1 + lossesDirect;
  return {
    total,
    wins,
    losses,
    winRateWithMG: total > 0 ? (wins / total) * 100 : 0,
    winRateWithoutMG: total > 0 ? (winsDirect / total) * 100 : 0,
    winsDirect,
    winsMG1,
  };
}

export function getTodayStats(): PeriodStats {
  return calcStats(getResultsSince(startOfToday()));
}

export function getWeekStats(): PeriodStats {
  return calcStats(getResultsSince(startOfWeek()));
}

export function getMonthStats(): PeriodStats {
  return calcStats(getResultsSince(startOfMonth()));
}
