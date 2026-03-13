
Diagnóstico rápido do que está acontecendo no seu caso (AUD/USD M1):

1) Hoje a entrada não é “fixada” no histórico no momento em que o sinal nasce; ela só entra quando termina o ciclo.  
2) No gráfico, os marcadores usam `signalHistory.slice(-10)`, mas o histórico é salvo com os mais novos no início. Isso pega os 10 mais antigos, então sinais recentes podem “sumir”.  
3) A validação usa o último candle em formação em vez de candle já fechado em alguns momentos, gerando sensação de atraso/inconsistência no M1.  
4) Não existe hoje um timestamp separado de “resultado final”, então não dá para ter claramente “marca de entrada” + “marca de fechamento” como você pediu.

Plano objetivo para corrigir:

1. Corrigir o ciclo de sinal no motor (`use-trading-engine.ts`)
- Passar a trabalhar com candles fechados para análise/validação (não candle em formação).
- No momento da entrada, já inserir um item `PENDING` no `signalHistory` (com id fixo).
- Ao finalizar (WIN_DIRECT / WIN_MG1 / LOSS_MG1), atualizar esse mesmo item por `id` (em vez de criar outro solto).
- Limpar `currentSignal` ao finalizar para evitar sinal “fantasma” ativo.

2. Separar tempo de entrada e tempo de resultado (`trading-types.ts` + engine)
- Manter `timestamp` como horário de entrada.
- Adicionar `resolvedTimestamp` (opcional) para o candle onde o resultado foi confirmado.
- Preencher `resolvedTimestamp` no realtime e no backtest.

3. Ajustar marcadores no gráfico (`CandlestickChart.tsx`)
- Trocar `slice(-10)` por seleção dos mais recentes (`slice(0, 10)`).
- Renderizar sempre 2 fases:
  - Marker de entrada (quando PENDING).
  - Marker de resultado no `resolvedTimestamp` (WIN/LOSS), independente do desfecho.
- Manter estilo visual distinto para entrada vs resultado (ex.: ⏳ Entrada, 🎯/💀 Resultado).

4. Alinhar backtest com o mesmo modelo (`signal-engine.ts`)
- Preencher `resolvedTimestamp` conforme tipo do resultado:
  - WIN_DIRECT -> candle i+1
  - WIN_MG1 / LOSS_MG1 -> candle i+2
- Garantir consistência visual entre histórico e realtime.

5. Cobertura de teste (novo teste de engine + ajuste de chart)
- Testar cenário M1 com sequência determinística para validar:
  - entrada sempre criada,
  - resultado sempre computado,
  - stats sempre incrementados,
  - marker final sempre aparece.

Arquivos impactados:
- `src/hooks/use-trading-engine.ts`
- `src/lib/trading-types.ts`
- `src/components/trading/CandlestickChart.tsx`
- `src/lib/signal-engine.ts`
- `src/test/*` (novo teste focado em lifecycle entrada→resultado)

Critério de aceite (o que você deve ver no app):
- Em todo sinal: aparece marca de ENTRADA imediatamente.
- Após fechamento: aparece marca de RESULTADO (WIN ou LOSS), sem falhar no M1.
- Stats e histórico batem com o resultado visual.
- Sinais recentes sempre aparecem no gráfico (não só os antigos).
