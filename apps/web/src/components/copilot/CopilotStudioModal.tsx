/**
 * CopilotStudioModal.tsx — Канонический SSOT выдвижной кабинет и студия Копайлота DENTE.
 * Мандаты 8b (380-450 строк), 8e (автономия), 8am (1 Primary CTA), 8wy (двухрежимный харнесс), Apple HIG.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import "./styles/copilotStudio.css";
import { useUnifiedDictation } from "../../hooks/useUnifiedDictation";
import { showToast } from "../GlobalToast";
import { clientLogger } from "../../services/logging/clientLogger";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../../lib/safeLocalStorage";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { CRM_FASTIFY_TOOLS_REGISTRY } from "./copilotCatalogData";
import { SHOWCASE_INITIAL_MESSAGES } from "../../store/copilotShowcaseData";
import {
  useCopilotStore,
  syncCopilotStreamThread,
  type CopilotMessage,
} from "../../store/copilotStore";
import { isSessionUuid } from "../../store/copilotSessionApi";
import type { CopilotUiMessage } from "./copilotTypes";
import { executeCopilotConfirmationWithResult } from "./useCopilotModules/useCopilotActions";
import { streamCopilotChat, toCleanUuid } from "./client/copilotStreamClient";
import { CopilotStudioHeaderAndTabs } from "./studio/CopilotStudioHeaderAndTabs";
import { CopilotStudioTabContent } from "./studio/CopilotStudioTabContent";
import { handleClinicalSpeechOrText } from "./copilotDictationHandler";
import { useCopilotStudioLifecycle } from "./studio/useCopilotStudioLifecycle";
import {
  type CopilotStudioTab,
  type CopilotChatMessage,
  parseChatMsgs,
  hydrateCopilotThreadMessages,
  resolveStudioContextSnapshot,
  executeCopilotStudioApiTool,
} from "./studio/copilotStudioHelpers";
import {
  type SseProcessState,
  processCopilotSseEvent,
  executePrimaryProposalAction,
} from "./studio/copilotStudioStreamHelpers";

export type { CopilotStudioTab, CopilotChatMessage };

export interface CopilotStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTooth?: number | null | undefined;
  patientId?: string | null | undefined;
  patientName?: string | null | undefined;
  activeVisitId?: string | null | undefined;
  initialTab?: CopilotStudioTab | undefined;
  initialMessages?: Array<CopilotChatMessage | CopilotUiMessage | CopilotMessage> | undefined;
  isThinking?: boolean | undefined;
  thoughtProcess?: string | undefined;
}
export type ChairsideCopilotStudioModalProps = CopilotStudioModalProps;
export const DEFAULT_INITIAL_MESSAGES: CopilotChatMessage[] = [];

export const CopilotStudioModal: React.FC<CopilotStudioModalProps> = ({
  isOpen,
  onClose,
  activeTooth,
  patientId,
  patientName,
  activeVisitId,
  initialTab = "dialog",
  initialMessages,
  isThinking,
  thoughtProcess,
}) => {
  const [activeTab, setActiveTab] = useState<CopilotStudioTab>(
    (initialTab as CopilotStudioTab) || "dialog",
  );
  const {
    settings,
    memoryFacts,
    activeThreadId,
    threadMessages,
    saveThreadMessages,
    setRuntimeMode,
    isSettingsOpen,
    setSettingsOpen,
    isHistoryOpen,
    setHistoryOpen,
    threads,
    selectThread,
    addToolLog,
    activeDiff,
    setActiveDiff,
    applyActiveDiff,
    rejectActiveDiff,
    toolExecutionLogs,
  } = useCopilotStore();
  const { runtimeMode, speedMode, showThinkingProcess } = settings;
  const threadKey = activeThreadId || "default-thread";
  const ctxSnapshot = resolveStudioContextSnapshot({
    patientId,
    patientName,
    activeVisitId,
    activeTooth,
  });

  const [messages, setMessages] = useState<CopilotChatMessage[]>(() => {
    if (initialMessages?.length) return parseChatMsgs(initialMessages);
    if (threadMessages[threadKey]?.length) return parseChatMsgs(threadMessages[threadKey]);
    return isDemoShowcaseMode() ? (SHOWCASE_INITIAL_MESSAGES as CopilotChatMessage[]) : [];
  });
  const latestMessagesRef = useRef<CopilotChatMessage[]>(messages);
  const suppressNextHydrateThreadRef = useRef<string | null>(null);
  latestMessagesRef.current = messages;

  const setAndTrackMessages = useCallback(
    (updater: CopilotChatMessage[] | ((prev: CopilotChatMessage[]) => CopilotChatMessage[])) => {
      setMessages((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        latestMessagesRef.current = next;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (initialMessages?.length) setAndTrackMessages(parseChatMsgs(initialMessages));
  }, [initialMessages, setAndTrackMessages]);

  const hydrateSession = useCallback(
    async (sId: string) => {
      const parsed = await hydrateCopilotThreadMessages(sId);
      if (parsed?.length) {
        setAndTrackMessages(parsed);
        saveThreadMessages(sId, parsed);
        return true;
      }
      return false;
    },
    [saveThreadMessages, setAndTrackMessages],
  );

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab as CopilotStudioTab);
  }, [initialTab]);

  const [inputText, setInputText] = useState(
    () => safeLocalStorageGetItem("dente_copilot_draft_text") || "",
  );
  const baseDraftRef = useRef<string>(inputText);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstRenderRef = useRef<boolean>(true);

  const resetDraft = useCallback(() => {
    setInputText("");
    baseDraftRef.current = "";
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("dente_copilot_draft_text");
      } catch (err) {
        clientLogger.debug("[CopilotStudioModal] Local draft cleanup skipped:", err);
      }
    }
  }, []);

  useEffect(() => {
    resetDraft();
  }, [patientId, resetDraft]);

  const handleClose = useCallback(() => {
    if (latestMessagesRef.current.length > 0) {
      saveThreadMessages(threadKey, latestMessagesRef.current);
    }
    resetDraft();
    onClose();
  }, [threadKey, saveThreadMessages, resetDraft, onClose]);

  const handlePromptFill = useCallback((prompt: string) => {
    setInputText(prompt);
    baseDraftRef.current = prompt;
  }, []);

  useCopilotStudioLifecycle({
    isOpen,
    isSettingsOpen,
    isHistoryOpen,
    runtimeMode,
    setRuntimeMode,
    threadKey,
    patientId,
    threadMessages,
    suppressNextHydrateThreadRef,
    hydrateSession,
    setAndTrackMessages,
    onPromptFill: handlePromptFill,
    onClose: handleClose,
  });

  const [appliedActionIds, setAppliedActionIds] = useState<Set<string>>(() => new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [, setIsExecuting] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [currentThought, setCurrentThought] = useState<string>("");
  const [activeToolName, setActiveToolName] = useState<string | null>(null);

  const unifiedVoice = useUnifiedDictation({
    context: "chat",
    patientId: toCleanUuid(ctxSnapshot.patientId),
    visitId: toCleanUuid(ctxSnapshot.activeVisitId),
    autoFallback: true,
  });
  const voice = {
    isListening: unifiedVoice.isRecording,
    fullText: unifiedVoice.fullTranscript,
    toggleListening: unifiedVoice.toggleDictation,
    stopListening: unifiedVoice.stopDictation,
    clearTranscript: unifiedVoice.clearTranscript,
  };

  useEffect(() => {
    baseDraftRef.current = inputText;
    if (!voice.isListening) voice.clearTranscript();
  }, [voice.isListening]);

  useEffect(() => {
    if (!voice.fullText) return;
    const base = (baseDraftRef.current || "").trim();
    const combined = base ? `${base} ${voice.fullText}` : voice.fullText;
    setInputText(combined);
    safeLocalStorageSetItem("dente_copilot_draft_text", combined);
  }, [voice.fullText]);

  useEffect(() => {
    if (!isOpen || activeTab !== "dialog") return;
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, activeTab]);

  const handleInputChange = (val: string) => {
    setInputText(val);
    if (!voice.isListening) baseDraftRef.current = val;
    safeLocalStorageSetItem("dente_copilot_draft_text", val);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? inputText).trim();
    if (!query) return;
    if (voice.isListening) await voice.stopListening();
    const nowTime = new Date().toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const userMsgId = `msg-${Date.now()}`;
    const assistantMsgId = `msg-${Date.now() + 1}`;
    setAndTrackMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: query, timestamp: nowTime },
      { id: assistantMsgId, role: "assistant", text: "", timestamp: nowTime, applied: false },
    ]);
    setInputText("");
    baseDraftRef.current = "";
    safeLocalStorageSetItem("dente_copilot_draft_text", "");
    voice.clearTranscript();
    setCurrentThought("");
    setActiveToolName(null);
    setIsStreaming(true);

    const { fallbackText, pendingAction: localPendingAction } = handleClinicalSpeechOrText(
      query,
      ctxSnapshot.patientId,
      ctxSnapshot.activeTooth,
      { trustLevel: settings.trustLevel, autoApply: settings.trustLevel === "autonomous" },
    );
    const apiRuntimeMode = runtimeMode === "desktop_native" ? "desktop_native" : "web_browser";
    const historyWindow = messages
      .filter((m) => m.text && m.text.trim().length > 0)
      .slice(-10)
      .map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      }));
    const outboundMessages = [...historyWindow, { role: "user" as const, content: query }];

    const sseState: SseProcessState = {
      accumulatedText: "",
      accumulatedThought: "",
      resolvedServerSessionId: isSessionUuid(activeThreadId) ? activeThreadId : "",
    };
    const localProposal = localPendingAction
      ? { ...localPendingAction, payload: { ...(localPendingAction.payload || {}) } }
      : undefined;
    let streamFailed = false;
    const handleSseEvent = (event: string, data: Record<string, unknown>) => {
      processCopilotSseEvent({
        event,
        data,
        state: sseState,
        assistantMsgId,
        localPendingAction: localProposal,
        setActiveToolName,
        setCurrentThought,
        setActiveDiff,
        addToolLog,
        setAndTrackMessages,
        defaultToolName: CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus,
      });
    };

    try {
      const mergedInstructions = [settings.customDoctorInstructions, ctxSnapshot.clinicalContextNote]
        .filter(Boolean)
        .join("\n\n");
      const streamResult = await streamCopilotChat({
        messages: outboundMessages, patientId: ctxSnapshot.patientId, activeVisitId: ctxSnapshot.activeVisitId,
        sessionId: sseState.resolvedServerSessionId || undefined, activeTooth: ctxSnapshot.activeTooth,
        runtimeMode: apiRuntimeMode, trustLevel: settings.trustLevel, maskPhiData: settings.maskPhiData ?? true,
        temperature: settings.temperature ?? 0.2, contextLimitTokens: settings.contextLimitTokens,
        showTypingAnimation: settings.showTypingAnimation, granularPermissions: settings.granularPermissions,
        customInstructions: mergedInstructions || undefined, memoryFacts: memoryFacts.map((m) => m.fact),
        doctorSpecialization: settings.clinicalSpecialization, speedMode,
        patientAllergies: ctxSnapshot.allergies, somaticHistory: ctxSnapshot.somaticHistory,
        modelRoutingMode: settings.modelRoutingMode, byokProvider: settings.byokProvider,
        byokApiKey: settings.byokApiKey, byokModel: settings.byokModel, byokBaseUrl: settings.byokBaseUrl,
        onEvent: handleSseEvent,
      });
      if (!streamResult.ok) streamFailed = true;
    } catch (err) {
      streamFailed = true;
      clientLogger.warn("[CopilotStudioModal] Streaming error:", err);
      showToast("Сбой соединения со шлюзом ИИ. Нажмите «Повторить».", "error", 6000, {
        label: "Повторить",
        onAction: () => { void handleSendMessage(query); },
      });
    }
    setIsStreaming(false);
    const syncedThreadId = syncCopilotStreamThread({
      resolvedServerSessionId: sseState.resolvedServerSessionId, activeThreadId,
      patientId: ctxSnapshot.patientId, patientName: ctxSnapshot.patientName,
      query, timestamp: nowTime, cleanUuid: toCleanUuid(ctxSnapshot.patientId),
    });
    if (syncedThreadId && syncedThreadId !== activeThreadId) {
      suppressNextHydrateThreadRef.current = syncedThreadId;
      sseState.resolvedServerSessionId = syncedThreadId;
    }
    if (!sseState.accumulatedText.trim() || streamFailed) {
      const isFallback = !isDemoShowcaseMode() && (streamFailed || !sseState.accumulatedText.trim());
      const fallbackMsg = isDemoShowcaseMode()
        ? "Готов к работе у кресла. Чем могу помочь?"
        : "Локальный клинический словарь готов к приёму команд.";
      setAndTrackMessages((prev) => prev.map((m) =>
        m.id === assistantMsgId
          ? {
              ...m,
              text: m.text.trim() || fallbackText || fallbackMsg,
              citation: m.citation || (isDemoShowcaseMode() && localProposal ? "Клинический протокол СтАР" : undefined),
              actionProposal: m.actionProposal ?? localProposal,
              ...(isFallback ? { isOfflineFallback: true } : {}),
            }
          : m,
      ));
    }
    saveThreadMessages(sseState.resolvedServerSessionId || threadKey, latestMessagesRef.current);
  };

  const handleApplyPrimaryAction = useCallback(
    async (action?: CopilotChatMessage["actionProposal"]) => {
      await executePrimaryProposalAction({
        action, messages, appliedActionIds, ctxSnapshot, activeThreadId, runtimeMode,
        executeConfirm: executeCopilotConfirmationWithResult,
        isDemoMode: isDemoShowcaseMode(),
        addToolLog,
        addProtocolMemory: (cat, fact) => useCopilotStore.getState().addMemoryFact(cat, fact),
        setActionError,
        onSuccessApplied: (actId) => {
          setAppliedActionIds((prev) => new Set([...prev, actId]));
          setMessages((prev) =>
            prev.map((m) => (m.actionProposal?.id === actId ? { ...m, applied: true } : m)),
          );
        },
      });
    },
    [ctxSnapshot, messages, appliedActionIds, activeThreadId, runtimeMode, addToolLog],
  );

  const executeApiTool = async (toolKey: string, payload: Record<string, unknown>) => {
    setIsExecuting(toolKey);
    try {
      await executeCopilotStudioApiTool({
        toolKey, payload, patientId: ctxSnapshot.patientId, activeThreadId, runtimeMode, addToolLog,
      });
    } finally {
      setIsExecuting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="copilot-studio-overlay fixed inset-0 z-[100] flex justify-end max-md:items-end pointer-events-auto"
      data-testid="chairside-copilot-studio-root"
    >
      <div
        className="copilot-studio-backdrop fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={handleClose} aria-hidden="true" data-testid="copilot-host-backdrop"
      />
      <aside
        className={[
          "copilot-studio-panel relative z-10 flex flex-col w-full md:w-[580px] lg:w-[620px]",
          "h-[88vh] md:h-full bg-[var(--paper)] text-[var(--ink)] border-t md:border-t-0",
          "md:border-l border-[var(--line)] rounded-t-[24px] md:rounded-t-0 shadow-2xl overflow-x-clip max-w-[100vw]",
        ].join(" ")}
        aria-label="Кабинет клинического копайлота" data-testid="copilot-workspace-panel"
      >
        <CopilotStudioHeaderAndTabs
          ctxSnapshot={ctxSnapshot} activeTab={activeTab} setActiveTab={setActiveTab}
          onOpenHistory={() => setHistoryOpen(true)} onOpenSettings={() => setSettingsOpen(true)}
          onCollapseToHud={() => { useCopilotStore.getState().collapseToHud(); handleClose(); }}
          onClose={handleClose}
        />
        <CopilotStudioTabContent
          activeTab={activeTab} setActiveTab={setActiveTab} ctxSnapshot={ctxSnapshot}
          runtimeMode={runtimeMode} speedMode={speedMode} showThinkingProcess={showThinkingProcess}
          thoughtProcess={thoughtProcess} currentThought={currentThought} activeToolName={activeToolName}
          messages={messages} setMessages={setMessages} isStreaming={isStreaming} isThinking={isThinking}
          activeDiff={activeDiff} setActiveDiff={setActiveDiff} applyActiveDiff={applyActiveDiff}
          rejectActiveDiff={rejectActiveDiff} toolExecutionLogs={toolExecutionLogs}
          appliedActionIds={appliedActionIds} actionError={actionError} setActionError={setActionError}
          onApplyAction={handleApplyPrimaryAction} onSendMessage={handleSendMessage}
          executeApiTool={executeApiTool} messagesEndRef={messagesEndRef}
          isListening={voice.isListening} audioLevel={unifiedVoice.audioLevel}
          audioMode={unifiedVoice.mode} speechHealth={unifiedVoice.speechHealth}
          streamManager={unifiedVoice.streamManager} inputText={inputText}
          onInputChange={handleInputChange} onToggleListening={voice.toggleListening}
          onStopListening={voice.stopListening} isSettingsOpen={isSettingsOpen}
          setSettingsOpen={setSettingsOpen} isHistoryOpen={isHistoryOpen} setHistoryOpen={setHistoryOpen}
          threads={threads} threadMessages={threadMessages} selectThread={selectThread}
          hydrateSession={hydrateSession}
        />
      </aside>
    </div>
  );
};
export const ChairsideCopilotStudioModal = CopilotStudioModal;
export default CopilotStudioModal;
