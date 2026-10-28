/**
 * copilotStreamEventHandler.ts — Event parser and state dispatcher for Copilot SSE streams.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 250 lines.
 * - Dispatches thinking, tokens, tool results, and HITL confirmations.
 */

import { dispatchCrmAction } from "../../../services/ai";
import type {
  ConfirmUiMessage,
  CopilotPhase,
  CopilotUiMessage,
  PendingConfirmation,
  ProactiveAlertCardData,
  ReactStepItem,
  ToolUiMessage,
  WhatsAppApprovalCard,
} from "./types";

export interface StreamEventHandlerParams {
  apiBaseUrl: string;
  setPhase: (phase: CopilotPhase) => void;
  setMessages: React.Dispatch<React.SetStateAction<CopilotUiMessage[]>>;
  setPending: (pending: PendingConfirmation | null) => void;
  setProactiveAlerts: React.Dispatch<React.SetStateAction<ProactiveAlertCardData[]>>;
  setWhatsappHitLCards: React.Dispatch<React.SetStateAction<WhatsAppApprovalCard[]>>;
  cacheNames: (toolName: string, result: unknown) => void;
}

export function createStreamEventHandler(params: StreamEventHandlerParams) {
  const {
    apiBaseUrl,
    setPhase,
    setMessages,
    setPending,
    setProactiveAlerts,
    setWhatsappHitLCards,
    cacheNames,
  } = params;

  return (event: string, data: Record<string, unknown>) => {
    if (event === "thought" || event === "reasoning") {
      setPhase("thinking");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.kind === "thinking" && last.streaming) {
          return [
            ...prev.slice(0, -1),
            { ...last, text: last.text + String(data.text || "") },
          ];
        }
        return [
          ...prev,
          {
            kind: "thinking",
            text: String(data.text || ""),
            streaming: true,
          },
        ];
      });
    } else if (event === "token" || event === "delta") {
      setPhase("writing");
      setMessages((prev) => {
        // Mark any streaming thinking blocks as finished
        const finalizedPrev = prev.map((m) =>
          m.kind === "thinking" && m.streaming ? { ...m, streaming: false } : m,
        );
        const last = finalizedPrev[finalizedPrev.length - 1];
        if (last && last.kind === "text" && last.role === "assistant" && last.streaming) {
          return [
            ...finalizedPrev.slice(0, -1),
            { ...last, text: last.text + String(data.text || "") },
          ];
        }
        return [
          ...finalizedPrev,
          {
            kind: "text",
            role: "assistant",
            text: String(data.text || ""),
            streaming: true,
          },
        ];
      });
    } else if (event === "tool_call" || event === "tool_start") {
      setPhase("working");
      setMessages((prev) =>
        prev.map((m) =>
          m.kind === "thinking" && m.streaming ? { ...m, streaming: false } : m,
        ),
      );
      const toolMsg: ToolUiMessage = {
        kind: "tool",
        callId: String(data.callId || data.call_id || Date.now()),
        name: String(data.name || "tool"),
        status: "running",
        args:
          (data.args as Record<string, unknown>) ||
          (data.arguments as Record<string, unknown>) ||
          {},
      };
      setMessages((prev) => [...prev, toolMsg]);
    } else if (event === "tool_result") {
      const callId = String(data.callId || data.call_id);
      const isOk = Boolean(data.ok !== false && data.status !== "failed");
      const res = data.result;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.kind === "tool" && m.callId === callId) {
            return {
              ...m,
              status: isOk ? "done" : "failed",
              result: res,
            };
          }
          return m;
        }),
      );

      if (isOk && data.name) {
        cacheNames(String(data.name), res);
        const toolArgs =
          (data.args as Record<string, unknown>) ||
          (data.arguments as Record<string, unknown>) ||
          {};
        dispatchCrmAction(
          {
            callId,
            name: String(data.name),
            arguments: toolArgs,
            confirmed: true,
          },
          apiBaseUrl,
        ).catch(() => {});
      }
    } else if (
      event === "confirmation_required" ||
      event === "tool_confirmation_required"
    ) {
      const cMsg: ConfirmUiMessage = {
        kind: "confirmation",
        callId: String(data.callId || data.call_id || Date.now()),
        name: String(data.name || "action"),
        args:
          (data.args as Record<string, unknown>) ||
          (data.arguments as Record<string, unknown>) ||
          {},
      };
      setMessages((prev) => [...prev, cMsg]);
      setPending({ callId: cMsg.callId, name: cMsg.name, args: cMsg.args });
    } else if (event === "react_steps" || event === "react_pipeline") {
      const steps = (data.steps as ReactStepItem[]) || [];
      const title = typeof data.title === "string" ? data.title : undefined;
      const isComplete = typeof data.isComplete === "boolean" ? data.isComplete : false;
      const currentStepIndex =
        typeof data.currentStepIndex === "number" ? data.currentStepIndex : undefined;
      const totalDurationMs =
        typeof data.totalDurationMs === "number" ? data.totalDurationMs : undefined;

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.kind === "react_steps") {
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              steps,
              title: title || last.title,
              isComplete,
              currentStepIndex,
              totalDurationMs,
            },
          ];
        }
        return [
          ...prev,
          {
            kind: "react_steps",
            title,
            steps,
            isComplete,
            currentStepIndex,
            totalDurationMs,
          },
        ];
      });
    } else if (event === "proactive_alert") {
      const alertData =
        (data.data as ProactiveAlertCardData) ||
        (data as unknown as ProactiveAlertCardData);
      if (alertData?.id) {
        setProactiveAlerts((prev) => {
          if (prev.some((a) => a.id === alertData.id)) return prev;
          return [alertData, ...prev];
        });
        const hitl = alertData.data?.approvalCard as WhatsAppApprovalCard | undefined;
        if (hitl?.approvalId) {
          setWhatsappHitLCards((prev) => {
            if (prev.some((c) => c.approvalId === hitl.approvalId)) return prev;
            return [hitl, ...prev];
          });
        }
      }
    } else if (event === "proactive_alert_resolved") {
      const cardId = String(data.id || "");
      setWhatsappHitLCards((prev) =>
        prev.map((c) =>
          c.approvalId === cardId
            ? {
                ...c,
                status: data.status === "approved" ? "approved" : "rejected",
              }
            : c,
        ),
      );
      setProactiveAlerts((prev) =>
        prev.filter(
          (a) =>
            a.id !== `alert_hitl_${cardId}` && a.data?.approvalId !== cardId,
        ),
      );
    } else if (event === "proactive_alert_dismissed") {
      const alertId = String(data.alertId || "");
      setProactiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } else if (event === "done" || event === "finish") {
      setPhase(null);
      setMessages((prev) =>
        prev.map((m) =>
          m.kind === "text" && m.streaming ? { ...m, streaming: false } : m,
        ),
      );
    } else if (event === "budget_exceeded") {
      setMessages((prev) => [
        ...prev,
        {
          kind: "text",
          role: "assistant",
          text: "Превышен месячный лимит токенов Copilot для клиники.",
          streaming: false,
        },
      ]);
    } else if (event === "error") {
      setMessages((prev) => [
        ...prev,
        {
          kind: "text",
          role: "assistant",
          text: `Ошибка: ${String(data.detail || data.message || "Неизвестная ошибка")}`,
          streaming: false,
        },
      ]);
    }
  };
}
