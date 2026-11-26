/**
 * copilotStudioHelpers.ts — Session hydration, full chairside context snapshot,
 * and canonical tool execution for CopilotStudioModal (Mandates 8b, 8be, 8bm, 8bo).
 */

import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders, denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../GlobalToast";
import type { CopilotMessage, ToolExecutionLog } from "../../../store/copilotStore";
import { parseActionProposal, parseJsonResponse, type CopilotUiMessage } from "../copilotTypes";
import { getCurrentCopilotUiContext } from "../contextSync/contextStoreReader";

export type CopilotStudioTab = "dialog" | "actions" | "memory";

export interface CopilotChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  citation?: string | undefined;
  timestamp: string;
  applied?: boolean | undefined;
  actionProposal?: {
    id: string;
    toolName: string;
    description: string;
    payload: Record<string, unknown>;
  } | undefined;
  suggestedReplies?: string[] | undefined;
  toolResult?: unknown | undefined;
  toolName?: string | undefined;
  isOfflineFallback?: boolean | undefined;
}

export interface StudioContextSnapshot {
  patientId: string | null;
  patientName: string | null;
  activeVisitId: string | null;
  activeTooth: number | null;
  activeDoctor: string | null;
  activeViewLabel: string;
  allergies: string[] | undefined;
  somaticHistory: string | undefined;
  clinicalContextNote: string | undefined;
}

const DESKTOP_ONLY_TOOLS = new Set([
  "capture_workstation_screen",
  "search_workstation_files",
  "launch_workstation_app",
  "run_workstation_shell",
]);

export function extractSuggestions(text: string): { cleanText: string; suggestions?: string[] | undefined } {
  const match = text.match(/<<<SUGGESTIONS:\s*(\[[\s\S]*?\])\s*>>>/);
  let suggestions: string[] | undefined;
  if (match && match[1]) {
    try {
      const parsed: unknown = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        suggestions = parsed.filter((s): s is string => typeof s === "string");
      }
    } catch (err) {
      clientLogger.debug("[copilotStudioHelpers] Ignored malformed suggestions JSON:", err);
    }
  }
  return {
    cleanText: text.replace(/<<<SUGGESTIONS:[\s\S]*?(?:>>>|$)/g, "").trim(),
    suggestions,
  };
}

export function parseChatMsgs(
  list?: Array<CopilotChatMessage | CopilotUiMessage | CopilotMessage | Record<string, unknown>>,
): CopilotChatMessage[] {
  return (list || []).map((m, i) => {
    const rec = typeof m === "object" && m !== null ? (m as Record<string, unknown>) : {};
    const raw =
      typeof rec.text === "string"
        ? rec.text
        : typeof rec.content === "string"
          ? rec.content
          : rec.kind === "tool"
            ? `Выполнен инструмент: ${String(rec.name || "")}`
            : "";
    const { cleanText, suggestions } = extractSuggestions(raw);
    const role = rec.role === "assistant" || rec.kind === "tool" ? "assistant" : "user";
    const replies = Array.isArray(rec.suggestedReplies)
      ? rec.suggestedReplies.filter((s): s is string => typeof s === "string")
      : suggestions;
    return {
      id: typeof rec.id === "string" ? rec.id : typeof rec.callId === "string" ? rec.callId : `msg-${i}`,
      role,
      text: cleanText,
      timestamp: typeof rec.timestamp === "string" ? rec.timestamp : "10:00",
      applied: Boolean(rec.applied),
      citation: typeof rec.citation === "string" ? rec.citation : undefined,
      actionProposal: parseActionProposal(rec.actionProposal),
      suggestedReplies: replies,
      toolResult: rec.toolResult,
      toolName: typeof rec.toolName === "string" ? rec.toolName : undefined,
      isOfflineFallback: Boolean(rec.isOfflineFallback),
    };
  });
}

export async function hydrateCopilotThreadMessages(sId: string): Promise<CopilotChatMessage[] | null> {
  try {
    const res = await fetch(`/api/agent/sessions/${encodeURIComponent(sId)}/messages`, {
      method: "GET",
      credentials: "include",
      headers: denteClinicalReadHeaders(),
    });
    if (!res.ok) return null;
    const rawJson: unknown = await res.json();
    const unwrapped =
      rawJson && typeof rawJson === "object" && "data" in rawJson
        ? (rawJson as { data?: unknown }).data
        : rawJson;
    const container = (unwrapped && typeof unwrapped === "object" ? unwrapped : rawJson) as {
      messages?: unknown[];
    } | null;
    const list = Array.isArray(unwrapped)
      ? unwrapped
      : Array.isArray(container?.messages)
        ? container.messages
        : null;
    if (!list?.length) return null;
    return parseChatMsgs(
      list.map((raw) => {
        const m = (typeof raw === "object" && raw !== null ? raw : {}) as {
          id?: string;
          role?: "user" | "assistant";
          content?: string;
          text?: string;
          createdAt?: string;
        };
        return {
          id: m.id,
          role: m.role,
          content: m.content || m.text,
          timestamp: m.createdAt
            ? new Date(m.createdAt).toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : undefined,
        };
      }),
    );
  } catch (err) {
    clientLogger.warn("[CopilotStudioModal] Hydrate session offline:", err);
    return null;
  }
}

export function resolveStudioContextSnapshot(params: {
  patientId?: string | null | undefined;
  patientName?: string | null | undefined;
  activeVisitId?: string | null | undefined;
  activeTooth?: number | null | undefined;
}): StudioContextSnapshot {
  const uiCtx = getCurrentCopilotUiContext();
  const isDemo = isDemoShowcaseMode() || isDemoPatientId(params.patientId);
  const resolvedPatientId = params.patientId ?? uiCtx.patientId ?? (isDemo ? "pat-36" : null);
  const resolvedPatientName =
    params.patientName || uiCtx.patientName || (isDemo ? "Кузнецов М.П." : null);
  const parsedTooth =
    typeof params.activeTooth === "number"
      ? params.activeTooth
      : typeof uiCtx.activeTooth === "number"
        ? uiCtx.activeTooth
        : isDemo
          ? 36
          : null;

  const noteParts: string[] = [];
  if (uiCtx.toothFormula && Object.keys(uiCtx.toothFormula).length > 0) {
    const entries = Object.entries(uiCtx.toothFormula)
      .slice(0, 12)
      .map(([tooth, st]) => `${tooth}:${st}`)
      .join(", ");
    noteParts.push(`Зубная формула: ${entries}`);
  }
  const emk = uiCtx.clinicalEmkContext ?? uiCtx.clinical043Context;
  if (emk?.complaints || emk?.diagnosis || emk?.treatmentPlan) {
    const emkSummary = [emk.complaints, emk.diagnosis, emk.treatmentPlan].filter(Boolean).join(" | ");
    if (emkSummary) noteParts.push(`Черновик карты: ${emkSummary.slice(0, 260)}`);
  }
  const activeVisit =
    params.activeVisitId ??
    (typeof uiCtx.additionalContext?.activeVisitId === "string"
      ? uiCtx.additionalContext.activeVisitId
      : null);

  return {
    patientId: resolvedPatientId,
    patientName: resolvedPatientName,
    activeVisitId: activeVisit,
    activeTooth: parsedTooth,
    activeDoctor: uiCtx.activeDoctor,
    activeViewLabel: uiCtx.viewLabel,
    allergies: uiCtx.allergies,
    somaticHistory: uiCtx.allergies?.length ? `Аллергии: ${uiCtx.allergies.join(", ")}` : undefined,
    clinicalContextNote: noteParts.length > 0 ? noteParts.join("\n") : undefined,
  };
}

export async function executeCopilotStudioApiTool(params: {
  toolKey: string;
  payload: Record<string, unknown>;
  patientId?: string | null | undefined;
  activeThreadId: string;
  runtimeMode: string;
  addToolLog: (log: Omit<ToolExecutionLog, "id" | "timestamp">) => void;
}): Promise<void> {
  const { toolKey, payload, patientId, activeThreadId, runtimeMode, addToolLog } = params;
  const apiRuntimeMode = runtimeMode === "desktop_native" ? "desktop_native" : "web_browser";
  if (apiRuntimeMode !== "desktop_native" && DESKTOP_ONLY_TOOLS.has(toolKey)) {
    const msg = "Этот инструмент рабочей станции доступен только в десктопном приложении DENTE.";
    addToolLog({
      toolName: toolKey,
      category: "workstation",
      status: "rejected",
      args: payload,
      resultSummary: msg,
    });
    showToast(msg, "info");
    return;
  }
  const startTime = Date.now();
  try {
    const res = await fetch("/api/agent/action", {
      method: "POST",
      credentials: "include",
      headers: denteClinicalMutationHeaders({
        "Content-Type": "application/json",
        "Idempotency-Key": generateUuidV7(),
        "x-agent-runtime": apiRuntimeMode,
      }),
      body: JSON.stringify({
        toolName: toolKey,
        args: payload,
        confirmed: true,
        patientId: patientId || undefined,
        sessionId: activeThreadId || undefined,
        runtimeMode: apiRuntimeMode,
      }),
    });
    let rawJson: unknown = {};
    try {
      rawJson = await res.json();
    } catch (parseErr) {
      clientLogger.warn("[copilotStudioHelpers] Invalid JSON response:", parseErr);
    }
    const unwrapped =
      rawJson && typeof rawJson === "object" && "data" in rawJson
        ? (rawJson as { data?: unknown }).data
        : rawJson;
    const data = parseJsonResponse(unwrapped);
    const ok = res.ok && data.ok !== false;
    const errDetail =
      res.status === 403
        ? "Доступно только в десктопном приложении DENTE"
        : data?.error || res.statusText;
    addToolLog({
      toolName: toolKey,
      category: DESKTOP_ONLY_TOOLS.has(toolKey) ? "workstation" : "clinical",
      status: ok ? "success" : "rejected",
      durationMs: Date.now() - startTime,
      args: payload,
      resultSummary: ok ? `Выполнен инструмент ${toolKey}` : `Сбой ${toolKey}: ${errDetail}`,
    });
    showToast(
      ok ? "Действие успешно выполнено в системе" : `Сбой ${toolKey}: ${errDetail}`,
      ok ? "success" : "error",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ошибка сети";
    addToolLog({
      toolName: toolKey,
      category: "clinical",
      status: "rejected",
      durationMs: Date.now() - startTime,
      args: payload,
      resultSummary: `Сбой сети для ${toolKey}: ${msg}`,
    });
    showToast(`Ошибка сети при вызове инструмента: ${msg}`, "error");
  }
}
