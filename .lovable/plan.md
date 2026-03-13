

# Plano: Renomear timezone + Testes E2E e Integração

## 1. Renomear "Nova York" para "São Paulo" no MarketSession

O componente `MarketSession.tsx` lista sessões de mercado globais (Tóquio, Londres, Nova York). O usuário quer que o label "Nova York" seja substituído por "São Paulo" já que o timezone de referência é BRT. O horário da sessão (10:00-19:00 BRT) permanece o mesmo — só muda o nome exibido.

Também renomear "Overlap LDN/NY" para "Overlap LDN/SP".

**Arquivo**: `src/components/trading/MarketSession.tsx`
- Linha 31: `'Nova York'` → `'São Paulo'`
- Linha 35: `'Overlap LDN/NY'` → `'Overlap LDN/SP'`

---

## 2. Testes de Integração (Vitest)

Criar `src/test/market-session.test.ts` para validar a lógica `getActiveSessions()`:
- Extrair `getActiveSessions` como export nomeado para ser testável
- Testar que retorna sessões corretas para diferentes horas BRT (mockando `Date`)
- Verificar que "São Paulo" aparece no lugar de "Nova York"
- Verificar overlap LDN/SP entre 10-13h BRT

Criar `src/test/use-binance-ws.test.ts` para validar guarda de par:
- Testar que `setCandles([])` é chamado ao trocar de par
- Testar que mensagens WS de par anterior são descartadas

---

## 3. Teste E2E (Playwright)

Criar `e2e/chart-stability.spec.ts`:
- Navegar para a página principal
- Trocar de ativo no dropdown (BTC → ETH → EUR/USD)
- Verificar que o chart renderiza candles após cada troca
- Fazer zoom in/out e verificar que candles não desaparecem
- Verificar que o label "São Paulo" aparece no MarketSession

---

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/components/trading/MarketSession.tsx` | Renomear Nova York → São Paulo |
| `src/test/market-session.test.ts` | Novo — testes de integração da lógica de sessões |
| `e2e/chart-stability.spec.ts` | Novo — teste E2E de troca de ativos e zoom |

