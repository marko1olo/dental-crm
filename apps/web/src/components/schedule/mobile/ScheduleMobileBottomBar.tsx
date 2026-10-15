import React from "react";
import { Plus } from "lucide-react";

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
    <div className="schedule-mobile-bottom-bar">
      <button
        type="button"
        className="schedule-mobile-primary-action-btn"
        onClick={onAction}
      >
        <Plus size={18} />
        <span>Запись</span>
      </button>
    </div>
  );
};
