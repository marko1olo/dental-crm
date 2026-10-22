import React from "react";
import { CheckCheck, RotateCcw, Sparkles, Trash2 } from "lucide-react";

export interface ChairsideActionFooterProps {
  readonly allApplied: boolean;
  readonly onApplyAll: () => void;
  readonly onUndoAll: () => void;
  readonly onDismissAll: () => void;
}

export const ChairsideActionFooter: React.FC<ChairsideActionFooterProps> = ({
  allApplied,
  onApplyAll,
  onUndoAll,
  onDismissAll,
}) => {
  return (
    <>
      <div className="chairside-hud-apply-all-row">
        {allApplied ? (
          <button
            type="button"
            className="chairside-hud-btn-apply-all chairside-hud-btn-apply-all--undo"
            onClick={onUndoAll}
            data-testid="btn-chairside-undo-all"
          >
            <RotateCcw size={16} />
            <span>Откатить всё</span>
          </button>
        ) : (
          <button
            type="button"
            className="chairside-hud-btn-apply-all"
            onClick={onApplyAll}
            data-testid="btn-chairside-apply-all"
          >
            <CheckCheck size={16} />
            <span>Применить все предложения</span>
          </button>
        )}
        <button
          type="button"
          className="chairside-hud-btn-dismiss"
          onClick={onDismissAll}
          data-testid="btn-chairside-dismiss-all"
          title="Сбросить все отметки применения"
        >
          <Trash2 size={14} />
          <span>Сброс</span>
        </button>
      </div>

      <div className="chairside-hud-autonomy-note" data-testid="chairside-autonomy-note">
        <Sparkles size={12} className="text-[var(--teal)]" />
        <span>Обратимые действия • Полный контроль врача</span>
      </div>
    </>
  );
};
