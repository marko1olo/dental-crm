import React from "react";
import type { EstimateTierOption } from "../types";
import { formatMoney } from "../../useCopilotFormat";

export interface EstimateTierComparatorStripProps {
  tiers: EstimateTierOption[];
  currentTierKey: "economy" | "optimum" | "premium";
  onSelectTier: (key: "economy" | "optimum" | "premium") => void;
}

export const EstimateTierComparatorStrip: React.FC<EstimateTierComparatorStripProps> = ({
  tiers,
  currentTierKey,
  onSelectTier,
}) => {
  return (
    <div className="copilot-et-segmented-control" role="tablist">
      {tiers.map((tier) => {
        const isSelected = tier.tierKey === currentTierKey;
        const badgeText =
          tier.badge ||
          (tier.tierKey === "optimum"
            ? "Рекомендуемый"
            : tier.tierKey === "premium"
              ? "Премиум"
              : "Базовый");

        return (
          <button
            key={tier.tierKey}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectTier(tier.tierKey)}
            className={`copilot-et-segment-btn ${isSelected ? `active ${tier.tierKey}` : ""}`}
          >
            <span className="copilot-et-segment-name">
              {tier.tierKey === "optimum"
                ? "Оптимум"
                : tier.tierKey === "premium"
                  ? "Премиум"
                  : "Эконом"}
            </span>
            <span className="copilot-et-segment-material">{badgeText}</span>
            <span className="copilot-et-segment-price tabular-nums">
              {formatMoney(tier.totalRub)}
            </span>
          </button>
        );
      })}
    </div>
  );
};
