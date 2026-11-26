/**
 * CopilotStudioHeaderAndTabs.tsx — Header, drag handle, telemetry bar,
 * and 3 Apple HIG Segmented tabs for CopilotStudioModal.
 */

import React from "react";
import {
  Activity,
  BookOpen,
  Brain,
  MessageSquare,
  Minimize2,
  Sliders,
  Sparkles,
  X,
} from "lucide-react";
import { CopilotContextTelemetryBar } from "../telemetry/CopilotContextTelemetryBar";
import type { CopilotStudioTab, StudioContextSnapshot } from "./copilotStudioHelpers";

export interface CopilotStudioHeaderAndTabsProps {
  ctxSnapshot: StudioContextSnapshot;
  activeTab: CopilotStudioTab;
  setActiveTab: (tab: CopilotStudioTab) => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onCollapseToHud: () => void;
  onClose: () => void;
}

const TAB_ITEMS: Array<{
  id: CopilotStudioTab;
  full: string;
  short: string;
}> = [
  { id: "dialog", full: "Клинический диалог", short: "Диалог" },
  { id: "actions", full: "Быстрые действия", short: "Действия" },
  { id: "memory", full: "Память ИИ", short: "Память" },
];

function renderTabIcon(tabId: CopilotStudioTab) {
  if (tabId === "actions") return <Activity size={13} className="shrink-0" />;
  if (tabId === "memory") return <Brain size={13} className="shrink-0" />;
  return <BookOpen size={13} className="shrink-0" />;
}

export const CopilotStudioHeaderAndTabs: React.FC<CopilotStudioHeaderAndTabsProps> = ({
  ctxSnapshot,
  activeTab,
  setActiveTab,
  onOpenHistory,
  onOpenSettings,
  onCollapseToHud,
  onClose,
}) => {
  const iconBtnCls = [
    "icon-button w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9",
    "sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center",
    "rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]",
    "hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer shrink-0",
  ].join(" ");

  return (
    <>
      <div className="copilot-studio-drag-handle-wrap md:hidden flex justify-center pt-2.5 pb-1">
        <div className="copilot-studio-drag-handle w-9 h-1.5 touch-none rounded-full bg-[var(--line)]" />
      </div>

      <header
        className={[
          "copilot-studio-header px-3 sm:px-6 py-2.5 border-b border-[var(--line)]",
          "flex items-center justify-between gap-2 shrink-0",
        ].join(" ")}
      >
        <div className="copilot-studio-brand flex items-center gap-2 min-w-0 flex-1">
          <div
            className={[
              "copilot-studio-icon-badge w-8 h-8 rounded-lg bg-[var(--primary-soft)]",
              "border border-[var(--primary)]/25 flex items-center justify-center",
              "text-[var(--primary)] shrink-0",
            ].join(" ")}
          >
            <Sparkles size={16} />
          </div>
          <div className="copilot-studio-title-box min-w-0 flex-1">
            <div className="copilot-studio-title-row flex items-center gap-1.5">
              <h2 className="copilot-studio-heading text-sm font-bold tracking-tight text-[var(--ink)] whitespace-nowrap">
                ДЕНТА Копайлот
              </h2>
              <span
                className="copilot-pulse-dot w-2 h-2 rounded-full bg-[var(--success)] animate-pulse shrink-0"
                title="Движок активен"
              />
            </div>
            <div className="copilot-studio-submeta flex items-center gap-1 text-xs text-[var(--muted)]">
              <span className="text-[11px] text-[var(--muted)] font-medium whitespace-nowrap">
                <span className="hidden sm:inline">Клинический ассистент врача</span>
                <span className="sm:hidden">Ассистент</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenHistory}
            data-testid="copilot-history-trigger"
            className={iconBtnCls}
            title="История диалогов"
            aria-label="История диалогов"
          >
            <MessageSquare size={15} />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            data-testid="copilot-settings-trigger"
            className={iconBtnCls}
            title="Настройки ИИ"
            aria-label="Настройки ИИ"
          >
            <Sliders size={15} />
          </button>
          <button
            type="button"
            onClick={onCollapseToHud}
            data-testid="copilot-collapse-to-hud-trigger"
            className={[
              "icon-button copilot-studio-collapse-btn w-9 h-9 min-w-[36px] min-h-[36px]",
              "items-center justify-center rounded-lg border border-[var(--line)]",
              "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)]",
              "hover:text-[var(--ink)] cursor-pointer shrink-0",
            ].join(" ")}
            title="Свернуть в панель у кресла (HUD)"
            aria-label="Свернуть в панель у кресла"
          >
            <Minimize2 size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            data-testid="copilot-studio-close-btn"
            className={`copilot-close-btn ${iconBtnCls}`}
            aria-label="Закрыть кабинет копайлота"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <CopilotContextTelemetryBar
        patientName={ctxSnapshot.patientName}
        patientId={ctxSnapshot.patientId}
        activeTooth={ctxSnapshot.activeTooth}
        activeDoctor={ctxSnapshot.activeDoctor}
        activeView={ctxSnapshot.activeViewLabel}
        allergies={ctxSnapshot.allergies ?? null}
        compact
      />

      <div className="copilot-tabs-segmented-wrapper px-4 py-2 border-b border-[var(--line)] bg-[var(--paper)] shrink-0">
        <div className="copilot-tabs-segmented flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "copilot-tab-btn flex-1 min-h-[44px] sm:min-h-[36px] py-1.5 px-2.5",
                "rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                activeTab === tab.id
                  ? "active bg-[var(--paper)] text-[var(--primary)] font-bold shadow-sm border border-[var(--line)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent border-transparent",
              ].join(" ")}
            >
              {renderTabIcon(tab.id)}
              <span className="hidden sm:inline">{tab.full}</span>
              <span className="sm:hidden">{tab.short}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
