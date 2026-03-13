

## Diagnóstico: Por que os gráficos Forex não batem com a realidade

### Problema raiz identificado

**Os gráficos de Forex (EUR/JPY, AUD/CHF, etc.) são 100% simulados com `Math.random()`.** Não existe conexão com nenhuma API real de cotações Forex. O arquivo `forex-candle-cache.ts` gera velas fictícias a partir de preços-base hardcoded, e o `use-forex-data.ts` atualiza essas velas com movimentos aleatórios a cada 3 segundos.

Isso explica:
- Preços que não batem com sua corretora
- Padrões de vela que não existem no mercado real
- Sinais gerados sobre dados falsos (entrada em "cilada")
- EUR/JPY mostrando ~162.50 fixo enquanto o mercado real pode estar em outro valor

**Os gráficos de Crypto (BTC, ETH, SOL, etc.) usam dados reais da Binance via WebSocket e REST API** — esses devem estar corretos.

### Quanto ao timing/horário

O eixo X do gráfico aplica offset BRT (UTC-3) fixo. Os timestamps das velas Binance (crypto) vêm em UTC e são convertidos corretamente. Os timestamps Forex são gerados localmente com `Date.now()`, então o alinhamento de horário está correto — o problema é exclusivamente de **preço/dados**, não de timing.

---

### Plano de correção

#### 1. Integrar API real de Forex (Twelve Data - free tier)
- **Twelve Data** oferece OHLC candles para Forex com tier gratuito (8 req/min, 5000/dia)
- Endpoint: `https://api.twelvedata.com/time_series?symbol=EUR/JPY&interval=1min&outputsize=50&apikey=KEY`
- Funciona direto do browser (CORS habilitado)
- Criar `src/lib/forex-api.ts` com função para buscar candles reais
- Guardar API key como variável de ambiente (secret)

#### 2. Substituir simulação por polling real em `use-forex-data.ts`
- Na inicialização: buscar 50 candles históricos da API
- Polling a cada 15-30s para atualizar a vela atual (respeitando rate limit de 8/min)
- Fallback: se API falhar, manter última série conhecida (não gerar dados aleatórios)
- Exibir status "API LIMITADA" se rate limit for atingido

#### 3. Ajustar scanner (`use-multi-scanner.ts`)
- Scanner Forex passa a ler snapshot do cache alimentado pela API real
- Reduzir frequência de scan para Forex (a cada 60s ao invés de a cada 30s) para não estourar rate limit
- Priorizar pares que o usuário está visualizando

#### 4. Indicador visual de fonte de dados
- Adicionar badge no gráfico: "BINANCE LIVE" (crypto) vs "TWELVE DATA" (forex) vs "SIMULADO" (fallback)
- Usuário saberá imediatamente se está vendo dados reais ou não

#### 5. Validação de/para
- Adicionar no header do gráfico o preço atual com timestamp UTC e BRT lado a lado
- Permite comparação rápida com a plataforma de trading

### Arquivos impactados
- **Novo**: `src/lib/forex-api.ts` (client para Twelve Data)
- **Editar**: `src/hooks/use-forex-data.ts` (substituir simulação por API real)
- **Editar**: `src/hooks/use-multi-scanner.ts` (usar dados reais no scan)
- **Editar**: `src/components/trading/CandlestickChart.tsx` (badge de fonte + preço/hora)
- **Editar**: `src/lib/forex-candle-cache.ts` (cache agora armazena dados reais)

### Pré-requisito
- Preciso que você conecte uma API key do Twelve Data (gratuita em twelvedata.com) como secret do projeto. Posso prosseguir com a estrutura e deixar o fallback funcionando enquanto isso.

### Alternativa sem API key
Se preferir não usar API externa agora, posso pelo menos:
- Marcar claramente todos os gráficos Forex como "DADOS SIMULADOS" 
- Focar sinais apenas nos 9 pares Crypto (dados reais Binance)
- Desabilitar sinais Forex até ter dados reais

