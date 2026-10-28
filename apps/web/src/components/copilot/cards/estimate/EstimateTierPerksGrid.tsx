import React from "react";
import { CreditCard, Percent } from "lucide-react";
import type { EstimateTierOption } from "../types";
import { formatMoney } from "../../useCopilotFormat";

export interface EstimateTierPerksGridProps {
  activeTierObj: EstimateTierOption;
}

export const EstimateTierPerksGrid: React.FC<EstimateTierPerksGridProps> = ({
  activeTierObj,
}) => {
  return (
    <div className="copilot-et-perks-grid">
      <div className="copilot-et-perk-box">
        <span className="copilot-et-perk-label flex items-center gap-1">
          <Percent size={11} className="text-[var(--teal)]" />
          <span>Вычет 13% НДФЛ</span>
        </span>
        <span className="copilot-et-perk-val text-[var(--teal)] tabular-nums">
          -{formatMoney(activeTierObj.taxDeductionRub || 0)}
        </span>
        <span className="text-[10px] text-[var(--muted)]">
          К оплате: {formatMoney(activeTierObj.netCostAfterDeductionRub || 0)}
        </span>
      </div>

      <div className="copilot-et-perk-box">
        <span className="copilot-et-perk-label flex items-center gap-1">
          <CreditCard size={11} className="text-[var(--amber)]" />
          <span>Рассрочка 0%</span>
        </span>
        <span className="copilot-et-perk-val text-[var(--ink)] tabular-nums">
          от{" "}
          {formatMoney(
            activeTierObj.monthlyInstallmentRub ||
              Math.round((activeTierObj.totalRub || 0) / 12),
          )}{" "}
          / мес
        </span>
        <span className="text-[10px] text-[var(--muted)]">
          на {activeTierObj.installmentMonths || 12} месяцев
        </span>
      </div>
    </div>
  );
};
