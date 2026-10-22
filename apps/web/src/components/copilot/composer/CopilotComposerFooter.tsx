import React from "react";
import { RotateCcw, ShieldCheck } from "lucide-react";

interface CopilotComposerFooterProps {
  onReset?: (() => void) | undefined;
}

export const CopilotComposerFooter: React.FC<CopilotComposerFooterProps> = ({
  onReset,
}) => {
  return (
    <div className="copilot-composer-footer">
      <div className="copilot-trust-note">
        <ShieldCheck size={15} style={{ color: "var(--teal)" }} />
        <span>Медицинская тайна и защита данных</span>
      </div>

      <div className="copilot-footer-actions">
        <span className="copilot-hotkey-hint">
          Горячие клавиши: <span className="copilot-kbd">Ctrl+K</span>
        </span>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="copilot-reset-btn"
            title="Сброс / Очистить диалог"
            aria-label="Сброс / Очистить диалог"
          >
            <RotateCcw size={13} style={{ flexShrink: 0 }} />
            <span>Сброс</span>
          </button>
        )}
      </div>
    </div>
  );
};
