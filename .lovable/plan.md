

## Plano: Sinal de Entrada com Horários Claros (Entrada + Martingale)

### Conceito

Quando um sinal CALL/PUT é detectado, o sistema calcula automaticamente:
- **Horário de entrada**: 1 segundo antes do fechamento da vela atual (ex: se a vela M5 fecha às 14:35:00, entrada às 14:34:59)
- **Horário do Martingale**: caso perca, a próxima vela (ex: entrada Martingale às 14:39:59 em M5)

### O que será feito

**1. Novo componente `EntryTimer`**
- Exibido dentro do banner de sinal ativo no gráfico (canto direito)
- Mostra: `ENTRADA 14:34:59` com countdown pulsando nos últimos 5 segundos
- Se Martingale ativo: `MG1 14:39:59` em amarelo abaixo
- Quando chega no momento da entrada (1s antes do close), flash verde/vermelho forte por 3 segundos como alerta visual

**2. Modificações no `CandlestickChart.tsx`**
- Expandir o banner de sinal ativo para incluir os horários de entrada no lado direito
- Calcular `entryTime` = próximo fechamento de vela - 1 segundo baseado no timeframe
- Calcular `martingaleTime` = entryTime + intervalo do timeframe (se consecutiveLosses === 1)

**3. Modificações no `use-trading-engine.ts`**
- Adicionar `entryTime` e `martingaleTime` ao retorno do hook
- Calcular baseado no timeframe atual (M1 = +60s, M5 = +300s)

**4. Props adicionais**
- Passar `timeframe` e `consecutiveLosses` para o `CandlestickChart` para que ele calcule e exiba os horários

### Exemplo visual do banner

```text
┌─────────────────────────────────────────────────────────────────┐
│ ▲ CALL │ 85% confiança │ EMA Cross    │  ENTRADA 14:34:59  ⏱ 00:23 │
│        │                │              │  MG1     14:39:59  (se loss) │
└─────────────────────────────────────────────────────────────────┘
```

Nos últimos 5 segundos antes da entrada, o horário pisca e muda de cor para chamar atenção máxima.

### Arquivos modificados
- `src/components/trading/CandlestickChart.tsx` — banner com horários
- `src/hooks/use-trading-engine.ts` — cálculo dos horários
- `src/pages/Index.tsx` — passar timeframe e consecutiveLosses ao chart

