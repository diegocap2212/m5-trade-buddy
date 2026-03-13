

# Plano: Manter Banner de Oportunidade ao Trocar de Ativo

## Problema

Quando o usuário clica "ABRIR" no banner de oportunidade:
1. `setSelectedAsset(opp.asset)` muda o ativo ativo
2. `useMultiScanner` tem um `useEffect` que filtra `opportunities` removendo qualquer item onde `asset === activeAsset`
3. O banner some instantaneamente — o usuário perde a informação de direção, confiança, RSI, pattern

## Solução

Adicionar um estado `activeOpportunity` no `Index.tsx` que captura a oportunidade selecionada antes de trocar o ativo. Exibir essa oportunidade como um banner "fixo" (pinned) no topo, com um estilo levemente diferente (indicando "ativo atual"), até que:
- O usuário feche manualmente (X)
- Um novo sinal seja gerado pelo trading engine
- 60 segundos passem (auto-dismiss)

### Mudanças

**`src/pages/Index.tsx`**:
- Novo state: `activeOpportunity: ScannerOpportunity | null`
- No `onSwitchAsset`, antes de `setSelectedAsset`, salvar a oportunidade em `activeOpportunity`
- Renderizar o `activeOpportunity` como um banner fixo acima do `OpportunityBanner`
- Auto-limpar após 60s ou quando `currentSignal` mudar para non-WAIT

**`src/components/trading/OpportunityBanner.tsx`**:
- Adicionar prop opcional `pinnedOpportunity` e `onDismissPinned`
- Renderizar o pinned primeiro, com badge "ATIVO ATUAL" e estilo com borda mais forte
- Manter todos os dados visíveis: ativo, direção, confiança, RSI, pattern

### Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/pages/Index.tsx` | State `activeOpportunity`, handler de switch, auto-dismiss |
| `src/components/trading/OpportunityBanner.tsx` | Prop `pinnedOpportunity`, renderização do banner fixo |

