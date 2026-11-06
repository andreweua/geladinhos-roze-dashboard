import React, { useEffect, useState } from "react";
import {
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Smartphone,
  Share2,
  RefreshCw,
  Store,
  Receipt,
  PackageCheck,
  ChevronRight,
  Barcode,
  Camera,
  Layers,
  Download,
  ExternalLink,
} from "lucide-react";
import { Button, Badge } from "@/components/ui/primitives";
import { BRAND_CONFIG } from "@/config/brand.config";
import {
  subscribeToOta,
  checkForOtaUpdate,
  getOfficialApkDownloadUrl,
  getOfficialReleasePageUrl,
  OtaUpdateInfo,
} from "@/services/otaService";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForceReload: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  isOpen,
  onClose,
  onForceReload,
}) => {
  const [otaInfo, setOtaInfo] = useState<OtaUpdateInfo | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkForOtaUpdate();
    }
    return subscribeToOta((info) => {
      setOtaInfo(info);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const targetVer = otaInfo?.remoteVersion || BRAND_CONFIG.appVersion;
  const apkUrl = getOfficialApkDownloadUrl(targetVer);
  const releasePageUrl = getOfficialReleasePageUrl(targetVer);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl text-foreground animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 bg-secondary/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-amber-500 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-foreground">
                  Novidades & Atualizações
                </h3>
                <Badge
                  variant="default"
                  className="bg-primary text-primary-foreground font-mono text-[10px] font-bold"
                >
                  v{BRAND_CONFIG.appVersion}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Acompanhe as melhorias, novidades de segurança e recursos do sistema
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Central de Atualização & Download Direto do APK Android */}
          <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs sm:text-sm font-black text-foreground">
                  Atualização & Download do Aplicativo Android (APK)
                </span>
              </div>
              {otaInfo?.hasUpdate ? (
                <span className="rounded-full bg-rose-500 text-white px-2.5 py-0.5 text-[10px] font-black animate-pulse">
                  NOVA VERSÃO DISPONÍVEL: v{targetVer}
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-[10px] font-bold">
                  Versão Instalada: v{BRAND_CONFIG.appVersion}
                </span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              No Android instalado via APK, para atualizar para a versão mais recente mantendo todos os seus dados salvos, toque no botão abaixo para baixar e instalar o pacote oficial:
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={apkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white shadow-sm hover:bg-emerald-700 transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Baixar APK Direto (v{targetVer})</span>
              </a>

              <a
                href={releasePageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
                <span>Abrir Página de Releases (GitHub)</span>
              </a>
            </div>

            <div className="rounded-lg bg-background/80 border border-border/60 px-2.5 py-1.5 text-[10px] font-mono text-muted-foreground break-all">
              Link Direto: <a href={apkUrl} target="_blank" rel="noreferrer" className="text-primary underline font-bold">{apkUrl}</a>
            </div>
          </div>

          {/* Active Version Highlight: v3.6.5 */}
          <div className="rounded-2xl border-2 border-primary/50 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 sm:p-5 shadow-md">
            <div className="flex items-center justify-between gap-2 border-b border-primary/25 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-sm sm:text-base font-black text-foreground">
                  Versão {BRAND_CONFIG.appVersion} (Versão Oficial em Execução)
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-black">
                NOVA • 05/11/2026
              </span>
            </div>

            <div className="mt-3.5 space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <strong className="text-foreground">Levantamento Rápido de Preços & Bipagem Otimizada (v3.7.0):</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5 mb-2">
                    Pesquisa de campo ágil no mercado: modal ergonômico com rolagem interna (max-h 92vh), botões fixos visíveis no Android e PWA ("Salvar Preço" e "Salvar & Bipar Próximo 📷"). Itens bipados posicionados automaticamente no topo da lista (de cima para baixo). Detecção inteligente de itens já na lista: se ainda sem preço abre formulário rápido imediatamente; se já preenchido/bipado oferece opções de manter, editar preço ou adicionar +1 unidade. Botão "⚡ Cotar / Preço" direto nos cards e tabela.
                  </p>
                  <strong className="text-foreground">Segurança do PDV & Cabeçalho Oficial Estação da Rô (v3.6.9):</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5 mb-2">
                    Trava de segurança: cadastro de novos produtos no PDV restrito exclusivamente para Administradores (oculto para vendedores/operadores com PIN). Privacidade financeira: lucro no fechamento do PDV ocultado para vendedores e protegido por botão discreto com ícone de olho para administradores. Novo cabeçalho temático oficial da Estação da Rô (locomotiva a vapor, tipografia ornamental e Brasão Histórico de Jaú) no cupom 80mm térmico, PDF e visualização digital.
                  </p>
                  <strong className="text-foreground">Sincronização em Nuvem de Pesquisas de Mercado & Preços Pagos (v3.6.8):</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5 mb-2">
                    Sincronização bidirecional em tempo real entre celulares e computadores via Supabase para Estabelecimentos Comerciais, Pesquisas de Preços, Histórico de Inflação, Compras/Cupons Fiscais (NFC-e) e Listas de Compras, com suporte offline resiliente e botão manual de atualização na nuvem.
                  </p>
                  <strong className="text-foreground">Painel de CRM & Fidelidade Multi-Empresa (v3.6.7):</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5 mb-2">
                    Nova tela dedicada para gestão de passageiros e clientes com isolamento estrito de dados (multi-tenant), passaporte visual com 10 carimbos, filtros inteligentes ("Quase Ganhando 7-9 selos", "Cortesia Disponível", "Sumidos +20d") e disparo de mensagens personalizadas no WhatsApp com 1 clique.
                  </p>
                  <strong className="text-foreground">Entrega Na Estação / Delivery & Roteamento Dinâmico (v3.6.6):</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5 mb-2">
                    Seletor no PDV entre "NA ESTAÇÃO" (retirada presencial) e "DELIVERY" (entrega em domicílio), suporte a plataformas cadastradas (iFood, AiQFome, WhatsApp), rota ferroviária no bilhete (Linha Matriz x Cidade PDV), seletor de modelo de cupom (Temático Estrada Real vs Comercial Padrão) e conformidade LGPD com venda anônima opcional.
                  </p>
                  <strong className="text-foreground">Sincronização de Produtos com a Nuvem (v3.6.5):</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5 mb-2">
                    Produtos cadastrados no aplicativo agora são sincronizados automaticamente com a tabela "produtos" no Supabase ao abrir o app.
                  </p>
                  <strong className="text-foreground">Cupom Sincronizado com o Supabase (v3.6.4):</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5 mb-2">
                    A configuração do Bilhete de Embarque passa a ser salva na nuvem (empresas.cupom_config) e fica igual em todos os aparelhos.
                  </p>
                  <strong className="text-foreground">Cupom Configurável, PIX e Nº do Bilhete (v3.6.3):</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5 mb-2">
                    Origem, Parada, Próxima Parada e Destino do Bilhete de Embarque agora são definidos nas Configurações da Empresa; PIX em maiúsculas e número do bilhete corrigido.
                  </p>
                  <strong className="text-foreground">Tempo de Preparo & Custos Fiéis ao Banco (v3.6.2):</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5 mb-2">
                    O tempo de preparo (ex.: 30 min) agora aparece e pode ser editado na Ficha Técnica, e os custos respeitam exatamente os valores do Supabase, inclusive R$ 0,00.
                  </p>
                  <strong className="text-foreground">Blindagem da Edição de Ficha Técnica & DRE (v3.6.1):</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Proteção contra ghost-clicks de telas sensíveis (delay guard de 650ms), botão "Salvar Ficha" destacado em esmeralda, separação de botões para evitar toques concorrentes e trava de segurança ao trocar de sabor com dados não salvos.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary mt-0.5">
                  <Layers className="h-3.5 w-3.5" />
                </div>
                <div>
                  <strong className="text-foreground">Detecção de Teclado Móvel & Ocultação de Barra:</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    A barra de navegação inferior flutuante se esconde suavemente ao focar em campos de digitação no celular, liberando tela limpa para preencher ingredientes e custos.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5">
                  <Smartphone className="h-3.5 w-3.5" />
                </div>
                <div>
                  <strong className="text-foreground">Sincronização Híbrida Supabase com Fallback Local:</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Persistência garantida das fichas técnicas no navegador e na nuvem, compatibilidade com IDs numéricos e alfanuméricos e pausa de polling durante a edição.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Past Version: v3.5.8 a v3.5.9 */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-bold text-foreground">
                Versão 3.5.8 a 3.5.9 — Configurações da Empresa (7 Abas), Moeda pt-BR e Scanner ML Kit
              </span>
              <span className="text-[10px] text-muted-foreground">01 a 02/11/2026</span>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Painel da Empresa com 7 abas responsivas, navegação por setas e suporte a rolagem por roda do mouse.</li>
              <li>Campos de moeda e valores numéricos com separador pt-BR (vírgula) e liberdade total de exclusão pelo teclado.</li>
              <li>Scanner de cotações com Google ML Kit padronizado em alta velocidade.</li>
            </ul>
          </div>

          {/* Past Version: v3.5.5 a v3.5.7 */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-bold text-foreground">
                Versão 3.5.5 a 3.5.7 — Governança RSC Sistemas, Unidades Independentes & Proteção
              </span>
              <span className="text-[10px] text-muted-foreground">30 a 31/10/2026</span>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Independência total entre unidade da Quantidade Necessária (un, cx, pct) e Embalagem/Tamanho (395 g, 1 L, 1000 un).</li>
              <li>Proteção contra edição direta em produtos oficiais RSC Sistemas com fluxo de aprovação exclusivo PereiraLabs.</li>
              <li>Links permanentes de download do APK Android no rodapé e correções de CORS no WebView.</li>
            </ul>
          </div>

          {/* Past Version: v3.4.4 - v3.4.9 */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-bold text-foreground">
                Versão 3.4.4 a 3.4.9 — Safe Area Mobile Galaxy A26, Imagens Culinárias IA & Consultoria
              </span>
              <span className="text-[10px] text-muted-foreground">26 a 29/10/2026</span>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Proteção nativa de Safe Area contra sobreposição de barras de navegação no Samsung Galaxy A26.</li>
              <li>Estúdio Culinário IA com seleção de embalagem real de saquinho de geladinho/chup-chup e prompt customizável.</li>
              <li>Consultoria inteligente restrita a consultores cadastrados e homologados PereiraLabs.</li>
              <li>Download de modelos pré-formatados em CSV e JSON com colunas de atacado e varejo.</li>
            </ul>
          </div>

          {/* Past Version: v3.3.0 */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-bold text-foreground">
                Versão 3.3.0 — Sincronização Master Multi-Aparelhos & SQL Supabase
              </span>
              <span className="text-[10px] text-muted-foreground">25/10/2026</span>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Sincronização em tempo real das empresas ativas via tabela public.empresas no Supabase.</li>
              <li>QR Code dinâmico para migração instantânea de portfólio multi-empresa entre aparelhos.</li>
              <li>Isolamento de dados cadastrais preservando sigilo de clientes entre unidades.</li>
            </ul>
          </div>

          {/* Past Version: v3.2.0 */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-bold text-foreground">
                Versão 3.2.0 — Atualização Automática OTA & Trava de Segurança
              </span>
              <span className="text-[10px] text-muted-foreground">24/10/2026</span>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Sincronização Over-The-Air automática ao desbloquear celular ou reabrir app.</li>
              <li>Trava de segurança para impedir finalização de vendas sem estoque em freezer.</li>
              <li>Onboarding e painel de empresas com cálculo pró-rata.</li>
            </ul>
          </div>

          {/* Past Version: v3.1.0 */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-bold text-foreground">
                Versão 3.1.0 — Caixa Obrigatório, Cupons & CRM WhatsApp
              </span>
              <span className="text-[10px] text-muted-foreground">24/10/2026</span>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <Receipt className="h-3.5 w-3.5" />
                </div>
                <div>
                  <strong className="text-foreground">Fechamento estilo Cupom Fiscal:</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Relatório para WhatsApp com divisórias duplas <code className="font-mono">===</code>, contagem física da gaveta (dinheiro/moedas), conferência da maquininha de cartão e balanço automático de sobra ou falta.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 mt-0.5">
                  <Store className="h-3.5 w-3.5" />
                </div>
                <div>
                  <strong className="text-foreground">Rastreamento de Canais de Venda:</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Seletor no PDV (Balcão, iFood, WhatsApp, Instagram, Outros) e novo gráfico comparativo no Painel de Administração alternando entre Pagamento e Canal/Origem.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-green-500/20 text-green-600 dark:text-green-400 mt-0.5">
                  <Smartphone className="h-3.5 w-3.5" />
                </div>
                <div>
                  <strong className="text-foreground">CRM de Clientes pelo WhatsApp:</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Chave primária pelo número de telefone sem senha, busca automática no PDV, histórico de pedidos, ticket médio e sugestão dos sabores favoritos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Past Version: v3.0.0 */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-bold text-foreground">
                Versão 3.0.0 — Sistema de Caixa & Cupons
              </span>
              <span className="text-[10px] text-muted-foreground">22/10/2026</span>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-foreground">Módulo de Turnos de Caixa:</strong> Abertura e fechamento com fundo de troco inicial.
              </li>
              <li>
                <strong className="text-foreground">Pix Stone OpenBank:</strong> Cobrança com QR Code dinâmico e liquidação via Webhook.
              </li>
              <li>
                <strong className="text-foreground">Cupons Não Fiscais Permanentes:</strong> Exportação em PDF (80mm), TXT, CSV e OFX via links sem custo de storage.
              </li>
              <li>
                <strong className="text-foreground">Perfil Operador de Caixa:</strong> Acesso restrito a vendas e caixa.
              </li>
              <li>
                <strong className="text-foreground">Reposição por Receitas:</strong> Reposição baseada no rendimento oficial de cada lote.
              </li>
            </ul>
          </div>

          {/* Past Version: v2.0.0 */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-bold text-foreground">
                Versão 2.0.0 — Auditoria & Leitor de Código de Barras
              </span>
              <span className="text-[10px] text-muted-foreground">21/10/2026</span>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-foreground">Auditoria de Estoque:</strong> Notificação por e-mail e controle de perdas/avarias.
              </li>
              <li>
                <strong className="text-foreground">Leitor de Código de Barras:</strong> Escaneamento EAN/GTIN pela câmera com integração RSC GTIN.
              </li>
              <li>
                <strong className="text-foreground">White-Label Dinâmico:</strong> Configurações da empresa editáveis no próprio navegador.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border/70 bg-secondary/30 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onForceReload}
              className="text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
              title="Recarregar a página com função F5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Recarregar / OTA (F5)</span>
            </Button>

            <a
              href={apkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Baixar APK (v{targetVer})</span>
            </a>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold"
          >
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
};
