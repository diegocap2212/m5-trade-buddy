import { X, ArrowUpCircle, ArrowDownCircle, Radar, Pin, Clock } from 'lucide-react';
import type { ScannerOpportunity } from '@/hooks/use-multi-scanner';
import { playCallAlert, playPutAlert } from '@/lib/sound-alerts';
import { useEffect, useRef, useState } from 'react';

import type { Timeframe } from '@/lib/trading-types';

interface OpportunityBannerProps {
  opportunities: ScannerOpportunity[];
  scanning: boolean;
  onSwitchAsset: (asset: string) => void;
  onDismiss: (asset: string) => void;
  pinnedOpportunity?: ScannerOpportunity | null;
  onDismissPinned?: () => void;
  timeframe: Timeframe;
  onCommit?: (opp: ScannerOpportunity) => void;
}

function getEntryTime(timeframe: Timeframe): string {
  const intervalMs = timeframe === 'M1' ? 60_000 : 300_000;
  const entryTs = Math.ceil(Date.now() / intervalMs) * intervalMs - 1000;
  const d = new Date(entryTs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function getTemporalStatus(opp: ScannerOpportunity): { label: string; urgent: boolean } {
  const now = Date.now();
  const msToEntry = opp.entryTimestamp - now;
  const msToClose = opp.closeTimestamp - now;

  if (msToClose < 0) {
    return { label: 'EM VALIDAÇÃO', urgent: false };
  }
  if (msToEntry <= 5000) {
    return { label: 'ENTRAR AGORA', urgent: true };
  }
  if (msToEntry <= 15000) {
    const secs = Math.ceil(msToEntry / 1000);
    return { label: `ENTRADA EM ${secs}s`, urgent: true };
  }
  return { label: 'AGUARDANDO', urgent: false };
}

const OpportunityItem = ({
  opp,
  pinned,
  onAction,
  onDismiss,
  timeframe,
}: {
  opp: ScannerOpportunity;
  pinned?: boolean;
  onAction: () => void;
  onDismiss: () => void;
  timeframe: Timeframe;
}) => {
  const isCall = opp.analysis.direction === 'CALL';
  const [status, setStatus] = useState(getTemporalStatus(opp));

  // Update temporal status every second
  useEffect(() => {
    const timer = setInterval(() => {
      setStatus(getTemporalStatus(opp));
    }, 1000);
    return () => clearInterval(timer);
  }, [opp]);

  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border font-mono text-xs transition-all duration-500 animate-in slide-in-from-top-2 ${
        isCall
          ? 'bg-[#00e676]/5 border-[#00e676]/30 text-[#00e676]'
          : 'bg-[#ff1744]/5 border-[#ff1744]/30 text-[#ff1744]'
      } ${pinned ? 'ring-1 ring-primary/40 border-2' : ''}`}
    >
      <div className="flex items-center gap-3">
        {pinned ? (
          <Pin className="h-4 w-4 text-primary" />
        ) : (
          <Radar className="h-4 w-4 animate-pulse" />
        )}
        <div className="flex items-center gap-2">
          {isCall ? (
            <ArrowUpCircle className="h-5 w-5" />
          ) : (
            <ArrowDownCircle className="h-5 w-5" />
          )}
          <span className="font-bold text-sm tracking-wider">{opp.asset}</span>
          <span className="text-foreground font-bold">{opp.analysis.direction}</span>
          {pinned && (
            <span className="px-1.5 py-0.5 rounded bg-primary/20 border border-primary/30 text-primary text-[9px] font-bold tracking-widest">
              ATIVO ATUAL
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="px-1.5 py-0.5 rounded bg-background/50 border border-border">
            {opp.analysis.confidence}%
          </span>
          <span className="px-1.5 py-0.5 rounded bg-background/50 border border-border">
            RSI {opp.analysis.rsi}
          </span>
          <span>{opp.analysis.pattern}</span>
          <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold">
            {timeframe}
          </span>
          <span className="px-2 py-1 rounded bg-primary/15 border border-primary/30 text-primary font-bold text-xs tracking-wide">
            ⏱ {getEntryTime(timeframe)}
          </span>
          {/* Temporal status badge */}
          <span className={`flex items-center gap-1 px-2 py-1 rounded font-bold text-[9px] tracking-widest ${
            status.urgent
              ? 'bg-[#ffd600]/20 border border-[#ffd600]/40 text-[#ffd600] animate-pulse'
              : 'bg-muted/30 border border-border text-muted-foreground'
          }`}>
            <Clock className="h-3 w-3" />
            {status.label}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!pinned && (
          <button
            onClick={onAction}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all hover:scale-105 ${
              isCall
                ? 'bg-[#00e676]/20 hover:bg-[#00e676]/30 text-[#00e676] border border-[#00e676]/30'
                : 'bg-[#ff1744]/20 hover:bg-[#ff1744]/30 text-[#ff1744] border border-[#ff1744]/30'
            }`}
          >
            ABRIR
          </button>
        )}
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-muted/50 text-muted-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

const OpportunityBanner = ({ opportunities, scanning, onSwitchAsset, onDismiss, pinnedOpportunity, onDismissPinned, timeframe, onCommit }: OpportunityBannerProps) => {
  const lastSoundRef = useRef<string>('');

  useEffect(() => {
    if (opportunities.length > 0) {
      const key = `${opportunities[0].asset}_${opportunities[0].timestamp}`;
      if (key !== lastSoundRef.current) {
        lastSoundRef.current = key;
        const play = opportunities[0].analysis.direction === 'CALL' ? playCallAlert : playPutAlert;
        play();
      }
    }
  }, [opportunities]);

  if (!pinnedOpportunity && opportunities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {pinnedOpportunity && onDismissPinned && (
        <OpportunityItem
          opp={pinnedOpportunity}
          pinned
          onAction={() => {}}
          onDismiss={onDismissPinned}
          timeframe={timeframe}
        />
      )}
      {opportunities.map((opp) => (
        <OpportunityItem
          key={`${opp.asset}_${opp.timestamp}`}
          opp={opp}
          onAction={() => {
            onCommit?.(opp);
            onSwitchAsset(opp.asset);
          }}
          onDismiss={() => onDismiss(opp.asset)}
          timeframe={timeframe}
        />
      ))}
    </div>
  );
};

export default OpportunityBanner;
