import React from "react";
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
} from "lucide-react";
import { Button, Badge } from "@/components/ui/primitives";
import { BRAND_CONFIG } from "@/config/brand.config";

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
  if (!isOpen) return null;

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
          {/* Active Version Highlight: v3.4.0 */}
          <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-primary/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-black text-foreground">
                  Versão 3.4.0 (Versão Oficial OTA Instalada)
                </span>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                25/10/2026 • Estável
              </span>
            </div>

            <div className="mt-3.5 space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary mt-0.5">
                  <Camera className="h-3.5 w-3.5" />
                </div>
                <div>
                  <strong className="text-foreground">Leitor de Código de Barras por Câmera no PDV & Lista:</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Abertura direta da câmera sem passos extras. Lê códigos GTIN/EAN com alta precisão e preenche automaticamente os campos de busca e cadastro.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5">
                  <Barcode className="h-3.5 w-3.5" />
                </div>
                <div>
                  <strong className="text-foreground">Detecção Inteligente de Duplicados & Incremento (+1 Unidade):</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Se o produto já estiver no pedido ou na lista de compras, o app notifica imediatamente e permite adicionar +1 unidade com apenas 1 toque.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <Smartphone className="h-3.5 w-3.5" />
                </div>
                <div>
                  <strong className="text-foreground">Eliminação de Rolagem Lateral & Design Mobile Nativo:</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Remoção completa de transbordamento horizontal. Tabelas convertidas em cartões adaptativos modernos para telas de celulares Android e PWA.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 mt-0.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <div>
                  <strong className="text-foreground">Segurança Master & APK Oficial PereiraLabs:</strong>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Remoção de botões de autofill master para proteção de credenciais e empacotamento do APK PereiraLabs PDV Foods v3.4.0.
                  </p>
                </div>
              </div>
            </div>
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
        <div className="border-t border-border/70 bg-secondary/30 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onForceReload}
            className="text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            title="Recarregar a página com função F5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Recarregar Aplicativo (F5)</span>
          </Button>

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
