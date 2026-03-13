

## Integração Binance WebSocket — Dados em Tempo Real

### Resumo

Substituir os dados simulados (mock candles) por preços reais via WebSocket da Binance. Os sinais do motor de confluência passarão a ser baseados em dados de mercado reais.

### Arquitetura

```text
Binance WebSocket ──► useBinanceWebSocket hook ──► CandleData[] ──► analyzeMarket() ──► Signal
   (wss://stream.binance.com)                        (real OHLCV)      (3-layer engine)
```

### O que será criado/modificado

| Arquivo | Ação |
|---|---|
| `src/hooks/use-binance-ws.ts` | **Criar** — Hook WebSocket para Binance kline streams |
| `src/lib/binance-symbols.ts` | **Criar** — Mapeamento NovaDexy pair → Binance symbol |
| `src/hooks/use-trading-engine.ts` | **Modificar** — Usar dados reais em vez de mock candles |
| `src/components/trading/ConnectionStatus.tsx` | **Modificar** — Refletir estado real do WebSocket |

### Detalhes técnicos

**1. Mapeamento de símbolos** (`binance-symbols.ts`)
- `BTC/USD` → `btcusdt`, `ETH/USD` → `ethusdt`, `SOL/USD` → `solusdt`, etc.
- Todos os 9 ativos mapeados

**2. Hook WebSocket** (`use-binance-ws.ts`)
- Conecta a `wss://stream.binance.com:9443/ws/{symbol}@kline_{interval}`
- `interval` = `1m` para M1, `5m` para M5
- Converte cada kline message em `CandleData` (open, high, low, close, volume, timestamp)
- Mantém buffer de ~40 candles para alimentar os indicadores
- Reconexão automática em caso de desconexão
- Sem autenticação necessária (dados públicos)

**3. Integração no engine** (`use-trading-engine.ts`)
- Remover `generateMockCandle()` 
- Receber candles reais do hook Binance
- O motor de confluência (`analyzeMarket`) continua idêntico — só muda a fonte de dados
- Fallback para dados simulados se o WebSocket falhar

**4. Status de conexão real**
- ConnectionStatus mostra se o WebSocket está conectado/desconectado/reconectando

### Limitações
- A execução de operações continua manual na NovaDexy
- Pequenas diferenças de preço entre Binance e NovaDexy são possíveis (spreads diferentes)
- Rate limit da Binance: sem preocupação para dados públicos de kline

