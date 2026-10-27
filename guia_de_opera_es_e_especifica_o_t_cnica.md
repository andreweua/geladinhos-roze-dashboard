# Geladinhos Gourmet da Roze — Guia Operacional & Atualizações

## 1. Resumo Técnico da IA (Para validação no Antigravity)

Copie e cole este bloco de texto diretamente no chat do **Antigravity** para verificar compatibilidade:

> **Pergunta para o Antigravity:**
>
> "Estou integrando chamadas REST à API do Google Gemini em uma aplicação React frontend e gostaria de validar se a plataforma suporta as seguintes configurações em produção:
>
> 1. **Modelo de Texto e Raciocínio de Negócios:**
>
>    * **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`
>
>    * **Uso:** Diagnóstico financeiro automatizado, cálculo de margem e chatbot de consultoria em confeitaria.
>
>    * **Payload:** `contents` com `parts.text` e suporte a `systemInstruction`.
>
> 2. **Modelo de Geração de Imagens Culinárias:**
>
>    * **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent`
>
>    * **Configuração:** `generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } }`
>
>    * **Resposta esperada:** Base64 inline em `candidates[0].content.parts[].inlineData.data` com `mimeType: "image/png"`.
>
> 3. **Tratamento de Erros e Autenticação:**
>
>    * Retry com backoff exponencial (1s, 2s, 4s) para contornar limites transitórios (`HTTP 429 / 503`).
>
>    * Injeção segura da `GEMINI_API_KEY` via variável de ambiente (`import.meta.env.VITE_GEMINI_API_KEY`).
>
> Esses modelos e payloads estão disponíveis e funcionais na sua infraestrutura atual?"

## 2. Protocolo de Versionamento e Atualização Contínua

### 2.1 Como me pedir atualizações nas próximas vezes

Para evitar mal-entendidos e garantir que alterações não quebrem o que já funciona, use o seguinte padrão de solicitação:

```
"Atualize o app para a versão [vX.Y.Z]:
- Mudança 1: [descreva a tela ou cálculo a alterar]
- Mudança 2: [adicione novo recurso]
Mantenha intacto: [o que não pode sumir]
Atualize a etiqueta de versão visível no rodapé e no Service Worker."

```

### 2.2 Critério de Versionamento Semântico (`vMAJOR.MINOR.PATCH`)

* **PATCH (`v1.0.1`):** Correções de bugs pontuais, ajuste de cores, texto ou layout sem alterar regras de negócio.

* **MINOR (`v1.1.0`):** Nova funcionalidade (ex: tela de lista de compras, novo filtro, novo relatório).

* **MAJOR (`v2.0.0`):** Mudança estrutural grande (ex: troca de banco de dados, login de múltiplos usuários, reescrita completa).

## 3. Solução para o PWA preso na versão antiga (Cache Invalidação)

O problema do PWA ou navegador exibir o número da versão nova mas continuar executando o código antigo ocorre porque o **Service Worker armazena em cache os arquivos `.js` e `.html` para funcionamento offline**.

### Por que acontece?

1. O navegador carrega o cache local primeiro (*Cache First*).

2. O Service Worker baixa a nova versão em segundo plano, mas **não substitui a tela atual** até que todas as abas sejam fechadas ou haja recarga forçada.

### Checklist de correção definitiva para o código:

1. **Versionar a chave de Cache no Service Worker:**

   ```
   const CACHE_NAME = 'geladinhos-cache-v1.1.0'; // Incrementar sempre a cada deploy
   
   ```

2. **Ativar o `skipWaiting` e `clients.claim`:**
   Força o Service Worker novo a assumir o controle imediatamente sem esperar o usuário fechar a aba:

   ```
   self.addEventListener('install', (event) => {
     self.skipWaiting();
   });
   });
   
   self.addEventListener('activate', (event) => {
     event.waitUntil(
       caches.keys().then((keys) =>
         Promise.all(
           keys.map((key) => {
             if (key !== CACHE_NAME) return caches.delete(key);
           })
         )
       ).then(() => self.clients.claim())
     );
   });
   
   ```

3. **Banner de Atualização com Botão "Recarregar":**
   Exibir um aviso no topo: *"Nova versão disponível! \[Atualizar Agora\]"*, executando `window.location.reload(true)`.

4. **Para o usuário no celular (PWA):**

   * No Chrome/Android: Deslizar para baixo com força duas vezes para forçar o recálculo do cache.

   * No iPhone (Safari): Ir em *Ajustes > Safari > Avançado > Dados dos Sites* e remover o cache do domínio se persistir.

## 4. Padrão Universal para Lista de Compras (Manual + Importação)

Este modelo foi desenhado para ser **portável para qualquer aplicativo** de confeitaria, restaurante, mercadinho ou gestão de estoque.

### 4.1 Regras de Negócio do Módulo

1. **Lista Independente:** Pode ser criada antes de qualquer compra ser efetuada.

2. **Fontes de Criação:**

   * **Manual:** Digitar o item, categoria, quantidade planejada e preço estimado.

   * **Automática por Estoque Crítico:** Botão *"Gerar da Falta de Freezer"* calcula ingredientes necessários para repor os geladinhos com estoque zerado ou abaixo do mínimo.

   * **Importação em Lote:** Leitura de arquivo CSV ou JSON padronizado.

3. **Status de Ciclo de Vida do Item:**

   * `pendente` (a comprar)

   * `carrinho` (marcado no supermercado)

   * `comprado` (lançado no custo e finalizado)

### 4.2 Modelo Padrão de Importação JSON

Qualquer aplicação sua que processe compras poderá consumir este formato:

```
{
  "versao_schema": "1.0",
  "lista_nome": "Reposição Semanal de Ingredientes",
  "data_planejada": "2026-10-30",
  "itens": [
    {
      "id_item": "ing-001",
      "nome": "Leite Condensado 395g",
      "categoria": "Laticínios",
      "quantidade": 12,
      "unidade": "un",
      "preco_estimado_unitario": 5.49,
      "prioridade": "alta",
      "fornecedor_sugerido": "Atacadista Central",
      "status": "pendente"
    },
    {
      "id_item": "ing-002",
      "nome": "Creme de Leite 200g",
      "categoria": "Laticínios",
      "quantidade": 15,
      "unidade": "un",
      "preco_estimado_unitario": 3.19,
      "prioridade": "alta",
      "fornecedor_sugerido": "Atacadista Central",
      "status": "pendente"
    },
    {
      "id_item": "ing-003",
      "nome": "Liga Neutra 100g",
      "categoria": "Confeitaria",
      "quantidade": 2,
      "unidade": "pct",
      "preco_estimado_unitario": 6.80,
      "prioridade": "media",
      "fornecedor_sugerido": "Casa do Confeiteiro",
      "status": "pendente"
    },
    {
      "id_item": "ing-004",
      "nome": "Saquinhos 6x24cm (Fardo c/ 1000)",
      "categoria": "Embalagens",
      "quantidade": 1,
      "unidade": "fardo",
      "preco_estimado_unitario": 34.00,
      "prioridade": "baixa",
      "fornecedor_sugerido": "Distribuidora de Plásticos",
      "status": "pendente"
    }
  ]
}

```

### 4.3 Modelo Padrão de Importação CSV (Planilhas Excel / Google Sheets)

Para que você ou qualquer pessoa possa criar a lista no Excel e subir no app:

```
nome;categoria;quantidade;unidade;preco_estimado_unitario;prioridade;fornecedor_sugerido
Leite Condensado 395g;Laticínios;12;un;5.49;alta;Atacadista Central
Creme de Leite 200g;Laticínios;15;un;3.19;alta;Atacadista Central
Liga Neutra 100g;Confeitaria;2;pct;6.80;media;Casa do Confeiteiro
Cacau em Pó 100% 500g;Confeitaria;1;pct;28.50;alta;Casa do Confeiteiro
Nutella Balde 3kg;Recheios;1;un;149.90;alta;Atacadista Central
Saquinhos 6x24cm;Embalagens;1;fardo;34.00;baixa;Distribuidora

```

#### Dicionário de Campos Obrigatórios:

* **`nome`** (Texto, obrigatório): Descrição clara do insumo ou embalagem.

* **`categoria`** (Texto, opcional): Laticínios, Frutas, Recheios, Embalagens, Higiene.

* **`quantidade`** (Numérico, obrigatório): Valor inteiro ou fracionado (ex: `2.5`).

* **`unidade`** (Texto, obrigatório): `un` (unidade), `kg` (quilos), `pct` (pacote), `cx` (caixa), `lt` (litro).

* **`preco_estimado_unitario`** (Numérico, opcional): Para cálculo prévio do orçamento total da ida ao supermercado.

* **`prioridade`** (Enum, opcional): `alta`, `media`, `baixa`.

* **`status`** (Padrão: `pendente`): Controla se já foi colocado no carrinho.