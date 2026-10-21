# 🍧 Geladinhos Gourmet da Roze — Dashboard Gerencial (PWA & White-Label)

![Versão](https://img.shields.io/badge/vers%C3%A3o-1.8.0-e11d48)
![PWA](https://img.shields.io/badge/PWA-Android%20%7C%20iOS%20%7C%20Desktop-10b981)
![Dados](https://img.shields.io/badge/Dados-100%25%20Reais-10b981)
![Pagamento](https://img.shields.io/badge/Ton%20Pix-BACEN%20EMV%20QR%20Code-2563eb)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Checkout%20%26%20Recibo-22c55e)
![Mercados](https://img.shields.io/badge/Pesquisa%20de%20Pre%C3%A7o-Mercados%20Locais-f59e0b)

Dashboard financeiro, operacional, de Frente de Caixa (PDV) e Inteligência Artificial desenvolvido em **React + Vite + TypeScript + Tailwind CSS + Shadcn/UI + Recharts + Supabase (PostgreSQL) + PereiraLabs IA**, com suporte a **Pix QR Code Ton (BR Code EMV dinâmico)**, integração com **WhatsApp**, **Pesquisa de Mercados Locais (endereço físico e eletrônico)**, **Preços Pagos Reais via Cupom/NF-e**, instalação como **PWA** e hospedagem no **GitHub Pages**.

- 🌐 **Acesse a Demonstração Online (GitHub Pages)**: [https://andreweua.github.io/geladinhos-roze-dashboard/](https://andreweua.github.io/geladinhos-roze-dashboard/)
- 📋 **Histórico de Versões**: Consulte o [CHANGELOG.md](./CHANGELOG.md)

---

## 📊 Funcionalidades Principais

1. **100% Dados Reais (`v1.8.0`)**:
   - Eliminação de qualquer venda fictícia ou sintética. O painel opera exclusivamente com as 8 receitas reais cadastradas dos PDFs e vendas reais lançadas pela Rozana no Frente de Caixa (PDV).
2. **Pesquisa de Mercados Locais & Preços Pagos (`v1.8.0`)**:
   - **Cadastro de Estabelecimentos**: Registro de Mercados, Atacados e Distribuidoras locais com **Endereço Físico Completo** (Rua, bairro, cidade, CEP), **Endereço Eletrônico Oficial** (Site, e-commerce, Google Maps, WhatsApp ou Instagram), telefone e observações.
   - **Pesquisa de Preços nos Mercados (Cotações)**: Registro de cotações com cálculo automático do **Preço Normalizado (R$ por Kg ou R$ por Litro)** e selo de **"Menor Preço Local"**.
   - **Preços Efetivamente Pagos (Cupons & NF-e)**: Histórico de notas fiscais reais importadas com botão de 1 clique para atualizar a Ficha Técnica oficial.
3. **Frente de Caixa (PDV) com Pix Ton Dinâmico & WhatsApp (`v1.7.0`)**:
   - **QR Code Pix Dinâmico**: Geração oficial BACEN BR Code EMV Payload (`TLV + CRC16 CCITT`) com valor da venda em tempo real para a chave Ton da titular `ROZANA HELENA MIGUEL` (`+5514988183327`).
   - **Copiar Pix Copia e Cola**: 1 toque com feedback visual.
   - **Enviar pelo WhatsApp**: Link direto `wa.me/55...` com resumo completo do pedido e chave Pix para pagamento à distância.
   - **Calculadora de Troco para Dinheiro**: Atalhos de cédulas (R$ 10, R$ 20, R$ 50, R$ 100).
   - **Dedução Imediata de Estoque**: Baixa automática das unidades no estoque.
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
