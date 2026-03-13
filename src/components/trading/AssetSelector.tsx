import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CRYPTO_ASSETS } from '@/lib/trading-types';

interface AssetSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

const cryptoAssets = CRYPTO_ASSETS.filter(a => a.category === 'crypto');
const forexAssets = CRYPTO_ASSETS.filter(a => a.category === 'forex');

const AssetSelector = ({ value, onValueChange }: AssetSelectorProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[200px] bg-secondary border-border font-mono text-sm h-9">
        <SelectValue placeholder="Selecionar ativo" />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border max-h-[400px]">
        {/* Crypto group */}
        <div className="px-2 py-1.5 text-[10px] font-mono font-bold text-muted-foreground tracking-widest uppercase border-b border-border">
          Crypto
        </div>
        {cryptoAssets.map((asset) => (
          <SelectItem key={asset.pair} value={asset.pair} className="font-mono text-sm">
            <span className="flex items-center justify-between gap-3 w-full">
              <span>{asset.pair}</span>
              <span className="text-xs text-muted-foreground">{asset.payout}%</span>
            </span>
          </SelectItem>
        ))}

        {/* Forex group */}
        <div className="px-2 py-1.5 mt-1 text-[10px] font-mono font-bold text-muted-foreground tracking-widest uppercase border-b border-border">
          Forex
        </div>
        {forexAssets.map((asset) => (
          <SelectItem key={asset.pair} value={asset.pair} className="font-mono text-sm">
            <span className="flex items-center justify-between gap-3 w-full">
              <span>{asset.pair}</span>
              <span className="text-xs text-muted-foreground">{asset.payout}%</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default AssetSelector;
