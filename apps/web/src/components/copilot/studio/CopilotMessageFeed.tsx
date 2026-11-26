/**
 * CopilotMessageFeed.tsx — Clinical message stream, fallback banner, diffs,
 * tool proposals, and real-time thinking milestones for CopilotStudioModal.
 */

import React from "react";
import { AlertTriangle, BookOpen } from "lucide-react";
import type { ActiveDiff, AiSpeedMode } from "../../../store/copilotStore";
import { ActiveDiffCard } from "../cards/ActiveDiffCard";
import { CopilotResultCard } from "../CopilotResultCard";
import { CopilotStudioToolProposalCard } from "../CopilotStudioToolProposalCard";
import { CopilotThinkingIndicator } from "../CopilotThinkingIndicator";
import { CopilotVisitClinicalDigest } from "../CopilotVisitClinicalDigest";
import type { CopilotChatMessage } from "./copilotStudioHelpers";

export interface CopilotMessageFeedProps {
  messages: CopilotChatMessage[];
  activeTooth?: number | null | undefined;
  patientId?: string | null | undefined;
  activeDiff: ActiveDiff | null;
  applyActiveDiff: () => void;
  rejectActiveDiff: () => void;
  appliedActionIds: Set<string>;
  actionError: string | null;
  onApplyAction: (action?: CopilotChatMessage["actionProposal"]) => void;
  onRejectMessageAction: (messageId: string) => void;
  onSendMessage: (prompt: string) => void;
  isStreaming: boolean;
  isThinking?: boolean | undefined;
  speedMode: AiSpeedMode;
  showThinkingProcess: boolean;
  thoughtProcess?: string | undefined;
  currentThought: string;
  activeToolName: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const CopilotMessageFeed: React.FC<CopilotMessageFeedProps> = ({
  messages,
  activeTooth,
  patientId,
  activeDiff,
  applyActiveDiff,
  rejectActiveDiff,
  appliedActionIds,
  actionError,
  onApplyAction,
  onRejectMessageAction,
  onSendMessage,
  isStreaming,
  isThinking,
  speedMode,
  showThinkingProcess,
  thoughtProcess,
  currentThought,
  activeToolName,
  messagesEndRef,
}) => {
  const lastMsgId = messages[messages.length - 1]?.id;

  return (
    <div className="copilot-chat-messages-container flex-1 overflow-y-auto px-5 py-3.5 space-y-3">
      <CopilotVisitClinicalDigest
        activeTooth={activeTooth}
        patientId={patientId}
        onSendMessage={onSendMessage}
        showEmptyStateIfNoFindings={messages.length === 0}
      />

      {activeDiff && (
        <div className="my-2">
          <ActiveDiffCard diff={activeDiff} onApply={applyActiveDiff} onReject={rejectActiveDiff} />
        </div>
      )}

      {messages.map((m) => (
        <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
          <div
            className={[
              "copilot-message-bubble max-w-[92%] p-3.5 rounded-2xl text-xs leading-relaxed",
              m.role === "user"
                ? "copilot-message-user bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]"
                : "copilot-message-assistant bg-[var(--paper)] border border-[var(--line)] shadow-sm text-[var(--ink)]",
            ].join(" ")}
          >
            {m.isOfflineFallback && (
              <div
                className={[
                  "copilot-offline-badge mb-2 px-2.5 py-1.5 rounded-xl bg-[var(--warn-soft)]",
                  "border border-[var(--warn)]/25 text-[var(--warn)] text-[11px] font-semibold",
                  "flex items-center gap-2 shrink-0",
                ].join(" ")}
              >
                <AlertTriangle size={14} className="shrink-0 text-[var(--warn)]" />
                <span>Автономный режим: используется локальный клинический словарь (без ИИ)</span>
              </div>
            )}
            <p className="whitespace-pre-wrap m-0">
              {m.text || (isStreaming ? "Формирование ответа..." : "")}
              {isStreaming && m.id === lastMsgId && m.role === "assistant" && (
                <span className="copilot-typing-cursor inline-block w-1.5 h-3 bg-[var(--primary)] animate-pulse ml-1 align-middle" />
              )}
            </p>

            {m.actionProposal && (
              <CopilotStudioToolProposalCard
                message={m}
                isActionApplied={Boolean(
                  m.applied || appliedActionIds.has(m.actionProposal.id),
                )}
                activeTooth={activeTooth}
                actionError={actionError}
                onApply={onApplyAction}
                onReject={() => onRejectMessageAction(m.id)}
              />
            )}

            {Boolean(m.toolResult) && (
              <div className="mt-2.5">
                <CopilotResultCard name={m.toolName || m.actionProposal?.toolName} result={m.toolResult} />
              </div>
            )}

            {m.citation && (
              <div className="mt-2 pt-2 border-t border-[var(--line)] flex items-center gap-1.5 text-[10px] text-[var(--primary)] font-medium">
                <BookOpen size={11} />
                <span>{m.citation}</span>
              </div>
            )}
          </div>
          <span className="text-[10px] text-[var(--muted)] mt-1 px-1">{m.timestamp}</span>
        </div>
      ))}

      <CopilotThinkingIndicator
        isThinking={isStreaming || Boolean(isThinking)}
        activeTooth={activeTooth}
        speedMode={speedMode}
        showThinkingProcess={showThinkingProcess}
        thoughtProcess={thoughtProcess || currentThought || undefined}
        currentToolName={activeToolName}
      />
      <div ref={messagesEndRef} />
    </div>
  );
};
