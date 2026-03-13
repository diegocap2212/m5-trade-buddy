

## Análise do pedido

O usuário quer 4 coisas:

1. **Modo operacional com toggle** — "Vou operar" (ativa banca + contabilidade P&L) vs "Só acompanhando" (modo observação, sem gestão de risco)
2. **Histórico separado por timeframe E por ativo** — ao trocar M1↔M5 ou moeda, cada combinação mantém seu próprio histórico e stats
3. **Testes** — usabilidade, interação, carga
4. **Melhorias no gráfico** — a API lightweight-charts ainda tem problemas

---

## Plano de implementação

### 1. Modo Operacional — Toggle "Operando / Acompanhando"

**Novo componente `OperatingModeToggle.tsx`:**
- Switch estilizado no header com dois estados: `OPERANDO` (verde) e `OBSERVANDO` (cinza)
- Quando ativa "Operando", expande o `RiskManager` pedindo a banca inicial
- Quando em "Observando", oculta o `RiskManager` e exibe apenas sinais/stats sem P&L

**Mudanças em `Index.tsx`:**
- Estado `operatingMode: 'operating' | 'watching'`
- `RiskManager` só renderiza quando `mode === 'operating'`
- SessionStats mostra P&L financeiro (R$) apenas no modo operating
- Adicionar um card simples "Banca" que aparece ao ativar o modo, com input para capital e exibição de lucro/prejuízo acumulado baseado nos resultados reais da sessão

**Mudanças em `SessionStats.tsx`:**
- Receber `operatingMode` e `capital` como props
- Quando operando: exibir linha extra com "P&L da sessão" calculado com base nos wins/losses × entrada base × payout

### 2. Histórico separado por Timeframe + Ativo

**Novo hook `use-session-history.ts`:**
- Armazena um `Map<string, { signals, mg1Stats }>` indexado por `${asset}_${timeframe}` (ex: `BTC/USD_M5`)
- Quando o engine resolve um sinal, salva no slot correto
- Quando o usuário troca ativo/timeframe, carrega o histórico daquela combinação
- Backtest roda por combinação e não sobrescreve outros

**Mudanças em `use-trading-engine.ts`:**
- Em vez de resetar `signalHistory` e `mg1Stats` ao trocar ativo, mover os dados atuais para o map e carregar os do novo slot
- Receber `timeframe` como dependência do reset (já recebe, mas o histórico se perde)
- Retornar também `allSessions: Map<string, stats>` para exibir um resumo geral

**Mudanças em `SignalHistory.tsx`:**
- Header mostra qual combinação ativo+timeframe está selecionada
- Tabs opcionais: "Sessão atual" vs "Todas as sessões" para ver agregado

### 3. Melhorias no Gráfico

**Problemas identificados no código atual:**
- `setData()` é chamado a cada tick do WebSocket (a cada ~1s), recalculando TODOS os indicadores (EMA, BB, VWAP) para 200 candles — isso é pesado e causa jank
- VWAP calcula `O(n²)` porque faz `candles.slice(0, i+1)` em loop
- Markers são recriados a cada render com `setMarkers()` + `createSeriesMarkers()` repetidamente
- O chart não é destruído/recriado ao trocar ativo, causando possíveis conflitos de dados

**Otimizações planejadas em `CandlestickChart.tsx`:**
- **Incremental updates**: Usar `update()` em vez de `setData()` para o candle em progresso. Só chamar `setData()` quando o array de candles muda de tamanho (nova vela fechada)
- **Throttle de indicadores**: Recalcular EMA/BB/VWAP apenas quando uma vela fecha, não a cada tick
- **VWAP O(n)**: Pré-calcular cumulativo em vez de slice em loop
- **Markers estáveis**: Só atualizar markers quando `signalHistory` muda de fato (comparar length + último ID)
- **Recrear chart ao trocar ativo**: Adicionar `selectedAsset` como key no componente para forçar remount limpo

**Mudanças em `Index.tsx`:**
- Passar `key={selectedAsset + timeframe}` no `CandlestickChart` para forçar remount limpo

### 4. Testes

**Testes unitários (`vitest`):**
- `signal-engine.test.ts` — testar `analyzeMarket` com dados mock (cenários CALL, PUT, WAIT)
- `trading-indicators.test.ts` — testar EMA, RSI, Bollinger com dados conhecidos
- `sound-alerts.test.ts` — testar que mute impede reprodução

**Testes de componente:**
- `SessionStats.test.tsx` — renderiza corretamente com diferentes mg1Stats
- `SignalHistory.test.tsx` — badges corretos para cada resultDetail

**Teste de carga (inline no test):**
- Gerar 1000 candles sintéticos, rodar `backtestCandles`, verificar que não excede 100ms
- Verificar que `calculateBollingerBands` com 200 candles roda em < 5ms

---

## Arquivos modificados/criados

| Arquivo | Ação |
|---------|------|
| `src/components/trading/OperatingModeToggle.tsx` | Criar — toggle operando/acompanhando |
| `src/hooks/use-session-history.ts` | Criar — histórico persistente por ativo+timeframe |
| `src/hooks/use-trading-engine.ts` | Editar — integrar session history, modo operacional |
| `src/pages/Index.tsx` | Editar — toggle no header, key no chart, modo operacional |
| `src/components/trading/CandlestickChart.tsx` | Editar — updates incrementais, throttle indicadores, VWAP O(n) |
| `src/components/trading/SessionStats.tsx` | Editar — P&L financeiro no modo operando |
| `src/components/trading/RiskManager.tsx` | Editar — visibilidade condicional |
| `src/components/trading/SignalHistory.tsx` | Editar — label ativo+timeframe no header |
| `src/test/signal-engine.test.ts` | Criar — testes unitários engine |
| `src/test/trading-indicators.test.ts` | Criar — testes unitários indicadores |
| `src/test/SessionStats.test.tsx` | Criar — teste de componente |
| `src/test/performance.test.ts` | Criar — teste de carga |

