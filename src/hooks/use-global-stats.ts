import { useState, useEffect, useCallback } from 'react';
import { getTodayStats, getWeekStats, getMonthStats, type PeriodStats } from '@/lib/global-stats';

const emptyStats: PeriodStats = { total: 0, wins: 0, losses: 0, winRateWithMG: 0, winRateWithoutMG: 0, winsDirect: 0, winsMG1: 0 };

export function useGlobalStats(refreshTrigger: number) {
  const [today, setToday] = useState<PeriodStats>(emptyStats);
  const [week, setWeek] = useState<PeriodStats>(emptyStats);
  const [month, setMonth] = useState<PeriodStats>(emptyStats);

  const refresh = useCallback(() => {
    setToday(getTodayStats());
    setWeek(getWeekStats());
    setMonth(getMonthStats());
  }, []);

  useEffect(() => {
    refresh();
  }, [refreshTrigger, refresh]);

  return { today, week, month };
}
