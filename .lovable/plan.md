

## Plano: Página de Relatório de Operações com Export CSV

### O que será construído

Uma nova página `/relatorio` com todas as suas operações hardcoded (os dados que você forneceu), exibindo:

1. **Tabela completa de operações** — Data, Horário, Ativo, Tipo, Entrada, Saída, Resultado, Status (WIN/LOSS/ZERO)
2. **Dashboard de resumo** — Total investido, total retornado, lucro líquido, win rate, quantidade de operações
3. **Análise por ativo** — Ranking de performance por ativo (lucro total, win rate, número de operações)
4. **Análise por período** — Performance por dia da semana e por horário
5. **Equity Curve** — Gráfico de linha (Recharts) mostrando evolução do saldo acumulado
6. **Botão de export CSV** — Gera e baixa um arquivo `.csv` com todos os dados (abre direto no Excel)

### Arquivos

1. **`src/lib/operations-data.ts`** — Array tipado com todas as ~500+ operações parseadas dos dados fornecidos, filtrando linhas vazias, depósitos e saques. Cada entrada terá: `date, hour, asset, type, entry, exit, result, status`.

2. **`src/pages/Report.tsx`** — Página principal com:
   - Header com navegação de volta ao HUD
   - Cards de resumo (total ops, win rate, lucro líquido, maior gain, maior loss)
   - Tabs: "Operações" | "Por Ativo" | "Por Horário" | "Equity Curve"
   - Tabela paginada com ScrollArea
   - Gráficos com Recharts (já instalado)
   - Botão "Exportar CSV" que gera download client-side

3. **`src/App.tsx`** — Adicionar rota `/relatorio`

4. **`src/pages/Index.tsx`** — Adicionar link/botão no header para acessar o relatório

### Detalhes técnicos

- Dados hardcoded (sem backend) — parseados e normalizados (ex: "solano" → "Solana", "Etherium" → "Ethereum")
- Operações marcadas como depósito/saque serão separadas e contabilizadas à parte
- CSV gerado via `Blob` + `URL.createObjectURL` para download direto
- Equity curve calculada como soma cumulativa dos resultados líquidos
- Filtros de depósito/saque/retirada excluídos das métricas de trading

