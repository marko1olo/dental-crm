/**
 * CopilotStudioToolProposalCard.tsx — Structured Tool Execution Card with Two-Phase Contiguous Diff for proposals.
 * Mandate 8b (< 100 lines), Mandate 8e (Autonomous 1-click confirmation), Mandate 8am (design tokens).
 */

import React from "react";
import { Check, Activity } from "lucide-react";
import type { CopilotChatMessage } from "./CopilotStudioModal";

export interface CopilotStudioToolProposalCardProps {
  message: CopilotChatMessage;
  isActionApplied: boolean;
  activeTooth?: number | null | undefined;
  actionError: string | null;
  onApply: (action: CopilotChatMessage["actionProposal"]) => void;
  onReject: () => void;
}

export const CopilotStudioToolProposalCard: React.FC<CopilotStudioToolProposalCardProps> = ({
  message,
  isActionApplied,
  activeTooth,
  actionError,
  onApply,
  onReject,
}) => {
  if (!message.actionProposal) return null;

  if (isActionApplied) {
    return (
      <div className="copilot-tool-execution-card mt-2.5 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5 text-[11px] opacity-80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
            <Check size={13} className="text-[var(--teal)]" />
            <span>{message.actionProposal.description}</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--teal)]/25">
            Применено
          </span>
        </div>
      </div>
    );
  }

  const rawTooth = message.actionProposal.payload?.tooth ?? message.actionProposal.payload?.toothNumber ?? (activeTooth ?? null);
  const proposalTooth = rawTooth !== null && rawTooth !== undefined ? Number(rawTooth) : null;
  const toolShort = message.actionProposal.toolName.split('.').pop() || message.actionProposal.toolName;
  const toothSuffix = proposalTooth ? ` (Зуб ${proposalTooth})` : "";
  const actionTitle = toolShort.includes("Soap") || toolShort.includes("Diary") || toolShort.includes("Visit")
    ? `Дневник приёма${toothSuffix}`
    : toolShort.includes("Tooth")
      ? `Обновление одонтограммы${toothSuffix}`
      : `Клинический протокол${toothSuffix}`;

  return (
    <div className="copilot-tool-execution-card mt-2.5 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal)]/30 space-y-2 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
          <Activity size={13} className="text-[var(--teal)]" />
          <span>{actionTitle}</span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn)]/25">
          Требуется подтверждение
        </span>
      </div>
      <div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs space-y-1.5">
        <div className="flex items-center gap-2 text-[var(--muted)]">
          <span className="text-[11px] font-medium text-[var(--muted)] w-14 shrink-0">Было:</span>
          <span className="line-through opacity-75">{proposalTooth ? `Зуб ${proposalTooth}: Без патологии / Интактный` : "Без патологии / Интактный"}</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--ink)] font-medium">
          <span className="text-[11px] font-semibold text-[var(--teal)] w-14 shrink-0">Станет:</span>
          <span className="text-[var(--teal)] font-semibold">{proposalTooth ? `Зуб ${proposalTooth}: ${message.actionProposal.description}` : message.actionProposal.description}</span>
        </div>
      </div>
      {actionError && (
        <div className="p-2 rounded-lg bg-[var(--danger-soft)] border border-[var(--danger)]/30 flex items-center justify-between text-[11px] text-[var(--danger)]">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => onApply(message.actionProposal)}
            className="px-2 py-1 rounded bg-[var(--danger)] text-white font-semibold hover:opacity-90 cursor-pointer text-[10px]"
          >
            Повторить попытку
          </button>
        </div>
      )}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onReject}
          className={[
            "h-11 min-h-[44px] min-w-[44px] px-3.5 rounded-xl border border-[var(--line)]",
            "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]",
            "font-medium cursor-pointer text-xs flex items-center justify-center transition-colors",
          ].join(" ")}
        >
          Отклонить
        </button>
        <button
          type="button"
          data-testid="copilot-primary-apply-cta"
          onClick={() => onApply(message.actionProposal)}
          className={[
            "copilot-primary-cta h-11 min-h-[44px] px-4 rounded-xl bg-[var(--primary)] text-white",
            "font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-xs shadow-sm",
            "hover:bg-[var(--primary-hover)] transition-all",
          ].join(" ")}
        >
          <Check size={14} />
          <span>Применить в карту</span>
        </button>
      </div>
    </div>
  );
};
