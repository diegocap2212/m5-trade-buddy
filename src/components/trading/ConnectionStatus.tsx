import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  connected: boolean;
}

const ConnectionStatus = ({ connected }: ConnectionStatusProps) => {
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
