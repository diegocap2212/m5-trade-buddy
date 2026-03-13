

## Diagnóstico

O motivo é simples: o **backtest** (que roda ao carregar as velas históricas) **não chama `recordResult()`**. Ele popula `signalHistory` e `mg1Stats` na memória, mas nunca grava no `localStorage`. Só sinais resolvidos em **tempo real** (pelo fluxo `pendingValidation`) são persistidos.

Ou seja: toda vez que a página recarrega, o backtest roda de novo e preenche a sessão atual, mas esses resultados retroativos nunca alimentam o painel de assertividade global.

## Solução

Uma linha de mudança no lugar certo resolve:

### `src/hooks/use-trading-engine.ts` — bloco do backtest (linhas 190-198)
Após o `backtestCandles()` retornar, iterar sobre os sinais resultantes e chamar `recordResult()` para cada um que tenha `resultDetail`. Porém, precisamos de um cuidado: **não duplicar** registros se o usuário recarregar a página. Para isso:

- Antes de gravar, verificar se já existem registros no `localStorage` para aquele ativo+timeframe com timestamps coincidentes (os timestamps do backtest vêm das velas históricas, então são determinísticos).
- Alternativa mais simples: adicionar uma função `hasResultsForCandle(timestamp, asset)` em `global-stats.ts` que checa duplicidade.

### `src/lib/global-stats.ts`
- Adicionar `recordBacktestResults(signals)` — recebe o array de sinais do backtest, filtra os que já existem por `timestamp + asset`, e grava os novos.

### Resultado
Ao abrir a página, o backtest roda, grava os resultados retroativos no localStorage (sem duplicar), e o painel de assertividade global já mostra dados históricos imediatamente.

### Arquivos
| Arquivo | Ação |
|---------|------|
| `src/lib/global-stats.ts` | Adicionar `recordBacktestResults()` com deduplicação |
| `src/hooks/use-trading-engine.ts` | Chamar `recordBacktestResults()` após backtest |

