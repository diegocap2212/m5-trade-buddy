

## Diagnóstico

Dois problemas centrais identificados:

**1. Falta de granularidade nos resultados** — O tipo `TradingSignal.result` só tem `WIN | LOSS | PENDING`. Não há como saber se um WIN veio direto ou via MG1, nem se um LOSS foi direto (sem proteção) ou após MG1 falhar. O usuário precisa de 4 categorias:
- **Win Direto** — acertou na primeira vela
- **Win MG1** — errou a primeira, acertou na MG1
- **Loss MG1** — entrou em MG1 e perdeu (loss real com custo dobrado)
- **Loss Direto** — perdeu sem entrar em MG1 (cenário onde o trader opta por não proteger)

**2. UI/UX genérica** — Layout funcional mas sem refinamento visual de produto premium. Cards sem hierarquia clara, histórico sem distinção visual entre tipos de resultado, sidebar apertada.

---

## Plano de implementação

### 1. Expandir tipo de resultado (`trading-types.ts`)
- Adicionar campo `resultDetail?: 'WIN_DIRECT' | 'WIN_MG1' | 'LOSS_MG1' | 'LOSS_DIRECT'` ao `TradingSignal`
- Manter `result: WIN | LOSS | PENDING` para compatibilidade

### 2. Atualizar engine para popular `resultDetail` (`use-trading-engine.ts` + `signal-engine.ts`)
- No live engine: quando valida `waiting_first` como win → `resultDetail = 'WIN_DIRECT'`
- Quando `waiting_mg1` win → `resultDetail = 'WIN_MG1'`
- Quando `waiting_mg1` loss → `resultDetail = 'LOSS_MG1'`
- No backtest: mesma lógica no `backtestCandles`
- Atualizar `MG1Stats` para incluir `lossesMG1` separado de `lossesDirect`

### 3. Redesenhar `SessionStats.tsx`
- Layout em 2 linhas: linha 1 com Win Direto + Win MG1, linha 2 com Loss MG1 + Loss Direto
- Card de WR Final destacado ao centro com tamanho maior
- Usar cores distintas: verde para wins, âmbar para MG1 wins, vermelho para losses MG1, vermelho escuro para losses diretos
- Adicionar barra de progresso visual do win rate

### 4. Redesenhar `SignalHistory.tsx`
- Cada sinal mostra badge com `resultDetail` em vez de genérico WIN/LOSS
- Badges: `WIN ✓` verde, `WIN MG1` âmbar, `LOSS MG1` vermelho com ícone de shield, `LOSS` vermelho
- Adicionar preço de entrada e confiança em cada linha
- Melhorar espaçamento e tipografia

### 5. Polish geral da UI (`Index.tsx` + componentes)
- Header: adicionar gradiente sutil na borda inferior, melhorar espaçamento
- Chart card: borda com gradiente sutil baseado no último sinal
- Sidebar cards: padding consistente, sombras sutis, hover states
- Signal banner no gráfico: redesenhar com glassmorphism sutil
- Footer: remover ou tornar mais discreto

### Arquivos modificados
- `src/lib/trading-types.ts` — novo campo `resultDetail`
- `src/lib/signal-engine.ts` — backtest popula `resultDetail`
- `src/hooks/use-trading-engine.ts` — live engine popula `resultDetail`, stats expandidas
- `src/components/trading/SessionStats.tsx` — redesign completo com 5 métricas
- `src/components/trading/SignalHistory.tsx` — badges granulares, layout refinado
- `src/pages/Index.tsx` — polish visual geral
- `src/index.css` — novas utility classes para glassmorphism e gradientes

