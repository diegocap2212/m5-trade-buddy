

# Plano: Correção Estrutural do Gráfico + Expansão de Ativos

## Diagnóstico da Causa Raiz

O problema de desaparecimento de candles NÃO é paliativo — são 3 falhas estruturais interligadas:

1. **Race condition no WebSocket**: Quando o usuário troca de ativo, o hook `useBinanceWebSocket` cria uma nova conexão, mas a antiga ainda pode enviar mensagens antes de fechar. Esses dados do ativo anterior corrompem o state `candles` do novo ativo.

2. **Detecção frágil de "novo candle"**: O chart usa `candles.length !== prevCandleCountRef.current` para decidir se faz `setData()` (redraw completo) ou `update()` (incremental). Se dois ativos têm o mesmo número de candles (ambos 50), o chart tenta fazer `update()` com dados de um ativo completamente diferente — o `lightweight-charts` rejeita e crasha.

3. **`update()` do lightweight-charts é restritivo**: A API `update()` exige que `time >= lastBarTime`. Quando dados de um ativo anterior chegam com timestamps diferentes, o chart lança "Cannot update oldest data" e entra em estado corrompido onde as candles somem.

A `key` prop já existe no `Index.tsx` (`key={selectedAsset_timeframe}`), o que deveria destruir/recriar o chart a cada troca. Porém, o hook `useBinanceWebSocket` NÃO reseta o state `candles` ao trocar de par — ele mantém os candles antigos no state enquanto fetcha os novos, alimentando o chart recriado com dados do ativo errado.

---

## Fase 1: Estabilidade Estrutural do Gráfico

### 1.1 — Reset imediato de candles ao trocar ativo (`use-binance-ws.ts`)
- No `useEffect` que reage a `[pair, timeframe]`, chamar `setCandles([])` **antes** de fazer `fetchInitialCandles()`.
- Isso garante que o chart recriado pela `key` prop receba um array vazio e não renderize dados do ativo anterior.

### 1.2 — Guard de ativo no WebSocket handler (`use-binance-ws.ts`)
- Adicionar um `currentPairRef = useRef(pair)` que é atualizado quando pair muda.
- No `ws.onmessage`, verificar se `currentPairRef.current === pair` antes de chamar `setCandles`. Se o par mudou, descartar a mensagem silenciosamente.
- Isso elimina a race condition de dados velhos chegando após a troca.

### 1.3 — Tornar o chart 100% baseado em `setData()` (`CandlestickChart.tsx`)
- Remover toda a lógica de `update()` incremental. Sempre usar `setData()`.
- O `update()` é a fonte de todos os crashes. O custo de performance de `setData()` em 50-200 candles é negligível (~0.5ms).
- Preservar o visible range antes do `setData()` e restaurar depois para não causar "jump" visual.

```text
Antes:                          Depois:
┌──────────────────────┐       ┌──────────────────────┐
│ isNewCandle?          │       │ Sempre setData()     │
│  ├─ SIM → setData()  │  ──►  │ + preservar range    │
│  └─ NÃO → update()   │       │ + try/catch global   │
│       └─ CRASH! 💥    │       └──────────────────────┘
└──────────────────────┘
```

### 1.4 — Limpar markers ao trocar ativo (`CandlestickChart.tsx`)
- No início do useEffect de dados, se `candles.length === 0`, limpar todas as séries e markers e retornar cedo.
- Resetar `markersPrimitiveRef.current = null` quando o chart é recriado (já feito no cleanup, mas validar).

### 1.5 — Preservar zoom/pan range durante updates em tempo real
- Antes de `setData()`, capturar `chart.timeScale().getVisibleLogicalRange()`.
- Após `setData()`, restaurar com `chart.timeScale().setVisibleLogicalRange(savedRange)`.
- Isso resolve o "pulo" que faz parecer que as candles sumiram quando na verdade o viewport mudou.

---

## Fase 2: Expansão de Ativos (Forex + Novos Crypto)

### 2.1 — Adicionar pares Forex na lista de ativos (`trading-types.ts`)
Baseado nas imagens enviadas, adicionar todos os pares com seus payouts:

**Forex (27 pares):**
EUR/USD (86%), EUR/GBP (86%), AUD/JPY (86%), EUR/JPY (82%), GBP/USD (82%), AUD/CAD (82%), USD/CAD (82%), NZD/USD (86%), USD/JPY (82%), CAD/JPY (82%), CHF/JPY (82%), EUR/NZD (80%), AUD/CHF (80%), EUR/AUD (80%), GBP/CHF (80%), GBP/AUD (80%), GBP/JPY (80%), USD/CHF (80%), NZD/JPY (80%), EUR/CHF (80%), CAD/CHF (80%), EUR/CAD (80%), AUD/NZD (80%), AUD/USD (80%), NZD/CHF (80%), GBP/CAD (80%), GBP/NZD (80%), NZD/CAD (80%)

### 2.2 — Criar mapeamento Forex → Binance symbols (`binance-symbols.ts`)
- Para pares Forex, a Binance não tem dados nativos.
- Adicionar um tipo `DataSource = 'binance' | 'forex-api'` ao `CryptoAsset`.
- Para Forex, usar uma API gratuita como proxy: criar uma edge function que busca dados de uma API Forex (ex: exchangerate.host, Twelve Data free tier).

### 2.3 — Adaptar `useBinanceWebSocket` para suportar Forex
- Criar um hook `useForexData` separado ou adaptar o existente com um factory pattern.
- Para Forex, usar polling REST a cada 5s (não há WS gratuito para Forex).
- No `useTradingEngine`, detectar automaticamente a fonte correta pelo par.

### 2.4 — Atualizar `AssetSelector` com categorias
- Agrupar os ativos em "Crypto" e "Forex" no dropdown.
- Mostrar o payout ao lado de cada par.

### 2.5 — Atualizar o scanner multi-ativos (`use-multi-scanner.ts`)
- Expandir `ALL_PAIRS` para incluir os novos pares Forex.
- Para pares Forex, usar o mesmo mecanismo de polling REST.

---

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/hooks/use-binance-ws.ts` | Reset candles, guard de par, AbortController |
| `src/components/trading/CandlestickChart.tsx` | Remover `update()`, usar só `setData()`, preservar range |
| `src/lib/trading-types.ts` | Adicionar pares Forex, tipo DataSource |
| `src/lib/binance-symbols.ts` | Mapeamento Forex, factory de URLs |
| `src/components/trading/AssetSelector.tsx` | Categorias Crypto/Forex |
| `src/hooks/use-multi-scanner.ts` | Suporte a novos pares |
| `src/hooks/use-trading-engine.ts` | Detecção de fonte de dados por par |

---

## Ordem de Implementação

1. Fase 1 primeiro (estabilidade) — sem isso, novos ativos terão o mesmo problema
2. Fase 2 depois (expansão) — com o chart estável, adicionar ativos é seguro

