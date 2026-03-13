import { Switch } from '@/components/ui/switch';
import { Eye, TrendingUp } from 'lucide-react';

interface OperatingModeToggleProps {
  operating: boolean;
  onToggle: (operating: boolean) => void;
}

const OperatingModeToggle = ({ operating, onToggle }: OperatingModeToggleProps) => {
  return (
    <div className="flex items-center gap-2">
      <Eye className={`h-3.5 w-3.5 transition-colors ${!operating ? 'text-primary' : 'text-muted-foreground'}`} />
      <Switch
        checked={operating}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-win data-[state=unchecked]:bg-muted"
      />
      <TrendingUp className={`h-3.5 w-3.5 transition-colors ${operating ? 'text-win' : 'text-muted-foreground'}`} />
      <span className={`font-mono text-[10px] tracking-wider font-semibold ${operating ? 'text-win' : 'text-muted-foreground'}`}>
        {operating ? 'OPERANDO' : 'OBSERVANDO'}
      </span>
    </div>
  );
};

export default OperatingModeToggle;
