# 🍧 Geladinhos Gourmet da Roze — Dashboard Gerencial (PWA & White-Label)

![Versão](https://img.shields.io/badge/vers%C3%A3o-1.4.0-e11d48)
![PWA](https://img.shields.io/badge/PWA-Android%20%7C%20iOS%20%7C%20Desktop-10b981)
![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Vite%20%2B%20TypeScript%20%2B%20Supabase-f59e0b)

Dashboard financeiro e operacional desenvolvido em **React + Vite + TypeScript + Tailwind CSS + Shadcn/UI + Recharts + Supabase**, projetado para hospedagem no **GitHub Pages**, instalação nativa como **PWA (Android WebAPK, iOS Safari e Desktop)** e arquitetura **White-Label replicável** para novos clientes.

- 🌐 **Acesse a Demonstração Online (GitHub Pages)**: [https://andreweua.github.io/geladinhos-roze-dashboard/](https://andreweua.github.io/geladinhos-roze-dashboard/)
- 📋 **Histórico de Versões**: Consulte o [CHANGELOG.md](./CHANGELOG.md)

---

## 📊 Funcionalidades Principais

1. **5 KPIs em Tempo Real**:
   - **Faturamento Total** (R$ no período filtrado)
   - **Lucro Bruto Estimado** (Receita menos custo estimado dos itens vendidos + margem %)
   - **Total de Geladinhos Vendidos** (Unidades totais entregues)
   - **Ticket Médio** (Valor médio por venda concluída)
   - **Alerta de Estoque Baixo** (Sabores ativos com menos de 10 unidades)
2. **Engenharia de Cardápio: Ficha Técnica & DRE por Produto (`v1.2.0`)**:
   - **Ficha Técnica Completa e Editável**: Cadastro de insumos da receita, quantidades, custos por batelada, rendimento (unidades), volume (ml), tempo de preparo, embalagem e energia/freezer — calculando automaticamente o custo unitário e o markup.
   - **DRE Gerencial por Produto (Período e Unitária)**: Apuração completa da Receita Bruta $\rightarrow$ (-) Taxas de Cartão $\rightarrow$ (=) Receita Líquida $\rightarrow$ (-) CMV Insumos $\rightarrow$ (-) Embalagens $\rightarrow$ (-) Custo Operacional $\rightarrow$ (=) Lucro Líquido e Margem de Contribuição (%).
   - **Matriz Comparativa de DRE**: Tabela consolidada comparando a lucratividade líquida de todos os sabores lado a lado.
3. **4 Gráficos Analíticos (Recharts)**:
   - **Evolução Diária de Vendas** (100% largura — comparativo Faturamento vs. Custo Estimado em Linha/Área ou Barras)
   - **Top 5 Sabores Mais Vendidos** (Barras horizontais por quantidade)
   - **Divisão por Forma de Pagamento** (Donut chart: Pix, Cartão de Crédito, Cartão de Débito e Dinheiro)
   - **Nível de Estoque por Sabor** + **Catálogo Gourmet & Potencial Financeiro do Estoque**
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
