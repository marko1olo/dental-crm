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
  patientAgeYears,
  testId = "mobile-chairside-workspace",
}) => {
  const [selectedToothModal, setSelectedToothModal] = useState<string | null>(null);

  const isPrimary = patientAgeYears !== undefined && patientAgeYears < 6;
  const isMixed = patientAgeYears !== undefined && patientAgeYears >= 6 && patientAgeYears < 12;
  const isChild = isPrimary || isMixed;

  // Quadrant tooth mapping (FDI notation)
  const quadrantTeeth = useMemo(() => {
    if (isPrimary) {
      switch (activeQuadrant) {
        case 1:
          return ["55", "54", "53", "52", "51"];
        case 2:
          return ["61", "62", "63", "64", "65"];
        case 3:
          return ["85", "84", "83", "82", "81"];
        case 4:
          return ["71", "72", "73", "74", "75"];
      }
    }
    if (isMixed) {
      switch (activeQuadrant) {
        case 1:
          return ["16", "55", "54", "53", "52", "51"];
        case 2:
          return ["61", "62", "63", "64", "65", "26"];
        case 3:
          return ["46", "85", "84", "83", "82", "81"];
        case 4:
          return ["71", "72", "73", "74", "75", "36"];
      }
    }
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
  }, [activeQuadrant, isPrimary, isMixed]);

  const q1Label = isPrimary ? "Q5 (55–51)" : isMixed ? "Q5 (16+55–51)" : "Q1 (18–11)";
  const q2Label = isPrimary ? "Q6 (61–65)" : isMixed ? "Q6 (61–65+26)" : "Q2 (21–28)";
  const q3Label = isPrimary ? "Q8 (85–81)" : isMixed ? "Q8 (46+85–81)" : "Q3 (48–41)";
  const q4Label = isPrimary ? "Q7 (71–75)" : isMixed ? "Q7 (71–75+36)" : "Q4 (31–38)";

  const handleMarkAllTeethHealthy = () => {
    triggerHaptic("success");
    const allTeeth = isPrimary
      ? ["55", "54", "53", "52", "51", "61", "62", "63", "64", "65", "85", "84", "83", "82", "81", "71", "72", "73", "74", "75"]
      : [
          "18", "17", "16", "15", "14", "13", "12", "11",
          "21", "22", "23", "24", "25", "26", "27", "28",
          "48", "47", "46", "45", "44", "43", "42", "41",
          "31", "32", "33", "34", "35", "36", "37", "38",
        ];
    if (setToothState) {
      for (const t of allTeeth) {
        setToothState(t, "Healthy");
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dente-batch-update-tooth-state", {
          detail: { state: "Healthy", teeth: allTeeth },
        }),
      );
    }
    showToast("✓ Все зубы интактны (Физиологическая норма)", "success");
  };

  const gridClass = isPrimary
    ? "grid grid-cols-5 gap-1.5 mt-2"
    : isMixed
      ? "grid grid-cols-6 gap-1.5 mt-2"
      : "mobile-teeth-grid-8 mt-2";

  return (
    <>
      <div className="mobile-chairside-grouped-card">
        <div className="mobile-chairside-card-title">
          {isChild ? "Зубная формула детского приёма (FDI 51–85)" : "Зубная формула по квадрантам (FDI)"}
        </div>
        <div className="p-3">
          <button
            type="button"
            onClick={handleMarkAllTeethHealthy}
            className="mobile-chairside-teeth-norm-action"
            data-testid={`${testId}-teeth-norm-btn`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-bold text-[14px]">✓ Интактные зубы (Норма в 1 клик)</span>
            </div>
            <span className="text-[12px] opacity-80 font-medium">Все 32</span>
          </button>

          <div className="mobile-quadrant-tabs">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onQuadrantChange(1);
              }}
              className={`mobile-quadrant-tab ${activeQuadrant === 1 ? "is-active" : ""}`}
            >
              {q1Label}
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onQuadrantChange(2);
              }}
              className={`mobile-quadrant-tab ${activeQuadrant === 2 ? "is-active" : ""}`}
            >
              {q2Label}
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onQuadrantChange(3);
              }}
              className={`mobile-quadrant-tab ${activeQuadrant === 3 ? "is-active" : ""}`}
            >
              {q3Label}
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onQuadrantChange(4);
              }}
              className={`mobile-quadrant-tab ${activeQuadrant === 4 ? "is-active" : ""}`}
            >
              {q4Label}
            </button>
          </div>

          <div className="mobile-teeth-scroller-wrap" data-testid={`${testId}-teeth-scroller`}>
            <div className={`mobile-teeth-horizontal-scroller ${gridClass}`}>
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
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent("dente-update-tooth-state", {
                        detail: { toothNumber: selectedToothModal, state: item.id },
                      }),
                    );
                  }
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
