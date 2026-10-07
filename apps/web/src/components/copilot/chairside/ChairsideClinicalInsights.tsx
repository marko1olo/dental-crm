/**
 * ChairsideClinicalInsights.tsx — Clinical protocol recommendations & ReAct thought stream.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent strictly <= 500 lines.
 * - Mandate 8e: Doctor Autonomy (transparent reasoning, non-blocking recommendations).
 * - Mandate 8k: Clinical presets and 1 142 protocol suggestions.
 * - Zero cartoon emojis, strictly Lucide vector icons.
 */

import React from "react";
import {
  Sparkles,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ChevronDown,
  ChevronUp,
  Loader2,
  Zap,
  BookOpen,
} from "lucide-react";
import {
  CLINICAL_PRESETS,
  type ChairsideThoughtStep,
} from "./chairsideTypes";

export interface MatchedProtocolInfo {
  procedureName: string;
  matchedIcd10?: string | undefined;
  categoryKey: string;
  tooth?: number | null | undefined;
}

export interface ChairsideClinicalInsightsProps {
  readonly activePresetIndex: number;
  readonly onLoadPreset: (index: number) => void;
  readonly verdict?: string | undefined;
  readonly thoughts: ChairsideThoughtStep[];
  readonly isThoughtsExpanded: boolean;
  readonly onToggleThoughts: () => void;
  readonly isThinking: boolean;
  readonly completedStepsCount: number;
  readonly totalThoughtDuration: string;
  readonly matchedProtocol?: MatchedProtocolInfo | null | undefined;
  readonly activeTooth?: number | null | undefined;
}

export const ChairsideClinicalInsights: React.FC<ChairsideClinicalInsightsProps> = ({
  activePresetIndex,
  onLoadPreset,
  verdict,
  thoughts,
  isThoughtsExpanded,
  onToggleThoughts,
  isThinking,
  completedStepsCount,
  totalThoughtDuration,
  matchedProtocol,
  activeTooth,
}) => {
  return (
    <>
      {/* Quick Clinical Presets Bar */}
      <div className="chairside-hud-presets" role="toolbar" aria-label="Клинические сценарии">
        {CLINICAL_PRESETS.map((preset, idx) => (
          <button
            key={preset.id}
            type="button"
            className={`chairside-hud-preset-chip ${activePresetIndex === idx ? "chairside-hud-preset-chip--active" : ""}`}
            onClick={() => onLoadPreset(idx)}
            data-testid={`btn-preset-${preset.id}`}
          >
            <Zap size={11} className="text-[var(--teal)]" />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Clinical Verdict Banner (T.A.R.S. 100%) */}
      {verdict && (
        <section className="chairside-hud-verdict" data-testid="chairside-hud-verdict">
          <div className="chairside-hud-verdict-title">
            <Sparkles size={13} className="text-[var(--teal-dark)]" />
            <span>Клинический вердикт ассистента DENTE (T.A.R.S. 100%)</span>
          </div>
          <div className="chairside-hud-verdict-body">{verdict}</div>
        </section>
      )}

      {/* Collapsible Thought Stream */}
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
          <div>
            {isThoughtsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
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

      {/* Clinical Catalog 1 142 Protocol Banner (if matched) */}
      {matchedProtocol && (
        <div
          className="chairside-hud-catalog-banner flex items-center justify-between gap-2 px-2.5 py-1.5 mb-2.5 rounded-lg bg-[var(--paper-subtle)] border border-[var(--glass-border)] text-xs"
          data-testid="chairside-catalog-protocol-badge"
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            <BookOpen size={13} className="text-[var(--teal)] shrink-0" />
            <span className="truncate">
              Каталог 1 142: <strong className="text-[var(--ink-strong)]">{matchedProtocol.procedureName}</strong>
              {matchedProtocol.matchedIcd10 && <span className="opacity-70 ml-1">({matchedProtocol.matchedIcd10})</span>}
            </span>
          </div>
          <button
            type="button"
            className="text-[var(--primary)] hover:underline shrink-0 text-[11px] font-medium transition-colors"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("dente:open-protocols-catalog", {
                  detail: {
                    tooth: matchedProtocol.tooth || activeTooth || 16,
                    query: matchedProtocol.procedureName,
                    category: matchedProtocol.categoryKey,
                  },
                })
              );
            }}
            data-testid="btn-chairside-choose-another-protocol"
          >
            Выбрать другой из 1 142
          </button>
        </div>
      )}
    </>
  );
};
