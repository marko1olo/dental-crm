import React from "react";
import { Sparkles } from "lucide-react";

interface ChairsideHUDMinimizedPillProps {
  isDocked: boolean;
  className?: string;
  isThinking: boolean;
  onExpand: () => void;
}

export const ChairsideHUDMinimizedPill: React.FC<ChairsideHUDMinimizedPillProps> = ({
  isDocked,
  className = "",
  isThinking,
  onExpand,
}) => {
  return (
    <div
      className={`chairside-copilot-hud ${isDocked ? "chairside-copilot-hud--docked" : "chairside-copilot-hud--floating"} ${className}`}
      data-testid="chairside-copilot-hud-minimized"
    >
      <button
        type="button"
        className="chairside-hud-pill"
        onClick={onExpand}
        title="Развернуть ИИ-Копилот у кресла"
        data-testid="btn-chairside-hud-expand"
      >
        <div className="chairside-hud-pill-icon">
          <Sparkles size={14} />
        </div>
        <span>Копилот у кресла</span>
        {isThinking ? (
          <span className="chairside-hud-pill-badge chairside-hud-pill-badge--busy">
            Анализ...
          </span>
        ) : (
          <span className="chairside-hud-pill-badge">
            Готов
          </span>
        )}
      </button>
    </div>
  );
};
