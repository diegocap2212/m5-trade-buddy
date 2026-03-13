/**
 * Factory hook that routes to the correct data source based on asset type.
 * Crypto → Binance WebSocket | Forex → Polling/simulated
 */
import type { Timeframe } from '@/lib/trading-types';
import { getAssetSource } from '@/lib/trading-types';
import { useBinanceWebSocket } from './use-binance-ws';
import { useForexData } from './use-forex-data';

export function useMarketData(pair: string, timeframe: Timeframe) {
  const source = getAssetSource(pair);
  const binance = useBinanceWebSocket(
    source === 'binance' ? pair : 'BTC/USD', // dummy pair when not using binance
    timeframe
  );
  const forex = useForexData(
    source === 'forex-api' ? pair : 'EUR/USD', // dummy pair when not using forex
    timeframe
  );

  if (source === 'binance') {
    return binance;
  }
  return forex;
}
