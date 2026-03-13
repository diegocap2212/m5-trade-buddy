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

const AssetSelector = ({ value, onValueChange }: AssetSelectorProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[200px] bg-secondary border-border font-mono text-sm h-9">
        <SelectValue placeholder="Selecionar ativo" />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        {CRYPTO_ASSETS.map((asset) => (
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
