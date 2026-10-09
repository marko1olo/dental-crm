/**
 * apps/web/src/components/visit/mobileChairside/ChairsideTeethQuickSelector.tsx
 * DENTE Dental CRM — Sovereign Mobile Chairside Visit Workspace (Layer 1: Quadrant Teeth Selector)
 */

import React, { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { triggerHaptic } from "../../../native/mobileBridge";
import { showToast } from "../../GlobalToast";
import { MobileBottomSheet } from "../../mobile/MobileBottomSheet";
import {
  TOOTH_STATUS_OPTIONS,
  type ChairsideTeethQuickSelectorProps,
} from "./types";

export const ChairsideTeethQuickSelector: React.FC<ChairsideTeethQuickSelectorProps> = ({
  activeQuadrant,
  onQuadrantChange,
  toothStateByCode = {},
  setToothState,
  testId = "mobile-chairside-workspace",
}) => {
  const [selectedToothModal, setSelectedToothModal] = useState<string | null>(null);

  // Quadrant tooth mapping (FDI notation)
  const quadrantTeeth = useMemo(() => {
    switch (activeQuadrant) {
      case 1:
        return ["18", "17", "16", "15", "14", "13", "12", "11"];
      case 2:
        return ["21", "22", "23", "24", "25", "26", "27", "28"];
      case 3:
        return ["48", "47", "46", "45", "44", "43", "42", "41"];
      case 4:
        return ["31", "32", "33", "34", "35", "36", "37", "38"];
    }
  }, [activeQuadrant]);

  return (
    <>
      <div className="mobile-chairside-grouped-card">
        <div className="mobile-chairside-card-title">
          Зубная формула по квадрантам (FDI)
        </div>
        <div className="p-3">
          <div className="mobile-quadrant-tabs">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onQuadrantChange(1);
              }}
              className={`mobile-quadrant-tab ${activeQuadrant === 1 ? "is-active" : ""}`}
            >
              Q1 (18–11)
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onQuadrantChange(2);
              }}
              className={`mobile-quadrant-tab ${activeQuadrant === 2 ? "is-active" : ""}`}
            >
              Q2 (21–28)
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onQuadrantChange(3);
              }}
              className={`mobile-quadrant-tab ${activeQuadrant === 3 ? "is-active" : ""}`}
            >
              Q3 (48–41)
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onQuadrantChange(4);
              }}
              className={`mobile-quadrant-tab ${activeQuadrant === 4 ? "is-active" : ""}`}
            >
              Q4 (31–38)
            </button>
          </div>

          <div className="mobile-teeth-grid-8 mt-2">
            {quadrantTeeth.map((tooth) => {
              const status = toothStateByCode[tooth] || "Healthy";
              const isHealthy = status === "Healthy" || status === "watch";
              return (
                <button
                  key={tooth}
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setSelectedToothModal(tooth);
                  }}
                  className={`mobile-tooth-tile ${
                    selectedToothModal === tooth ? "is-selected" : ""
                  }`}
                  data-testid={`${testId}-tooth-tile-${tooth}`}
                >
                  <span className="mobile-tooth-number">{tooth}</span>
                  <span
                    className={`mobile-tooth-status-tag ${
                      isHealthy
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {status === "Healthy" ? "Норма" : status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* NATIVE BOTTOM SHEET: ВЫБОР СТАТУСА ЗУБА */}
      <MobileBottomSheet
        isOpen={Boolean(selectedToothModal)}
        onClose={() => setSelectedToothModal(null)}
        title={`Зуб ${selectedToothModal}: Клинический статус`}
        testId={`${testId}-tooth-sheet`}
      >
        <div className="space-y-2 py-2">
          {TOOTH_STATUS_OPTIONS.map((item) => (
            <div
              key={item.id}
              className="mobile-chairside-row-item rounded-xl border border-[var(--line)]"
              onClick={() => {
                if (selectedToothModal && setToothState) {
                  triggerHaptic("selection");
                  setToothState(selectedToothModal, item.id);
                  showToast(`Зуб ${selectedToothModal}: ${item.label}`, "info");
                }
                setSelectedToothModal(null);
              }}
            >
              <div>
                <div className="text-[15px] font-bold text-[var(--ink)]">{item.label}</div>
                <div className="text-[12px] text-[var(--muted)]">{item.desc}</div>
              </div>
              <CheckCircle2 size={18} className="text-teal-600" />
            </div>
          ))}
        </div>
      </MobileBottomSheet>
    </>
  );
};
