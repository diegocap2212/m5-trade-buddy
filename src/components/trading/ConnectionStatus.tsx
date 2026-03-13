import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { WsStatus } from '@/hooks/use-binance-ws';

interface ConnectionStatusProps {
  connected: boolean;
  status?: WsStatus;
}

const ConnectionStatus = ({ connected, status }: ConnectionStatusProps) => {
  if (status === 'connecting' || status === 'reconnecting') {
    return (
      <div className="flex items-center gap-2 font-mono text-xs">
        <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
        <span className="text-muted-foreground">
          {status === 'reconnecting' ? 'RECONECTANDO...' : 'CONECTANDO...'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      {connected ? (
        <>
          <Wifi className="h-3.5 w-3.5 text-primary" />
          <span className="text-primary">LIVE</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">OFFLINE</span>
        </>
      )}
    </div>
  );
};

export default ConnectionStatus;
