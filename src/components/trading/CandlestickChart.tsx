import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, createSeriesMarkers, CandlestickSeries, LineSeries, type IChartApi, type ISeriesApi, type CandlestickData, type LineData, ColorType } from 'lightweight-charts';
import type { CandleData, TradingSignal } from '@/lib/trading-types';
import { calculateEMA, calculateBollingerBands } from '@/lib/trading-indicators';
import { Lock, Unlock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import EntryTimer from './EntryTimer';
import type { DataSourceLabel } from '@/hooks/use-market-data';

import type { Timeframe } from '@/lib/trading-types';

interface CandlestickChartProps {
  candles: CandleData[];
  currentSignal?: TradingSignal | null;
  signalHistory?: TradingSignal[];
  entryTime?: Date;
  martingaleTime?: Date | null;
  consecutiveLosses?: number;
  timeframe?: Timeframe;
  onTimeframeChange?: (tf: Timeframe) => void;
  dataSourceLabel?: DataSourceLabel;
}

/** Convert ms timestamp to lightweight-charts time in São Paulo (BRT) timezone */
export function toChartTime(ts: number) {
  const BRT_OFFSET = -3 * 3600; // UTC-3 fixo
  return (Math.floor(ts / 1000) + BRT_OFFSET) as any;
}

function dedupeLineData(data: LineData[]): LineData[] {
  const map = new Map<number, LineData>();
  for (const d of data) map.set(d.time as number, d);
  return Array.from(map.values()).sort((a, b) => (a.time as number) - (b.time as number));
}

function computeVWAPSeries(candles: CandleData[]): LineData[] {
  let cumulativeTPV = 0;
  let cumulativeVol = 0;
  const data: LineData[] = [];
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    const vol = c.volume || 1;
    cumulativeTPV += tp * vol;
    cumulativeVol += vol;
    data.push({ time: toChartTime(c.timestamp), value: cumulativeTPV / cumulativeVol });
  }
  return dedupeLineData(data);
}

function computeBBSeries(candles: CandleData[], period: number) {
  const upper: LineData[] = [];
  const middle: LineData[] = [];
  const lower: LineData[] = [];
  const p = Math.min(period, candles.length);
  for (let i = p - 1; i < candles.length; i++) {
    const slice = candles.slice(i - p + 1, i + 1);
    const bb = calculateBollingerBands(slice, p);
    const time = toChartTime(candles[i].timestamp);
    upper.push({ time, value: bb.upper });
    middle.push({ time, value: bb.middle });
    lower.push({ time, value: bb.lower });
  }
  return { upper: dedupeLineData(upper), middle: dedupeLineData(middle), lower: dedupeLineData(lower) };
}

// ── Rich marker config ──────────────────────────────────────────────
const MARKER_CONFIG = {
  WIN_DIRECT: {
    call: { shape: 'arrowUp' as const, color: '#00e676', text: '🎯 WIN' },
    put:  { shape: 'arrowDown' as const, color: '#00e676', text: '🎯 WIN' },
  },
  WIN_MG1: {
    call: { shape: 'arrowUp' as const, color: '#ffab00', text: '⚡ MG1 WIN' },
    put:  { shape: 'arrowDown' as const, color: '#ffab00', text: '⚡ MG1 WIN' },
  },
  WIN_MG2: {
    call: { shape: 'arrowUp' as const, color: '#ff6d00', text: '🔥 MG2 WIN' },
    put:  { shape: 'arrowDown' as const, color: '#ff6d00', text: '🔥 MG2 WIN' },
  },
  LOSS_MG1: {
    call: { shape: 'arrowUp' as const, color: '#ffab00', text: '⚠️ →MG2' },
    put:  { shape: 'arrowDown' as const, color: '#ffab00', text: '⚠️ →MG2' },
  },
  LOSS_MG2: {
    call: { shape: 'arrowUp' as const, color: '#ff1744', text: '💀 LOSS MG2' },
    put:  { shape: 'arrowDown' as const, color: '#ff1744', text: '💀 LOSS MG2' },
  },
  LOSS_DIRECT: {
    call: { shape: 'arrowUp' as const, color: '#ffab00', text: '⚠️ →MG1' },
    put:  { shape: 'arrowDown' as const, color: '#ffab00', text: '⚠️ →MG1' },
  },
  PENDING: {
    call: { shape: 'arrowUp' as const, color: '#ffd600', text: '⏳ ENTRY' },
    put:  { shape: 'arrowDown' as const, color: '#ffd600', text: '⏳ ENTRY' },
  },
  ACTIVE: {
    call: { shape: 'arrowUp' as const, color: '#00e676', text: '' },
    put:  { shape: 'arrowDown' as const, color: '#ff1744', text: '' },
  },
};

function getMarkerStyle(signal: TradingSignal, isActive: boolean) {
  const dir = signal.direction === 'CALL' ? 'call' : 'put';

  if (isActive) {
    const cfg = MARKER_CONFIG.ACTIVE[dir];
    return { ...cfg, text: `▶ ${signal.direction} ${signal.confidence}%` };
  }

  const rd = signal.resultDetail;
  if (rd && rd in MARKER_CONFIG) {
    return MARKER_CONFIG[rd as keyof typeof MARKER_CONFIG][dir];
  }

  if (signal.result === 'WIN') return MARKER_CONFIG.WIN_DIRECT[dir];
  if (signal.result === 'LOSS') return MARKER_CONFIG.LOSS_DIRECT[dir];
  return MARKER_CONFIG.PENDING[dir];
}

const DATA_SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  binance: { label: 'BINANCE LIVE', color: 'text-[#f0b90b]' },
  twelvedata: { label: 'TWELVE DATA', color: 'text-[#00e676]' },
  simulated: { label: 'SIMULADO', color: 'text-[#ff1744]' },
};

const CandlestickChart = ({ candles, currentSignal, signalHistory = [], entryTime, martingaleTime, consecutiveLosses = 0, timeframe, onTimeframeChange, dataSourceLabel = 'binance' }: CandlestickChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const ema9Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const vwapRef = useRef<ISeriesApi<'Line'> | null>(null);
  const entryLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const markersPrimitiveRef = useRef<any>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const userDragRef = useRef(false);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(210, 10%, 50%)',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'hsl(210, 10%, 15%)' },
        horzLines: { color: 'hsl(210, 10%, 15%)' },
      },
      crosshair: {
        vertLine: { color: 'hsl(210, 10%, 30%)', labelBackgroundColor: 'hsl(210, 10%, 20%)' },
        horzLine: { color: 'hsl(210, 10%, 30%)', labelBackgroundColor: 'hsl(210, 10%, 20%)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'hsl(210, 10%, 20%)',
        minBarSpacing: 6,
      },
      rightPriceScale: {
        borderColor: 'hsl(210, 10%, 20%)',
        autoScale: true,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true },
      kineticScroll: { mouse: true, touch: true },
    });

    chartRef.current = chart;

    candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#00c853',
      downColor: '#ff1744',
      borderUpColor: '#00e676',
      borderDownColor: '#ff5252',
      wickUpColor: '#00e676',
      wickDownColor: '#ff5252',
    });

    ema9Ref.current = chart.addSeries(LineSeries, { color: '#ffd600', lineWidth: 1, title: 'EMA 9', priceLineVisible: false, lastValueVisible: false });
    ema21Ref.current = chart.addSeries(LineSeries, { color: '#aa00ff', lineWidth: 1, title: 'EMA 21', priceLineVisible: false, lastValueVisible: false });
    bbUpperRef.current = chart.addSeries(LineSeries, { color: 'rgba(100, 180, 230, 0.5)', lineWidth: 1, lineStyle: 2, title: 'BB+', priceLineVisible: false, lastValueVisible: false });
    bbMiddleRef.current = chart.addSeries(LineSeries, { color: 'rgba(100, 180, 230, 0.3)', lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false });
    bbLowerRef.current = chart.addSeries(LineSeries, { color: 'rgba(100, 180, 230, 0.5)', lineWidth: 1, lineStyle: 2, title: 'BB-', priceLineVisible: false, lastValueVisible: false });
    vwapRef.current = chart.addSeries(LineSeries, { color: '#ff6d00', lineWidth: 2, title: 'VWAP', priceLineVisible: false, lastValueVisible: false });

    entryLineRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(255, 214, 0, 0.6)',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: '',
      crosshairMarkerVisible: false,
    });

    const ro = new ResizeObserver((entries) => {
      if (!chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) chart.applyOptions({ width, height });
    });
    ro.observe(containerRef.current);

    const container = containerRef.current;
    const onPointerDown = () => { userDragRef.current = true; };
    const onPointerUp = () => { userDragRef.current = false; };
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointerup', onPointerUp);

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      if (userDragRef.current) {
        setAutoScroll(false);
      }
    });

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointerup', onPointerUp);
      ro.disconnect();
      chartRef.current = null;
      markersPrimitiveRef.current = null;
      chart.remove();
    };
  }, []);

  // ── Update data — ALWAYS use setData(), NEVER update() ──
  useEffect(() => {
    if (!chartRef.current) return;

    // If candles empty (during asset switch), clear all series and bail
    if (candles.length < 2) {
      try {
        candleSeriesRef.current?.setData([]);
        ema9Ref.current?.setData([]);
        ema21Ref.current?.setData([]);
        bbUpperRef.current?.setData([]);
        bbMiddleRef.current?.setData([]);
        bbLowerRef.current?.setData([]);
        vwapRef.current?.setData([]);
        entryLineRef.current?.setData([]);
        if (markersPrimitiveRef.current) {
          markersPrimitiveRef.current.setMarkers([]);
          markersPrimitiveRef.current = null;
        }
      } catch { /* chart destroyed */ }
      return;
    }

    const seen = new Map<number, CandlestickData>();
    for (const c of candles) {
      const time = toChartTime(c.timestamp);
      seen.set(time, { time: time as any, open: c.open, high: c.high, low: c.low, close: c.close });
    }
    const candleData = Array.from(seen.values()).sort((a, b) => (a.time as number) - (b.time as number));
    if (candleData.length === 0) return;

    try {
      // ── Preserve visible range to avoid viewport jumps ──
      const timeScale = chartRef.current!.timeScale();
      const savedRange = timeScale.getVisibleLogicalRange();

      // Always setData — safe, no "Cannot update oldest data" crashes
      candleSeriesRef.current?.setData(candleData);

      // Indicators
      const ema9Values = calculateEMA(candles, Math.min(9, candles.length));
      const ema9Data: LineData[] = ema9Values.map((v, i) => ({
        time: toChartTime(candles[candles.length - ema9Values.length + i].timestamp),
        value: v,
      }));
      ema9Ref.current?.setData(dedupeLineData(ema9Data));

      if (candles.length >= 21) {
        const ema21Values = calculateEMA(candles, 21);
        const ema21Data: LineData[] = ema21Values.map((v, i) => ({
          time: toChartTime(candles[candles.length - ema21Values.length + i].timestamp),
          value: v,
        }));
        ema21Ref.current?.setData(dedupeLineData(ema21Data));
      }

      const bb = computeBBSeries(candles, 20);
      bbUpperRef.current?.setData(bb.upper);
      bbMiddleRef.current?.setData(bb.middle);
      bbLowerRef.current?.setData(bb.lower);

      vwapRef.current?.setData(computeVWAPSeries(candles));

      // ── Restore visible range if user was zoomed/panned ──
      if (!autoScroll && savedRange) {
        try {
          timeScale.setVisibleLogicalRange(savedRange);
        } catch { /* range may be invalid after data change */ }
      }
    } catch (e) {
      console.warn('[Chart] setData error:', e);
    }

    // ── Entry price line ──────────────────────────────────────────
    try {
      if (currentSignal && (currentSignal.direction === 'CALL' || currentSignal.direction === 'PUT') && currentSignal.result === 'PENDING') {
        const entryPrice = currentSignal.price;
        const lineColor = currentSignal.direction === 'CALL' ? '#00e676' : '#ff1744';
        entryLineRef.current?.applyOptions({
          color: lineColor,
          title: `⇢ ${currentSignal.direction} @ ${entryPrice.toFixed(2)}`,
        });
        const firstTime = toChartTime(candles[0].timestamp);
        const lt = toChartTime(candles[candles.length - 1].timestamp);
        entryLineRef.current?.setData([
          { time: firstTime, value: entryPrice },
          { time: lt, value: entryPrice },
        ]);
      } else {
        entryLineRef.current?.setData([]);
      }
    } catch { /* non-critical */ }

    // ── Signal markers ────────────────────────────────────────────
    try {
      const validTimes = new Set<number>();
      for (const c of candles) validTimes.add(toChartTime(c.timestamp));

      const markers: any[] = [];
      // Use slice(0, 10) — history is newest-first
      const recentHistory = signalHistory.slice(0, 10);

      for (const sig of recentHistory) {
        if (sig.direction === 'CALL' || sig.direction === 'PUT') {
          // Entry marker (always render at entry timestamp)
          const entryT = toChartTime(sig.timestamp.getTime());
          if (validTimes.has(entryT)) {
            if (sig.result === 'PENDING') {
              // Still pending — show entry marker
              const style = MARKER_CONFIG.PENDING[sig.direction === 'CALL' ? 'call' : 'put'];
              markers.push({
                time: entryT,
                position: sig.direction === 'CALL' ? 'belowBar' : 'aboveBar',
                color: style.color,
                shape: style.shape,
                text: style.text,
                size: 2,
              });
            } else {
              // Resolved — show entry point with direction label
              markers.push({
                time: entryT,
                position: sig.direction === 'CALL' ? 'belowBar' : 'aboveBar',
                color: '#42a5f5',
                shape: sig.direction === 'CALL' ? 'arrowUp' as const : 'arrowDown' as const,
                text: `▶ ${sig.direction}`,
                size: 1,
              });
            }
          }

          // Result marker (render at resolvedTimestamp if available)
          if (sig.resolvedTimestamp && sig.result !== 'PENDING') {
            const resultT = toChartTime(sig.resolvedTimestamp.getTime());
            if (validTimes.has(resultT)) {
              const style = getMarkerStyle(sig, false);
              markers.push({
                time: resultT,
                position: sig.direction === 'CALL' ? 'belowBar' : 'aboveBar',
                color: style.color,
                shape: style.shape,
                text: style.text,
                size: 2,
              });
            }
          }
        }
      }

      if (currentSignal && (currentSignal.direction === 'CALL' || currentSignal.direction === 'PUT') && currentSignal.result === 'PENDING') {
        const t = toChartTime(currentSignal.timestamp.getTime());
        if (validTimes.has(t)) {
          const style = getMarkerStyle(currentSignal, true);
          markers.push({
            time: t,
            position: currentSignal.direction === 'CALL' ? 'belowBar' : 'aboveBar',
            color: style.color,
            shape: style.shape,
            text: style.text,
            size: 3,
          });
        }
      }

      markers.sort((a, b) => a.time - b.time);
      if (markersPrimitiveRef.current) {
        markersPrimitiveRef.current.setMarkers(markers);
      } else if (candleSeriesRef.current && markers.length > 0) {
        markersPrimitiveRef.current = createSeriesMarkers(candleSeriesRef.current, markers);
      }
    } catch { /* non-critical */ }

    if (autoScroll) {
      chartRef.current?.timeScale().scrollToRealTime();
    }
  }, [candles, currentSignal?.id, currentSignal?.result, signalHistory, autoScroll]);

  const handleToggleScroll = useCallback(() => {
    setAutoScroll(prev => {
      if (!prev) chartRef.current?.timeScale().scrollToRealTime();
      return !prev;
    });
  }, []);

  const activeSignal = currentSignal && currentSignal.direction !== 'WAIT' ? currentSignal : null;

  const sourceInfo = DATA_SOURCE_LABELS[dataSourceLabel] || DATA_SOURCE_LABELS.simulated;
  const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;
  const now = new Date();
  const utcStr = now.toISOString().slice(11, 19);
  const brtStr = new Date(now.getTime() - 3 * 3600_000).toISOString().slice(11, 19);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-foreground tracking-wider">GRÁFICO</span>
          <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-border ${sourceInfo.color}`}>
            {sourceInfo.label}
          </span>
          {timeframe && onTimeframeChange && (
            <div className="flex bg-secondary rounded-md overflow-hidden border border-border ml-2">
              <button
                onClick={() => onTimeframeChange('M1')}
                className={`px-2 py-1 text-[10px] font-mono font-bold transition-colors ${
                  timeframe === 'M1'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                M1
              </button>
              <button
                onClick={() => onTimeframeChange('M5')}
                className={`px-2 py-1 text-[10px] font-mono font-bold transition-colors ${
                  timeframe === 'M5'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                M5
              </button>
            </div>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggleScroll}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono transition-all ${
                    autoScroll
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'bg-muted/50 text-muted-foreground border border-border hover:bg-muted'
                  }`}
                >
                  {autoScroll ? <Lock size={12} /> : <Unlock size={12} />}
                  {!autoScroll && <span className="tracking-wider">LIVRE</span>}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{autoScroll ? 'Gráfico travado no tempo real — clique para navegar livremente' : 'Navegação livre — clique para voltar ao tempo real'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
          {lastCandle && (
            <span className="text-foreground font-bold mr-1">
              {lastCandle.close.toFixed(lastCandle.close > 50 ? 2 : 5)}
            </span>
          )}
          <span className="text-[9px] opacity-70" title="UTC / BRT">
            {utcStr} UTC | {brtStr} BRT
          </span>
          <span className="w-px h-3 bg-border" />
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: '#ffd600' }} /> EMA9
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: '#aa00ff' }} /> EMA21
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: 'rgba(100, 180, 230, 0.7)' }} /> BB
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: '#ff6d00' }} /> VWAP
          </span>
          <span className="ml-2 flex items-center gap-2 border-l border-border pl-2">
            <span>🎯 Win</span>
            <span>⚡ MG1</span>
            <span>🔥 MG2</span>
            <span>💀 Loss</span>
          </span>
        </div>
      </div>

      {activeSignal && (
        <div className={`flex items-center justify-between px-4 py-2.5 font-mono text-xs border-b transition-all duration-300 ${
          activeSignal.direction === 'CALL'
            ? 'bg-gradient-to-r from-[#00e676]/15 via-[#00e676]/5 to-transparent border-[#00e676]/30 text-[#00e676]'
            : 'bg-gradient-to-r from-[#ff1744]/15 via-[#ff1744]/5 to-transparent border-[#ff1744]/30 text-[#ff1744]'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">{activeSignal.direction === 'CALL' ? '▲' : '▼'}</span>
            <div className="flex flex-col">
              <span className="font-bold tracking-widest text-sm">{activeSignal.direction}</span>
              <span className="text-[10px] text-muted-foreground">{activeSignal.pattern}</span>
            </div>
            <div className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-background/50 border border-border">
              <span className="text-[10px] text-muted-foreground">Confiança</span>
              <span className="font-bold">{activeSignal.confidence}%</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {activeSignal.rsi != null && (
                <span className={`px-1.5 py-0.5 rounded ${activeSignal.rsi < 30 ? 'bg-[#00e676]/10 text-[#00e676]' : activeSignal.rsi > 70 ? 'bg-[#ff1744]/10 text-[#ff1744]' : ''}`}>
                  RSI {activeSignal.rsi}
                </span>
              )}
              {activeSignal.ema200Bias && (
                <span className={`px-1.5 py-0.5 rounded ${
                  activeSignal.ema200Bias === 'BULL' ? 'bg-[#00e676]/10 text-[#00e676]' :
                  activeSignal.ema200Bias === 'BEAR' ? 'bg-[#ff1744]/10 text-[#ff1744]' : ''
                }`}>
                  EMA200 {activeSignal.ema200Bias}
                </span>
              )}
              {activeSignal.confluences && (
                <span className="px-1.5 py-0.5 rounded bg-[#ffd600]/10 text-[#ffd600]">
                  {activeSignal.confluences.length} confluências
                </span>
              )}
            </div>
            {entryTime && (
              <EntryTimer
                entryTime={entryTime}
                martingaleTime={consecutiveLosses >= 1 ? martingaleTime : null}
                direction={activeSignal.direction as 'CALL' | 'PUT'}
              />
            )}
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full h-[calc(100vh-220px)] min-h-[400px]" />
    </div>
  );
};

export default CandlestickChart;
