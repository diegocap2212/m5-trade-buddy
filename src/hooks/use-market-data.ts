/**
 * Factory hook that routes to the correct data source based on asset type.
 * Crypto → Binance WebSocket | Forex → Polling/simulated or Twelve Data API
 */
import type { Timeframe } from '@/lib/trading-types';
import { getAssetSource } from '@/lib/trading-types';
import { useBinanceWebSocket } from './use-binance-ws';
import { useForexData } from './use-forex-data';
import type { ForexDataSource } from '@/lib/forex-candle-cache';

export type DataSourceLabel = 'binance' | ForexDataSource;

export function useMarketData(pair: string, timeframe: Timeframe) {
  const source = getAssetSource(pair);
  const isBinance = source === 'binance';

  const binance = useBinanceWebSocket(pair, timeframe, isBinance);
  const forex = useForexData(pair, timeframe, !isBinance);

  const dataSourceLabel: DataSourceLabel = isBinance
    ? 'binance'
    : forex.dataSource;

  return {
    ...(isBinance ? binance : forex),
    dataSourceLabel,
  };
}
