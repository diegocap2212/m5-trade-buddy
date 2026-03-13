

## Plano: Corrigir crash na troca de ativos + Aumentar gráfico

### Problema 1: Gráfico quebra ao trocar de ativo
A causa raiz: ao trocar de ativo, o `signalHistory` restaurado contém sinais com timestamps do ativo anterior. Quando o gráfico remonta (via `key`), os novos candles ainda estão carregando e os marcadores referenciam timestamps que não existem nos candles — o `lightweight-charts` lança erro.

**Correção em `CandlestickChart.tsx`**:
- Filtrar marcadores para incluir apenas timestamps que existam dentro do range dos candles atuais
- Adicionar guard contra `candles.length === 0` antes de criar marcadores
- Limpar `markersPrimitiveRef` ao criar novo chart para evitar referências stale

### Problema 2: Gráfico pequeno demais
Atualmente fixo em `h-[520px]` (linha 436). O layout é `grid-cols-4` com o gráfico ocupando 3 colunas e sidebar 1.

**Correção em `Index.tsx` e `CandlestickChart.tsx`**:
- Mudar altura do gráfico de `h-[520px]` para `h-[calc(100vh-220px)]` — ocupa quase toda a viewport
- Mudar grid de `lg:grid-cols-4` para `lg:grid-cols-5`, gráfico com `lg:col-span-4` e sidebar com `lg:col-span-1`
- Compactar `MarketSession` para inline no header (menos espaço vertical desperdiçado)
- Sidebar: limitar altura dos componentes com `max-h` e scroll

### Problema 3: Assertividade não bate ao trocar
No `use-trading-engine.ts`, ao restaurar sessão, o `backtestRan` é setado como `true` se já tem sinais — mas o backtest roda com candles do ativo anterior. 

**Correção**: Resetar `backtestRan.current = false` sempre na troca, e no efeito de backtest, validar que os candles correspondem ao asset selecionado antes de rodar.

### Arquivos alterados
1. `src/components/trading/CandlestickChart.tsx` — Filtro de marcadores por range válido + altura responsiva
2. `src/pages/Index.tsx` — Grid 5 colunas, gráfico 4:1, compactação
3. `src/hooks/use-trading-engine.ts` — Reset correto do backtest na troca de ativo

