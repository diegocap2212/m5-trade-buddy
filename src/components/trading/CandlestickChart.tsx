import { useEffect, useRef, useMemo } from 'react';
import { createChart, createSeriesMarkers, CandlestickSeries, LineSeries, type IChartApi, type ISeriesApi, type CandlestickData, type LineData, ColorType } from 'lightweight-charts';
import type { CandleData, TradingSignal } from '@/lib/trading-types';
import { calculateEMA, calculateBollingerBands, calculateVWAP } from '@/lib/trading-indicators';
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

/** O(n) VWAP series calculation */
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

/** Compute Bollinger Bands series in one pass */
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
  const markersPrimitiveRef = useRef<any>(null);
  const prevCandleCountRef = useRef(0);
  const prevSignalCountRef = useRef(0);
  const prevLastSignalIdRef = useRef('');

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
      upColor: 'hsl(142, 71%, 45%)',
      downColor: 'hsl(0, 84%, 60%)',
      borderUpColor: 'hsl(142, 71%, 45%)',
      borderDownColor: 'hsl(0, 84%, 60%)',
      wickUpColor: 'hsl(142, 71%, 45%)',
      wickDownColor: 'hsl(0, 84%, 60%)',
    });

    ema9Ref.current = chart.addSeries(LineSeries, { color: 'hsl(45, 93%, 58%)', lineWidth: 1, title: 'EMA 9', priceLineVisible: false, lastValueVisible: false });
    ema21Ref.current = chart.addSeries(LineSeries, { color: 'hsl(270, 70%, 60%)', lineWidth: 1, title: 'EMA 21', priceLineVisible: false, lastValueVisible: false });
    bbUpperRef.current = chart.addSeries(LineSeries, { color: 'rgba(100, 180, 230, 0.5)', lineWidth: 1, lineStyle: 2, title: 'BB+', priceLineVisible: false, lastValueVisible: false });
    bbMiddleRef.current = chart.addSeries(LineSeries, { color: 'rgba(100, 180, 230, 0.3)', lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false });
    bbLowerRef.current = chart.addSeries(LineSeries, { color: 'rgba(100, 180, 230, 0.5)', lineWidth: 1, lineStyle: 2, title: 'BB-', priceLineVisible: false, lastValueVisible: false });
    vwapRef.current = chart.addSeries(LineSeries, { color: 'hsl(30, 100%, 60%)', lineWidth: 2, title: 'VWAP', priceLineVisible: false, lastValueVisible: false });

    const ro = new ResizeObserver((entries) => {
      if (!chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) chart.applyOptions({ width, height });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chartRef.current = null;
      markersPrimitiveRef.current = null;
      chart.remove();
    };
  }, []);

  // Update data — incremental for in-progress candle, full recalc on new candle close
  useEffect(() => {
    if (!chartRef.current || candles.length < 2) return;

    const isNewCandle = candles.length !== prevCandleCountRef.current;
    prevCandleCountRef.current = candles.length;

    // Always update candle data (deduped)
    const seen = new Map<number, CandlestickData>();
    for (const c of candles) {
      const time = toChartTime(c.timestamp);
      seen.set(time, { time: time as any, open: c.open, high: c.high, low: c.low, close: c.close });
    }
    const candleData = Array.from(seen.values()).sort((a, b) => (a.time as number) - (b.time as number));

    if (isNewCandle) {
      // Full setData + recalculate indicators only on new candle
      candleSeriesRef.current?.setData(candleData);

      // EMA 9
      const ema9Values = calculateEMA(candles, Math.min(9, candles.length));
      const ema9Data: LineData[] = ema9Values.map((v, i) => ({
        time: toChartTime(candles[candles.length - ema9Values.length + i].timestamp),
        value: v,
      }));
      ema9Ref.current?.setData(dedupeLineData(ema9Data));

      // EMA 21
      if (candles.length >= 21) {
        const ema21Values = calculateEMA(candles, 21);
        const ema21Data: LineData[] = ema21Values.map((v, i) => ({
          time: toChartTime(candles[candles.length - ema21Values.length + i].timestamp),
          value: v,
        }));
        ema21Ref.current?.setData(dedupeLineData(ema21Data));
      }

      // Bollinger Bands
      const bb = computeBBSeries(candles, 20);
      bbUpperRef.current?.setData(bb.upper);
      bbMiddleRef.current?.setData(bb.middle);
      bbLowerRef.current?.setData(bb.lower);

      // VWAP O(n)
      vwapRef.current?.setData(computeVWAPSeries(candles));
    } else {
      // Incremental update — just update last candle point
      const lastPoint = candleData[candleData.length - 1];
      if (lastPoint) candleSeriesRef.current?.update(lastPoint);
    }

    // Markers — only update when signal history changes
    const lastSigId = signalHistory.length > 0 ? signalHistory[0].id : '';
    const markersChanged = signalHistory.length !== prevSignalCountRef.current ||
      lastSigId !== prevLastSignalIdRef.current ||
      (currentSignal && currentSignal.direction !== 'WAIT');
    
    prevSignalCountRef.current = signalHistory.length;
    prevLastSignalIdRef.current = lastSigId;

    if (markersChanged) {
      const markers: any[] = [];
      const recentHistory = signalHistory.slice(-10);

      for (const sig of recentHistory) {
        if (sig.direction === 'CALL' || sig.direction === 'PUT') {
          const rd = sig.resultDetail;
          let resultLabel = '?';
          let color = 'hsl(45, 93%, 58%)';
          if (rd === 'WIN_DIRECT') { resultLabel = '✓'; color = 'hsl(142, 71%, 45%)'; }
          else if (rd === 'WIN_MG1') { resultLabel = 'MG✓'; color = 'hsl(45, 93%, 58%)'; }
          else if (rd === 'LOSS_MG1') { resultLabel = 'MG✗'; color = 'hsl(0, 84%, 60%)'; }
          else if (rd === 'LOSS_DIRECT') { resultLabel = '✗'; color = 'hsl(0, 84%, 60%)'; }
          else if (sig.result === 'WIN') { resultLabel = '✓'; color = 'hsl(142, 71%, 45%)'; }
          else if (sig.result === 'LOSS') { resultLabel = '✗'; color = 'hsl(0, 84%, 60%)'; }

          markers.push({
            time: toChartTime(sig.timestamp.getTime()),
            position: sig.direction === 'CALL' ? 'belowBar' : 'aboveBar',
            color,
            shape: sig.direction === 'CALL' ? 'arrowUp' : 'arrowDown',
            text: resultLabel,
          });
        }
      }

      if (currentSignal && (currentSignal.direction === 'CALL' || currentSignal.direction === 'PUT')) {
        markers.push({
          time: toChartTime(currentSignal.timestamp.getTime()),
          position: currentSignal.direction === 'CALL' ? 'belowBar' : 'aboveBar',
          color: 'hsl(45, 93%, 58%)',
          shape: currentSignal.direction === 'CALL' ? 'arrowUp' : 'arrowDown',
          text: `${currentSignal.confidence}%`,
        });
      }

      markers.sort((a, b) => a.time - b.time);
      if (markersPrimitiveRef.current) {
        markersPrimitiveRef.current.setMarkers(markers);
      } else if (candleSeriesRef.current && markers.length > 0) {
        markersPrimitiveRef.current = createSeriesMarkers(candleSeriesRef.current, markers);
      }
    }

    chartRef.current?.timeScale().scrollToRealTime();
  }, [candles, currentSignal?.id, signalHistory.length]);

  const activeSignal = currentSignal && currentSignal.direction !== 'WAIT' ? currentSignal : null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="font-mono text-xs font-semibold text-foreground tracking-wider">GRÁFICO</span>
        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: 'hsl(45, 93%, 58%)' }} /> EMA9
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: 'hsl(270, 70%, 60%)' }} /> EMA21
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: 'rgba(100, 180, 230, 0.7)' }} /> BB
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: 'hsl(30, 100%, 60%)' }} /> VWAP
          </span>
        </div>
      </div>

      {activeSignal && (
        <div className={`flex items-center justify-between px-4 py-2 font-mono text-xs border-b border-border ${
          activeSignal.direction === 'CALL' ? 'bg-win/10 text-win' : 'bg-loss/10 text-loss'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-base">{activeSignal.direction === 'CALL' ? '▲' : '▼'}</span>
            <span className="font-bold tracking-wider">{activeSignal.direction}</span>
            <span className="text-muted-foreground">•</span>
            <span>{activeSignal.confidence}% confiança</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{activeSignal.pattern}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {activeSignal.rsi != null && <span>RSI {activeSignal.rsi}</span>}
            {activeSignal.ema200Bias && <span>EMA200 {activeSignal.ema200Bias}</span>}
            {activeSignal.confluences && <span>{activeSignal.confluences.length} confluências</span>}
          </div>
          {entryTime && (
            <EntryTimer
              entryTime={entryTime}
              martingaleTime={consecutiveLosses >= 1 ? martingaleTime : null}
              direction={activeSignal.direction as 'CALL' | 'PUT'}
            />
          )}
        </div>
      )}

      <div ref={containerRef} className="w-full h-[520px]" />
    </div>
  );
};

export default CandlestickChart;
