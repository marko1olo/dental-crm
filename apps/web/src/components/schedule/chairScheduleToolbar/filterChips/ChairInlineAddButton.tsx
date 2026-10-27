import React from "react";
import { Plus } from "lucide-react";

export interface ChairInlineAddButtonProps {
  isSoloDoctor?: boolean | undefined;
  handleOpenAddChair: () => void;
}

export function ChairInlineAddButton({
  isSoloDoctor,
  handleOpenAddChair,
}: ChairInlineAddButtonProps) {
  if (isSoloDoctor) return null;

  return (
    <button
      type="button"
      onClick={handleOpenAddChair}
      className="dente-filter-chip h-9 min-h-[36px] max-h-[36px] px-3 border border-dashed border-[var(--line-strong)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] rounded-xl flex items-center gap-1.5 shrink-0 transition-all cursor-pointer bg-[var(--paper)] shadow-2xs touch-manipulation"
      title="Добавить еще одно стоматологическое кресло"
      data-testid="chair-view-add-chair-strip-btn"
    >
      <Plus size={13} />
      <span>+ Кресло</span>
    </button>
  );
}
