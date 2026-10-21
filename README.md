# 🍧 Geladinhos Gourmet da Roze — Dashboard Gerencial (PWA & White-Label)

![Versão](https://img.shields.io/badge/vers%C3%A3o-1.9.0-e11d48)
![PWA](https://img.shields.io/badge/PWA-Android%20%7C%20iOS%20%7C%20Desktop-10b981)
![Praças](https://img.shields.io/badge/Pra%C3%A7as-Ja%C3%BA%20(SP)%20%7C%20Tr%C3%AAs%20Pontas%20(MG)-2563eb)
![Atacado & Varejo](https://img.shields.io/badge/Atacado%20%26%20Varejo-Mart%20Minas%20%7C%20Atacad%C3%A3o-f59e0b)
![Anti-Inflação](https://img.shields.io/badge/Validade%20%26%20Radar-Anti--Infla%C3%A7%C3%A3o-10b981)

Dashboard financeiro, operacional, de Frente de Caixa (PDV) e Inteligência Artificial desenvolvido em **React + Vite + TypeScript + Tailwind CSS + Shadcn/UI + Recharts + Supabase (PostgreSQL) + PereiraLabs IA**, com suporte a **Pix QR Code Ton (BR Code EMV dinâmico)**, integração com **WhatsApp**, **Pesquisa de Mercados em Jaú (SP) e Três Pontas (MG)**, **Controle de Validade de Ofertas**, **Radar de Inflação & Oportunidade de Estocar**, **Preços Pagos Reais via Cupom/NF-e** e instalação como **PWA**.

- 🌐 **Acesse a Demonstração Online (GitHub Pages)**: [https://andreweua.github.io/geladinhos-roze-dashboard/](https://andreweua.github.io/geladinhos-roze-dashboard/)
- 📋 **Histórico de Versões**: Consulte o [CHANGELOG.md](./CHANGELOG.md)

---

## 📊 Funcionalidades Principais

1. **Pré-Cadastro Regional Jaú (SP) e Três Pontas (MG) + Atacado e Varejo (`v1.9.0`)**:
   - Estabelecimentos pré-cadastrados com endereços físicos completos e canais eletrônicos: *Mart Minas Atacado & Varejo (Sul de Minas)*, *Atacadão Jaú*, *Jaú Serve Supermercados*, *Tenda Atacado*, *Supermercado Moacyr*, *Alvorada Supermercados* e *Jaú Embalagens*.
   - Suporte oficial ao tipo **"Atacado e Varejo"** (Atacarejos).
2. **Validade de Ofertas & Radar Anti-Inflação (`v1.9.0`)**:
   - Bloqueio automático: cotações expiradas não concorrem ao "Menor Preço Vigente Hoje".
   - Histórico permanente com cálculo de inflação acumulada ao longo dos meses e anos.
   - Alerta inteligente: `🔥 Oportunidade de Estocar` acionado quando o preço vigente está $\ge 12\%$ a $15\%$ mais barato que a média histórica.
3. **Gestão de Custos de Insumos: Custo de Reposição vs. Custo Médio Ponderado (CMP)**:
   - Permite escolher entre precificar pelo custo da última reposição (recomendado para proteger a margem contra a inflação) ou pelo CMP (para compras em grande escala).
4. **100% Dados Reais**:
   - Sem vendas fictícias. O painel opera exclusivamente com as 8 receitas reais dos PDFs e vendas reais lançadas pela Rozana no Frente de Caixa (PDV).
5. **Frente de Caixa (PDV) com Pix Ton Dinâmico & WhatsApp**:
   - QR Code Pix BACEN EMV Payload oficial com chave Ton da titular `ROZANA HELENA MIGUEL` (`+5514988183327`), botão Copiar Pix e envio direto para WhatsApp.
4. **Arquitetura de Navegação**:
   - **1. Visão Geral de Vendas**: 5 KPIs, 5 Gráficos Analíticos, Tabelas de Últimas Vendas e Reposição.
   - **2. Ficha Técnica & DRE por Produto**: Matriz comparativa dos 8 sabores, precificação iFood dinâmica (`Preço Local / 0,738`) e editor de receitas.
   - **3. Pesquisa de Mercados & Preços Pagos**: Estabelecimentos, Cotações Locais e Cupons Fiscais Reais.
   - **4. Central de Inteligência PereiraLabs IA**: Planejador de produção anti-ruptura, Lista de compras com sobras, Matriz BCG e simulador financeiro.
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
