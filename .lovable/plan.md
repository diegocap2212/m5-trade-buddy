

## Plano: Backtester Histórico com Dados Já Carregados

### Problema
O motor atual só gera sinais em tempo real (quando novas velas chegam). Com as 40 velas históricas já carregadas da Binance, não há como validar a estratégia — você precisa esperar horas até o preço tocar uma Bollinger extrema.

### Solução
Criar uma função de **backtest** que percorre todas as velas históricas já carregadas, aplica a mesma lógica de exaustão (BB 2.0 + RSI < 35 / > 65), e valida o resultado com o preço real da vela seguinte (+ MG1 na segunda vela). Os resultados aparecem imediatamente no painel de estatísticas e no histórico de sinais.

### O que será feito

**1. Função `backtestCandles` em `src/lib/signal-engine.ts`**
- Recebe o array de velas históricas
- Para cada vela `i` (de 20 até `length - 3`), roda `analyzeMarket(candles.slice(0, i+1))`
- Se gerar CALL/PUT, valida:
  - Vela `i+1` close vs entry price → Win Direto ou passa para MG1
  - Vela `i+2` close vs vela `i+1` close → Win MG1 ou Loss Real
- Retorna array de sinais resolvidos + stats MG1

**2. Hook `use-trading-engine.ts` — rodar backtest na carga inicial**
- Quando as 40 velas históricas chegam da Binance, rodar `backtestCandles` uma vez
- Popular `signalHistory` e `mg1Stats` com os resultados históricos
- Sinais em tempo real continuam funcionando normalmente por cima

**3. Indicador visual no `SessionStats.tsx`**
- Separar visualmente os resultados: "Backtest (histórico)" vs "Ao vivo"
- Mostrar total combinado no WR Final

**4. Marcadores no gráfico**
- Os sinais do backtest já vão aparecer como markers no `CandlestickChart` pois serão adicionados ao `signalHistory`

### Arquivos modificados
- `src/lib/signal-engine.ts` — nova função `backtestCandles`
- `src/hooks/use-trading-engine.ts` — rodar backtest na carga inicial
- `src/components/trading/SessionStats.tsx` — label indicando dados de backtest

### Resultado esperado
- Ao abrir o app, em ~1 segundo você verá o WR histórico das últimas ~20 velas com a estratégia de exaustão + MG1
- Sinais marcados no gráfico mostrando onde teria entrado e o resultado
- Validação imediata da assertividade sem esperar sinais ao vivo

