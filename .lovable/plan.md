

## Problema Identificado

O motor atual recalcula o sinal **a cada tick do WebSocket** (varias vezes por segundo). Como o scoring por confluência é instável, ele alterna entre CALL 95% e PUT 95% constantemente. Isso acontece porque qualquer micro-movimento no preço muda os pesos de bull vs bear.

## Plano: Motor de Reversão por Exaustão + Trava de Sinal

Baseado na sua pesquisa com o Gemini, vamos substituir a lógica do motor por uma estratégia de **Reversão de Exaustão** (preço fora das Bandas de Bollinger + RSI extremo), que gera poucos sinais mas com alta assertividade. Além disso, vamos travar o sinal por vela e validar o resultado com preço real.

### 1. Nova lógica de sinal (`signal-engine.ts`)

Substituir o scoring por confluência pela estratégia de reversão:
- **CALL**: preço fecha abaixo da Bollinger inferior (desvio 2.0) **E** RSI < 35
- **PUT**: preço fecha acima da Bollinger superior **E** RSI > 65
- Confiança calculada pela intensidade da penetração na banda + extremidade do RSI
- Mantém EMA200, suporte/resistência e padrões como dados informativos (não decisórios)

### 2. Trava de sinal por vela (`use-trading-engine.ts`)

O problema principal: o sinal muda a cada tick. Solução:
- Guardar o `timestamp` da vela que gerou o sinal
- Só permitir novo sinal quando uma **nova vela** se formar (timestamp diferente)
- Isso impede flip-flop dentro da mesma vela

### 3. Validação real de resultado (`use-trading-engine.ts`)

Em vez de `Math.random()` para decidir WIN/LOSS:
- Guardar o preço de entrada do sinal
- Quando a **próxima vela fechar**, comparar: se CALL e `close > entryPrice` = WIN, senão LOSS
- Para MG1: se perdeu a primeira, verificar a vela seguinte

### 4. Estatísticas MG1 separadas (`SessionStats.tsx` + `use-trading-engine.ts`)

Adicionar tracking de:
- **Wins diretos**: acertou na primeira vela
- **Wins MG1**: errou a primeira, acertou na segunda
- **Losses reais**: errou as duas
- **WR Final**: (wins diretos + wins MG1) / total

### Arquivos modificados

- `src/lib/signal-engine.ts` — nova lógica de reversão por exaustão
- `src/hooks/use-trading-engine.ts` — trava de sinal + validação real + stats MG1
- `src/components/trading/SessionStats.tsx` — exibir wins diretos, wins MG1, losses reais

### Resultado esperado

- Sinais raros e estáveis (não muda a cada segundo)
- Taxa de acerto base ~55-60%, com MG1 potencialmente ~75-80%
- Estatísticas reais baseadas em preço, não em random

