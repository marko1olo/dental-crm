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
    <div className="schedule-mobile-bottom-bar">
      <button
        type="button"
        className="primary-button schedule-mobile-primary-action-btn"
        onClick={onAction}
        data-testid="schedule-mobile-add-btn"
      >
        <span>+ Новая запись</span>
      </button>
    </div>
  );
};
