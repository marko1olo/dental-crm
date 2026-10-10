/**
 * apps/web/src/components/visit/mobileChairside/ChairsideStepNav.tsx
 * DENTE Dental CRM — Sovereign Mobile Chairside Visit Workspace (Layer 1: 5-Segment Step Navigation Bar)
 */

import React from "react";
import { Check } from "lucide-react";
import { triggerHaptic } from "../../../native/mobileBridge";
import type { ChairsideStepItem, ChairsideStepNavProps } from "./types";

export const CHAIRSIDE_STEP_ITEMS: ChairsideStepItem[] = [
  { id: "complaints", label: "Жалобы", number: 1 },
  { id: "exam", label: "Осмотр", number: 2 },
  { id: "diagnosis", label: "Диагноз", number: 3 },
  { id: "treatment", label: "Лечение", number: 4 },
  { id: "checkout", label: "Итог и Чек", number: 5 },
];

export const ChairsideStepNav: React.FC<ChairsideStepNavProps> = ({
  currentStep,
  onStepSelect,
  visitNoteForm,
  billingItemsCount,
  testId = "mobile-chairside-workspace",
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector<HTMLElement>(".mobile-chairside-step-chip.is-active");
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [currentStep]);

  return (
    <nav
      className="mobile-chairside-steps-container"
      aria-label="Этапы клинического приёма"
      data-testid={`${testId}-steps-nav`}
    >
      <div className="mobile-chairside-steps-scroll" ref={scrollRef}>
        {CHAIRSIDE_STEP_ITEMS.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted =
            (step.id === "complaints" && Boolean(visitNoteForm?.complaint)) ||
            (step.id === "exam" && Boolean(visitNoteForm?.objectiveStatus)) ||
            (step.id === "diagnosis" && Boolean(visitNoteForm?.diagnosis)) ||
            (step.id === "treatment" && Boolean(visitNoteForm?.treatmentPlan)) ||
            (step.id === "checkout" && billingItemsCount > 0);

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onStepSelect(step.id);
              }}
              className={`mobile-chairside-step-chip ${isActive ? "is-active" : ""} ${
                isCompleted ? "is-completed" : ""
              }`}
              data-testid={`${testId}-step-${step.id}`}
            >
              <span className="whitespace-nowrap">{`${step.number}. ${step.label}`}</span>
              {isCompleted && !isActive && <Check size={11} className="stroke-[2.5] shrink-0" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
