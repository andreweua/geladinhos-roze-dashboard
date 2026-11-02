# 🍧 Geladinhos Gourmet da Roze — Sistema de Gestão, PDV, Cotações & Inteligência Artificial

![Versão](https://img.shields.io/badge/vers%C3%A3o-3.5.9-e11d48)
![PWA](https://img.shields.io/badge/PWA-Android%20%7C%20iOS%20%7C%20Desktop-10b981)
![Capacitor](https://img.shields.io/badge/Capacitor-Android%20APK%20%28v53%29-38bdf8)
![RSC Sistemas](https://img.shields.io/badge/GTIN%20%2F%20EAN--13-RSC%20Sistemas%20%2B%20Fotos-f59e0b)
![Atacado e Varejo](https://img.shields.io/badge/Cota%C3%A7%C3%B5es-Atacado%20%26%20Varejo-8b5cf6)
![Segurança de Caixa](https://img.shields.io/badge/Caixa-Abertura%20Obrigat%C3%B3ria-10b981)
![Stone OpenBank](https://img.shields.io/badge/Stone%20OpenBank-Pix%20Din%C3%A2mico-00a868)

Sistema completo de gestão financeira, frente de caixa (PDV), engenharia de fichas técnicas, lista de compras atacado/varejo com scanner de código de barras (GTIN/EAN), auditoria de estoque e inteligência artificial desenvolvido em **React 18 + Vite 6 + TypeScript + Tailwind CSS + Capacitor 8 (Android) + Supabase (PostgreSQL) + PereiraLabs IA**.

- 🌐 **Aplicação Web / PWA (GitHub Pages)**: [https://andreweua.github.io/geladinhos-roze-dashboard/](https://andreweua.github.io/geladinhos-roze-dashboard/)
- 📲 **Download Direto do Aplicativo Android (APK Oficial)**: [Baixar APK Mais Recente (GitHub Releases)](https://github.com/andreweua/geladinhos-roze-dashboard/releases/latest)
- 📋 **Histórico Completo de Alterações**: Consulte o [CHANGELOG.md](./CHANGELOG.md)

---

## 🚀 Destaques das Versões 3.5.x (Última Atualização: v3.5.9)

### 1. ⚙️ Painel de Configurações da Empresa & Gateway Pix (7 Abas Responsivas — v3.5.9)
- **Visualização Completa em 7 Abas**: *Meu Plano*, *IA Gemini (SaaS)*, *Chave Pix & TON*, *API Stone*, *Dados da Empresa*, *Polos & CEPs* e *Nuvem Supabase*.
- **Expansão de Tela Larga & Navegação por Setas**: Modal ampliado para `max-w-5xl` acomodando todas as abas no desktop; botões de navegação lateral (`ChevronLeft` / `ChevronRight`) surgem automaticamente no mobile e em telas menores.
- **Scroll Suave com Roda do Mouse (`Wheel`) & Auto-centralização**: Rolar a roda do mouse sobre as abas desliza o menu horizontalmente, e ao tocar em qualquer aba ela se centraliza automaticamente (`scrollIntoView`).

### 2. 💱 Formatação Regional de Moeda & Edição Livre no Teclado (v3.5.8)
- **Separador Padrão do País (`pt-BR` / `BRL`)**: Campos de entrada monetária e numérica utilizam vírgula como separador decimal oficial.
- **Liberdade de Edição e Limpeza Total**: Usuário pode apagar com `Backspace`/`Delete` e digitar novos valores sem bloqueio de dígitos, inclusive após preenchimento automático por QR Code de Nota Fiscal ou catálogo de produtos.

### 3. 🔍 Scanner GTIN / EAN-13 Integrado com Google ML Kit Padrão
- **Google ML Kit Prioritário nas Cotações**: Leitura rápida e precisa de códigos de barras com detecção nativa em hardware.
- **Autenticação Automática RSC Sistemas (API v3) & Fotos Reais**: Identificação instantânea de rótulos comerciais com miniaturas fotográficas e bloqueio governado PereiraLabs para produtos oficiais.

### 4. 🛒 Lista de Compras & Cotações em Cards Mobile-First (Atacado & Varejo)
- **Layout em Cards Responsivos**: Visualização otimizada para telas de celulares e PWA, eliminando rolagem horizontal e compressão de tabelas. Permite alternar com um toque entre **Cards (Recomendado)** e **Tabela**.
- **Independência Total entre Quantidade de Compra e Embalagem**:
  - **Qtd. Necessária (Compra)**: Quantidade de itens a comprar com seletor próprio de unidade comercial (`un`, `cx`, `pct`, `fardo`, `lata`, `pote`, `kg`, `L`).
  - **Embalagem / Tamanho**: Peso, volume ou contagem unitária do rótulo (`395 g`, `200 g`, `1 L`, `1,01 kg`, `1000 un`) com seletor independente (`g`, `kg`, `ml`, `L`, `un`).
- **Preços de Varejo e Atacado com Gatilho Mínimo**:
  - Suporte simultâneo a **Preço de Varejo**, **Preço de Atacado** e **Quantidade Mínima de Atacado** (ex: pacote fechado a partir de 6, 12 ou 24 unidades).
  - Cálculo automático de subtotal ativando a tarifa de atacado assim que a quantidade mínima é atingida e aviso inteligente de economia (*"💡 Faltam X un p/ atacado"*).

### 5. 🔔 Sistema de Atualização OTA (Over-The-Air) & Rastreabilidade Técnica
- **Notificação Sonora, Tátil e Visual**: Aviso de nova versão com chime melódico sintetizado via *Web Audio API*, vibração háptica e botão claro para fechar o alerta.
- **Rastreabilidade Técnica no Rodapé**: Exibição exata da versão instalada em execução (`Versão: v3.5.9 • Build: 2026110201 • Ambiente: PWA Web App / Android Nativo versionCode 53`).
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
  - Compilação automatizada via GitHub Actions (`.github/workflows/build-apk.yml`) gerando o pacote oficial `PereiraLabs-PDV-Foods-v3.5.9.apk` e `PereiraLabs-PDV-Foods-latest.apk`.
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
