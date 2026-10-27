import React from "react";
import { type WaitlistUrgency, URGENCY_CONFIG } from "../waitlistCancellationEngine";

export interface WaitlistUrgencySelectorProps {
  addUrgency: WaitlistUrgency;
  handleUrgencySelect: (u: WaitlistUrgency) => void;
}

export const WaitlistUrgencySelector: React.FC<WaitlistUrgencySelectorProps> = ({
  addUrgency,
  handleUrgencySelect,
}) => {
  return (
    <div className="space-y-1">
      <span className="text-xs text-[var(--muted)] font-semibold block">
        Срочность обращения и категория *
      </span>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {(["acute_pain", "ortho_endo", "hygiene", "routine"] as const).map((u) => {
          const cfg = URGENCY_CONFIG[u];
          const isSel = addUrgency === u;
          return (
            <button
              key={u}
              type="button"
              onClick={() => handleUrgencySelect(u)}
              className={`h-7 px-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center text-center pointer-coarse:min-h-[44px] ${
                isSel
                  ? `${cfg.badgeClass} ring-1 ring-offset-0`
                  : "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {cfg.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
};
