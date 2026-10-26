import React from "react";
import { BookOpen, Sparkles, Zap } from "lucide-react";
import { CLINICAL_PRESETS, type ChairsideThoughtStep } from "./chairsideTypes";
import { ChairsideThoughtStream } from "./ChairsideThoughtStream";

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
  activePresetIndex, onLoadPreset, verdict, thoughts, isThoughtsExpanded,
  onToggleThoughts, isThinking, completedStepsCount, totalThoughtDuration,
  matchedProtocol, activeTooth,
}) => {
  return (
    <>
      <div className="chairside-hud-presets" role="toolbar" aria-label="Клинические сценарии">
        {CLINICAL_PRESETS.map((preset, idx) => (
          <button
            key={preset.id} type="button"
            className={`chairside-hud-preset-chip ${activePresetIndex === idx ? "chairside-hud-preset-chip--active" : ""}`}
            onClick={() => onLoadPreset(idx)} data-testid={`btn-preset-${preset.id}`}
          >
            <Zap size={11} className="text-[var(--teal)]" />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {verdict && (
        <section className="chairside-hud-verdict" data-testid="chairside-hud-verdict">
          <div className="chairside-hud-verdict-title">
            <Sparkles size={13} className="text-[var(--teal-dark)]" />
            <span>Клиническая рекомендация</span>
          </div>
          <div className="chairside-hud-verdict-body">{verdict}</div>
        </section>
      )}

      <ChairsideThoughtStream
        thoughts={thoughts} isThoughtsExpanded={isThoughtsExpanded} onToggleThoughts={onToggleThoughts}
        isThinking={isThinking} completedStepsCount={completedStepsCount} totalThoughtDuration={totalThoughtDuration}
      />

      {matchedProtocol && (
        <div
          className="chairside-hud-catalog-banner flex items-center justify-between gap-2 px-2.5 py-1.5 mb-2.5 rounded-lg bg-[var(--paper-subtle)] border border-[var(--glass-border)] text-xs"
          data-testid="chairside-catalog-protocol-badge"
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            <BookOpen size={13} className="text-[var(--teal)] shrink-0" />
            <span className="truncate">
              Клинические протоколы: <strong className="text-[var(--ink-strong)]">{matchedProtocol.procedureName}</strong>
              {matchedProtocol.matchedIcd10 && <span className="opacity-70 ml-1">({matchedProtocol.matchedIcd10})</span>}
            </span>
          </div>
          <button
            type="button"
            className="px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--teal)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] shrink-0 text-[11px] font-semibold transition-colors cursor-pointer"
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
            Справочник процедур
          </button>
        </div>
      )}
    </>
  );
};
