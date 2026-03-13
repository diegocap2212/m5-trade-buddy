import { Globe, Clock } from 'lucide-react';

interface Session {
  name: string;
  quality: 'alta' | 'média' | 'baixa';
  active: boolean;
}

function getActiveSessions(): Session[] {
  const now = new Date();
  const utcH = now.getUTCHours();

  const sessions: Session[] = [];

  // Tokyo/Asia: 00:00-09:00 UTC
  if (utcH >= 0 && utcH < 9) {
    sessions.push({ name: 'Tóquio', quality: 'baixa', active: true });
  }
  // London: 07:00-16:00 UTC
  if (utcH >= 7 && utcH < 16) {
    sessions.push({ name: 'Londres', quality: 'alta', active: true });
  }
  // New York: 13:00-22:00 UTC
  if (utcH >= 13 && utcH < 22) {
    sessions.push({ name: 'Nova York', quality: 'alta', active: true });
  }
  // Overlap London+NY: 13:00-16:00 UTC
  if (utcH >= 13 && utcH < 16) {
    sessions.push({ name: 'Overlap LDN/NY', quality: 'alta', active: true });
  }

  if (sessions.length === 0) {
    sessions.push({ name: 'Fora de sessão', quality: 'baixa', active: false });
  }

  return sessions;
}

const qualityColors = {
  alta: 'text-win',
  média: 'text-pending',
  baixa: 'text-loss',
};

const qualityBg = {
  alta: 'bg-win/10',
  média: 'bg-pending/10',
  baixa: 'bg-loss/10',
};

const MarketSession = () => {
  const sessions = getActiveSessions();
  const bestQuality = sessions.some((s) => s.quality === 'alta')
    ? 'alta'
    : sessions.some((s) => s.quality === 'média')
    ? 'média'
    : 'baixa';

  return (
    <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
      <Globe className={`h-4 w-4 ${qualityColors[bestQuality]}`} />
      <div className="flex items-center gap-2 flex-wrap">
        {sessions.filter((s, i, arr) => arr.findIndex((x) => x.name === s.name) === i).map((session) => (
          <span
            key={session.name}
            className={`text-xs font-mono px-2 py-0.5 rounded-full ${qualityBg[session.quality]} ${qualityColors[session.quality]}`}
          >
            {session.name}
          </span>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-mono text-muted-foreground">
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

export default MarketSession;
