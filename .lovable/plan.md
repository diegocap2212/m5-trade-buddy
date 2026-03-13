

## Trading HUD - Painel de Sinais M5 para Opções Binárias

### Visão Geral
Um painel compacto, dark mode, estilo HUD de piloto, que acompanha sua tela de trade e exibe sinais de entrada (CALL/PUT) em tempo real baseados em Suporte/Resistência + padrões de velas no timeframe M5. Conectado a uma API de mercado para dados ao vivo, com histórico persistente de resultados.

### Design
- **Fundo escuro** (#121212/#1E1E1E) para não cansar a vista e combinar com plataformas de trade
- **Tipografia monospace** (JetBrains Mono) para números e preços — sem jitter visual
- **Sinais em cores de alta visibilidade**: Verde neon (CALL), Vermelho vibrante (PUT), Âmbar (AGUARDAR)
- **Layout compacto tipo widget**, não tela cheia

### Estrutura da Interface

**1. Barra Superior**
- Seletor de par ativo (Forex + OTC)
- Countdown até o fechamento do candle M5 atual (ex: "03:42")
- Status de conexão com a API

**2. Área Central — O Sinal**
- Card grande e impossível de ignorar com o sinal atual: **AGUARDAR**, **PREPARAR CALL**, **ENTRAR PUT**
- Nível de confiança do sinal (baseado em confluência de indicadores)
- Preço atual e níveis de suporte/resistência relevantes

**3. Painel Inferior — Histórico de Sinais**
- Lista dos últimos 10 sinais com resultado (WIN/LOSS/PENDENTE)
- Taxa de acerto da sessão e geral
- Filtro por par ativo

### Backend (Lovable Cloud + Supabase)

**Tabelas:**
- `signals` — registro de cada sinal gerado (par, direção, timestamp, preço entrada, resultado)
- `trading_sessions` — sessões com estatísticas agregadas

**Edge Function:**
- Conectar à API de mercado (ex: Deriv API via WebSocket) para receber candles M5 em tempo real
- Processar lógica de sinais: identificar suportes/resistências e padrões de velas
- Retornar sinal processado para o frontend

### Lógica de Sinais (Suporte/Resistência + Candle Patterns)
- Detectar zonas de suporte e resistência baseadas nos últimos N candles
- Identificar padrões de reversão (engolfo, pin bar, doji) nessas zonas
- Gerar sinal CALL em suporte + padrão de alta, PUT em resistência + padrão de baixa
- AGUARDAR quando não há confluência clara

### Próximos Passos
- Após implementação inicial, você cola seu estudo do NotebookLM para refinarmos a estratégia
- Configuração da API de dados de mercado (Deriv ou outra)

