

## Opinião criteriosa

A ideia é excelente e resolve uma lacuna real: hoje o usuário vê stats apenas da sessão ativo+timeframe atual, sem visão consolidada. Um painel de assertividade global dá contexto sobre a consistência do sistema ao longo do tempo.

**Pontos de atenção para fazer bem feito:**

1. **Dados in-memory vs persistidos** — Hoje tudo vive em `useRef<Map>` (memória). Ao recarregar a página, perde-se tudo. Para dia/semana/mês funcionar de verdade, precisamos persistir no `localStorage`. Sem isso, "semana" e "mês" só mostram dados da sessão atual do navegador.

2. **Com vs sem Martingale** — Faz total sentido mostrar ambos. O win rate "sem MG" (só wins diretos / total) mostra a qualidade pura do sinal. O "com MG" (diretos + MG1 wins / total) mostra o resultado real do trader. A comparação entre os dois é muito informativa.

3. **Simplicidade visual** — Em vez de tabelas complexas, propor um layout compacto de 3 colunas (Hoje | Semana | Mês), cada uma com duas linhas: WR sem MG e WR com MG. Limpo e escaneável.

---

## Plano

### 1. Persistência de resultados (`src/lib/global-stats.ts`)
- Criar um módulo que salva cada resultado resolvido no `localStorage` como array de `{ timestamp, resultDetail, asset, timeframe }`
- Funções: `recordResult()`, `getResultsSince(date)`, `getTodayResults()`, `getWeekResults()`, `getMonthResults()`
- Limitar a 500 registros (rolling window)

### 2. Hook de agregação (`src/hooks/use-global-stats.ts`)
- Consome `global-stats.ts` e recalcula sempre que `signalHistory` muda
- Retorna para cada período (hoje/semana/mês):
  - `totalSignals`, `winRateWithMG`, `winRateWithoutMG`, `wins`, `losses`

### 3. Componente `GlobalAssertiveness.tsx`
- Card fixo no rodapé da página (substitui o texto atual de footer)
- Layout: 3 colunas — **Hoje** | **7 dias** | **30 dias**
- Cada coluna mostra:
  - Win Rate com MG (número grande, cor baseada no valor)
  - Win Rate sem MG (número menor, secundário)
  - Total de sinais (badge discreto)
- Badge de tendência: seta ↑ ou ↓ comparando hoje vs média da semana

### 4. Integração
- `use-trading-engine.ts` — chamar `recordResult()` quando um sinal é resolvido
- `Index.tsx` — adicionar `<GlobalAssertiveness />` no rodapé, passar dados do hook

### Arquivos
| Arquivo | Ação |
|---------|------|
| `src/lib/global-stats.ts` | Criar — persistência localStorage |
| `src/hooks/use-global-stats.ts` | Criar — hook de agregação por período |
| `src/components/trading/GlobalAssertiveness.tsx` | Criar — componente visual |
| `src/hooks/use-trading-engine.ts` | Editar — gravar resultados |
| `src/pages/Index.tsx` | Editar — montar componente no rodapé |

