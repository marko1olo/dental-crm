import React from "react";
import { countLabel } from "../../../../lib/russianPlural";
import type { ChairScheduleToolbarProps } from "../types";

export function ChairViewCountBadge({
  chairs,
  isSoloDoctor,
  rawBranches,
  hasMultipleBranches,
  selectedBranchId,
  onSelectBranch,
}: ChairScheduleToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-[11px] font-semibold text-[var(--muted)] hidden 2xl:inline">
        Стоматологические установки:
      </span>
      <span
        className={`items-center px-2.5 h-9 min-h-[36px] max-h-[36px] rounded-xl text-xs font-bold bg-[var(--primary-soft)] text-[var(--primary-dark)] border border-[var(--primary)]/20 shadow-2xs shrink-0 select-none ${
          chairs.length > 2 ? "inline-flex" : "hidden 2xl:inline-flex"
        }`}
        data-testid="chair-view-count-badge"
      >
        {countLabel(chairs.length || 1, "кресло", "кресла", "кресел")}
      </span>
      {chairs.length > 3 && (
        <span
          className="inline-flex items-center px-2 h-9 min-h-[36px] max-h-[36px] rounded-xl text-xs font-bold bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)] shadow-2xs shrink-0 select-none"
          title={`Всего установок: ${chairs.length}. Все установки доступны в полосе фильтров`}
        >
          +{chairs.length - 3}
        </span>
      )}
      {isSoloDoctor && (
        <span className="text-xs text-[var(--muted)] hidden 2xl:inline">
          (Авто-привязка)
        </span>
      )}

      {/* Auto-hide branch selector when branches <= 1 */}
      {hasMultipleBranches && (
        <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-[var(--line)] shrink-0">
          <span className="text-xs text-[var(--muted)] font-medium hidden lg:inline">Филиал:</span>
          <select
            value={selectedBranchId || ""}
            onChange={(e) => onSelectBranch?.(e.target.value || null)}
            className="text-xs h-9 min-h-[36px] max-h-[36px] px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium cursor-pointer hover:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors shadow-2xs shrink-0 touch-manipulation"
            data-testid="chair-view-branch-select"
            aria-label="Выбор филиала клиники"
          >
            <option value="">Все филиалы</option>
            {rawBranches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
