import React from "react";
import { Plus } from "lucide-react";

export interface ScheduleMobileBottomBarProps {
  isVisible: boolean;
  onAction: () => void;
  label?: string;
}

export const ScheduleMobileBottomBar: React.FC<ScheduleMobileBottomBarProps> = ({
  isVisible,
  onAction,
  label = "+ Записать визит",
}) => {
  if (!isVisible) return null;

  return (
    <div
      className="schedule-mobile-bottom-bar fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-0 right-0 w-full z-40 p-3 bg-[var(--paper)]/90 backdrop-blur-md border-t border-[var(--line)] box-border"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}
    >
      <button
        type="button"
        className="primary-button schedule-mobile-primary-action-btn w-full h-[52px] min-h-[44px] rounded-2xl bg-[var(--teal,#0d9488)] text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-teal-700/20 active:scale-[0.98] transition-all cursor-pointer"
        onClick={onAction}
        data-testid="schedule-mobile-add-btn"
      >
        <Plus size={18} className="shrink-0 stroke-[2.5]" />
        <span>{label}</span>
      </button>
    </div>
  );
};
