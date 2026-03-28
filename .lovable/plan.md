

## Plano: 3 Correções Prioritarias

### 1. Motor de Regras — Filtros muito restritivos, poucos sinais

**Problema identificado:** O motor exige `confidence >= 85` **E** presença obrigatória de padrão de vela (`hasPattern`). Isso filtra ~95% das oportunidades reais. Um sinal onde preço rompe Bollinger + RSI extremo (condições fortes) é descartado se a vela não formar exatamente um Hammer/Engulfing/Doji.

**Correção:**
- Remover a exigência obrigatória de padrão de vela — tratar padrão como **bônus de confiança** (+5-10%), não como filtro eliminatório
- Reduzir confiança mínima de 85% para **70%** para permitir sinais com BB+RSI fortes mesmo sem padrão
- Adicionar confluência do Stochastic ao cálculo de confiança (+5% se Stoch < 20 para CALL ou > 80 para PUT)
- Adicionar confluência VWAP (+3% se preço abaixo do VWAP para CALL, acima para PUT)
- Resultado: mais sinais, melhor calibrados, sem exigir padrão raro

**Arquivo:** `src/lib/signal-engine.ts` (função `analyzeMarket`, linhas 99-104)

### 2. Histórico 30 dias — Dados de backtest poluem estatísticas reais

**Problema identificado:** A função `recordBacktestResults` grava resultados de backtest no mesmo localStorage que resultados reais. Quando você troca de ativo, o backtest roda novamente e injeta sinais históricos como se fossem operações reais. O painel "Assertividade Global" (30 dias) mostra um mix de backtest + sessão real, sem distinção.

**Correção:**
- Adicionar campo `source: 'live' | 'backtest'` no `GlobalResult`
- `recordResult()` grava com `source: 'live'`
- `recordBacktestResults()` grava com `source: 'backtest'`
- No painel `GlobalAssertiveness`, exibir **apenas resultados `live`** por padrão, com toggle opcional para incluir backtest
- Limpar dados antigos de backtest que já foram gravados sem distinção (migração simples)

**Arquivos:** `src/lib/global-stats.ts`, `src/components/trading/GlobalAssertiveness.tsx`

### 3. Layout do Gestão de Risco — Redesign compacto e funcional

**Problema identificado:** O `RiskManager` ocupa muito espaço vertical com 3 colunas de entrada (BASE/MG1/MG2), banners redundantes e grid de 4 stats. Na sidebar de 20% da tela, fica apertado e difícil de ler.

**Redesign:**
- **Seção 1 — Capital + Entrada ativa:** Uma linha com input de capital e o valor da entrada atual destacado (com badge BASE/MG1/MG2)
- **Seção 2 — Barra de progresso do ciclo:** Barra visual horizontal mostrando as 3 fases (BASE → MG1 → MG2) com a fase atual destacada e o risco acumulado
- **Seção 3 — Métricas compactas:** 2 colunas: Risco do ciclo % | Losses seguidos (X/3)
- **Seção 4 — Alertas:** Apenas o alerta relevante (MG1 ativo, MG2 ativo, ou STOP), sem empilhar múltiplos banners
- Remover os 3 cards separados de BASE/MG1/MG2 (informação redundante com a barra de progresso)

**Arquivo:** `src/components/trading/RiskManager.tsx`

---

### Resumo de arquivos alterados

| Arquivo | Alteração |
|---|---|
| `src/lib/signal-engine.ts` | Relaxar filtros, padrão como bônus |
| `src/lib/global-stats.ts` | Campo `source` para separar live/backtest |
| `src/components/trading/GlobalAssertiveness.tsx` | Filtrar apenas `live` |
| `src/components/trading/RiskManager.tsx` | Redesign compacto |

