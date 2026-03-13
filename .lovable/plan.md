

## Atualização: Ativos da NovaDexy + Timeframe M1/M5

Baseado na screenshot, os ativos que você opera são exclusivamente cripto. Vou atualizar o sistema para refletir isso.

### Mudanças

**1. Atualizar lista de ativos cripto (`trading-types.ts`)**
Adicionar os ativos que faltam da sua corretora:
- Manter: BTC, LTC, BNB, XRP, ETH, SOL
- Adicionar: **ADA/USD** (Cardano), **DOGE/USD**, **XLM/USD** (Stellar)
- Atualizar preços base no `use-trading-engine.ts` para valores atuais da screenshot

**2. Adicionar lucro por ativo (`trading-types.ts`)**
Guardar o payout de cada ativo (83%, 86%, 98%, etc.) para exibir no seletor e calcular risco real.

**3. Seletor de Timeframe M1/M5 (`CandleCountdown.tsx` + `Index.tsx`)**
- Adicionar toggle M1/M5 na barra superior
- Countdown se adapta ao timeframe selecionado (1 min ou 5 min)
- O intervalo de atualização do engine muda conforme timeframe (mais rápido em M1)

**4. Atualizar AssetSelector**
- Mostrar payout ao lado de cada ativo (ex: "BTC/USD — 83%")
- Remover Forex e OTC (você opera apenas cripto)

### Arquivos modificados
| Arquivo | Mudança |
|---|---|
| `src/lib/trading-types.ts` | Novo array de cripto com payouts, remover forex/OTC |
| `src/hooks/use-trading-engine.ts` | Preços atualizados, intervalo M1/M5 |
| `src/components/trading/CandleCountdown.tsx` | Aceitar prop timeframe (1 ou 5) |
| `src/components/trading/AssetSelector.tsx` | Mostrar payouts, só cripto |
| `src/pages/Index.tsx` | State de timeframe, passar para componentes |

