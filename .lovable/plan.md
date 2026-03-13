

## Upgrade do Motor de Sinais — Estratégia Completa do Estudo

Seu estudo é extremamente detalhado. Vou incorporar os conceitos-chave no motor de sinais, transformando-o de um detector simples de S/R + padrões em um **sistema de 3 camadas com confluência múltipla**.

### O que muda

**1. Novos indicadores no motor (`src/lib/trading-indicators.ts`)**
- **EMA 9, 21, 200** — viés macro (Bull/Bear via EMA200) + cruzamentos de momentum
- **RSI (7 períodos)** — detecção de sobrecompra/sobrevenda para M5
- **Estocástico (5,3,3)** — gatilho de reversão rápida
- **VWAP simulado** — âncora de valor (calculado sobre os candles da sessão)
- **Bollinger Bands** — detecção de squeeze/compressão para rompimentos
- **ATR** — volatilidade para normalizar momentum

**2. Sistema de confluência de 3 camadas (`src/lib/signal-engine.ts`)**
Seguindo o framework do estudo:
- **Camada 1 — Viés Macro**: EMA 200 define se estamos Bull ou Bear. Sinais contra o viés são penalizados.
- **Camada 2 — Zona de Interesse**: Preço em zona de S/R, próximo da VWAP, ou tocando EMA 21/Bollinger Band.
- **Camada 3 — Gatilho**: Padrão de vela (Engolfo, Martelo, Doji) + cruzamento Estocástico ou RSI extremo.

Confiança = soma ponderada das confluências. Só gera CALL/PUT com 2+ camadas confirmando.

**3. Tipos atualizados (`src/lib/trading-types.ts`)**
- Adicionar `volume` ao `CandleData`
- Adicionar campos ao `TradingSignal`: `ema200Bias`, `rsi`, `stochastic`, `confluences` (lista de razões textuais)

**4. UI — Painel de confluências no SignalCard**
- Mostrar as razões do sinal (ex: "EMA200 Bull + Martelo em Suporte + RSI < 30")
- Indicador visual de viés macro (Bull/Bear badge)
- RSI e Estocástico como mini-gauges

**5. Gestão de risco na UI (`src/components/trading/RiskManager.tsx`)**
- Input do capital total
- Calculadora de 1% por operação
- Contador de perdas consecutivas (stop após 3 losses = alerta visual)
- Alerta de "stop diário" ao atingir 3% de drawdown

**6. Indicador de sessão de mercado**
- Mostrar sessão ativa (Londres/NY/Ásia) com qualidade estimada
- Alerta quando estiver fora de horário ideal para scalping

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `src/lib/trading-indicators.ts` | **Criar** — funções puras: EMA, RSI, Stochastic, VWAP, Bollinger, ATR |
| `src/lib/signal-engine.ts` | **Criar** — motor de 3 camadas com confluência |
| `src/lib/trading-types.ts` | **Modificar** — novos campos |
| `src/hooks/use-trading-engine.ts` | **Modificar** — usar novo signal engine |
| `src/components/trading/SignalCard.tsx` | **Modificar** — mostrar confluências e indicadores |
| `src/components/trading/RiskManager.tsx` | **Criar** — painel de gestão de risco |
| `src/components/trading/MarketSession.tsx` | **Criar** — indicador de sessão |
| `src/pages/Index.tsx` | **Modificar** — adicionar RiskManager e MarketSession |

### Lógica de geração de sinal (pseudocódigo)

```text
1. Calcular EMA200 → definir bias (BULL se price > EMA200, BEAR se abaixo)
2. Calcular EMA9, EMA21, RSI(7), Stoch(5,3,3), VWAP, Bollinger
3. Detectar padrão de vela (Engolfo, Martelo, Doji, Spring)
4. Coletar confluências:
   - Preço em zona S/R? (+20 confiança)
   - Padrão de vela? (+15)
   - RSI extremo (<30 ou >70)? (+15)
   - Stoch cruzamento? (+10)
   - VWAP rejection? (+15)
   - Bollinger touch? (+10)
   - Alinhado com EMA200 bias? (+15)
5. Se confluências >= 2 e alinhado com bias → CALL ou PUT
6. Senão → WAIT
```

Os dados continuam simulados, mas a lógica agora reflete fielmente o framework de 3 camadas do seu estudo.

