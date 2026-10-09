/**
 * apps/web/src/components/visit/mobileChairside/ChairsideBottomStickyActions.tsx
 * DENTE Dental CRM — Sovereign Mobile Chairside Visit Workspace (Layer 2: Floating Bottom Bar)
 */

import React from "react";
import {
  ArrowRight,
  ChevronLeft,
  CreditCard,
  Layers,
} from "lucide-react";
import type { ChairsideBottomStickyActionsProps } from "./types";

export const ChairsideBottomStickyActions: React.FC<ChairsideBottomStickyActionsProps> = ({
  currentStep,
  loadedTreatmentPlan,
  isStageTaken,
  onPrevStep,
  onNextStep,
  onTakeActivePlanStage,
  testId = "mobile-chairside-workspace",
}) => {
  return (
    <footer className="mobile-chairside-floating-bar" data-testid={`${testId}-bottom-bar`}>
      {currentStep !== "complaints" && (
        <button
          type="button"
          onClick={onPrevStep}
          className="mobile-chairside-secondary-cta"
          aria-label="Назад к предыдущему этапу"
          title="Назад"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {currentStep === "treatment" && loadedTreatmentPlan && !isStageTaken ? (
        <>
          <button
            type="button"
            onClick={onTakeActivePlanStage}
            className="mobile-chairside-primary-cta"
            data-testid={`${testId}-bottom-take-stage-btn`}
          >
            <Layers size={20} />
            <span>Взять этап в работу</span>
          </button>
          <button
            type="button"
            onClick={onNextStep}
            className="mobile-chairside-secondary-cta"
            aria-label="Далее: 5. Итог и Чек"
            title="Далее к чеку"
            data-testid={`${testId}-primary-cta-btn`}
          >
            <ArrowRight size={22} />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onNextStep}
          className="mobile-chairside-primary-cta"
          data-testid={`${testId}-primary-cta-btn`}
        >
          {currentStep === "checkout" ? (
            <>
              <CreditCard size={20} />
              <span>Завершить приём и сформировать счёт</span>
            </>
          ) : (
            <>
              <span>
                {currentStep === "complaints" && "Далее: 2. Осмотр"}
                {currentStep === "exam" && "Далее: 3. Диагноз"}
                {currentStep === "diagnosis" && "Далее: 4. Лечение"}
                {currentStep === "treatment" && "Далее: 5. Итог и Чек"}
              </span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      )}
    </footer>
  );
};
