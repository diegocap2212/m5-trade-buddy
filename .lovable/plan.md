

## Problema

Olhando o screenshot, dois problemas graves:

1. **Layout muito estreito** — o container usa `max-w-2xl` (672px), espremendo o gráfico e todos os componentes numa coluna minúscula para um monitor de 1336px.

2. **Markers empilhados e escala distorcida** — o backtest gera ~29 sinais, cada um com um marker (seta + texto). O `fitContent()` tenta encaixar todos, o que esmaga a escala de preço e empilha as setas verticalmente, tornando o gráfico ilegível.

## Solução

### 1. Layout responsivo mais largo (`src/pages/Index.tsx`)
- Trocar `max-w-2xl` por `max-w-7xl` e usar grid de 2 colunas em telas grandes: gráfico ocupa a coluna principal, painéis laterais (stats, risk, history) ficam ao lado.

### 2. Limitar markers visíveis no gráfico (`CandlestickChart.tsx`)
- Mostrar apenas os **últimos 10 sinais** como markers no gráfico (os mais recentes são os mais relevantes).
- Remover a chamada `fitContent()` a cada update — usar `scrollToRealTime()` para manter o foco nas velas recentes sem distorcer a escala.
- Simplificar o texto dos markers: só o símbolo `✓`/`✗` sem repetir "CALL"/"PUT" (a seta já indica a direção).

### 3. Escala de preço estável
- Configurar `rightPriceScale` com `autoScale: true` e `scaleMargins` para dar padding vertical, evitando que markers forcem zoom-out extremo.

### Arquivos modificados
- `src/pages/Index.tsx` — layout 2 colunas, max-w-7xl
- `src/components/trading/CandlestickChart.tsx` — limitar markers, scrollToRealTime, simplificar texto, ajustar escala

