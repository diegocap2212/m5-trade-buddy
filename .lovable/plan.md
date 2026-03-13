

# Plano: Fix Chart Blank para Crypto + Info no Banner + Fix Timer Delay

## Problemas Identificados no Teste E2E

### Bug 1: Gráfico BTC/USD (crypto) totalmente em branco
O gráfico renderiza normalmente para Forex (CAD/CHF) mas fica **completamente vazio** para crypto (BTC/USD) apesar do status LIVE e dados WS chegando normalmente.

**Causa raiz**: A função `toChartTime()` usa `new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))`. O `new Date()` interpreta a string no timezone *local do browser*. Se o browser roda em UTC (como no servidor/preview), o resultado é um offset duplo. Para candles Binance com timestamps UTC, os timestamps ficam corrompidos.

Além disso, o `dedupeLineData` usa Map por time key — se a conversão gera valores colapsados, dados são perdidos.

**Fix correto**: Calcular o offset BRT de forma determinística sem depender do timezone do browser:

```typescript
export function toChartTime(ts: number) {
  // BRT = UTC-3, offset fixo em segundos
  const BRT_OFFSET = -3 * 3600;
  return Math.floor(ts / 1000) + BRT_OFFSET as any;
}
```

Isso é simples, correto e não depende de `toLocaleString`. O lightweight-charts interpretará os timestamps como "UTC" mas os valores já estarão em BRT.

**Arquivo**: `src/components/trading/CandlestickChart.tsx` — função `toChartTime` (linhas 18-23)

### Bug 2: Banner falta timeframe e horário de entrada
O banner de oportunidade mostra ativo, direção, confiança, RSI e pattern, mas **não mostra**:
- Timeframe ativo (M1/M5)
- Horário da vela de entrada (1s antes do fechamento)

**Fix**: Adicionar ao `OpportunityItem`:
- Badge do timeframe atual
- Horário de entrada calculado: `Math.ceil(Date.now() / intervalMs) * intervalMs - 1000`

Precisamos passar `timeframe` como prop para o `OpportunityBanner`.

**Arquivos**:
- `src/components/trading/OpportunityBanner.tsx` — adicionar prop `timeframe`, renderizar badge M1/M5 e horário de entrada
- `src/pages/Index.tsx` — passar `timeframe` para `OpportunityBanner`

### Bug 3: Delay de 2-3s no countdown
O countdown em `CandleCountdown.tsx` usa `setInterval(updateCountdown, 1000)` com `new Date()`. O intervalo de 1s do `setInterval` **não é sincronizado** com a virada real do segundo — cada tick pode acumular drift de até 50ms, resultando em 2-3s de atraso acumulado após alguns minutos.

**Fix**: Usar `requestAnimationFrame` ou um intervalo mais curto (200ms) para garantir precisão, e calcular o countdown baseado em `Date.now()` em cada tick (o que já faz), mas o problema real é que `setInterval(fn, 1000)` pode disparar tarde. Trocar para 250ms resolve o drift visível.

**Arquivo**: `src/components/trading/CandleCountdown.tsx` — trocar `setInterval` de 1000ms para 250ms

### Bug 4: Warning de ref em OpportunityItem
Console mostra "Function components cannot be given refs" no `OpportunityBanner`. Provavelmente algum componente interno está recebendo ref.

**Arquivo**: `src/components/trading/OpportunityBanner.tsx` — verificar se há ref leak

### Bug 5: Timezone errado no eixo X do gráfico Forex
O gráfico Forex mostra "21:45" quando deveria mostrar ~15:23 BRT. O fix do `toChartTime` com offset fixo resolverá isso também.

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/components/trading/CandlestickChart.tsx` | Fix `toChartTime` com offset BRT fixo |
| `src/components/trading/OpportunityBanner.tsx` | Adicionar timeframe + horário de entrada no banner |
| `src/components/trading/CandleCountdown.tsx` | Reduzir intervalo para 250ms |
| `src/pages/Index.tsx` | Passar `timeframe` para OpportunityBanner |
| `src/test/chart-timezone.test.ts` | Atualizar teste para nova lógica |

