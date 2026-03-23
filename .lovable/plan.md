

## Plano: Expandir para Martingale 2 (MG2)

### Contexto atual
- Hoje: entrada base → se LOSS, MG1 (1x) → se LOSS MG1, **para**
- Win rate considerando MG1 já é elevado (cada sinal tem 2 chances de acertar)
- Proposta: entrada base → MG1 → MG2 → se LOSS MG2, **stop do dia**

### Análise de viabilidade

**Matemática do MG2:**
Com payout médio de 85%, a sequência de entradas seria:
- Base: 2% do capital (ex: $20 em banca de $1000)
- MG1: recuperar $20 + lucro → ~$34.12
- MG2: recuperar $20 + $34.12 + lucro → ~$81.55

Risco máximo por ciclo: $20 + $34.12 + $81.55 = **$135.67** (~13.6% da banca)

**Win rate teórico:** Se cada vela tem ~50% de chance de acertar a direção, 3 tentativas dão ~87.5% de win. Com o filtro de exaustão (sinais já filtrados), pode chegar a **92-95%**.

**Risco:** Um único ciclo MG2 perdido consome ~13.6% da banca. Dois ciclos perdidos no mesmo dia = ~27%. Por isso o stop após 1 loss MG2 é essencial.

### Implementação

**1. Expandir tipos e engine (`trading-types.ts` + `use-trading-engine.ts`)**
- Adicionar `ResultDetail`: `WIN_MG2` e `LOSS_MG2`
- Validação passa a ter 3 fases: direto → MG1 → MG2
- `consecutiveLosses` agora vai até 3 (0=base, 1=MG1, 2=MG2, 3=stop)
- Pendência rastreia fase atual (`phase: 'DIRECT' | 'MG1' | 'MG2'`)

**2. Atualizar gestão de risco (`RiskManager.tsx`)**
- Calcular e exibir 3 entradas: Base, MG1, MG2
- Grid de 3 colunas com valores
- Stop condition: loss MG2 = stop do dia (não mais loss MG1)
- Exibir risco total do ciclo (soma das 3 entradas)

**3. Atualizar stats (`SessionStats.tsx` + `SignalHistory.tsx`)**
- Adicionar colunas Win MG2 e Loss MG2
- P&L considera 3 níveis de entrada
- Grid passa de 4 para 6 categorias (ou 2x3)

**4. Backtest (`signal-engine.ts`)**
- Validação usa candle i+1 (direto), i+2 (MG1), i+3 (MG2)
- Stats expandidos com `winsMG2` e `lossesMG2`
- Cooldown aumenta para 4 candles após sinal
- Mínimo de candles sobe de 23 para 24

**5. Marcadores no gráfico (`CandlestickChart.tsx`)**
- Fase MG2 ganha marcador próprio (ex: cor laranja)
- Resultado final no candle i+3 se necessário

**6. Scanner e banner**
- Sem mudança de lógica — o scanner detecta oportunidades, o MG2 é interno ao ciclo de validação

### Arquivos impactados

| Arquivo | Mudança |
|---|---|
| `src/lib/trading-types.ts` | Novos `ResultDetail` valores |
| `src/hooks/use-trading-engine.ts` | Fase MG2 na validação |
| `src/lib/signal-engine.ts` | Backtest com 3 fases |
| `src/components/trading/RiskManager.tsx` | Exibir 3 níveis de entrada + risco total |
| `src/components/trading/SessionStats.tsx` | Stats MG2 |
| `src/components/trading/SignalHistory.tsx` | Labels MG2 |
| `src/components/trading/CandlestickChart.tsx` | Marcadores MG2 |
| `src/test/signal-lifecycle.test.ts` | Testes MG2 |

### Proteção de banca (regras)
- Loss MG2 = **stop imediato do dia** (banner vermelho permanente)
- Exibir risco total do ciclo em andamento (Base + MG1 + MG2)
- Alerta visual quando entrar em fase MG2 (banner laranja pulsante)
- Entrada base reduzida de 2% para **1%** do capital (recomendação, configurável) para manter risco do ciclo abaixo de 7%

