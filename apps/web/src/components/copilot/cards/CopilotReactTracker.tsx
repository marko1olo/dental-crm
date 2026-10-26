import React, { useState, useMemo } from "react";
import { Brain, CheckCircle2 } from "lucide-react";
import type { CopilotReactTrackerProps } from "./types";
import { DEFAULT_DENTE_REACT_STEPS, getReactStepIcon } from "./reactTrackerPresets";

export { DEFAULT_DENTE_REACT_STEPS };

export const CopilotReactTracker: React.FC<CopilotReactTrackerProps> = ({
  title = "ReAct Цикл ДЕНТЫ: Автономное выполнение",
  steps = DEFAULT_DENTE_REACT_STEPS,
  currentStepIndex,
  isComplete,
  onStepClick,
}) => {
  const [expanded, setExpanded] = useState<boolean>(true);

  const completedCount = useMemo(() => steps.filter((s) => s.status === "done").length, [steps]);
  const activeIndex = useMemo(() => {
    if (typeof currentStepIndex === "number") return currentStepIndex;
    const runningIdx = steps.findIndex((s) => s.status === "running");
    if (runningIdx >= 0) return runningIdx;
    if (isComplete || completedCount === steps.length) return steps.length;
    return completedCount;
  }, [currentStepIndex, steps, isComplete, completedCount]);

  const allDone = isComplete || completedCount === steps.length;
  const progressPercent = Math.round((completedCount / (steps.length || 1)) * 100);

  return (
    <div
      className={`copilot-gen-card copilot-react-tracker ${allDone ? "all-done" : "running"}`}
      data-testid="copilot-react-tracker"
      role="region"
      aria-label="Живой пошаговый ReAct трекер ДЕНТЫ"
    >
      <div
        className="copilot-rt-header"
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
      >
        <div className="copilot-rt-title-block">
          <div className="copilot-rt-badge" aria-hidden="true">
            {allDone ? <CheckCircle2 size={18} /> : <Brain size={18} className="animate-pulse" />}
          </div>
          <div>
            <h4 className="copilot-rt-title">{title}</h4>
            <div className="copilot-rt-subtitle">
              {allDone
                ? "Все шаги клинического рассуждения успешно завершены"
                : `Выполняется шаг ${Math.min(activeIndex + 1, steps.length)} из ${steps.length}...`}
            </div>
          </div>
        </div>

        <div className="copilot-rt-status-box">
          <span className={`copilot-rt-status-pill ${allDone ? "done" : "active"}`}>
            {allDone ? "Завершено (4/4)" : `Шаг ${Math.min(activeIndex + 1, steps.length)}/${steps.length}`}
          </span>
        </div>
      </div>

      <div className="copilot-rt-progress-track" aria-hidden="true">
        <div className="copilot-rt-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {expanded && (
        <div className="copilot-rt-steps-list">
          {steps.map((step, idx) => {
            const isCurrent = step.status === "running" || (!allDone && idx === activeIndex);
            return (
              <div
                key={step.id || idx}
                className={`copilot-rt-step-item ${step.status} ${isCurrent ? "current" : ""}`}
                onClick={() => onStepClick?.(step)}
              >
                <div className="copilot-rt-step-left">
                  <div className="copilot-rt-step-icon-wrap">{getReactStepIcon(step)}</div>
                  <div className="copilot-rt-step-num-badge">{`Шаг ${step.stepNumber || idx + 1}`}</div>
                </div>
                <div className="copilot-rt-step-body">
                  <div className="copilot-rt-step-title">{step.title}</div>
                  {Boolean(step.detail) && <div className="copilot-rt-step-detail">{step.detail}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
