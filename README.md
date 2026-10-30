# 🍧 Geladinhos Gourmet da Roze — Sistema de Gestão, PDV, Cotações & Inteligência Artificial

![Versão](https://img.shields.io/badge/vers%C3%A3o-3.5.7-e11d48)
![PWA](https://img.shields.io/badge/PWA-Android%20%7C%20iOS%20%7C%20Desktop-10b981)
![Capacitor](https://img.shields.io/badge/Capacitor-Android%20APK%20%28v51%29-38bdf8)
![RSC Sistemas](https://img.shields.io/badge/GTIN%20%2F%20EAN--13-RSC%20Sistemas%20%2B%20Fotos-f59e0b)
![Atacado e Varejo](https://img.shields.io/badge/Cota%C3%A7%C3%B5es-Atacado%20%26%20Varejo-8b5cf6)
![Segurança de Caixa](https://img.shields.io/badge/Caixa-Abertura%20Obrigat%C3%B3ria-10b981)
![Stone OpenBank](https://img.shields.io/badge/Stone%20OpenBank-Pix%20Din%C3%A2mico-00a868)

Sistema completo de gestão financeira, frente de caixa (PDV), engenharia de fichas técnicas, lista de compras atacado/varejo com scanner de código de barras (GTIN/EAN), auditoria de estoque e inteligência artificial desenvolvido em **React 18 + Vite 6 + TypeScript + Tailwind CSS + Capacitor 8 (Android) + Supabase (PostgreSQL) + PereiraLabs IA**.

- 🌐 **Aplicação Web / PWA (GitHub Pages)**: [https://andreweua.github.io/geladinhos-roze-dashboard/](https://andreweua.github.io/geladinhos-roze-dashboard/)
- 📲 **Download Direto do Aplicativo Android (APK Oficial)**: [Baixar APK Mais Recente (GitHub Releases)](https://github.com/andreweua/geladinhos-roze-dashboard/releases/latest)
- 📋 **Histórico Completo de Alterações**: Consulte o [CHANGELOG.md](./CHANGELOG.md)

---

## 🚀 Destaques das Versões 3.5.x (Última Atualização: v3.5.7)

### 1. 🛒 Lista de Compras & Cotações em Cards Mobile-First (Atacado & Varejo)
- **Layout em Cards Responsivos**: Visualização otimizada para telas de celulares e PWA, eliminando rolagem horizontal e compressão de tabelas. Permite alternar com um toque entre **Cards (Recomendado)** e **Tabela**.
- **Independência Total entre Quantidade de Compra e Embalagem**:
  - **Qtd. Necessária (Compra)**: Quantidade de itens a comprar com seletor próprio de unidade comercial (`un`, `cx`, `pct`, `fardo`, `lata`, `pote`, `kg`, `L`).
  - **Embalagem / Tamanho**: Peso, volume ou contagem unitária do rótulo (`395 g`, `200 g`, `1 L`, `1,01 kg`, `1000 un`) com seletor independente (`g`, `kg`, `ml`, `L`, `un`).
- **Preços de Varejo e Atacado com Gatilho Mínimo**:
  - Suporte simultâneo a **Preço de Varejo**, **Preço de Atacado** e **Quantidade Mínima de Atacado** (ex: pacote fechado a partir de 6, 12 ou 24 unidades).
  - Cálculo automático de subtotal ativando a tarifa de atacado assim que a quantidade mínima é atingida e aviso inteligente de economia (*"💡 Faltam X un p/ atacado"*).
- **Importador Universal Inteligente (CSV, Excel, JSON e Tabelas de Mercado)**:
  - Parser monetário compatível tanto com formato brasileiro (`5,78` / `1.250,50`) quanto internacional (`5.49`), sem multiplicar valores decimais.
  - Suporte a colagem direta de múltiplas tabelas concatenadas (Modelo Oficial + planilhas de cotação de atacarejos como *Mart Minas*, *Tenda* e *Atacadão*).

### 2. 🔍 Scanner GTIN / EAN-13 Integrado à RSC Sistemas, Fotos Reais & Governança PereiraLabs
- **Autenticação Automática RSC Sistemas (API v3)**: Integração direta com o portal `gtin.rscsistemas.com.br` e fallback para o catálogo aberto *Open Food Facts Brasil*.
- **Exibição de Fotos Oficiais das Embalagens**: Carregamento automático da miniatura real do produto nos Cards e na Tabela da Lista de Compras ao escanear ou buscar um código de barras.
- **Proteção de Dados Oficiais & Aprovação Exclusiva PereiraLabs**:
  - Quando um produto é localizado na **RSC Sistemas** ou no **Banco de Dados Oficial**, seus dados cadastrais (Nome, Marca, GTIN e Embalagem/Tamanho) ficam protegidos (`🔒 Oficial RSC Sistemas`) contra edição direta, pois não foram cadastrados manualmente pelo usuário.
  - Caso o usuário encontre dados divergentes na embalagem física, ele pode clicar em **"Dados divergentes? Solicitar edição"**, enviando uma solicitação que **somente a PereiraLabs pode aprovar** no Painel Master (`Aprovação de Produtos RSC`).

### 3. 🎨 Estúdio Culinário IA (Fidelidade ao Produto Real na Sacolinha)
- **Apresentação Fiel em Saquinho de Geladinho (6x24cm)**: Geração de imagens promocionais com seleção do formato real do produto (**No Saquinho Tradicional Transparente**, **Saquinho Cortado Mostrando a Cremosa Calda/Recheio** ou **Taça Gourmet**).
- **Prompt Customizável em Português**: Permite editar livremente os detalhes visuais antes de gerar cada fotografia e utiliza o motor **Google Gemini 2.5 Flash** e **Imagen 3** com fallback inteligente.

### 4. 🔔 Sistema de Atualização OTA (Over-The-Air) & APK Android
- **Notificação Sonora, Tátil e Visual**: Aviso de nova versão com chime melódico sintetizado via *Web Audio API*, vibração háptica e botão claro para **Fechar Notificação** (persistindo o fechamento na sessão sem reabrir sozinho).
- **Rastreabilidade Técnica no Rodapé**: Exibição exata da versão instalada em execução (`Versão: v3.5.7 • Build: 2026103007 • Ambiente: PWA Web App / Android Nativo versionCode 51`).
- **Links Permanentes de Atualização Android**: Botões diretos para baixar o `.APK` atualizado disponíveis no rodapé do sistema, no alerta de atualização e na janela **Novidades ✨**.

---

## 📊 Principais Módulos da Aplicação

1. **Frente de Caixa (PDV) & Meios de Pagamento**:
   - Abertura obrigatória de turno de caixa com contagem de fundo de troco inicial.
   - Pix Dinâmico Stone OpenBank com liquidação em tempo real e fallback Ton Pix BACEN (QR Code EMV + Copia e Cola).
   - Rastreamento de Canais de Venda (*Balcão, iFood, WhatsApp, Instagram, Outros*) e CRM automático por telefone WhatsApp.
   - Emissão de Cupons Não Fiscais permanentes em 4 formatos (**PDF Térmico 80mm, TXT, CSV e OFX**).
2. **Visão Geral & Inteligência Analítica**:
   - 5 KPIs Financeiros em tempo real e 5 Gráficos interativos (Evolução Diária, Top 5 Sabores, Pagamento vs. Canal, Nível de Estoque e Margem de Contribuição).
3. **Fichas Técnicas & Engenharia de Receitas (150ml)**:
   - 9 Fichas Técnicas oficiais da confeitaria com precificação dinâmica para o iFood ($\text{Preço} / 0,738$) e DRE individual por sabor.
4. **Pesquisa de Mercados, Cotações & Notas Fiscais**:
   - Comparador de preços Varejo vs. Atacado normalizado por Kg e Litro nas praças de Jaú (SP) e Três Pontas (MG).
   - Alerta `🔥 Oportunidade de Estocar` e bloqueio de ofertas com validade expirada.
5. **Auditoria de Estoque & Controle de Perdas**:
   - Reposição por rendimento de receitas inteiras, trava contra venda sem estoque e registro formal de avarias.
6. **Painel Master Multi-Empresa & Consultoria PereiraLabs**:
   - Sincronização em tempo real entre múltiplos aparelhos via Supabase (`public.empresas`), migração instantânea via QR Code e módulo exclusivo para consultores homologados PereiraLabs.

---

## 📱 Suporte PWA e Aplicativo Android Nativo

- **Aplicativo Android Nativo (Capacitor 8 + Google ML Kit)**:
  - Compilação automatizada via GitHub Actions (`.github/workflows/build-apk.yml`) gerando o pacote oficial `PereiraLabs-PDV-Foods-v3.5.6.apk` e `PereiraLabs-PDV-Foods-latest.apk`.
  - Safe Area nativa configurada para celulares modernos (incluindo Samsung Galaxy A26 / Android 15).
- **PWA (Progressive Web App)**:
  - Instalação em 1 clique no Android, iOS e Desktop com funcionamento offline e atualização automática via Service Worker (`public/sw.js`).

---

## 🛠️ Como Executar o Projeto Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento local
npm run dev

# 3. Compilar para produção e validar tipos TypeScript
npm run build

# 4. Sincronizar alterações com o projeto Android Capacitor
npx cap sync android
```

---

## ✒️ Créditos e Autoria

```text
Desenvolvido por:
PereiraLabs
Divisão de Tecnologia e IA
Louzada & Pereira - Soluções Digitais
```
