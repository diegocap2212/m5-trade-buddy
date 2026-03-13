

## Plano: Botão Travar/Destravar Auto-Scroll do Gráfico

### Problema
A cada atualização de velas, o gráfico chama `scrollToRealTime()` (linha 307), forçando a viewport a voltar para a vela mais recente. Isso impede a navegação livre pelo histórico.

### Solução
Adicionar um estado `locked` (auto-scroll ativo) com um botão de toggle no header do gráfico. Quando destravado, o `scrollToRealTime()` é ignorado, permitindo navegar livremente.

### Mudanças em `CandlestickChart.tsx`

1. **Estado `autoScroll`** — `useState(true)` para controlar se o gráfico segue o tempo real.

2. **Condicionar o `scrollToRealTime()`** — Linha 307: só chamar quando `autoScroll === true`.

3. **Botão no header** — Ícone de cadeado (Lock/Unlock do lucide-react) ao lado da legenda, com tooltip indicando o estado. Ao clicar, alterna `autoScroll`.

4. **Detecção automática** — Usar o evento `timeScale().subscribeVisibleLogicalRangeChange()` para detectar quando o usuário arrasta o gráfico manualmente e automaticamente destravar. Quando o usuário clicar no botão para travar novamente, volta ao auto-scroll.

### Visual
- 🔒 Travado (auto-scroll ON) — ícone Lock, cor primária
- 🔓 Destravado (auto-scroll OFF) — ícone Unlock, cor muted, com badge sutil "Livre"

