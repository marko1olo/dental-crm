/**
 * CopilotStudioTabContent.tsx — Tab view switcher, studio settings modal,
 * and history drawer host for CopilotStudioModal (Mandates 8b, 8be).
 */

import React from "react";
import type {
  ActiveDiff,
  AiSpeedMode,
  CopilotMessage,
  CopilotThread,
  ToolExecutionLog,
} from "../../../store/copilotStore";
import type { AudioStreamManager } from "../../audio/AudioStreamManager";
import type { SpeechGatewayHealthSummary } from "../../../hooks/useUnifiedDictation";
import type { UnifiedAudioMode } from "../../../services/voice/UnifiedAudioClient";
import { CopilotHistoryDrawer } from "../CopilotHistoryDrawer";
import { CopilotMemoryTab } from "../CopilotMemoryTab";
import { CopilotSettingsModal } from "../CopilotSettingsModal";
import { CopilotStudioActionsTab } from "../CopilotStudioActionsTab";
import { CopilotMessageFeed } from "./CopilotMessageFeed";
import { CopilotVoiceDock } from "./CopilotVoiceDock";
import {
  type CopilotChatMessage,
  type CopilotStudioTab,
  type StudioContextSnapshot,
  parseChatMsgs,
} from "./copilotStudioHelpers";

export interface CopilotStudioTabContentProps {
  activeTab: CopilotStudioTab;
  setActiveTab: (tab: CopilotStudioTab) => void;
  ctxSnapshot: StudioContextSnapshot;
  runtimeMode: string;
  speedMode: AiSpeedMode;
  showThinkingProcess: boolean;
  thoughtProcess?: string | undefined;
  currentThought: string;
  activeToolName: string | null;
  messages: CopilotChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<CopilotChatMessage[]>>;
  isStreaming: boolean;
  isThinking?: boolean | undefined;
  activeDiff: ActiveDiff | null;
  setActiveDiff: (diff: ActiveDiff | null) => void;
  applyActiveDiff: () => Promise<boolean>;
  rejectActiveDiff: () => void;
  toolExecutionLogs: ToolExecutionLog[];
  appliedActionIds: Set<string>;
  actionError: string | null;
  setActionError: (err: string | null) => void;
  onApplyAction: (action?: CopilotChatMessage["actionProposal"]) => void;
  onSendMessage: (text?: string) => void;
  executeApiTool: (toolKey: string, payload: Record<string, unknown>) => Promise<void>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isListening: boolean;
  audioLevel: number;
  audioMode: UnifiedAudioMode;
  speechHealth: SpeechGatewayHealthSummary;
  streamManager: AudioStreamManager | null;
  inputText: string;
  onInputChange: (val: string) => void;
  onToggleListening: () => void;
  onStopListening: () => void;
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  isHistoryOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  threads: CopilotThread[];
  threadMessages: Record<string, CopilotMessage[]>;
  selectThread: (id: string) => void;
  hydrateSession: (id: string) => Promise<boolean>;
}

export const CopilotStudioTabContent: React.FC<CopilotStudioTabContentProps> = ({
  activeTab, setActiveTab, ctxSnapshot, runtimeMode, speedMode, showThinkingProcess,
  thoughtProcess, currentThought, activeToolName, messages, setMessages, isStreaming,
  isThinking, activeDiff, setActiveDiff, applyActiveDiff, rejectActiveDiff,
  toolExecutionLogs, appliedActionIds, actionError, setActionError, onApplyAction,
  onSendMessage, executeApiTool, messagesEndRef, isListening, audioLevel, audioMode,
  speechHealth, streamManager, inputText, onInputChange, onToggleListening,
  onStopListening, isSettingsOpen, setSettingsOpen, isHistoryOpen, setHistoryOpen,
  threads, threadMessages, selectThread, hydrateSession,
}) => (
  <>
    {activeTab === "dialog" && (
      <div className="flex-1 flex flex-col min-h-0">
        <CopilotMessageFeed
          messages={messages}
          activeTooth={ctxSnapshot.activeTooth}
          patientId={ctxSnapshot.patientId}
          activeDiff={activeDiff}
          applyActiveDiff={applyActiveDiff}
          rejectActiveDiff={rejectActiveDiff}
          appliedActionIds={appliedActionIds}
          actionError={actionError}
          onApplyAction={onApplyAction}
          onRejectMessageAction={(msgId) => {
            setActionError(null);
            setMessages((prev) =>
              prev.map((msg) => (msg.id === msgId ? { ...msg, actionProposal: undefined } : msg)),
            );
          }}
          onSendMessage={(prompt) => onSendMessage(prompt)}
          isStreaming={isStreaming}
          isThinking={isThinking}
          speedMode={speedMode}
          showThinkingProcess={showThinkingProcess}
          thoughtProcess={thoughtProcess}
          currentThought={currentThought}
          activeToolName={activeToolName}
          messagesEndRef={messagesEndRef}
        />
        <CopilotVoiceDock
          messages={messages}
          isStreaming={isStreaming}
          isListening={isListening}
          audioLevel={audioLevel}
          audioMode={audioMode}
          speechHealth={speechHealth}
          streamManager={streamManager}
          inputText={inputText}
          onInputChange={onInputChange}
          onToggleListening={onToggleListening}
          onStopListening={onStopListening}
          onSendMessage={onSendMessage}
        />
      </div>
    )}
    {activeTab === "actions" && (
      <CopilotStudioActionsTab
        activeTooth={ctxSnapshot.activeTooth}
        patientId={ctxSnapshot.patientId}
        runtimeMode={runtimeMode}
        toolExecutionLogs={toolExecutionLogs}
        activeDiff={activeDiff}
        setActiveDiff={setActiveDiff}
        applyActiveDiff={applyActiveDiff}
        rejectActiveDiff={rejectActiveDiff}
        executeApiTool={executeApiTool}
      />
    )}
    {activeTab === "memory" && <CopilotMemoryTab />}
    <CopilotSettingsModal
      key={isSettingsOpen ? "settings-open" : "settings-closed"}
      isOpen={isSettingsOpen}
      onClose={() => setSettingsOpen(false)}
      onOpenMemoryTab={() => {
        setSettingsOpen(false);
        setActiveTab("memory");
      }}
    />
    <CopilotHistoryDrawer
      isOpen={isHistoryOpen}
      onClose={() => setHistoryOpen(false)}
      onSelectThread={(tId) => {
        selectThread(tId);
        setMessages([]);
        const saved = threadMessages[tId];
        if (saved && saved.length > 0) {
          setMessages(parseChatMsgs(saved));
        } else {
          const found = threads.find((t) => t.id === tId);
          if (found?.previewText) {
            setMessages([{
              id: `thread-init-${Date.now()}`,
              role: "assistant",
              text: found.previewText,
              timestamp: found.updatedAt,
              citation: "Клинический протокол СтАР",
            }]);
          }
          void hydrateSession(tId);
        }
        setHistoryOpen(false);
        setActiveTab("dialog");
      }}
    />
  </>
);
