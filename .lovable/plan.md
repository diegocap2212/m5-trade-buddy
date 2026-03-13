

## Plano: Configurar API Key do Twelve Data diretamente no código

### Situação
Você não consegue encontrar "Build Secrets" no Lovable. Isso pode acontecer por mudanças na UI ou por seu plano não incluir essa funcionalidade.

### Solução prática

A API key do Twelve Data é uma **chave pública** — ela já seria exposta no browser de qualquer forma (visível nas requisições de rede). Portanto, é seguro colocá-la diretamente no código.

O código já tem a função `setForexApiKey()` em `src/lib/forex-api.ts`. Basta chamá-la na inicialização do app.

### Implementação

**Editar `src/main.tsx`** — adicionar uma linha para configurar a API key na inicialização:

```typescript
import { setForexApiKey } from './lib/forex-api';
setForexApiKey('eddcaba6ff1e4077ad3d89a082658918');
```

Isso é tudo. Ao carregar o app, a key será configurada antes de qualquer componente renderizar, e o `use-forex-data.ts` já verifica via `getForexApiKey()` se há uma key disponível para buscar dados reais.

### Resultado esperado
- Badge no gráfico Forex muda de **SIMULADO** para **TWELVE DATA**
- Preços Forex passam a refletir dados reais (com ~15s de delay do free tier)
- Polling a cada 15s respeitando rate limit de 7 req/min

### Segurança
- A key do Twelve Data free tier é pública por natureza (chamada direto do browser)
- Se quiser mais segurança no futuro, podemos criar uma Edge Function como proxy

