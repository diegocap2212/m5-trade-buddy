import { X, ArrowUpCircle, ArrowDownCircle, Radar } from 'lucide-react';
import type { ScannerOpportunity } from '@/hooks/use-multi-scanner';
import { playCallAlert, playPutAlert } from '@/lib/sound-alerts';
import { useEffect, useRef } from 'react';

interface OpportunityBannerProps {
  opportunities: ScannerOpportunity[];
  scanning: boolean;
  onSwitchAsset: (asset: string) => void;
  onDismiss: (asset: string) => void;
}

const OpportunityBanner = ({ opportunities, scanning, onSwitchAsset, onDismiss }: OpportunityBannerProps) => {
  const lastSoundRef = useRef<string>('');

  // Play sound when new opportunity appears
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

  if (opportunities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {opportunities.map((opp) => {
        const isCall = opp.analysis.direction === 'CALL';
        return (
          <div
            key={`${opp.asset}_${opp.timestamp}`}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl border font-mono text-xs transition-all duration-500 animate-in slide-in-from-top-2 ${
              isCall
                ? 'bg-[#00e676]/5 border-[#00e676]/30 text-[#00e676]'
                : 'bg-[#ff1744]/5 border-[#ff1744]/30 text-[#ff1744]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Radar className="h-4 w-4 animate-pulse" />
              <div className="flex items-center gap-2">
                {isCall ? (
                  <ArrowUpCircle className="h-5 w-5" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5" />
                )}
                <span className="font-bold text-sm tracking-wider">{opp.asset}</span>
                <span className="text-foreground font-bold">{opp.analysis.direction}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-background/50 border border-border">
                  {opp.analysis.confidence}%
                </span>
                <span className="px-1.5 py-0.5 rounded bg-background/50 border border-border">
                  RSI {opp.analysis.rsi}
                </span>
                <span>{opp.analysis.pattern}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSwitchAsset(opp.asset)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all hover:scale-105 ${
                  isCall
                    ? 'bg-[#00e676]/20 hover:bg-[#00e676]/30 text-[#00e676] border border-[#00e676]/30'
                    : 'bg-[#ff1744]/20 hover:bg-[#ff1744]/30 text-[#ff1744] border border-[#ff1744]/30'
                }`}
              >
                ABRIR
              </button>
              <button
                onClick={() => onDismiss(opp.asset)}
                className="p-1 rounded hover:bg-muted/50 text-muted-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OpportunityBanner;
