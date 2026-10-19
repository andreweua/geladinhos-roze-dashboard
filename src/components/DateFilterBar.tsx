import React from "react";
import { Calendar, PackagePlus } from "lucide-react";
import { DateFilterRange, DatePreset } from "@/types/dashboard";
import { Button } from "@/components/ui/primitives";
import { formatShortDate } from "@/lib/utils";

interface DateFilterBarProps {
  dateFilter: DateFilterRange;
  onSelectPreset: (preset: DatePreset) => void;
  onCustomDateChange: (start: Date, end: Date) => void;
  onOpenStockModal: () => void;
}

const PRESET_OPTIONS: Array<{ id: DatePreset; label: string }> = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "7dias", label: "7 dias" },
  { id: "este_mes", label: "Este mês" },
  { id: "mes_passado", label: "Mês passado" },
  { id: "3meses", label: "3 meses" },
  { id: "personalizado", label: "Personalizado" },
];

function toInputDateValue(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  dateFilter,
  onSelectPreset,
  onCustomDateChange,
  onOpenStockModal,
}) => {
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split("-").map(Number);
    const newStart = new Date(y, m - 1, d);
    onCustomDateChange(newStart, dateFilter.endDate);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split("-").map(Number);
    const newEnd = new Date(y, m - 1, d);
    onCustomDateChange(dateFilter.startDate, newEnd);
  };

  return (
    <section
      aria-label="Filtros globais de período"
      className="rounded-xl border border-border/80 bg-card p-3.5 shadow-sm sm:p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left label & active date range */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold">Período de Análise</span>
              <span className="ml-2 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {formatShortDate(dateFilter.startDate)} —{" "}
                {formatShortDate(dateFilter.endDate)}
              </span>
            </div>
          </div>

          {/* Mobile quick stock button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenStockModal}
            className="sm:hidden"
          >
            <PackagePlus className="h-3.5 w-3.5 text-rose-500" />
            <span>Estoque</span>
          </Button>
        </div>

        {/* Preset pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET_OPTIONS.map((opt) => {
            const active = dateFilter.preset === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectPreset(opt.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Range Picker inputs */}
      {dateFilter.preset === "personalizado" && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <label
              htmlFor="custom-start-date"
              className="font-medium text-muted-foreground"
            >
              Data Inicial:
            </label>
            <input
              id="custom-start-date"
              type="date"
              value={toInputDateValue(dateFilter.startDate)}
              onChange={handleStartChange}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="custom-end-date"
              className="font-medium text-muted-foreground"
            >
              Data Final:
            </label>
            <input
              id="custom-end-date"
              type="date"
              value={toInputDateValue(dateFilter.endDate)}
              onChange={handleEndChange}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}
    </section>
  );
};
