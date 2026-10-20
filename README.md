# 🍧 Geladinhos Gourmet da Roze — Dashboard Gerencial (PWA & White-Label)

![Versão](https://img.shields.io/badge/vers%C3%A3o-1.7.0-e11d48)
![PWA](https://img.shields.io/badge/PWA-Android%20%7C%20iOS%20%7C%20Desktop-10b981)
![Pagamento](https://img.shields.io/badge/Ton%20Pix-BACEN%20EMV%20QR%20Code-2563eb)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Checkout%20%26%20Recibo-22c55e)
![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Vite%20%2B%20TypeScript%20%2B%20Supabase%20%2B%20Recharts-f59e0b)

Dashboard financeiro, operacional e de Frente de Caixa (PDV) desenvolvido em **React + Vite + TypeScript + Tailwind CSS + Shadcn/UI + Recharts + Supabase (PostgreSQL) + PereiraLabs IA**, com suporte a **Pix QR Code Ton (BR Code EMV dinâmico)**, integração com **WhatsApp**, hospedagem no **GitHub Pages**, instalação nativa como **PWA** e arquitetura **White-Label**.

- 🌐 **Acesse a Demonstração Online (GitHub Pages)**: [https://andreweua.github.io/geladinhos-roze-dashboard/](https://andreweua.github.io/geladinhos-roze-dashboard/)
- 📋 **Histórico de Versões**: Consulte o [CHANGELOG.md](./CHANGELOG.md)

---

## 📊 Funcionalidades Principais

1. **Frente de Caixa (PDV) com Pix Ton Dinâmico & WhatsApp (`v1.7.0`)**:
   - **QR Code Pix Dinâmico**: Geração oficial BACEN BR Code EMV Payload (`TLV + CRC16 CCITT`) com valor da venda em tempo real para a chave Ton da proprietária.
   - **Copiar Pix Copia e Cola**: Botão com 1 toque para transferir o código Pix completo.
   - **Enviar pelo WhatsApp**: Link direto `wa.me/55...` com saudação personalizada, discriminação dos itens, valor total e chave Pix Copia e Cola para pagamento à distância.
   - **Calculadora de Troco para Dinheiro**: Atalhos de cédulas (R$ 10, R$ 20, R$ 50, R$ 100) e cálculo instantâneo de troco.
   - **Dedução Imediata de Estoque**: Baixa automática das unidades no estoque de lotes prontos.
2. **Arquitetura em Duas Vistas Principais**:
   - **1. Visão Geral de Vendas**:
     - **5 KPIs**: Faturamento Total, Lucro Líquido Real, Total de Geladinhos Vendidos, Ticket Médio e Alerta de Sabores Críticos (< 10 un).
     - **5 Gráficos Analíticos**:
       - *Gráfico 1 (100% largura)*: Faturamento Diário vs Custos Totais ao longo do tempo.
       - *Gráficos 2 e 3*: Top 5 Sabores Mais Vendidos (Barras) e Vendas por Forma de Pagamento (Donut).
       - *Gráficos 4 e 5*: Nível de Estoque por Sabor e **Margem de Lucro % por Sabor** (com toggle para visão analítica).
     - **Tabelas Operacionais**: Últimas Vendas Realizadas (com botão de ação para WhatsApp) e Reposição Rápida de Estoque.
   - **2. Ficha Técnica & DRE por Produto**:
     - Matriz comparativa de todos os 8 sabores: Preço de Venda, Insumos, Embalagens, Taxas TON, Margem R$ e Margem %.
     - Cartão DRE Gerencial detalhado por sabor com simulador de taxa de delivery/iFood dinâmico (`Preço Local / (1 - Taxa/100)`).
     - Modal de edição e criação de receitas e fichas técnicas.
3. **Modelagem Relacional PostgreSQL / Supabase (`supabase/migrations/20261020_initial_schema.sql`)**:
   - Tabelas estruturadas com integridade referencial: `insumos`, `produtos`, `ficha_tecnica`, `taxas_pagamento`, `vendas`, `itens_venda` e `estoque_lotes`.
4. **Central de Inteligência PereiraLabs IA**:
   - Plano inteligente de produção com 1 clique `+Lote no Estoque`, Lista de Compras com aproveitamento de sobras, Matriz BCG de cardápio, Radar de 54 cotações (Varejo vs Atacado), Simulador de metas e Chat Híbrido com Google Gemini.
5. **Importador de Preços de Insumos por Nota Fiscal / NFC-e**:
   - Consulta por Chave de 44 dígitos / QR Code de NFC-e, Upload de XML SEFAZ, Foto do Cupom Impresso e CSV.
6. **Paleta Gourmet Confeitaria**:
   - Tons sofisticados de confeitaria artesanal (Berry Rose, Soft Peach e toques dourados) com alta legibilidade e suporte completo a Dark Mode.
4. **2 Tabelas Operacionais + Central Rápida**:
   - **Tabela de Últimas Vendas** e **Tabela de Reposição de Estoque** (com ajuste rápido `-1`, `+1`, `+10`)
   - **Modal Central Rápida** para lançar novas vendas (abatendo estoque automaticamente) e cadastrar novos sabores.
5. **Filtros Globais de Período**:
   - *Hoje, Ontem, 7 dias, Este mês, Mês passado, 3 meses e Personalizado*.

---

## 📱 Suporte PWA (Android & iOS)

- **Android (Chrome / Edge / Samsung Internet)**: Gera instalação nativa (**WebAPK**) via `manifest.webmanifest`, ícones PNG `192x192` e `512x512` (*maskable*) e botão **Instalar App** com suporte ao evento `beforeinstallprompt`.
- **iOS (iPhone / iPad no Safari)**: Meta tags `apple-mobile-web-app-capable`, `apple-touch-icon.png` (`180x180`), suporte a `viewport-fit=cover` e guia interativo passo a passo (*Compartilhar -> Adicionar à Tela de Início*).
- **Atalhos na Tela Inicial**: Segure o ícone do app instalado para acessar diretamente **Nova Venda** ou **Repor Estoque**.

---

## 🚀 Como Rodar Localmente

```bash
npm install
npm run dev
```

Para gerar o pacote de produção ou regerar os ícones PNG do PWA:

```bash
node scripts/generate-pwa-icons.mjs
npm run build
```

---

## 🔄 Como Replicar para Outro Cliente (Arquitetura White-Label)

Toda a configuração de marca, rótulos de produtos, limites de estoque e cores está centralizada em **2 arquivos**:

1. **[`src/config/brand.config.ts`](./src/config/brand.config.ts)**:
   - Altere `companyName`, `shortName`, `tagline`, `lowStockThreshold`, `userProfile`, `labels` e `chartColors`.
2. **[`src/index.css`](./src/index.css)**:
   - Ajuste as variáveis CSS HSL (`--primary`, `--secondary`, `--accent`) para alterar o tema claro e escuro.

---

## 🗄️ Conexão com Supabase (Modo Híbrido)

- **Sem `.env` (Modo Demo Ativo)**: Funciona imediatamente com dados realistas de 90 dias e salva novas vendas e reposições no `localStorage`.
- **Com Supabase Online**:
  1. Execute o script [`supabase/schema_and_seed.sql`](./supabase/schema_and_seed.sql) no SQL Editor do seu projeto Supabase.
  2. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

---

## ✒️ Créditos e Autoria

**Desenvolvido por PereiraLabs - Divisão de Tecnologia e IA | Louzada & Pereira - Soluções Digitais**
