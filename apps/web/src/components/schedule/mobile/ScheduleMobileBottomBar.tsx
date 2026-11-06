import React from "react";

export interface ScheduleMobileBottomBarProps {
  isVisible: boolean;
  onAction: () => void;
}

export const ScheduleMobileBottomBar: React.FC<ScheduleMobileBottomBarProps> = ({
  isVisible,
  onAction,
}) => {
  if (!isVisible) return null;

  return (
    <div
      className="schedule-mobile-bottom-bar fixed bottom-0 left-0 right-0 p-3 bg-[var(--paper-strong)]/90 backdrop-blur-md border-t border-[var(--line)] z-30"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        className="primary-button schedule-mobile-primary-action-btn w-full h-[52px] min-h-[44px] rounded-2xl bg-[var(--teal,#0d9488)] text-white font-semibold text-base shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
        onClick={onAction}
        data-testid="schedule-mobile-add-btn"
      >
        <span>+ Записать визит</span>
      </button>
    </div>
  );
};
