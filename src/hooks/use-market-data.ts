/**
 * Factory hook that routes to the correct data source based on asset type.
 * Crypto → Binance WebSocket | Forex → Polling/simulated
 * 
 * Only the active source's hook runs; the other is disabled via `enabled` flag.
 */
import type { Timeframe } from '@/lib/trading-types';
import { getAssetSource } from '@/lib/trading-types';
import { useBinanceWebSocket } from './use-binance-ws';
import { useForexData } from './use-forex-data';

export function useMarketData(pair: string, timeframe: Timeframe) {
  const source = getAssetSource(pair);
  const isBinance = source === 'binance';

  const binance = useBinanceWebSocket(pair, timeframe, isBinance);
  const forex = useForexData(pair, timeframe, !isBinance);

  return isBinance ? binance : forex;
}
