# 🍧 Geladinhos Gourmet da Roze — Sistema de Gestão, PDV & Inteligência Artificial

![Versão](https://img.shields.io/badge/vers%C3%A3o-3.1.0-e11d48)
![PWA](https://img.shields.io/badge/PWA-Android%20%7C%20iOS%20%7C%20Desktop-10b981)
![Capacitor](https://img.shields.io/badge/Capacitor-Android%20APK-38bdf8)
![Segurança de Caixa](https://img.shields.io/badge/Caixa-Abertura%20Obrigat%C3%B3ria-10b981)
![Stone OpenBank](https://img.shields.io/badge/Stone%20OpenBank-Pix%20Din%C3%A2mico-00a868)
![CRM WhatsApp](https://img.shields.io/badge/CRM-WhatsApp%20por%20Telefone-25d366)

Sistema integrado de gestão financeira, frente de caixa (PDV), controle de estoque, auditoria e inteligência artificial desenvolvido em **React 18 + Vite 6 + TypeScript + Tailwind CSS + Capacitor (Android) + Supabase (PostgreSQL) + PereiraLabs IA**.

- 🌐 **Demonstração Online (GitHub Pages)**: [https://andreweua.github.io/geladinhos-roze-dashboard/](https://andreweua.github.io/geladinhos-roze-dashboard/)
- 📋 **Histórico Completo de Alterações**: Consulte o [CHANGELOG.md](./CHANGELOG.md)

---

## 🚀 Novidades da Versão 3.1.0

### 1. 🔒 Segurança Operacional & Controle Estrito de Caixa
- **Abertura Obrigatória de Caixa**: Tanto o **Administrador** quanto o **Operador de Caixa** são impedidos de lançar vendas sem antes abrir o turno de caixa informando a contagem de fundo de troco inicial. Qualquer tentativa de acesso ao PDV redireciona automaticamente para a abertura de caixa.
- **Fechamento de Caixa estilo Cupom Fiscal**: Relatório para envio via WhatsApp com padrão de cupom não fiscal (`===`), contagem de gaveta (cédulas/moedas), total de vendas por forma de recebimento, conferência da maquininha de cartão e balanço automático de sobra ou falta no caixa.

### 2. 🛵 Rastreamento de Canais de Venda (Origem)
- **Seleção no PDV**: Identificação com um clique do canal de onde veio o pedido:
  - 🏪 **Balcão** (Presencial)
  - 🛵 **iFood** (Delivery)
  - 📱 **WhatsApp** (Encomendas)
  - 📸 **Instagram** (Direct)
  - 📦 **Outros** (Eventos e parceiros)
- **Gráfico Analítico de Origem**: No painel do Administrador, o **Gráfico 3** permite alternar instantaneamente entre **"Pagamento"** e **"Canal / Origem"**, demonstrando o faturamento e volume de cada canal de venda.
- **Histórico com Tags**: A tabela de últimas vendas exibe a origem de cada venda realizada.

### 3. 👥 CRM Inteligente com Chave Única por Telefone (WhatsApp)
- **Cadastro Automático & Zero Fricção**: O número de WhatsApp do cliente serve como chave primária única sem exigir senhas ou cadastros prévios demorados.
- **Autocomplete em Tempo Real**: Ao digitar o telefone ou o nome do cliente no PDV, o sistema busca e sugere clientes cadastrados, exibindo o número de compras acumuladas e badge de fidelidade.
- **Histórico & Sabores Favoritos**: O sistema calcula automaticamente o ticket médio, valor total gasto e o ranking dos sabores que o cliente mais compra.

### 4. 🧾 Emissão e Exportação de Cupons Permanentes (Sem Custo de Storage)
- **Links Permanentes Auto-Contidos**: Os dados da venda são compactados e codificados na própria URL (Base64), permitindo que o cliente abra e baixe o cupom meses ou anos depois sem custos de hospedagem de arquivos em nuvem.
- **4 Formatos de Exportação**:
  - 📄 **PDF Térmico (80mm)**: Formatado para leitura no celular ou impressoras térmicas não fiscais de balcão.
  - 📝 **Texto (.txt)**: Texto estruturado com lista de compras limpa para anotações e controles pessoais.
  - 📊 **CSV Financeiro (.csv)**: Com delimitador padrão e UTF-8 BOM, pronto para abrir no Excel, Google Sheets, Mobills, Organizze e Notion.
  - 🏦 **OFX Bancário (.ofx)**: Padrão universal para importação em softwares de contabilidade e ERPs.

---

## 📊 Principais Módulos da Aplicação

1. **Frente de Caixa (PDV) & Meios de Pagamento**:
   - Pix Dinâmico Stone OpenBank com liquidação em tempo real via Webhook e WebSocket.
   - Fallback dinâmico Ton Pix BACEN (chave oficial) com QR Code EMV e chave Copia e Cola.
   - Venda no Cartão de Crédito, Débito e Dinheiro com calculadora automática de troco.
2. **Visão Geral & Inteligência Analítica**:
   - 5 KPIs Financeiros em tempo real (Faturamento, Lucro Líquido, Unidades Vendidas, Ticket Médio e Alerta de Estoque Baixo).
   - 5 Gráficos Recharts (Evolução Diária, Top 5 Sabores, Pagamento vs. Canal, Nível de Estoque e Margem de Contribuição).
3. **Fichas Técnicas & Engenharia de Receitas (150ml)**:
   - 8 Fichas Técnicas reais dos cadernos oficiais da confeitaria.
   - Precificação dinâmica para o iFood ($\text{Preço} / 0,738$) garantindo lucro idêntico ao balcão.
   - DRE individual por produto e matriz comparativa de rentabilidade.
4. **Pesquisa de Mercados & Radar Anti-Inflação**:
   - Cotações com cálculo de preço normalizado por Kg e Litro nas praças de Jaú (SP) e Três Pontas (MG).
   - Alerta `🔥 Oportunidade de Estocar` e validação de ofertas vigentes.
   - Scanner de código de barras físico (EAN / GTIN) via câmera do celular.
5. **Auditoria de Estoque & Controle de Perdas**:
   - Reposição por rendimento de receitas inteiras ou ajuste administrativo manual.
   - Registro formal de perdas/avarias com justificativa e disparo de alerta por e-mail.
6. **Central de Inteligência PereiraLabs IA**:
   - Planejamento de produção anti-ruptura ("O que produzir hoje?").
   - Lista de compras com dedução automática de sobras disponíveis na despensa.
   - Consultor Financeiro e Operacional 24h (Motor local + Google Gemini 2.0 Flash).

---

## 📱 Suporte PWA e Aplicativo Android Nativo

- **Aplicativo Android Nativo (Capacitor)**:
  - Projeto integrado via `@capacitor/android` e `@capacitor-mlkit/barcode-scanning`.
  - Sincronização automatizada com `npx cap copy android`.
- **PWA (Progressive Web App)**:
  - Instalação nativa em Android (WebAPK) e iOS (Safari Adicionar à Tela de Início).
  - Suporte offline via Service Worker (`public/sw.js`).
  - Atalhos na tela de início para "Nova Venda" e "Repor Estoque".

---

## 🚀 Como Executar o Projeto

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento local
npm run dev

# Compilar para produção e validar tipos TypeScript
npm run build

# Sincronizar alterações com o projeto Android Capacitor
npx cap copy android
```

---

## 🔄 Arquitetura White-Label

A personalização de marca e configurações centrais pode ser feita tanto via código quanto diretamente pela interface da empresa:

1. **Via Painel de Configurações**: Ícone de engrenagem no cabeçalho com salvamento persistente.
2. **Via Código-Fonte**: [`src/config/brand.config.ts`](./src/config/brand.config.ts) e [`src/index.css`](./src/index.css).

---

## ✒️ Créditos e Autoria

```text
Desenvolvido por:
PereiraLabs
Divisão de Tecnologia e IA
Louzada & Pereira - Soluções Digitais
```
