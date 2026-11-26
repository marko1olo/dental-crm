/**
 * copilotStudioStreamHelpers.ts — SSE event processing and clinical workspace
 * event dispatching for CopilotStudioModal (Mandates 8b, 8be, 8zq).
 */

import { showToast } from "../../GlobalToast";
import type { ToolExecutionLog } from "../../../store/copilotStore";
import {
  type CopilotChatMessage,
  type StudioContextSnapshot,
  extractSuggestions,
} from "./copilotStudioHelpers";

export interface SseProcessState {
  accumulatedText: string;
  accumulatedThought: string;
  pendingAction?: CopilotChatMessage["actionProposal"] | undefined;
  pendingToolResult?: unknown | undefined;
  pendingToolName?: string | undefined;
  resolvedServerSessionId: string;
}

export function processCopilotSseEvent(params: {
  event: string;
  data: Record<string, unknown>;
  state: SseProcessState;
  assistantMsgId: string;
  localPendingAction?: CopilotChatMessage["actionProposal"] | undefined;
  setActiveToolName: (name: string | null) => void;
  setCurrentThought: (thought: string) => void;
  setActiveDiff: (diff: {
    id: string;
    title: string;
    targetEntity: string;
    beforeText: string;
    afterText: string;
    applied: boolean;
  }) => void;
  addToolLog: (log: Omit<ToolExecutionLog, "id" | "timestamp">) => void;
  setAndTrackMessages: (
    updater: CopilotChatMessage[] | ((prev: CopilotChatMessage[]) => CopilotChatMessage[]),
  ) => void;
  defaultToolName: string;
}): void {
  const {
    event, data, state, assistantMsgId, localPendingAction,
    setActiveToolName, setCurrentThought, setActiveDiff,
    addToolLog, setAndTrackMessages, defaultToolName,
  } = params;
  const evType = typeof data.type === "string" ? data.type : event;
  if (typeof data.sessionId === "string" && /^[0-9a-f-]{36}$/i.test(data.sessionId)) {
    state.resolvedServerSessionId = data.sessionId;
  }
  const evArgsRaw = data.args || data.arguments;
  const evArgs =
    evArgsRaw && typeof evArgsRaw === "object"
      ? (evArgsRaw as Record<string, unknown>)
      : {};

  if (evType === "token" && typeof data.text === "string") {
    state.accumulatedText += data.text;
  } else if (
    (evType === "thought" || evType === "thinking" || evType === "reasoning") &&
    typeof data.text === "string"
  ) {
    state.accumulatedThought += data.text;
    setCurrentThought(state.accumulatedThought);
  } else if (
    evType === "confirmation_required" ||
    evType === "tool_call_started" ||
    evType === "tool_start"
  ) {
    const toolName = String(data.tool || data.name || defaultToolName);
    setActiveToolName(toolName);
    const desc =
      typeof data.descriptionRu === "string" ? data.descriptionRu : `Действие: ${toolName}`;
    if (evType === "confirmation_required") {
      state.pendingAction = {
        id: String(data.callId || `act-${Date.now()}`),
        toolName,
        description: desc,
        payload: evArgs,
      };
    }
    addToolLog({
      toolName,
      category: "clinical",
      status: "pending",
      args: evArgs,
      resultSummary: desc,
    });
  } else if (
    evType === "tool_end" ||
    evType === "tool_call_finished" ||
    evType === "tool_result"
  ) {
    setActiveToolName(null);
    state.pendingToolName = String(
      data.name || data.tool || state.pendingAction?.toolName || "",
    );
    state.pendingToolResult = data.result ?? data.data ?? data.payload;
    if (
      evArgs.beforeText ||
      evArgs.afterText ||
      state.pendingToolName.includes("file") ||
      state.pendingToolName.includes("workstation")
    ) {
      const targetFile = String(
        evArgs.targetEntity || evArgs.path || evArgs.file || "workstation_document.txt",
      );
      const resultText =
        typeof state.pendingToolResult === "string"
          ? state.pendingToolResult
          : JSON.stringify(state.pendingToolResult, null, 2);
      setActiveDiff({
        id: `diff-${Date.now()}`,
        title: `Изменения файла: ${targetFile.split(/[/\\]/).pop() || targetFile}`,
        targetEntity: targetFile,
        beforeText: String(evArgs.beforeText || "(Исходное состояние файла)"),
        afterText: String(evArgs.afterText || evArgs.content || resultText || ""),
        applied: false,
      });
    }
    addToolLog({
      toolName: state.pendingToolName,
      category: "clinical",
      status: "success",
      args: evArgs,
      resultSummary: `Выполнен: ${state.pendingToolName}`,
    });
  } else if (
    (evType === "done" || evType === "final" || evType === "final_answer") &&
    typeof data.text === "string" &&
    !state.accumulatedText
  ) {
    setActiveToolName(null);
    state.accumulatedText = data.text;
  }

  if (state.accumulatedText || state.pendingToolResult) {
    const { cleanText, suggestions } = extractSuggestions(state.accumulatedText);
    const effectiveAction =
      state.pendingAction ??
      (localPendingAction
        ? { ...localPendingAction, payload: { ...(localPendingAction.payload || {}) } }
        : undefined);
    setAndTrackMessages((prev) =>
      prev.map((m): CopilotChatMessage =>
        m.id === assistantMsgId
          ? {
              ...m,
              text: cleanText,
              actionProposal: effectiveAction ?? m.actionProposal,
              citation: m.citation ?? "Клинический протокол СтАР",
              suggestedReplies: suggestions,
              toolResult: state.pendingToolResult ?? m.toolResult,
              toolName: state.pendingToolName ?? m.toolName,
            }
          : m,
      ),
    );
  }
}

export function dispatchAppliedProposalToClinicalEvents(params: {
  act: NonNullable<CopilotChatMessage["actionProposal"]>;
  ctxSnapshot: StudioContextSnapshot;
  addProtocolMemory: (category: "protocols", fact: string) => void;
}): void {
  if (typeof window === "undefined") return;
  const { act, ctxSnapshot, addProtocolMemory } = params;
  const payload = act.payload || {};
  const rawTooth = payload.tooth ?? payload.toothNumber ?? ctxSnapshot.activeTooth;
  const targetTooth = Number(rawTooth) || undefined;
  const targetDiag =
    (payload.diagnosis as string) ||
    act.description ||
    (targetTooth ? `Клинический статус (Зуб ${targetTooth})` : "Клинический статус");
  const targetPlan =
    (payload.treatmentPlan as string) ||
    (payload.plan as string) ||
    (act.description ? `План: ${act.description}` : "План лечения");
  const stateCode = (payload.state as string) || (payload.status as string) || undefined;
  const icdCode =
    (payload.diagnosisIcd10 as string) || (payload.icd10 as string) || undefined;
  const isVisitOpen = Boolean(
    ctxSnapshot.activeVisitId || window.__useVisitStore?.getState()?.visitNoteForm,
  );
  if (isVisitOpen) {
    window.dispatchEvent(
      new CustomEvent("dente-apply-soap-protocol", {
        detail: {
          tooth: targetTooth,
          toothNumber: targetTooth,
          state: stateCode,
          diagnosis: targetDiag,
          diagnosisIcd10: icdCode,
          treatmentPlan: targetPlan,
          finding: targetTooth
            ? { toothNumber: targetTooth, state: stateCode || "caries", icd10Override: icdCode }
            : undefined,
        },
      }),
    );
    showToast("Клиническое действие применено в карту приёма", "success");
  } else {
    const toothSuffix = targetTooth ? ` (Зуб ${targetTooth})` : "";
    addProtocolMemory("protocols", `Протокол [${targetDiag}]: ${targetPlan}${toothSuffix}`);
    showToast("Визит не открыт: протокол сохранён в памяти ассистента.", "info");
  }
  if (targetTooth) {
    window.dispatchEvent(
      new CustomEvent("dente-odontogram-update", {
        detail: {
          patientId: ctxSnapshot.patientId,
          toothNumber: targetTooth,
          status: stateCode || "caries",
        },
      }),
    );
  }
}

export async function executePrimaryProposalAction(params: {
  action?: CopilotChatMessage["actionProposal"] | undefined;
  messages: CopilotChatMessage[];
  appliedActionIds: Set<string>;
  ctxSnapshot: StudioContextSnapshot;
  activeThreadId: string;
  runtimeMode: string;
  executeConfirm: (opts: {
    callId: string;
    decision: "confirm";
    actionName: string;
    actionArgs: Record<string, unknown>;
    patientId?: string | undefined;
    sessionId?: string | undefined;
    runtimeMode: string;
  }) => Promise<{ ok: boolean; error?: string | undefined }>;
  isDemoMode: boolean;
  addToolLog: (log: Omit<ToolExecutionLog, "id" | "timestamp">) => void;
  addProtocolMemory: (category: "protocols", fact: string) => void;
  setActionError: (err: string | null) => void;
  onSuccessApplied: (actId: string) => void;
}): Promise<void> {
  const {
    action, messages, appliedActionIds, ctxSnapshot, activeThreadId, runtimeMode,
    executeConfirm, isDemoMode, addToolLog, addProtocolMemory, setActionError, onSuccessApplied,
  } = params;
  setActionError(null);
  const act =
    action ??
    [...messages]
      .reverse()
      .find(
        (m) =>
          m.role === "assistant" &&
          m.actionProposal &&
          !m.applied &&
          !appliedActionIds.has(m.actionProposal.id),
      )?.actionProposal;
  if (!act) {
    showToast("Нет активных предложений для применения", "info");
    return;
  }
  const apiRuntimeMode = runtimeMode === "desktop_native" ? "desktop_native" : "web_browser";
  try {
    if (act.id || act.toolName) {
      const confirmResult = await executeConfirm({
        callId: act.id,
        decision: "confirm",
        actionName: act.toolName,
        actionArgs: act.payload || {},
        patientId: ctxSnapshot.patientId || undefined,
        sessionId: activeThreadId || undefined,
        runtimeMode: apiRuntimeMode,
      });
      if (!confirmResult.ok && !isDemoMode) {
        const msg = confirmResult.error || `Не удалось подтвердить действие «${act.toolName}»`;
        addToolLog({
          toolName: act.toolName,
          category: "clinical",
          status: "rejected",
          args: act.payload || {},
          resultSummary: `Ошибка подтверждения: ${msg}`,
        });
        setActionError(msg);
        showToast(msg, "error");
        return;
      }
      addToolLog({
        toolName: act.toolName,
        category: "clinical",
        status: "success",
        args: act.payload || {},
        resultSummary: `Подтверждено: ${act.toolName}`,
      });
    }
    dispatchAppliedProposalToClinicalEvents({ act, ctxSnapshot, addProtocolMemory });
    onSuccessApplied(act.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Не удалось применить действие в карту";
    setActionError(msg);
    showToast(msg, "error");
  }
}
