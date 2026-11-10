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
  <div className="chairside-hud-footer flex items-center justify-between pt-2 border-t border-[var(--line)]">
    <div className="chairside-autonomy-note text-[11px] text-[var(--muted)]" data-testid="chairside-autonomy-note">
      Обратимые действия • Полный контроль врача
    </div>
    <div className="chairside-hud-apply-all-row flex items-center gap-1.5">
      <button
        type="button"
        onClick={onDismissAll}
        className="chairside-hud-btn-dismiss btn-chairside-dismiss-all px-2.5 py-1 text-xs border border-[var(--line)] rounded text-[var(--muted)]"
      >
        Сброс
      </button>
      <button
        type="button"
        onClick={onApplyAllActions}
        className="chairside-hud-btn-apply-all btn-chairside-apply-all"
        data-testid="chairside-btn-apply-all"
      >
        <Check size={14} />
        Применить все предложения
      </button>
    </div>
  </div>
);
