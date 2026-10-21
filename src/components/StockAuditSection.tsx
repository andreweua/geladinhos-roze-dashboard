import React, { useMemo, useState } from "react";
import {
  ShieldCheck,
  Package,
  History,
  Mail,
  Plus,
  AlertTriangle,
  Search,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Edit,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  AuditoriaEstoqueLog,
  generateAuditEmailContent,
  loadAuditLogs,
  loadAuditRecipients,
  loadMateriaPrimaCatalog,
  MateriaPrimaItem,
  saveAuditRecipients,
  updateMateriaPrimaStock,
} from "@/services/auditService";
import { EstoquePorProduto } from "@/types/dashboard";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/primitives";

interface StockAuditSectionProps {
  inventoryByFlavor: EstoquePorProduto[];
  onUpdateFlavorStock: (
    produtoId: string,
    newQty: number,
    auditInfo?: {
      adminNome?: string;
      motivo?: string;
      observacoes?: string;
    }
  ) => Promise<void>;
}

export const StockAuditSection: React.FC<StockAuditSectionProps> = ({
  inventoryByFlavor,
  onUpdateFlavorStock,
}) => {
  // Live state
  const [logs, setLogs] = useState<AuditoriaEstoqueLog[]>(() => loadAuditLogs());
  const [materiaPrima, setMateriaPrima] = useState<MateriaPrimaItem[]>(() =>
    loadMateriaPrimaCatalog()
  );
  const [recipients, setRecipients] = useState<string[]>(() =>
    loadAuditRecipients()
  );

  // Filters
  const [filterText, setFilterText] = useState("");
  const [filterType, setFilterType] = useState<
    "todos" | "geladinho_pronto" | "materia_prima_insumo"
  >("todos");

  // Modals state
  const [flavorModalOpen, setFlavorModalOpen] = useState(false);
  const [flavorForm, setFlavorForm] = useState({
    produtoId: inventoryByFlavor[0]?.produto_id || "",
    novoEstoque: 10,
    motivo: "Inventário físico no freezer",
    adminNome: "Andrew Pereira (Admin)",
    observacoes: "",
  });

  const [mpModalOpen, setMpModalOpen] = useState(false);
  const [mpForm, setMpForm] = useState({
    itemId: materiaPrima[0]?.id || "",
    novoEstoque: 500,
    motivo: "Inventário físico na despensa",
    adminNome: "Andrew Pereira (Admin)",
    observacoes: "",
  });

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");

  const [selectedLogPreview, setSelectedLogPreview] =
    useState<AuditoriaEstoqueLog | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchType = filterType === "todos" || log.tipo_item === filterType;
      const matchText =
        !filterText.trim() ||
        log.item_nome.toLowerCase().includes(filterText.toLowerCase()) ||
        log.admin_responsavel.toLowerCase().includes(filterText.toLowerCase()) ||
        log.motivo_ajuste.toLowerCase().includes(filterText.toLowerCase());
      return matchType && matchText;
    });
  }, [logs, filterType, filterText]);

  // Handlers
  const handleOpenFlavorModal = (produtoId?: string) => {
    const target = produtoId
      ? inventoryByFlavor.find((p) => p.produto_id === produtoId)
      : inventoryByFlavor[0];
    setFlavorForm({
      produtoId: target?.produto_id || "",
      novoEstoque: target?.quantidade_disponivel || 0,
      motivo: "Inventário físico no freezer",
      adminNome: "Andrew Pereira (Admin)",
      observacoes: "",
    });
    setFlavorModalOpen(true);
  };

  const handleOpenMpModal = (itemId?: string) => {
    const target = itemId
      ? materiaPrima.find((m) => m.id === itemId)
      : materiaPrima[0];
    setMpForm({
      itemId: target?.id || "",
      novoEstoque: target?.quantidade_em_estoque || 0,
      motivo: "Inventário físico na despensa",
      adminNome: "Andrew Pereira (Admin)",
      observacoes: "",
    });
    setMpModalOpen(true);
  };

  const handleSaveFlavorStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flavorForm.produtoId) return;

    try {
      await onUpdateFlavorStock(flavorForm.produtoId, flavorForm.novoEstoque, {
        adminNome: flavorForm.adminNome,
        motivo: flavorForm.motivo,
        observacoes: flavorForm.observacoes,
      });

      const updatedLogs = loadAuditLogs();
      setLogs(updatedLogs);
      setFlavorModalOpen(false);
      setFeedbackNotice(
        `✓ Estoque do geladinho atualizado com sucesso! Log de auditoria registrado e notificação preparada para ${recipients.length} e-mail(s).`
      );
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err: unknown) {
      alert("Erro ao atualizar estoque: " + String(err));
    }
  };

  const handleSaveMpStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpForm.itemId) return;

    try {
      updateMateriaPrimaStock(
        mpForm.itemId,
        mpForm.novoEstoque,
        mpForm.adminNome,
        mpForm.motivo,
        mpForm.observacoes
      );

      setMateriaPrima(loadMateriaPrimaCatalog());
      setLogs(loadAuditLogs());
      setMpModalOpen(false);
      setFeedbackNotice(
        `✓ Estoque da matéria-prima atualizado com sucesso! Auditoria registrada.`
      );
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err: unknown) {
      alert("Erro ao atualizar matéria-prima: " + String(err));
    }
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmailInput.trim().toLowerCase();
    if (!clean || !clean.includes("@") || !clean.includes(".")) {
      alert("Por favor, digite um e-mail válido.");
      return;
    }
    if (recipients.includes(clean)) {
      alert("Este e-mail já está cadastrado.");
      return;
    }
    const updated = [...recipients, clean];
    saveAuditRecipients(updated);
    setRecipients(updated);
    setNewEmailInput("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    if (recipients.length <= 1) {
      alert("Mantenha pelo menos um e-mail cadastrado para auditoria.");
      return;
    }
    const updated = recipients.filter((e) => e !== emailToRemove);
    saveAuditRecipients(updated);
    setRecipients(updated);
  };

  return (
    <section
      id="auditoria-estoque-section"
      className="space-y-6 pt-2"
      aria-label="Auditoria de Estoque e Ajustes Administrativos"
    >
      {/* Header Banner */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
                Auditoria de Estoque & Segurança Operacional
              </h2>
              <Badge variant="outline" className="border-primary/40 text-primary font-bold">
                Módulo Admin
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
              Rastreabilidade obrigatória para ajustes manuais no estoque físico de geladinhos e matéria-prima.
              Toda alteração do Admin fica registrada com data, motivo, responsável e notificação para{" "}
              <strong>{recipients.length} e-mail(s) cadastrados</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmailModalOpen(true)}
              className="text-xs"
            >
              <Mail className="h-3.5 w-3.5 mr-1.5 text-primary" />
              <span>E-mails ({recipients.length})</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenMpModal()}
              className="text-xs"
            >
              <Package className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
              <span>Ajustar Matéria-Prima</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => handleOpenFlavorModal()}
              className="bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:opacity-90"
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              <span>Ajustar Geladinho (Admin)</span>
            </Button>
          </div>
        </div>
      </div>

      {feedbackNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Grid: Matéria-Prima e Embalagens */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Estoque de Matéria-Prima, Sobras & Descartáveis
            </h3>
            <p className="text-xs text-muted-foreground">
              Saldos reais controlados na despensa (ingredientes e embalagens)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenMpModal()}
            className="text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ajustar Saldo de Insumo
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {materiaPrima.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border/70 bg-secondary/20 p-3 text-xs flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  {item.categoria}
                </span>
                <p className="font-bold text-foreground mt-0.5">{item.nome}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Emb: {item.embalagem_padrao}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
                <div>
                  <span className="text-[10px] text-muted-foreground block">
                    Saldo Atual:
                  </span>
                  <span className="text-sm font-extrabold text-foreground">
                    {item.quantidade_em_estoque} {item.unidade}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenMpModal(item.id)}
                  className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors"
                  title="Ajustar estoque deste insumo"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Histórico de Auditoria & Alterações do Administrador
            </h3>
            <p className="text-xs text-muted-foreground">
              Registro imutável de todas as baixas, correções de inventário e reposições manuais
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Buscar por sabor, admin ou motivo..."
                className="rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none w-52 sm:w-64"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="geladinho_pronto">Geladinhos Prontos</option>
              <option value="materia_prima_insumo">Matéria-Prima / Insumos</option>
            </select>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            Nenhum registro de auditoria encontrado para o filtro selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-secondary/50 font-bold text-foreground">
                <tr>
                  <th className="py-2.5 px-3">Data & Hora</th>
                  <th className="py-2.5 px-3">Item / Sabor</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 text-center">Diferença (Δ)</th>
                  <th className="py-2.5 px-3 text-center">Anterior → Novo</th>
                  <th className="py-2.5 px-3">Motivo Informado</th>
                  <th className="py-2.5 px-3">Admin</th>
                  <th className="py-2.5 px-3 text-center">Notificação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => {
                  const deltaPositive = log.diferenca > 0;
                  const deltaZero = log.diferenca === 0;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                        {new Date(log.timestamp).toLocaleDateString("pt-BR")}{" "}
                        <span className="font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-bold text-foreground">
                        {log.item_nome}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            log.tipo_item === "geladinho_pronto"
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                              : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {log.tipo_item === "geladinho_pronto"
                            ? "Geladinho 150ml"
                            : "Matéria-Prima"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs font-black ${
                            deltaPositive
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : deltaZero
                              ? "bg-secondary text-muted-foreground"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {deltaPositive ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {deltaPositive ? `+${log.diferenca}` : `${log.diferenca}`}{" "}
                          {log.unidade_medida}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono text-muted-foreground whitespace-nowrap">
                        {log.quantidade_anterior} →{" "}
                        <strong className="text-foreground">
                          {log.quantidade_nova} {log.unidade_medida}
                        </strong>
                      </td>

                      <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                        <span className="font-medium text-foreground">
                          {log.motivo_ajuste}
                        </span>
                        {log.observacoes && (
                          <span className="text-[11px] block italic text-muted-foreground">
                            "{log.observacoes}"
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {log.admin_responsavel}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLogPreview(log)}
                          className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-primary hover:text-primary-foreground transition-all"
                          title="Ver detalhes do e-mail de notificação"
                        >
                          <Mail className="h-3 w-3" />
                          <span>{log.emails_notificados.length} e-mail(s)</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: AJUSTE DE GELADINHO PRONTO (ADMIN) */}
      {flavorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Edit className="h-4 w-4 text-primary" />
              Ajuste de Estoque de Geladinho (Admin)
            </h3>

            <form onSubmit={handleSaveFlavorStock} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Selecione o Sabor Gourmet:
                </label>
                <select
                  value={flavorForm.produtoId}
                  onChange={(e) => {
                    const sel = inventoryByFlavor.find((p) => p.produto_id === e.target.value);
                    setFlavorForm({
                      ...flavorForm,
                      produtoId: e.target.value,
                      novoEstoque: sel?.quantidade_disponivel || 0,
                    });
                  }}
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs focus:border-primary focus:outline-none"
                >
                  {inventoryByFlavor.map((p) => (
                    <option key={p.produto_id} value={p.produto_id}>
                      {p.nome} (Atual no freezer: {p.quantidade_disponivel} un.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  Novo Saldo Físico no Freezer (Unidades):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={flavorForm.novoEstoque}
                  onChange={(e) =>
                    setFlavorForm({
                      ...flavorForm,
                      novoEstoque: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs font-mono font-bold focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  Motivo / Justificativa do Ajuste (Obrigatório para Auditoria):
                </label>
                <select
                  value={flavorForm.motivo}
                  onChange={(e) =>
                    setFlavorForm({ ...flavorForm, motivo: e.target.value })
                  }
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="Inventário físico no freezer">
                    Inventário Físico / Contagem no Freezer
                  </option>
                  <option value="Quebra / Descarte / Embalagem Furada">
                    Quebra / Descarte / Embalagem Furada
                  </option>
                  <option value="Amostra / Degustação / Parceria">
                    Amostra / Degustação / Parceria
                  </option>
                  <option value="Consumo interno / Doação">
                    Consumo Interno / Doação
                  </option>
                  <option value="Correção de lançamento de venda anterior">
                    Correção de Lançamento de Venda Anterior
                  </option>
                  <option value="Outro motivo operacional">Outro Motivo</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  Administrador Responsável:
                </label>
                <input
                  type="text"
                  required
                  value={flavorForm.adminNome}
                  onChange={(e) =>
                    setFlavorForm({ ...flavorForm, adminNome: e.target.value })
                  }
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  Observações Adicionais (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={flavorForm.observacoes}
                  onChange={(e) =>
                    setFlavorForm({ ...flavorForm, observacoes: e.target.value })
                  }
                  placeholder="Ex: 2 unidades descartadas por quebra de lacre durante o transporte..."
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="rounded-lg bg-secondary/50 p-2.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  Este ajuste será salvo e enviado para {recipients.length} e-mail(s).
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFlavorModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary text-primary-foreground font-bold"
                >
                  Confirmar & Registrar Auditoria
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AJUSTE DE MATÉRIA-PRIMA / INSUMO (ADMIN) */}
      {mpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Package className="h-4 w-4 text-amber-500" />
              Ajuste de Matéria-Prima / Insumos
            </h3>

            <form onSubmit={handleSaveMpStock} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Insumo / Embalagem:
                </label>
                <select
                  value={mpForm.itemId}
                  onChange={(e) => {
                    const sel = materiaPrima.find((m) => m.id === e.target.value);
                    setMpForm({
                      ...mpForm,
                      itemId: e.target.value,
                      novoEstoque: sel?.quantidade_em_estoque || 0,
                    });
                  }}
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs focus:border-primary focus:outline-none"
                >
                  {materiaPrima.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome} (Atual: {m.quantidade_em_estoque} {m.unidade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  Novo Saldo na Despensa:
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={mpForm.novoEstoque}
                  onChange={(e) =>
                    setMpForm({
                      ...mpForm,
                      novoEstoque: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs font-mono font-bold focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  Motivo do Ajuste:
                </label>
                <select
                  value={mpForm.motivo}
                  onChange={(e) =>
                    setMpForm({ ...mpForm, motivo: e.target.value })
                  }
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="Inventário físico na despensa">
                    Inventário Físico / Pesagem na Despensa
                  </option>
                  <option value="Perda por validade ou vazamento">
                    Perda por Validade ou Vazamento
                  </option>
                  <option value="Consumo em testes de receita">
                    Consumo em Testes de Receita
                  </option>
                  <option value="Compra não registrada via nota fiscal">
                    Entrada Manual / Compra Rápida
                  </option>
                  <option value="Outro ajuste">Outro Ajuste</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  Administrador Responsável:
                </label>
                <input
                  type="text"
                  required
                  value={mpForm.adminNome}
                  onChange={(e) =>
                    setMpForm({ ...mpForm, adminNome: e.target.value })
                  }
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMpModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary text-primary-foreground font-bold"
                >
                  Salvar Ajuste
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: GERENCIAR E-MAILS DE AUDITORIA */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Mail className="h-4 w-4 text-primary" />
              Destinatários de E-mail de Auditoria
            </h3>

            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Toda vez que o estoque for alterado manualmente por um administrador, um relatório será registrado e enviado para os e-mails abaixo:
            </p>

            <form onSubmit={handleAddEmail} className="mt-4 flex items-center gap-2">
              <input
                type="email"
                required
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                placeholder="Ex: auditoria@pereiralabs.com"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
              />
              <Button type="submit" size="sm" className="bg-primary font-bold text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </form>

            <div className="mt-4 max-h-56 overflow-y-auto space-y-1.5 divide-y divide-border/60">
              {recipients.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between pt-1.5 text-xs text-foreground"
                >
                  <span className="font-mono">{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    className="p-1 text-muted-foreground hover:text-rose-500 transition-colors"
                    title="Remover e-mail"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end border-t border-border pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmailModalOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DETALHES DO E-MAIL DE AUDITORIA */}
      {selectedLogPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Mail className="h-4 w-4 text-primary" />
              Relatório de Auditoria Disparado
            </h3>

            {(() => {
              const { subject, body, mailtoUrl } =
                generateAuditEmailContent(selectedLogPreview);
              return (
                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <span className="font-bold text-foreground block">
                      Assunto do E-mail:
                    </span>
                    <p className="mt-1 rounded bg-secondary/60 p-2 font-mono text-[11px] text-foreground">
                      {subject}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-foreground block">
                      Destinatários ({selectedLogPreview.emails_notificados.length}):
                    </span>
                    <p className="mt-1 rounded bg-secondary/60 p-2 font-mono text-[11px] text-foreground">
                      {selectedLogPreview.emails_notificados.join(", ")}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-foreground block">
                      Corpo da Notificação:
                    </span>
                    <pre className="mt-1 rounded bg-secondary/60 p-3 font-mono text-[10px] text-foreground whitespace-pre-wrap max-h-56 overflow-y-auto">
                      {body}
                    </pre>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <a
                      href={mailtoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir no Aplicativo de E-mail
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLogPreview(null)}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </section>
  );
};
