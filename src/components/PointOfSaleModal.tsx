import React, { useMemo, useState, useEffect } from "react";
import {
  X,
  Plus,
  Minus,
  Trash2,
  QrCode,
  Copy,
  Check,
  Send,
  CreditCard,
  Banknote,
  Sparkles,
  Smartphone,
  User,
  ShoppingBag,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Percent,
  Radio,
  Loader2,
  CheckCircle2,
  Zap,
  Building2,
  AlertCircle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { BRAND_CONFIG } from "@/config/brand.config";
import { formatCurrency, formatNumber, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import { generatePixPayload } from "@/lib/pix";
import { EstoquePorProduto, PaymentMethod } from "@/types/dashboard";
import { NewSalePayload } from "@/services/dataService";
import {
  createStonePixCharge,
  subscribeToPixSettlement,
  simulateStoneWebhookPayment,
  StonePixResult,
} from "@/services/stonePixService";

interface PointOfSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryByFlavor: EstoquePorProduto[];
  onSubmitSale: (payload: NewSalePayload) => Promise<void>;
}

export const PointOfSaleModal: React.FC<PointOfSaleModalProps> = ({
  isOpen,
  onClose,
  inventoryByFlavor,
  onSubmitSale,
}) => {
  // Step 1: Items selection & Customer details | Step 2: Payment & Pix confirmation
  const [step, setStep] = useState<"cart" | "payment">("cart");

  // Cart Quantities: produto_id -> quantity
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Customer details
  const [clienteNome, setClienteNome] = useState<string>("");
  const [clienteTelefone, setClienteTelefone] = useState<string>("");

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Pix");

  // Cash change calculator state
  const [valorPagoDinheiro, setValorPagoDinheiro] = useState<string>("");

  // Interaction feedback states
  const [copiedPix, setCopiedPix] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Stone OpenBank Dynamic Pix states
  const [stonePixData, setStonePixData] = useState<StonePixResult | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "waiting" | "paid">("idle");
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState<boolean>(false);
  const [successAnimation, setSuccessAnimation] = useState<boolean>(false);

  // Merchant Ton Config
  const ton = BRAND_CONFIG.tonConfig;

  // Selected items calculation
  const selectedItems = useMemo(() => {
    return inventoryByFlavor
      .map((prod) => ({
        ...prod,
        qtdSelecionada: quantities[prod.produto_id] || 0,
      }))
      .filter((i) => i.qtdSelecionada > 0);
  }, [inventoryByFlavor, quantities]);

  const totalVenda = useMemo(() => {
    return selectedItems.reduce(
      (acc, item) => acc + item.qtdSelecionada * item.preco_venda,
      0
    );
  }, [selectedItems]);

  const totalUnidades = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + item.qtdSelecionada, 0);
  }, [selectedItems]);

  const custoTotalVenda = useMemo(() => {
    return selectedItems.reduce(
      (acc, item) => acc + item.qtdSelecionada * item.custo_estimado,
      0
    );
  }, [selectedItems]);

  const lucroEstimadoVenda = useMemo(() => {
    return Math.max(0, totalVenda - custoTotalVenda);
  }, [totalVenda, custoTotalVenda]);

  // Ton fee calculations
  const tonFeeRate = ton.rates[paymentMethod] || 0;
  const tonFeeAmount = Number((totalVenda * (tonFeeRate / 100)).toFixed(2));
  const repasseLiquidoTon = Number((totalVenda - tonFeeAmount).toFixed(2));

  // Dynamic Pix BR Code Payload fallback
  const pixData = useMemo(() => {
    if (totalVenda <= 0) return { payload: "", txId: "", cleanKey: ton.pixKey };
    return generatePixPayload({
      pixKey: ton.pixKey,
      merchantName: ton.merchantName,
      merchantCity: ton.merchantCity,
      amount: totalVenda,
      description: `Pedido ${totalUnidades}x Geladinhos`,
    });
  }, [totalVenda, totalUnidades, ton]);

  // Efeito para gerar cobrança dinâmica Stone Pix assim que entra no passo de pagamento
  useEffect(() => {
    if (step === "payment" && paymentMethod === "Pix" && totalVenda > 0) {
      let isCancelled = false;
      setIsGeneratingPix(true);
      createStonePixCharge({
        amount: totalVenda,
        description: `Pedido ${totalUnidades}x Geladinhos Roze`,
        cliente_nome: clienteNome.trim() || undefined,
        cliente_telefone: clienteTelefone.trim() || undefined,
        itens: selectedItems.map((i) => ({
          produto_id: i.produto_id,
          quantidade: i.qtdSelecionada,
          preco_unitario: i.preco_venda,
        })),
      })
        .then((res) => {
          if (!isCancelled) {
            setStonePixData(res);
            setPaymentStatus("waiting");
          }
        })
        .catch((err) => {
          console.warn("Falha ao gerar Pix Stone:", err);
        })
        .finally(() => {
          if (!isCancelled) setIsGeneratingPix(false);
        });

      return () => {
        isCancelled = true;
      };
    }
  }, [step, paymentMethod, totalVenda, totalUnidades]);

  // Escuta WebSocket em Tempo Real (Supabase Realtime) para liquidação automática via Webhook
  useEffect(() => {
    if (step === "payment" && paymentMethod === "Pix" && stonePixData?.venda_id) {
      setPaymentStatus("waiting");
      const unsubscribe = subscribeToPixSettlement(stonePixData.venda_id, async () => {
        setPaymentStatus("paid");
        setSuccessAnimation(true);
        await onSubmitSale({
          forma_pagamento: "Pix",
          cliente_nome: clienteNome.trim() || undefined,
          cliente_telefone: clienteTelefone.trim() || undefined,
          status: "concluida",
          pix_txid: stonePixData.txid,
          pix_copia_cola: stonePixData.copia_e_cola,
          itens: selectedItems.map((i) => ({
            produto_id: i.produto_id,
            quantidade: i.qtdSelecionada,
          })),
        });

        setTimeout(() => {
          setSuccessAnimation(false);
          setQuantities({});
          setClienteNome("");
          setClienteTelefone("");
          setStep("cart");
          setPaymentStatus("idle");
          onClose();
        }, 2800);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [step, paymentMethod, stonePixData?.venda_id]);

  if (!isOpen) return null;

  const handleQtyChange = (produtoId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[produtoId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [produtoId]: next };
    });
  };

  const handleSetExactQty = (produtoId: string, val: number) => {
    setQuantities((prev) => ({
      ...prev,
      [produtoId]: Math.max(0, val),
    }));
  };

  const activePixPayload = stonePixData?.copia_e_cola || pixData.payload;
  const activeTxId = stonePixData?.txid || pixData.txId;

  const handleCopyPix = async () => {
    if (!activePixPayload) return;
    try {
      await navigator.clipboard.writeText(activePixPayload);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleSendWhatsAppOrder = () => {
    const cleanPhone = clienteTelefone.replace(/\D/g, "");
    const greetingName = clienteNome.trim() ? clienteNome.trim() : "Cliente";

    const itemsSummary = selectedItems
      .map(
        (i) =>
          `• ${i.qtdSelecionada}x *${i.nome}* (${formatCurrency(i.preco_venda)}/un) = ${formatCurrency(
            i.qtdSelecionada * i.preco_venda
          )}`
      )
      .join("\n");

    const message = `🍧 *GELADINHOS GOURMET DA ROZE — NOVO PEDIDO* 🍧\n\nOlá, *${greetingName}*! Seu pedido foi registrado com sucesso:\n\n${itemsSummary}\n\n💰 *Total do Pedido: ${formatCurrency(
      totalVenda
    )}*\n💳 Forma de Pagamento: *Pix Dinâmico Stone OpenBank / Ton*\n🆔 Identificador (txid): \`${activeTxId}\`\n\n🔑 *Pix Copia e Cola:*\n\`\`\`\n${activePixPayload}\n\`\`\`\n\nChave Pix Direta: *${ton.pixKey}* (Ton / ${ton.merchantName})\n\nAssim que você efetuar o pagamento, nosso sistema Stone OpenBank confirmará o recebimento de forma 100% automática e seu pedido será separado na hora! 🛵✨`;

    const targetUrl = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(targetUrl, "_blank");
  };

  // Simulação imediata do Webhook Stone OpenBank para testes
  const handleSimulatePaymentWebhook = async () => {
    if (!stonePixData || isSimulatingWebhook) return;
    setIsSimulatingWebhook(true);
    try {
      await simulateStoneWebhookPayment(stonePixData.txid, stonePixData.venda_id);
      setPaymentStatus("paid");
      setSuccessAnimation(true);

      await onSubmitSale({
        forma_pagamento: "Pix",
        cliente_nome: clienteNome.trim() || undefined,
        cliente_telefone: clienteTelefone.trim() || undefined,
        status: "concluida",
        pix_txid: stonePixData.txid,
        pix_copia_cola: stonePixData.copia_e_cola,
        itens: selectedItems.map((i) => ({
          produto_id: i.produto_id,
          quantidade: i.qtdSelecionada,
        })),
      });

      setTimeout(() => {
        setSuccessAnimation(false);
        setQuantities({});
        setClienteNome("");
        setClienteTelefone("");
        setStep("cart");
        setPaymentStatus("idle");
        onClose();
      }, 2800);
    } catch (err) {
      console.error("Erro ao simular webhook Stone:", err);
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  const handleConfirmAndFinalizeSale = async () => {
    if (selectedItems.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmitSale({
        forma_pagamento: paymentMethod,
        cliente_nome: clienteNome.trim() || undefined,
        cliente_telefone: clienteTelefone.trim() || undefined,
        status: "concluida",
        pix_txid: paymentMethod === "Pix" ? activeTxId : undefined,
        pix_copia_cola: paymentMethod === "Pix" ? activePixPayload : undefined,
        itens: selectedItems.map((i) => ({
          produto_id: i.produto_id,
          quantidade: i.qtdSelecionada,
        })),
      });

      // Reset and close
      setQuantities({});
      setClienteNome("");
      setClienteTelefone("");
      setStep("cart");
      setPaymentStatus("idle");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const valorPagoNum = parseFloat(valorPagoDinheiro.replace(",", ".")) || 0;
  const trocoDinheiro = Math.max(0, valorPagoNum - totalVenda);

  const filteredFlavors = inventoryByFlavor.filter((prod) =>
    prod.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl text-foreground">
        {/* Celebration Overlay on Automated Webhook Settlement */}
        {successAnimation && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 p-6 text-center backdrop-blur-md animate-in fade-in zoom-in duration-300">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-inner mb-4 animate-bounce">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h3 className="text-2xl font-black text-foreground">
              Pagamento Recebido com Sucesso!
            </h3>
            <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Liquidação Bancária Confirmada via Webhook Stone OpenBank
            </p>
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-foreground max-w-sm">
              <p className="font-bold">
                ✓ {totalUnidades} geladinhos baixados automaticamente do estoque!
              </p>
              <p className="text-muted-foreground text-[11px] mt-1 font-mono">
                txid: {activeTxId}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4 bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Frente de Caixa (PDV) — Novo Pedido
                </h3>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  Stone OpenBank Pix
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Cobrança dinâmica Stone OpenBank, liquidação automática via Webhook e baixa de estoque
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator Tabs */}
        <div className="flex border-b border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStep("cart")}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
              step === "cart"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            1. Selecionar Sabores & Cliente ({totalUnidades} un • {formatCurrency(totalVenda)})
          </button>
          <button
            type="button"
            disabled={totalUnidades === 0}
            onClick={() => setStep("payment")}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 disabled:opacity-50 ${
              step === "payment"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            2. Pagamento & QR Code Pix ({formatCurrency(totalVenda)})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === "cart" ? (
            <div className="space-y-5">
              {/* Customer Contact Strip (Optional for WhatsApp receipt) */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/80 bg-background/60 p-3.5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    Nome do Cliente (Opcional):
                  </label>
                  <input
                    type="text"
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    placeholder="Ex: Mariana Silva"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    WhatsApp com DDD (para envio do Pix e recibo):
                  </label>
                  <input
                    type="tel"
                    value={clienteTelefone}
                    onChange={(e) => setClienteTelefone(e.target.value)}
                    placeholder="Ex: 14988183327"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Flavor Selector & Stock Status */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cardápio Artesanal (150ml) — Toque para adicionar:
                  </h4>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar sabor..."
                    className="w-48 rounded-lg border border-input bg-background px-2.5 py-1 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-2">
                  {filteredFlavors.map((prod) => {
                    const selectedQty = quantities[prod.produto_id] || 0;
                    const isLow = prod.abaixo_do_minimo;

                    return (
                      <div
                        key={prod.produto_id}
                        className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                          selectedQty > 0
                            ? "border-primary/60 bg-primary/5 shadow-sm"
                            : "border-border/70 bg-card hover:border-border"
                        }`}
                      >
                        <div className="flex-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground">
                              {prod.nome}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            <span className="font-bold text-primary">
                              {formatCurrency(prod.preco_venda)}
                            </span>
                            <span>•</span>
                            <span
                              className={
                                isLow
                                  ? "text-amber-600 dark:text-amber-400 font-semibold"
                                  : "text-muted-foreground"
                              }
                            >
                              Estoque: {prod.quantidade_disponivel} un.
                            </span>
                          </div>
                        </div>

                        {/* Stepper controls */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(prod.produto_id, -1)}
                            disabled={selectedQty === 0}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                          >
                            <Minus className="h-3 w-3" />
                          </button>

                          <span className="w-8 text-center text-xs font-extrabold text-foreground">
                            {selectedQty}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleQtyChange(prod.produto_id, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 shadow-sm"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: PAYMENT & PIX TON INTEGRATION */
            <div className="space-y-5">
              {/* Order Recap Banner */}
              <div className="rounded-xl border border-border/80 bg-secondary/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Pedido {clienteNome ? `de ${clienteNome}` : "Balcão"}:
                    </span>
                    <p className="text-lg font-extrabold text-foreground">
                      {totalUnidades} geladinhos selecionados
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">
                      Total a Pagar:
                    </span>
                    <p className="text-2xl font-black text-primary">
                      {formatCurrency(totalVenda)}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs">
                  {selectedItems.map((item) => (
                    <span
                      key={item.produto_id}
                      className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground"
                    >
                      {item.qtdSelecionada}x {item.nome}
                    </span>
                  ))}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Escolha o Meio de Pagamento (Taxas da Conta Ton):
                </label>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {(["Pix", "Dinheiro", "Cartao_Debito", "Cartao_Credito"] as PaymentMethod[]).map(
                    (m) => {
                      const rate = ton.rates[m] || 0;
                      const isSelected = paymentMethod === m;

                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                              : "border-border/80 bg-card hover:border-border"
                          }`}
                        >
                          <div className="flex w-full items-center justify-between">
                            {m === "Pix" ? (
                              <QrCode className="h-4 w-4 text-primary" />
                            ) : m === "Dinheiro" ? (
                              <Banknote className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <CreditCard className="h-4 w-4 text-indigo-600" />
                            )}
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                              {rate > 0 ? `${rate}% Ton` : "0% taxa"}
                            </span>
                          </div>
                          <span className="mt-2 text-xs font-bold text-foreground">
                            {PAYMENT_METHOD_LABELS[m]}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* PAYMENT DETAILS: PIX (STONE OPENBANK DYNAMIC BR CODE) */}
              {paymentMethod === "Pix" && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-4">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between rounded-xl bg-card border border-primary/20 p-2.5 px-3.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                      </span>
                      <span className="font-bold text-foreground">
                        Status Stone OpenBank:
                      </span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {paymentStatus === "waiting"
                          ? "Aguardando confirmação bancária..."
                          : paymentStatus === "paid"
                          ? "Pagamento Confirmado!"
                          : "Gerando cobrança dinâmica..."}
                      </span>
                    </div>

                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      Realtime Ativo
                    </span>
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* QR Code Container */}
                    <div className="flex flex-col items-center justify-center rounded-xl border border-primary/20 bg-white p-3 shadow-sm shrink-0 self-center">
                      {isGeneratingPix ? (
                        <div className="flex h-[175px] w-[175px] items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : (
                        <QRCodeSVG
                          value={activePixPayload}
                          size={175}
                          level="M"
                          includeMargin={true}
                        />
                      )}
                      <span className="mt-1 text-[10px] font-bold text-zinc-700">
                        Pague com qualquer banco via Pix
                      </span>
                    </div>

                    {/* Pix Actions & Stone details */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                            Stone OpenBank • PJ Ton
                          </span>
                          <span className="rounded-md bg-secondary px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                            txid: {activeTxId.slice(0, 16)}...
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold text-foreground mt-0.5">
                          {formatCurrency(totalVenda)} via Pix Dinâmico
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Favorecido: <strong>{ton.merchantName}</strong> • Praça: {ton.merchantCity}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={handleCopyPix}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-card border border-border px-3.5 py-2 text-xs font-bold text-foreground shadow-sm hover:bg-secondary transition-colors"
                        >
                          {copiedPix ? (
                            <>
                              <Check className="h-4 w-4 text-emerald-600" />
                              <span className="text-emerald-600">Código Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 text-primary" />
                              <span>Copiar Pix Copia e Cola</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleSendWhatsAppOrder}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                        >
                          <Send className="h-4 w-4" />
                          <span>Enviar pelo WhatsApp</span>
                        </button>
                      </div>

                      {/* Webhook Test Simulation Button */}
                      <div className="pt-1">
                        <button
                          type="button"
                          disabled={isSimulatingWebhook}
                          onClick={handleSimulatePaymentWebhook}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                        >
                          {isSimulatingWebhook ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Simulando Webhook Stone OpenBank...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="h-3.5 w-3.5 text-amber-600" />
                              <span>⚡ Simular Liquidação Bancária (Stone Webhook)</span>
                            </>
                          )}
                        </button>
                        <span className="mt-1 block text-center text-[10px] text-muted-foreground">
                          Testa o recebimento instantâneo, animação de sucesso e baixa no estoque.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAYMENT DETAILS: DINHEIRO (CASH CHANGE CALCULATOR) */}
              {paymentMethod === "Dinheiro" && (
                <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-foreground">
                    Calculadora de Troco (Dinheiro Físico):
                  </h4>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <label className="text-[11px] text-muted-foreground block mb-1">
                        Valor entregue pelo cliente:
                      </label>
                      <input
                        type="text"
                        value={valorPagoDinheiro}
                        onChange={(e) => setValorPagoDinheiro(e.target.value)}
                        placeholder={`Ex: ${Math.ceil(totalVenda / 10) * 10},00`}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="flex gap-1.5 self-end sm:self-center">
                      {[10, 20, 50, 100].map((bill) => (
                        <button
                          key={bill}
                          type="button"
                          onClick={() => setValorPagoDinheiro(String(bill))}
                          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold hover:bg-secondary"
                        >
                          R$ {bill}
                        </button>
                      ))}
                    </div>
                  </div>

                  {valorPagoNum > 0 && (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex justify-between items-center">
                      <span>Troco a devolver:</span>
                      <span className="text-base">{formatCurrency(trocoDinheiro)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* PAYMENT DETAILS: CARTÃO TON */}
              {(paymentMethod === "Cartao_Credito" || paymentMethod === "Cartao_Debito") && (
                <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-2 text-xs">
                  <p className="font-bold text-foreground">
                    Passe o cartão na Maquininha TON:
                  </p>
                  <p className="text-muted-foreground">
                    Taxa da maquininha: <strong>{tonFeeRate}%</strong> ({formatCurrency(tonFeeAmount)}) • Repasse líquido estimado: <strong>{formatCurrency(repasseLiquidoTon)}</strong>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-border px-5 py-3.5 bg-secondary/20 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-muted-foreground">Itens no Pedido: </span>
            <strong className="text-foreground">
              {totalUnidades} un. ({formatCurrency(totalVenda)})
            </strong>
            {totalUnidades > 0 && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                (Lucro: +{formatCurrency(lucroEstimadoVenda)})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === "payment" && (
              <button
                type="button"
                onClick={() => setStep("cart")}
                className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                Voltar aos Sabores
              </button>
            )}

            {step === "cart" ? (
              <button
                type="button"
                disabled={totalUnidades === 0}
                onClick={() => setStep("payment")}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <span>Avançar para Pagamento Pix / TON</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmAndFinalizeSale}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Check className="h-4 w-4" />
                <span>Confirmar Pagamento e Baixar Estoque</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
