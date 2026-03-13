import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, createSeriesMarkers, CandlestickSeries, LineSeries, type IChartApi, type ISeriesApi, type CandlestickData, type LineData, ColorType } from 'lightweight-charts';
import type { CandleData, TradingSignal } from '@/lib/trading-types';
import { calculateEMA, calculateBollingerBands } from '@/lib/trading-indicators';
import { Lock, Unlock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import EntryTimer from './EntryTimer';

interface CandlestickChartProps {
  candles: CandleData[];
  currentSignal?: TradingSignal | null;
  signalHistory?: TradingSignal[];
  entryTime?: Date;
  martingaleTime?: Date | null;
  consecutiveLosses?: number;
}

function toChartTime(ts: number) {
  return Math.floor(ts / 1000) as any;
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
    call: { shape: 'arrowUp' as const, color: '#ffab00', text: '⚡ MG WIN' },
    put:  { shape: 'arrowDown' as const, color: '#ffab00', text: '⚡ MG WIN' },
  },
  LOSS_MG1: {
    call: { shape: 'arrowUp' as const, color: '#ff1744', text: '💀 MG LOSS' },
    put:  { shape: 'arrowDown' as const, color: '#ff1744', text: '💀 MG LOSS' },
  },
  LOSS_DIRECT: {
    call: { shape: 'arrowUp' as const, color: '#ff1744', text: '✗ LOSS' },
    put:  { shape: 'arrowDown' as const, color: '#ff1744', text: '✗ LOSS' },
  },
  PENDING: {
    call: { shape: 'arrowUp' as const, color: '#ffd600', text: '⏳' },
    put:  { shape: 'arrowDown' as const, color: '#ffd600', text: '⏳' },
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

const CandlestickChart = ({ candles, currentSignal, signalHistory = [], entryTime, martingaleTime, consecutiveLosses = 0 }: CandlestickChartProps) => {
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
  const prevCandleCountRef = useRef(0);
  const prevSignalCountRef = useRef(0);
  const prevLastSignalIdRef = useRef('');
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

    // Entry price horizontal line series (dashed)
    entryLineRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(255, 214, 0, 0.6)',
      lineWidth: 1,
      lineStyle: 2, // dashed
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

    // Detect manual drag to auto-unlock
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

  // Update data
  useEffect(() => {
    if (!chartRef.current || candles.length < 2) return;

    const isNewCandle = candles.length !== prevCandleCountRef.current;
    prevCandleCountRef.current = candles.length;

    const seen = new Map<number, CandlestickData>();
    for (const c of candles) {
      const time = toChartTime(c.timestamp);
      seen.set(time, { time: time as any, open: c.open, high: c.high, low: c.low, close: c.close });
    }
    const candleData = Array.from(seen.values()).sort((a, b) => (a.time as number) - (b.time as number));

    if (isNewCandle) {
      candleSeriesRef.current?.setData(candleData);

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
    } else {
      const lastPoint = candleData[candleData.length - 1];
      if (lastPoint) candleSeriesRef.current?.update(lastPoint);
    }

    // ── Entry price line ──────────────────────────────────────────
    if (currentSignal && (currentSignal.direction === 'CALL' || currentSignal.direction === 'PUT') && currentSignal.result === 'PENDING') {
      const entryPrice = currentSignal.price;
      const lineColor = currentSignal.direction === 'CALL' ? '#00e676' : '#ff1744';
      entryLineRef.current?.applyOptions({
        color: lineColor,
        title: `⇢ ${currentSignal.direction} @ ${entryPrice.toFixed(2)}`,
      });
      // Draw a flat line across visible range
      const firstTime = toChartTime(candles[0].timestamp);
      const lastTime = toChartTime(candles[candles.length - 1].timestamp);
      entryLineRef.current?.setData([
        { time: firstTime, value: entryPrice },
        { time: lastTime, value: entryPrice },
      ]);
    } else {
      entryLineRef.current?.setData([]);
    }

    // ── Signal markers ────────────────────────────────────────────
    const lastSigId = signalHistory.length > 0 ? signalHistory[0].id : '';
    const markersChanged = signalHistory.length !== prevSignalCountRef.current ||
      lastSigId !== prevLastSignalIdRef.current ||
      (currentSignal && currentSignal.direction !== 'WAIT');

    prevSignalCountRef.current = signalHistory.length;
    prevLastSignalIdRef.current = lastSigId;

    if (markersChanged) {
      // Build a set of valid chart times from current candles
      const validTimes = new Set<number>();
      for (const c of candles) validTimes.add(toChartTime(c.timestamp));

      const markers: any[] = [];
      const recentHistory = signalHistory.slice(-10);

      for (const sig of recentHistory) {
        if (sig.direction === 'CALL' || sig.direction === 'PUT') {
          const t = toChartTime(sig.timestamp.getTime());
          if (!validTimes.has(t)) continue; // skip markers outside candle range
          const style = getMarkerStyle(sig, false);
          markers.push({
            time: t,
            position: sig.direction === 'CALL' ? 'belowBar' : 'aboveBar',
            color: style.color,
            shape: style.shape,
            text: style.text,
            size: 2,
          });
        }
      }

      // Active signal — larger marker (only if time exists in candles)
      if (currentSignal && (currentSignal.direction === 'CALL' || currentSignal.direction === 'PUT')) {
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
    }

    if (autoScroll) {
      chartRef.current?.timeScale().scrollToRealTime();
    }
  }, [candles, currentSignal?.id, signalHistory.length, autoScroll]);

  const handleToggleScroll = useCallback(() => {
    setAutoScroll(prev => {
      if (!prev) chartRef.current?.timeScale().scrollToRealTime();
      return !prev;
    });
  }, []);

  const activeSignal = currentSignal && currentSignal.direction !== 'WAIT' ? currentSignal : null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-foreground tracking-wider">GRÁFICO</span>
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
            <span>⚡ MG</span>
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
