import React from "react";
import { Check } from "lucide-react";

export interface ChairsideHUDFooterProps {
  onDismissAll: () => void;
  onApplyAllActions: () => void;
}

export const ChairsideHUDFooter: React.FC<ChairsideHUDFooterProps> = ({
  onDismissAll,
  onApplyAllActions,
}) => (
  <div className="chairside-hud-footer flex items-center justify-between pt-2.5 border-t border-[var(--line)]">
    <div className="chairside-autonomy-note text-[11px] text-[var(--muted)]" data-testid="chairside-autonomy-note">
      Обратимые действия • Полный контроль врача
    </div>
    <div className="chairside-hud-apply-all-row flex items-center gap-2">
      <button
        type="button"
        onClick={onDismissAll}
        className="chairside-hud-btn-dismiss btn-chairside-dismiss-all h-9 px-3 max-sm:min-h-[44px] max-sm:h-11 max-sm:px-3.5 text-xs font-medium border border-[var(--line)] rounded-lg max-sm:rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
      >
        Сброс
      </button>
      <button
        type="button"
        onClick={onApplyAllActions}
        className="chairside-hud-btn-apply-all btn-chairside-apply-all h-9 px-3.5 max-sm:min-h-[44px] max-sm:h-11 max-sm:px-4 text-xs sm:text-sm font-medium rounded-lg max-sm:rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
        data-testid="chairside-btn-apply-all"
      >
        <Check size={15} className="shrink-0" />
        <span>Применить все предложения</span>
      </button>
    </div>
  </div>
);
