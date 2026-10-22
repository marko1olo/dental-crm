import React from "react";
import { Activity, AlertTriangle, Brain, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { ChairsideThoughtStep } from "./chairsideTypes";

interface ChairsideThoughtStreamProps {
  thoughts: ChairsideThoughtStep[];
  isThoughtsExpanded: boolean;
  onToggleThoughts: () => void;
  isThinking: boolean;
  completedStepsCount: number;
  totalThoughtDuration: string;
}

export const ChairsideThoughtStream: React.FC<ChairsideThoughtStreamProps> = ({
  thoughts,
  isThoughtsExpanded,
  onToggleThoughts,
  isThinking,
  completedStepsCount,
  totalThoughtDuration,
}) => {
  return (
    <section className="chairside-hud-thought-stream" data-testid="chairside-thought-stream">
      <button
        type="button"
        className="chairside-hud-thought-header"
        onClick={onToggleThoughts}
        aria-expanded={isThoughtsExpanded}
        data-testid="btn-toggle-thought-stream"
      >
        <div className="chairside-hud-thought-summary">
          <Brain size={14} className="text-[var(--teal)] shrink-0" />
          <span>Размышления ИИ</span>
          {isThinking ? (
            <span className="chairside-hud-badge">
              <Loader2 size={11} className="animate-spin inline mr-1" />
              Анализ...
            </span>
          ) : (
            <span className="chairside-hud-badge">
              {completedStepsCount}/{thoughts.length} завершено • {totalThoughtDuration} с
            </span>
          )}
        </div>
        <div>{isThoughtsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
      </button>

      {isThoughtsExpanded && (
        <div className="chairside-hud-thought-steps" data-testid="chairside-thought-steps">
          {thoughts.map((step) => (
            <div key={step.id} className="chairside-hud-step-item" data-testid={`thought-step-${step.stepNumber}`}>
              <div className="chairside-hud-step-icon">
                {step.status === "running" ? (
                  <Loader2 size={13} className="chairside-hud-step-icon--running" />
                ) : step.status === "done" ? (
                  <CheckCircle2 size={13} className="chairside-hud-step-icon--done" />
                ) : step.status === "warning" ? (
                  <AlertTriangle size={13} className="chairside-hud-step-icon--warning" />
                ) : (
                  <Activity size={13} className="chairside-hud-step-icon--pending" />
                )}
              </div>
              <div className="chairside-hud-step-content">
                <div className="chairside-hud-step-title">{step.title}</div>
                {step.detail && <div className="chairside-hud-step-detail">{step.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
