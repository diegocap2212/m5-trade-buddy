
Objetivo
Corrigir o “sinal que some” perto da entrada e garantir que, ao entrar na operação, ela fique registrada e seja marcada no gráfico/histórico até resolver em WIN/LOSS.

Diagnóstico (confirmado no código atual)
1) O topo (OpportunityBanner) usa oportunidades do scanner com expiração fixa de 60s (`useMultiScanner`), então em M1 ela pode sumir exatamente na janela de entrada.
2) O scanner de Forex usa `generateHistoricalCandles()` a cada varredura (dados aleatórios novos), diferente da série usada no ativo aberto — isso cria oportunidades “fantasma” (ex.: AUD/CHF aparece no banner e depois não casa com o gráfico).
3) O motor (`useTradingEngine`) analisa/valida com a última vela da lista (que pode estar em formação), gerando inconsistência de timing perto do fechamento.
4) O tracking de marcação hoje depende do sinal existir no engine do ativo atual; se veio do banner e não foi “comprometido” no engine, ele pode desaparecer sem trilha.

Plano de implementação
1) Travar ciclo da oportunidade por candle (não por 60s fixos)
- Em `useMultiScanner`, adicionar metadados por oportunidade:
  - `entryTimestamp` (T-1s),
  - `closeTimestamp`,
  - `expiresAt` (ex.: close + 1 candle de margem).
- Remover filtro por “últimos 60s” e usar `expiresAt`.
- No banner, mostrar status temporal (Aguardando entrada / Em validação) ao invés de simplesmente sumir.

2) “Commit” explícito da entrada ao clicar ABRIR
- Criar handshake entre `OpportunityBanner/Index` e `useTradingEngine`:
  - ao clicar ABRIR, a oportunidade vira sinal `PENDING` no engine imediatamente (ID fixo), com `timestamp` de entrada.
- Assim, mesmo que o scanner pare de exibir, a operação continua no histórico e no gráfico até resolver.

3) Unificar fonte de candles de Forex entre scanner e engine
- Extrair um store/cache compartilhado de candles Forex (módulo único) e fazer:
  - `useForexData` consumir esse store,
  - `useMultiScanner` ler snapshot do mesmo store.
- Eliminar uso de histórico aleatório independente no scanner para evitar armadilhas de divergência.

4) Validar apenas com velas fechadas
- No `useTradingEngine`, separar “vela em formação” de “velas fechadas” por timeframe.
- Análise de sinal e validação de resultado passam a usar apenas fechamento confirmado.
- Mantém estabilidade em M1 e evita sumiço/flip perto do T-1s.

5) Garantir marcação visual em duas fases
- Em `CandlestickChart`:
  - manter marcador de entrada desde o commit (`⏳ ENTRY`/`▶ CALL|PUT`),
  - marcador final no `resolvedTimestamp` (`🎯 WIN` / `💀 LOSS`).
- Não depender da presença do banner para manter a operação visível.

Arquivos impactados
- `src/hooks/use-multi-scanner.ts`
- `src/components/trading/OpportunityBanner.tsx`
- `src/pages/Index.tsx`
- `src/hooks/use-trading-engine.ts`
- `src/hooks/use-forex-data.ts` (ou novo módulo de store compartilhado)
- `src/components/trading/CandlestickChart.tsx`
- testes em `src/test/*` e opcional e2e em `e2e/*`

Critérios de aceite
1) Em M1, oportunidade não desaparece na virada da entrada por TTL arbitrário.
2) Clicou ABRIR: operação fica registrada imediatamente como `PENDING`.
3) Toda operação registrada recebe desfecho WIN/LOSS e marcador final no gráfico.
4) AUD/CHF (e demais Forex) não gera mais divergência entre banner e gráfico por fonte aleatória diferente.
5) Histórico/stats/marcadores ficam consistentes entre si.

Seção técnica (resumo)
- Substituir lógica de expiração por tempo de relógio (`now - 60s`) por lifecycle baseado no candle (`entryTimestamp/closeTimestamp/expiresAt`).
- Introduzir “signal commit” (evento de execução) para desacoplar exibição do scanner da persistência da operação.
- Padronizar avaliação por velas fechadas para remover race condition de candle em formação.
- Reusar a mesma série de candles no scanner e no ativo aberto para Forex.
