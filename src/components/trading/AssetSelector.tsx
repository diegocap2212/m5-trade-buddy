import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FOREX_PAIRS, CRYPTO_PAIRS, OTC_PAIRS } from '@/lib/trading-types';

interface AssetSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

const AssetSelector = ({ value, onValueChange }: AssetSelectorProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[160px] bg-secondary border-border font-mono text-sm h-9">
        <SelectValue placeholder="Par ativo" />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        <SelectGroup>
          <SelectLabel className="text-muted-foreground text-xs">Forex</SelectLabel>
          {FOREX_PAIRS.map((pair) => (
            <SelectItem key={pair} value={pair} className="font-mono text-sm">
              {pair}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-muted-foreground text-xs">Cripto</SelectLabel>
          {CRYPTO_PAIRS.map((pair) => (
            <SelectItem key={pair} value={pair} className="font-mono text-sm">
              {pair}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-muted-foreground text-xs">OTC</SelectLabel>
          {OTC_PAIRS.map((pair) => (
            <SelectItem key={pair} value={pair} className="font-mono text-sm">
              {pair}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default AssetSelector;
