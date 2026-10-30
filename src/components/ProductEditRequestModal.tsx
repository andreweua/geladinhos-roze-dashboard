import React, { useState, useEffect } from "react";
import {
  Lock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Send,
  Barcode,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button, Badge } from "@/components/ui/primitives";
import {
  createProductEditRequest,
  getPendingEditRequestForProduct,
  approveProductEditRequest,
  rejectProductEditRequest,
  SolicitacaoEdicaoProdutoOficial,
} from "@/services/gtinService";
import { getActiveCompany, isPereiraLabsMaster } from "@/services/companyService";
import { getCurrentUser } from "@/services/authService";

export interface OfficialProductTarget {
  gtin?: string;
  nome_atual: string;
  marca_atual: string;
  quantidade_embalagem_atual: number;
  unidade_medida_atual: "g" | "kg" | "ml" | "l" | "un";
  fonte_original?: "rsc_sistemas" | "catalogo_local";
}

interface ProductEditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: OfficialProductTarget | null;
  onSuccess?: (info: {
    action: "requested" | "approved" | "rejected";
    updatedData?: {
      nome: string;
      marca: string;
      quantidade_embalagem: number;
      unidade_medida: "g" | "kg" | "ml" | "l" | "un";
    };
  }) => void;
}

const MOTIVOS_SUGERIDOS = [
  "Peso / tamanho da embalagem mudou (reduflação ou nova embalagem)",
  "Marca divergente ou não identificada no RSC Sistemas",
  "Nome abreviado ou incompleto na base RSC Sistemas",
  "Unidade de medida incorreta (ex: g vs ml)",
];

export const ProductEditRequestModal: React.FC<ProductEditRequestModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess,
}) => {
  const [nomeSugerido, setNomeSugerido] = useState("");
  const [marcaSugerida, setMarcaSugerida] = useState("");
  const [qtdSugerida, setQtdSugerida] = useState<number>(395);
  const [unidadeSugerida, setUnidadeSugerida] = useState<"g" | "kg" | "ml" | "l" | "un">("g");
  const [motivoDivergencia, setMotivoDivergencia] = useState("");
  const [existingPending, setExistingPending] = useState<SolicitacaoEdicaoProdutoOficial | undefined>(
    undefined
  );
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const activeCompany = getActiveCompany();
  const currentUser = getCurrentUser();
  const isMasterAdmin =
    isPereiraLabsMaster({ id: activeCompany?.id, email: currentUser?.email }) ||
    currentUser?.email?.toLowerCase() === "admin@pereiralabs.com";

  useEffect(() => {
    if (isOpen && product) {
      const pending = getPendingEditRequestForProduct(product.gtin, product.nome_atual);
      setExistingPending(pending);
      setSubmittedSuccess(false);

      if (pending) {
        setNomeSugerido(pending.nome_sugerido);
        setMarcaSugerida(pending.marca_sugerida);
        setQtdSugerida(pending.quantidade_embalagem_sugerida);
        setUnidadeSugerida(pending.unidade_medida_sugerida);
        setMotivoDivergencia(pending.motivo_divergencia);
      } else {
        setNomeSugerido(product.nome_atual);
        setMarcaSugerida(product.marca_atual || "");
        setQtdSugerida(product.quantidade_embalagem_atual || 1);
        setUnidadeSugerida(product.unidade_medida_atual || "g");
        setMotivoDivergencia("");
      }
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeSugerido.trim()) return;

    const created = createProductEditRequest({
      gtin: product.gtin,
      nome_atual: product.nome_atual,
      marca_atual: product.marca_atual,
      quantidade_embalagem_atual: product.quantidade_embalagem_atual,
      unidade_medida_atual: product.unidade_medida_atual,
      fonte_original: product.fonte_original || "rsc_sistemas",
      nome_sugerido: nomeSugerido.trim().toUpperCase(),
      marca_sugerida: marcaSugerida.trim() || "Geral",
      quantidade_embalagem_sugerida: Number(qtdSugerida) || 1,
      unidade_medida_sugerida: unidadeSugerida,
      motivo_divergencia:
        motivoDivergencia.trim() || "Solicitação de ajuste nos dados oficiais do produto",
      empresa_id: activeCompany?.id || "emp-roze-gourmet",
      empresa_nome: activeCompany?.nome || "Geladinhos Gourmet da Roze",
      solicitado_por: currentUser?.name || activeCompany?.responsavel || "Usuário Operacional",
    });

    setExistingPending(created);
    setSubmittedSuccess(true);
    if (onSuccess) {
      onSuccess({ action: "requested" });
    }
  };

  const handleMasterDirectApprove = () => {
    let reqToApprove = existingPending;
    if (!reqToApprove) {
      reqToApprove = createProductEditRequest({
        gtin: product.gtin,
        nome_atual: product.nome_atual,
        marca_atual: product.marca_atual,
        quantidade_embalagem_atual: product.quantidade_embalagem_atual,
        unidade_medida_atual: product.unidade_medida_atual,
        fonte_original: product.fonte_original || "rsc_sistemas",
        nome_sugerido: nomeSugerido.trim().toUpperCase(),
        marca_sugerida: marcaSugerida.trim() || "Geral",
        quantidade_embalagem_sugerida: Number(qtdSugerida) || 1,
        unidade_medida_sugerida: unidadeSugerida,
        motivo_divergencia:
          motivoDivergencia.trim() || "Revisão direta aprovada pela PereiraLabs Master",
        empresa_id: activeCompany?.id || "emp-roze-gourmet",
        empresa_nome: activeCompany?.nome || "Geladinhos Gourmet da Roze",
        solicitado_por: currentUser?.name || "PereiraLabs Master",
      });
    }

    const approved = approveProductEditRequest(reqToApprove.id, {
      nome: nomeSugerido.trim().toUpperCase(),
      marca: marcaSugerida.trim() || "Geral",
      quantidade_embalagem: Number(qtdSugerida) || 1,
      unidade_medida: unidadeSugerida,
      parecer: "Aprovado diretamente pela curadoria oficial PereiraLabs.",
    });

    if (approved && onSuccess) {
      onSuccess({
        action: "approved",
        updatedData: {
          nome: approved.nome_sugerido,
          marca: approved.marca_sugerida,
          quantidade_embalagem: approved.quantidade_embalagem_sugerida,
          unidade_medida: approved.unidade_medida_sugerida,
        },
      });
    }
    onClose();
  };

  const handleMasterReject = () => {
    if (!existingPending) return;
    rejectProductEditRequest(
      existingPending.id,
      "Recusado pela PereiraLabs. Dados originais da RSC Sistemas mantidos."
    );
    if (onSuccess) {
      onSuccess({ action: "rejected" });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                  Solicitar Correção de Produto Oficial
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold"
                >
                  Aprovação Exclusiva PereiraLabs
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Dados originados da base oficial RSC Sistemas / Banco de Dados PereiraLabs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Explicação da Regra de Governança */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Por que este produto está bloqueado para edição direta?</span>
          </div>
          <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
            Este produto foi localizado no <strong>RSC Sistemas / Banco de Dados Oficial</strong> e não foi cadastrado manualmente pelo usuário. Caso encontre dados divergentes (peso da embalagem, marca ou descrição), envie a sugestão abaixo — <strong>somente a PereiraLabs pode aprovar a alteração oficial</strong>.
          </p>
        </div>

        {/* Quadro 1: Dados Oficiais Atuais (Bloqueados) */}
        <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3 text-amber-500" />
              Cadastro Oficial Atual (RSC Sistemas / Banco)
            </span>
            {product.gtin && (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-primary">
                <Barcode className="h-3.5 w-3.5" />
                {product.gtin}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div className="sm:col-span-2">
              <span className="text-[10px] text-muted-foreground block">Produto Oficial:</span>
              <strong className="text-xs font-extrabold text-foreground block truncate">
                {product.nome_atual}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Marca / Embalagem:</span>
              <strong className="text-xs font-bold text-foreground block">
                {product.marca_atual || "Geral"} • {product.quantidade_embalagem_atual}
                {product.unidade_medida_atual}
              </strong>
            </div>
          </div>
        </div>

        {/* Feedback se já foi enviado */}
        {submittedSuccess && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs space-y-1.5 animate-in fade-in">
            <div className="flex items-center gap-2 font-extrabold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Solicitação enviada para aprovação da PereiraLabs!</span>
            </div>
            <p className="text-[11px] text-emerald-800/90 dark:text-emerald-200/90">
              Sua sugestão de correção ficou registrada com status <strong>Pendente</strong>. Assim que a equipe <strong>PereiraLabs</strong> aprovar no Painel Master, o produto será atualizado automaticamente no sistema.
            </p>
          </div>
        )}

        {existingPending && !submittedSuccess && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Clock className="h-4 w-4 shrink-0 animate-pulse" />
              <span>
                Já existe uma solicitação pendente aguardando aprovação da PereiraLabs para este produto.
              </span>
            </div>
          </div>
        )}

        {/* Formulário de Sugestão de Correção */}
        <form onSubmit={handleSubmitRequest} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-foreground mb-1">
              Nome Correto Sugerido *:
            </label>
            <input
              type="text"
              required
              value={nomeSugerido}
              onChange={(e) => setNomeSugerido(e.target.value)}
              placeholder="Ex: MIST BOLO APTI 300G ZERO AÇÚCAR CHOC SUÍÇO"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold uppercase text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-bold text-foreground mb-1">
                Marca Correta *:
              </label>
              <input
                type="text"
                required
                value={marcaSugerida}
                onChange={(e) => setMarcaSugerida(e.target.value)}
                placeholder="Ex: Apti, Nestlé..."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">
                Tam. Embalagem *:
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={qtdSugerida}
                onChange={(e) => setQtdSugerida(parseFloat(e.target.value) || 1)}
                placeholder="395"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">
                Unid. Embalagem *:
              </label>
              <select
                value={unidadeSugerida}
                onChange={(e) =>
                  setUnidadeSugerida(e.target.value as "g" | "kg" | "ml" | "l" | "un")
                }
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
              >
                <option value="g">Gramas (g)</option>
                <option value="kg">Quilos (kg)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="l">Litros (L)</option>
                <option value="un">Unidade (un)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-foreground mb-1">
              Qual a divergência encontrada? *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {MOTIVOS_SUGERIDOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivoDivergencia(m)}
                  className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition-all ${
                    motivoDivergencia === m
                      ? "border-primary bg-primary/15 text-primary font-bold"
                      : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              required
              value={motivoDivergencia}
              onChange={(e) => setMotivoDivergencia(e.target.value)}
              placeholder="Descreva o que está divergente em relação ao produto físico..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Ações Exclusivas caso o administrador logado seja a própria PereiraLabs Master */}
          {isMasterAdmin && (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Ação Exclusiva PereiraLabs Master Detectada
                </span>
                <Badge className="bg-primary text-primary-foreground text-[9px]">
                  Curadoria Oficial
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Como você está autenticado com perfil <strong>PereiraLabs Master</strong>, pode aprovar imediatamente esta alteração ou gerenciá-la no Painel Master.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleMasterDirectApprove}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Aprovar Agora (PereiraLabs)</span>
                </Button>
                {existingPending && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleMasterReject}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 font-bold text-xs gap-1.5"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Recusar Solicitação</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Rodapé do Modal */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {submittedSuccess ? "Fechar" : "Cancelar"}
            </Button>
            {!submittedSuccess && (
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="bg-primary text-primary-foreground font-bold gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>
                  {existingPending
                    ? "Atualizar Solicitação p/ PereiraLabs"
                    : "Enviar p/ Aprovação da PereiraLabs"}
                </span>
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
