import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries, type IChartApi, type ISeriesApi, type CandlestickData, type LineData, ColorType } from 'lightweight-charts';
import type { CandleData } from '@/lib/trading-types';
import { calculateEMA, calculateBollingerBands, calculateVWAP } from '@/lib/trading-indicators';

interface CandlestickChartProps {
  candles: CandleData[];
}

function toChartTime(ts: number) {
  return Math.floor(ts / 1000) as any;
}

const CandlestickChart = ({ candles }: CandlestickChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const ema9Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const vwapRef = useRef<ISeriesApi<'Line'> | null>(null);

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
      },
      rightPriceScale: {
        borderColor: 'hsl(210, 10%, 20%)',
      },
      handleScroll: true,
      handleScale: true,
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

    ema9Ref.current = chart.addSeries(LineSeries, {
      color: 'hsl(45, 93%, 58%)',
      lineWidth: 1,
      title: 'EMA 9',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    ema21Ref.current = chart.addSeries(LineSeries, {
      color: 'hsl(270, 70%, 60%)',
      lineWidth: 1,
      title: 'EMA 21',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    bbUpperRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(100, 180, 230, 0.5)',
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB+',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    bbMiddleRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(100, 180, 230, 0.3)',
      lineWidth: 1,
      lineStyle: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    bbLowerRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(100, 180, 230, 0.5)',
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB-',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    vwapRef.current = chart.addSeries(LineSeries, {
      color: 'hsl(30, 100%, 60%)',
      lineWidth: 2,
      title: 'VWAP',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Update data
  useEffect(() => {
    if (!chartRef.current || candles.length < 2) return;

    const candleData: CandlestickData[] = candles.map((c) => ({
      time: toChartTime(c.timestamp),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current?.setData(candleData);

    // EMA 9
    const ema9Values = calculateEMA(candles, Math.min(9, candles.length));
    const ema9Data: LineData[] = ema9Values.map((v, i) => ({
      time: toChartTime(candles[candles.length - ema9Values.length + i].timestamp),
      value: v,
    }));
    ema9Ref.current?.setData(ema9Data);

    // EMA 21
    if (candles.length >= 21) {
      const ema21Values = calculateEMA(candles, 21);
      const ema21Data: LineData[] = ema21Values.map((v, i) => ({
        time: toChartTime(candles[candles.length - ema21Values.length + i].timestamp),
        value: v,
      }));
      ema21Ref.current?.setData(ema21Data);
    }

    // Bollinger Bands
    const period = Math.min(20, candles.length);
    if (candles.length >= period) {
      const bbUpper: LineData[] = [];
      const bbMiddle: LineData[] = [];
      const bbLower: LineData[] = [];
      for (let i = period - 1; i < candles.length; i++) {
        const slice = candles.slice(i - period + 1, i + 1);
        const bb = calculateBollingerBands(slice, period);
        const time = toChartTime(candles[i].timestamp);
        bbUpper.push({ time, value: bb.upper });
        bbMiddle.push({ time, value: bb.middle });
        bbLower.push({ time, value: bb.lower });
      }
      bbUpperRef.current?.setData(bbUpper);
      bbMiddleRef.current?.setData(bbMiddle);
      bbLowerRef.current?.setData(bbLower);
    }

    // VWAP
    const vwapData: LineData[] = [];
    for (let i = 0; i < candles.length; i++) {
      const slice = candles.slice(0, i + 1);
      const vwap = calculateVWAP(slice);
      vwapData.push({ time: toChartTime(candles[i].timestamp), value: vwap });
    }
    vwapRef.current?.setData(vwapData);

    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="font-mono text-xs font-semibold text-foreground tracking-wider">GRÁFICO</span>
        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: 'hsl(45, 93%, 58%)' }} />
            EMA9
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: 'hsl(270, 70%, 60%)' }} />
            EMA21
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: 'rgba(100, 180, 230, 0.7)' }} />
            BB
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: 'hsl(30, 100%, 60%)' }} />
            VWAP
          </span>
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[320px]" />
    </div>
  );
};

export default CandlestickChart;
