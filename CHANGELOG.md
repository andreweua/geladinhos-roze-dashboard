# Changelog

Todas as alterações notáveis deste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico (SemVer)](https://semver.org/lang/pt-BR/).

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
