# Changelog

Todas as alterações notáveis deste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico (SemVer)](https://semver.org/lang/pt-BR/).

---

## [1.9.0] - 2026-10-20

### Adicionado & Aprimorado
- **Pré-Cadastro Regional: Jaú (SP) e Três Pontas (MG)**:
  - Estabelecimentos pré-cadastrados com endereços físicos completos, canais eletrônicos oficiais (sites, e-commerce, WhatsApp) e telefones de contato:
    - **Jaú - SP**: *Jaú Serve Supermercados (Loja Centro)*, *Atacadão Jaú*, *Tenda Atacado Jaú* e *Jaú Embalagens & Confeitaria*.
    - **Três Pontas - MG**: *Mart Minas Atacado & Varejo (Sul de Minas)*, *Supermercado Moacyr (Centro)* e *Alvorada Supermercados*.
- **Novo Tipo de Estabelecimento: "Atacado e Varejo" (Atacarejos)**:
  - Inclusão do tipo oficial **"Atacado e Varejo"** no seletor de estabelecimentos, contemplando grandes atacarejos como o *Mart Minas*, *Atacadão* e *Tenda Atacado*.
- **Controle de Validade de Ofertas & Radar Histórico Anti-Inflação**:
  - Campo obrigatório **"Validade da Oferta"** em todas as cotações de preços.
  - **Bloqueio de Preços Expirados na Data Atual**: Se a validade já passou, o sistema não deixa a oferta aparecer como o preço real de hoje e impede que ela vença como o menor preço vigente.
  - **Histórico Completo & Radar de Inflação**: Ofertas expiradas são preservadas no banco para traçar a evolução histórica de preços ($\Delta\%$ inflação acumulada ao longo dos meses e anos).
  - **Inteligência de Compra ("Oportunidade de Estocar")**: Quando uma cotação vigente está $\ge 12\%$ a $15\%$ mais barata que a média histórica, o sistema aciona automaticamente o alerta: `🔥 Oportunidade de Estocar: O preço atual está X% abaixo da média histórica! Excelente momento para abastecer o estoque e blindar o lucro.`
- **Gestão Contábil de Insumos: Custo de Reposição vs. Custo Médio Ponderado (CMP)**:
  - Adicionado modal interativo e didático ao aplicar os preços pagos de cupons/notas fiscais:
    - **Opção 1 — Custo de Reposição Atual (Recomendado para Precificação)**: Aplica o valor da última compra real para garantir que o faturamento de cada geladinho cubra o valor que o supermercado cobrará amanhã para repor os insumos, evitando descapitalização.
    - **Opção 2 — Custo Médio Ponderado (CMP)**: Pondera o saldo de insumos antigos em estoque com o novo lote que acabou de entrar, diluindo custos de compras volumosas em promoção.

---

## [1.8.0] - 2026-10-20

### Adicionado & Aprimorado
- **Limpeza Completa de Dados Fictícios (100% Dados Reais)**:
  - Eliminação de todas as vendas sintéticas/aleatórias e clientes fictícios gerados para demonstração inicial.
  - As vendas agora refletem estritamente operações reais lançadas pela Rozana no Frente de Caixa (PDV).
  - Preservação integral dos 8 sabores e fichas técnicas reais de 150ml dos cadernos oficiais da confeitaria (*Doce de Leite Itambé, Ninho com Nutella, Ninho com Brigadeiro 50%, Mousse de Maracujá c/ Geleia, Delícia de Ovomaltine, Romeu e Julieta, Cheesecake Frutas Vermelhas e Ninho c/ Geleia de Morango*).
  - Banner informativo de validação: "Modo 100% Dados Reais Ativado".
- **Área Dedicada: Pesquisa de Mercados & Preços Pagos (`src/components/LocalMarketAndInvoicesSection.tsx` & `src/services/marketSurveyService.ts`)**:
  - **1. Cadastro de Estabelecimentos Comerciais Locais**:
    - Armazena Nome, Tipo (Atacado, Supermercado, Distribuidora, Empório, Internet), **Endereço Físico Completo** (Rua, Número, Bairro, Cidade, CEP) e **Endereço Eletrônico** (Site, E-commerce, Link do Google Maps ou WhatsApp oficial), além de telefones e observações de compra.
    - Pré-carregado com os principais centros de abastecimento da região de Marília / SP (DDD 14): *Atacadão Marília, Assaí Atacadista Tiradentes, Tauste Supermercados, Confiança Aquarius e Distribuidora Doce & Festa Embalagens*.
    - Modal interativo para adicionar, editar e excluir estabelecimentos.
  - **2. Pesquisa de Preços nos Mercados Locais (Cotações)**:
    - Registro de cotações pesquisadas em visitas, folhetos ou aplicativos.
    - Cálculo automático do **Preço Normalizado (R$ por Kg ou R$ por Litro)** para comparar de forma justa embalagens de tamanhos diferentes (ex: Nutella 350g vs 650g).
    - Identificação automática do **"Menor Preço Local"** com badge visual verde.
    - Filtros por insumo, marca, mercado e ofertas ativas.
  - **3. Preços Efetivamente Pagos (Histórico de Compras Reais via Cupom / NF)**:
    - Registro detalhado de compras com comprovante fiscal (chave de acesso NFC-e, XML ou cupom de foto).
    - Botão **"Atualizar Ficha Técnica"**: permite transferir o preço unitário efetivamente pago diretamente para a receita oficial, recalculando o CMV unitário e a DRE.
- **Configuração da Chave Pix Ton Oficial**:
  - Chave Ton atualizada para `+5514988183327` (BACEN E.164) em nome da titular `ROZANA HELENA MIGUEL` (Praça Marília/SP).

---

## [1.7.0] - 2026-10-20

### Adicionado & Aprimorado
- **Frente de Caixa (PDV) com Geração de QR Code Pix Ton (BR Code BACEN EMV)**:
  - Integração do gerador oficial de payload Pix EMV (`src/lib/pix.ts`) com padrão TLV e cálculo CRC16 CCITT (0xFFFF, 0x1021) dinâmico com valor em centavos.
  - Componente modal de Frente de Caixa (`src/components/PointOfSaleModal.tsx`) com fluxo em 2 etapas:
    1. Seleção de produtos/sabores, cálculo automático de quantidade, subtotal e campo opcional de nome e WhatsApp do cliente.
    2. Escolha da forma de pagamento (Pix Ton 0,99%, Dinheiro 0%, Débito 1,99%, Crédito 3,50%).
  - Exibição de QR Code oficial via `qrcode.react` para leitura presencial pelo cliente.
  - Botão com 1 clique para "Copiar Código Pix Copia e Cola" com feedback visual de confirmação na área de transferência.
  - Botão direto para "Enviar pelo WhatsApp" (`https://wa.me/55...`) com mensagem pré-formatada contendo resumo detalhado do pedido, valor total e chave Pix Copia e Cola para pagamento à distância.
  - Calculadora de troco inteligente para pagamento em dinheiro com botões rápidos de cédulas (R$ 10, R$ 20, R$ 50, R$ 100).
  - Dedução automática e imediata das unidades vendidas no estoque de lotes prontos.
- **Integração Relacional Supabase / PostgreSQL (`supabase/migrations/20261020_initial_schema.sql`)**:
  - Script DDL completo criando tabelas relacionais com chaves primárias UUID e integridade referencial:
    - `insumos`: catálogo de ingredientes, embalagens e custos unitários.
    - `produtos`: catálogo de sabores com preço de venda e rendimento da receita.
    - `ficha_tecnica`: relação N:N entre produtos e insumos com quantidades exatas.
    - `taxas_pagamento`: taxas por meio de pagamento (Ton Pix 0.99%, Ton Débito 1.99%, Ton Crédito 3.50%, Dinheiro 0.00%).
    - `vendas`: registro de pedidos com `cliente_nome`, `cliente_telefone`, `forma_pagamento`, `valor_total` e `status`.
    - `itens_venda`: itens de cada venda com quantidade e preço praticado.
    - `estoque_lotes`: controle de saldo disponível por sabor.
- **Gráficos e KPIs da Visão Geral de Vendas (`src/components/ChartsSection.tsx`)**:
  - Inclusão do **Gráfico 5: Margem de Lucro % por Sabor** com gráfico de barras horizontais Recharts e alternância de visualização de métricas detalhadas.
  - Botão de contato rápido por WhatsApp adicionado à tabela de "Últimas Vendas Realizadas" para pós-venda e comprovante imediato.
- **Paleta de Cores Confeitaria Gourmet Executiva (Berry Rose & Soft Peach)**:
  - Harmonização sutil de tons confeitaria sofisticados (Framboesa/Bordeaux `hsl(346, 77%, 46%)`, pêssego suave `hsl(25, 75%, 96%)` e toques em ouro âmbar) em sintonia com a identidade visual refinada de doceria gourmet.
  - Preservação da clareza contábil, gráficos Shadcn e suporte completo a temas Claro e Escuro (*Dark Mode*).

---

## [1.6.0] - 2026-10-19

### Adicionado & Aprimorado
- **Paleta de Cores Executiva & Limpa (Slate/Indigo) — Foco em Clareza Financeira**:
  - Substituição da paleta anterior com tons quentes/rosados dispersos por uma identidade visual sóbria, executiva e profissional baseada em tons neutros de **Slate** (cinza grafite e off-white) com acentos em **Indigo / Azul Corporativo** (`#2563eb`), verde esmeralda para lucro (`#10b981`) e cinza ardósia para custos (`#64748b`).
  - Remoção de gradientes multicoloridos e ruído visual nos cards e banners da IA, garantindo máxima legibilidade de relatórios contábeis tanto no tema Claro quanto no tema Escuro (*Dark Mode*).
- **Importador e Atualizador de Preços de Insumos do Supermercado (`src/services/quotationService.ts` & `src/components/InvoicePriceUpdaterModal.tsx`)**:
  - **Consulta por Chave de Acesso da NFC-e (44 dígitos) ou QR Code**: Permite consultar notas fiscais eletrônicas de consumidor com 1 clique ou testar com notas pré-carregadas (Atacadão / Supermercados BH).
  - **Upload de Arquivo XML da NF-e / NFC-e**: Processamento no cliente de XMLs SEFAZ com extração automática de produto (`xProd`), quantidade (`qCom`), valor unitário (`vUnCom`) e valor total (`vProd`).
  - **Foto do Cupom Fiscal Impresso**: Reconhecimento inteligente de itens a partir de fotos tiradas pela câmera do celular ou upload de imagem.
  - **Copiar & Colar / CSV**: Importação direta de texto colado de mensagens ou planilhas.
  - **Tabela de Conciliação e Ajuste de Vínculos**: Exibe o produto da nota lado a lado com o insumo correspondente do catálogo, comparando o preço anterior e novo com indicador percentual ($\Delta$).
  - **Recálculo Automático das Fichas Técnicas**: Ao aplicar a nota fiscal, os custos dos insumos são gravados no catálogo e todas as 8 receitas de 150ml têm seus custos unitários, DRE e Lista de Compras recalculados instantaneamente!

---

## [1.5.0] - 2026-10-19

### Adicionado
- **Central de Inteligência, Produção & Engenharia de Cardápio — PereiraLabs IA (`src/lib/aiEngine.ts` & `src/components/AiIntelligenceSection.tsx`)**:
  1. **Módulo IA #1 — Plano Inteligente de Produção ("O que produzir hoje?")**: Cruza o giro diário dos últimos 7 dias com o estoque disponível e o rendimento exato de cada receita (8, 9, 10, 12 ou 14 un. de 150ml), classificando a urgência anti-ruptura e permitindo somar o lote produzido ao estoque com 1 clique (`+Lote no Estoque`).
  2. **Módulo IA #2 — Lista de Compras Automática com Aproveitamento de Sobras**: Soma os ingredientes necessários para a fornada do dia e desconta automaticamente as sobras já disponíveis na despensa (*Leite Ninho 330g*, *Ovomaltine 540g*, *Chocolate 50% 960g*, *Nutella 120g*, *Morango 520g*), exibindo a economia real em R$.
  3. **Módulo IA #3 — Matriz BCG de Engenharia de Cardápio**: Classifica os 8 sabores em ⭐ *Estrela do Cardápio*, 🐄 *Gerador de Caixa*, 💎 *Joia Oculta (Alta Margem)* e 🔍 *Em Observação*, com ação tática recomendada para cada sabor.
  4. **Módulo IA #4 — Radar de Otimização de Custos e Marcas (54 Cotações)**: Compara o custo por grama (Varejo vs. Atacado) identificando oportunidades reais como *Nutella 650g Atacado (-38,4%/g)*, *Creme de Leite Atacado (-39,1%/g)* e *Leite Condensado Atacado (-32,5%/g)*.
  5. **Módulo IA #5 — Simulador Interativo de Meta Financeira Mensal**: Calcula quantos geladinhos por dia, por semana e quantos lotes de 69 unidades são necessários para atingir a meta de lucro líquido escolhida (ex: R$ 3.500,00/mês) tanto na venda Local quanto no iFood.
  6. **Módulo IA #6 — Gerador de Combos Inteligentes & Copy para WhatsApp**: Cria combos com margem protegida focados nos sabores de maior estoque e gera mensagens promocionais formatadas com botão **Copiar p/ WhatsApp**.
  7. **Consultor PereiraLabs IA (Chat Híbrido: Motor Local + Google Gemini 2.5 Flash)**: Assistente conversacional integrado que responde perguntas em tempo real sobre produção, preços iFood, DRE e compras (funciona 100% grátis localmente e aceita chave opcional da API Google Gemini).

---

## [1.4.0] - 2026-10-19

### Adicionado & Alterado
- **Cálculo Dinâmico de Preço Delivery / iFood Baseado na Taxa Cadastrada (`src/lib/analytics.ts` & `src/components/TechnicalSheetAndDreSection.tsx`)**:
  - Substituição dos preços fixos de iFood pela fórmula matemática exata baseada na taxa cadastrada: $\text{Preço}_{\text{iFood}} = \frac{\text{Preço}_{\text{Local}}}{1 - (\text{Taxa}/100)}$.
  - Campo interativo **"Taxa iFood Cadastrada (%)"** no painel com botões rápidos (`26,2% → ÷0,738`, `30% → ÷0,70`, `15% → ÷0,85`) e exibição em tempo real do **Fator Divisor** calculado.
  - Garantia matemática de que o **Repasse Líquido** e o **Lucro Líquido Unitário** no iFood empatam em 100% com o lucro da venda local em todos os sabores do cardápio.

---

## [1.3.0] - 2026-10-19

### Adicionado & Atualizado
- **Fichas Técnicas e Precificação Oficial do Caderno de Receitas (Saquinhos de 150ml)**:
  - Substituição dos sabores de exemplo pelas **receitas reais de 150ml** extraídas dos PDFs oficiais:
    1. *Doce de Leite (Itambé)* — Rendimento: 8 un | Custo: R$ 3,10 | Local: R$ 6,50 | iFood: R$ 8,90
    2. *Ninho com Nutella (Base Ninho + 20g Nutella)* — Rendimento: 8 un | Custo: R$ 3,15 | Local: R$ 7,00 | iFood: R$ 9,50
    3. *Ninho com Brigadeiro 50%* — Rendimento: 8 un | Custo: R$ 2,15 | Local: R$ 7,90 | iFood: R$ 9,90
    4. *Mousse de Maracujá c/ Geleia Artesanal* — Rendimento: 14 un | Custo: R$ 3,60 | Local: R$ 7,50 | iFood: R$ 9,90
    5. *Delícia de Ovomaltine* — Rendimento: 9 un | Custo: R$ 2,60 | Local: R$ 6,00 | iFood: R$ 8,50
    6. *Romeu e Julieta (Creme de Queijo + Goiabada)* — Rendimento: 10 un | Custo: R$ 2,67 | Local: R$ 7,90 | iFood: R$ 9,90
    7. *Cheesecake Frutas Vermelhas (Linha Premium)* — Rendimento: 12 un | Custo: R$ 3,77 | Local: R$ 9,90 | iFood: R$ 11,90
    8. *Ninho c/ Geleia de Morango* — Rendimento: 8 un | Custo: R$ 3,15 | Local: R$ 7,50 | iFood: R$ 9,90
- **Comparativo de DRE: Venda Local vs. iFood (Taxa 26,2%)**:
  - Seletor na DRE permitindo simular o lucro líquido no **Período Filtrado**, **Venda Local (1 un)** e **Venda iFood com taxa de 26,2% (1 un)**.
- **Caldas Artesanais Base, Controle de Sobras e Tabela de Cotação de 54 Insumos (`src/data/insumosCatalog.ts`)**:
  - Card das Caldas Base (*Geleia de Morango — R$ 14,45/lote* e *Geleia de Maracujá — R$ 12,10/lote*).
  - Tabela de *Desembolso Inicial no Caixa (R$ 201,10) vs. Consumo Efetivo (R$ 144,45) vs. Sobras em Estoque (R$ 56,65)*.
  - Tabela pesquisável com os **54 insumos reais cotados (Varejo, Atacado e Preço de 1g)**.

---

## [1.2.0] - 2026-10-19

### Adicionado
- **Módulo de Engenharia de Cardápio: Ficha Técnica Completa e Automática (`src/components/TechnicalSheetAndDreSection.tsx`)**:
  - Fichas técnicas detalhadas para todos os sabores contendo rendimento da batelada (unidades), volume unitário (ml), tempo de preparo (min), lista de ingredientes/insumos com quantidades e custos, custo de embalagem + adesivo por unidade, custo operacional (energia/freezer) e modo de preparo padronizado.
  - Cálculo automático em tempo real do **Custo Unitário Final (`custo_estimado`)** e do **Markup Multiplicador** a partir dos insumos da receita.
  - Edição interativa da Ficha Técnica (adicionar/remover insumos, alterar rendimento, custos e preço de venda) com atualização imediata em todo o dashboard.
- **DRE Gerencial por Produto e Matriz Comparativa (`src/lib/analytics.ts`)**:
  - Demonstrativo de Resultado do Exercício (DRE) individual por sabor com alternância entre **Visão no Período Selecionado** e **Simulação Unitária (Por 1 Unidade)**:
    - *(+) Receita Operacional Bruta*
    - *(-) Deduções / Taxas de Meios de Pagamento (Cartão)*
    - *(=) Receita Líquida de Vendas*
    - *(-) CMV — Insumos da Ficha Técnica*
    - *(-) Embalagens & Adesivos Gourmet*
    - *(-) Custo Operacional Direto (Energia/Freezer)*
    - *(=) Custo Total do Produto (CPV)*
    - *(=) Lucro Líquido / Margem de Contribuição (R$ e %)*
  - **Matriz Comparativa de DRE (Todos os Sabores + Consolidado Geral)**: Tabela comparativa lado a lado ranqueada por lucro líquido real no período.
- **Navegação Rápida por Seções**:
  - Seletor no topo permitindo alternar entre **Painel Completo**, **Vendas & Estoque** e **Ficha Técnica & DRE por Produto**.

---

## [1.1.0] - 2026-10-19

### Adicionado
- **Suporte PWA Nativo Completo para Android e iOS**:
  - Gerador automatizado de ícones PNG oficiais (`scripts/generate-pwa-icons.mjs`): `180x180` (`apple-touch-icon.png`), `192x192` (`pwa-192x192.png`) e `512x512` (`pwa-512x512.png` *any* e *maskable*).
  - Modal e botão **Instalar App** no cabeçalho (`src/components/InstallPwaModal.tsx`) com captura nativa do evento `beforeinstallprompt` (Android/Desktop) e instruções visuais para iOS Safari (*Compartilhar -> Adicionar à Tela de Início*).
  - Atalhos rápidos na tela inicial do celular (`shortcuts` no `manifest.webmanifest`) para abrir diretamente **Registrar Nova Venda** (`?action=nova-venda`) e **Repor Estoque** (`?action=estoque`).
  - Cache dinâmico *Network-First* com fallback offline no Service Worker (`public/sw.js`).
- **Assinatura Oficial & Versionamento Visível**:
  - Inclusão do crédito oficial **Desenvolvido por PereiraLabs - Divisão de Tecnologia e IA | Louzada & Pereira - Soluções Digitais** no rodapé e na configuração central White-Label (`src/config/brand.config.ts`).
  - Exibição da badge de versão no rodapé da aplicação e documentação de histórico em `CHANGELOG.md`.
- **Publicação Automática no GitHub Pages**:
  - Repositório publicado e integrado ao GitHub Actions (`.github/workflows/deploy.yml`).

---

## [1.0.0] - 2026-10-19

### Adicionado
- **Arquitetura Base & White-Label (`src/config/brand.config.ts`)**:
  - Estrutura single-page responsiva em React 18, Vite 6, TypeScript e Tailwind CSS com variáveis Shadcn/UI para Modo Claro e Modo Escuro.
  - Paleta personalizada de confeitaria gourmet (*rose/berry*, *soft peach*, *amber/gold*).
- **5 Indicadores Principais (KPIs)**:
  - *Faturamento Total*, *Lucro Bruto Estimado* (com margem percentual), *Total de Geladinhos Vendidos*, *Ticket Médio* e *Alerta de Estoque Baixo* (`< 10 unidades`).
- **4 Gráficos Interativos (Recharts)**:
  - *Evolução Diária de Vendas* (100% largura, alternável entre Linha/Área e Barras), *Top 5 Sabores Mais Vendidos*, *Divisão por Forma de Pagamento* (Donut) e *Nível de Estoque por Sabor* acompanhado do resumo financeiro do estoque.
- **Tabelas Operacionais & Central Rápida**:
  - *Tabela de Últimas Vendas* e *Tabela de Reposição de Estoque* com botões de ajuste rápido (`-1`, `+1`, `+10`).
  - Modal para registro de novas vendas (com baixa automática no estoque) e cadastro de novos sabores.
- **Camada de Dados Híbrida (`src/services/dataService.ts` & `supabase/schema_and_seed.sql`)**:
  - Funcionamento automático em Modo Demo Local (`localStorage`) com histórico realista de 90 dias e integração transparente com PostgreSQL no Supabase (`produtos`, `vendas`, `itens_venda`, `estoque_lotes`) via `.env`.
