

# Plano: Correção Timezone do Gráfico + Revisão de Arquitetura + Expansão de Testes

## 1. Correção do Timezone do Gráfico (BRT)

**Problema**: `toChartTime()` em `CandlestickChart.tsx` (linha 18-20) faz `Math.floor(ts / 1000)` — converte para segundos UTC. O `lightweight-charts` não suporta timezone nativo, então o eixo X exibe UTC, 3 horas à frente de BRT.

**Correção**: Aplicar offset BRT diretamente nos timestamps (padrão documentado pelo TradingView):

```typescript
function toChartTime(ts: number) {
  const d = new Date(ts);
  const sp = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return Math.floor(sp.getTime() / 1000) as any;
}
```

**Arquivo**: `src/components/trading/CandlestickChart.tsx` — linhas 18-20.

---

## 2. Revisão de Arquitetura — Problemas Identificados

### 2.1 — `useMarketData` aloca AMBOS os hooks sempre (wasteful)

O factory hook (`use-market-data.ts`) chama `useBinanceWebSocket` E `useForexData` simultaneamente, usando "dummy pairs" para o inativo. Isso significa que ao selecionar EUR/USD (Forex), uma conexão WebSocket real com a Binance é aberta para BTC/USD em paralelo — desperdiçando recursos e gerando tráfego de rede desnecessário.

**Correção**: Refatorar para que cada hook receba um flag `enabled` e faça early-return quando desabilitado:
- `useBinanceWebSocket(pair, tf, enabled)` — se `!enabled`, não conecta WS nem fetcha candles
- `useForexData(pair, tf, enabled)` — se `!enabled`, não gera dados nem inicia polling

### 2.2 — `useMultiScanner` ignora pares Forex

O scanner (`use-multi-scanner.ts` linha 47) filtra apenas `CRYPTO_PAIRS`. Pares Forex são excluídos do scanner multi-ativos.

**Correção**: Adicionar scan de pares Forex usando `generateHistoricalCandles` + `analyzeMarket` (já que não temos API real). Separar lógica de fetch por source type.

### 2.3 — `saveCurrentSession` não é usado

O callback `saveCurrentSession` em `use-trading-engine.ts` (linhas 41-46) é declarado mas nunca chamado — a lógica de save é duplicada inline no `useEffect` abaixo (linhas 51-54).

**Correção**: Remover o callback morto.

### 2.4 — Dependências faltantes nos useEffect

`use-trading-engine.ts` linha 67: `useEffect` depende de `[selectedAsset, timeframe]` mas usa `signalHistory`, `mg1Stats` e `sessionHistory` sem listá-los. Pode causar stale closures.

**Correção**: Usar refs para `signalHistory` e `mg1Stats` dentro desse effect.

---

## 3. Expansão da Cobertura de Testes

### 3.1 — `src/test/chart-timezone.test.ts` (NOVO)
- Testar que `toChartTime` com UTC 15:00 produz timestamp equivalente a 12:00 BRT
- Testar edge case: meia-noite UTC → 21:00 BRT do dia anterior

### 3.2 — `src/test/forex-data.test.ts` (NOVO)
- `generateHistoricalCandles` produz candles com timestamps crescentes e espaçamento correto (M1=60s, M5=300s)
- OHLCV é consistente: `low <= open,close <= high`
- Buffer de 200 candles é respeitado

### 3.3 — `src/test/trading-types.test.ts` (NOVO)
- Todos os pares têm `source` e `category` definidos
- `getAssetSource` retorna `'binance'` para crypto, `'forex-api'` para forex
- Não há pares duplicados em `CRYPTO_ASSETS`
- `ALL_PAIRS`, `CRYPTO_PAIRS`, `FOREX_PAIRS` têm contagens corretas

### 3.4 — Expandir `e2e/chart-stability.spec.ts`
- Adicionar teste de troca crypto → forex → crypto verificando que canvas persiste
- Adicionar teste que verifica label "BRT" visível no MarketSession
- Adicionar teste de zoom (scroll wheel) após troca de ativo

---

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/components/trading/CandlestickChart.tsx` | Fix `toChartTime` para BRT |
| `src/hooks/use-market-data.ts` | Adicionar flag `enabled` para evitar hooks desnecessários |
| `src/hooks/use-binance-ws.ts` | Aceitar param `enabled`, skip connect quando false |
| `src/hooks/use-forex-data.ts` | Aceitar param `enabled`, skip polling quando false |
| `src/hooks/use-trading-engine.ts` | Remover dead code, fix stale closures |
| `src/hooks/use-multi-scanner.ts` | Incluir pares Forex no scan |
| `src/test/chart-timezone.test.ts` | Novo — testes timezone |
| `src/test/forex-data.test.ts` | Novo — testes dados forex |
| `src/test/trading-types.test.ts` | Novo — testes catálogo |
| `e2e/chart-stability.spec.ts` | Expandir com forex + zoom |

## Ordem de Implementação

1. Fix timezone `toChartTime` (impacto visual imediato)
2. Refatorar `useMarketData` + hooks com `enabled` (cleanup arquitetural)
3. Fix dead code e stale closures no trading engine
4. Incluir Forex no scanner
5. Criar novos testes unitários
6. Expandir testes E2E

