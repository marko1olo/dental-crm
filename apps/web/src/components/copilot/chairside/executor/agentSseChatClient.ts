/**
 * agentSseChatClient.ts — Canonical SSE stream client for Chairside Copilot HUD.
 * Connects directly to POST /api/agent/chat (Mandate 8b <= 150 lines, Mandate 8e).
 */

import type {
  ChairsideThoughtStep,
  ChairsideToothProposal,
  ChairsideServiceProposal,
  ChairsideSoapProposal,
  ChairsideAnestheticProposal,
  ChairsideSafetyAlert,
} from "../chairsideTypes";
import type { CopilotExecutionResult } from "../chairsideAgentExecutor";
import { showToast } from "../../../GlobalToast";
import { clientLogger } from "../../../../services/logging/clientLogger";
import { useCopilotStore } from "../../../../store/copilotStore";
import { streamCopilotChat, toCleanUuid } from "../../client/copilotStreamClient";

const TOOTH_STATE_LABELS: Record<string, string> = {
  caries: "Кариес",
  pulpitis: "Пульпит",
  periodontitis: "Периодонтит",
  filling: "Пломба",
  crown: "Коронка",
  implant: "Имплантат",
  extracted: "Удалён",
  missing: "Отсутствует",
  root: "Корень",
  mobility: "Подвижность",
  healthy: "Норма",
};

export interface StreamAgentChatParams {
  promptText: string;
  activeTooth?: number | undefined;
  patientId?: string | undefined;
  visitId?: string | undefined;
  headers: Record<string, string>;
  trustLevel?: "confirm_all" | "balanced" | "autonomous" | undefined;
  onThoughtChunk?: ((chunk: string) => void) | undefined;
  maskPhiData?: boolean | undefined;
  patientAllergies?: readonly string[] | string[] | undefined;
  somaticHistory?: string | readonly string[] | string[] | undefined;
}

export async function requestAgentSseStream(
  params: StreamAgentChatParams
): Promise<CopilotExecutionResult | null> {
  const { promptText, activeTooth, patientId, visitId, headers, trustLevel, onThoughtChunk } = params;
  const effectiveMaskPhi = params.maskPhiData ?? useCopilotStore.getState().settings.maskPhiData ?? true;

  try {
    let accumulatedThought = "";
    let finalVerdict = "";
    const thoughts: ChairsideThoughtStep[] = [];
    let toothProposal: ChairsideToothProposal | null = null;
    let servicesProposal: ChairsideServiceProposal[] | null = null;
    let soapProposal: ChairsideSoapProposal | null = null;
    let anestheticProposal: ChairsideAnestheticProposal | null = null;
    let safetyAlert: ChairsideSafetyAlert | null = null;
    let stepCounter = 0;

    const processEvent = (event: string, data: Record<string, unknown>) => {
      if (event === "thought" || event === "reasoning" || event === "thinking") {
        const delta = String(data.text || data.thought || "");
        accumulatedThought += delta;
        onThoughtChunk?.(delta);
        const lastThought = thoughts[thoughts.length - 1];
        if (thoughts.length === 0 || !lastThought || lastThought.status === "done") {
          stepCounter++;
          thoughts.push({
            id: `thought-${stepCounter}`,
            stepNumber: stepCounter,
            title: delta.trim().split("\n")[0] || "Клинический анализ контекста",
            status: "running",
            detail: delta.trim(),
          });
        } else {
          lastThought.detail = (lastThought.detail || "") + delta;
        }
      } else if (event === "tool_start" || event === "tool_call_started") {
        const toolName = String(data.name || data.tool || "tool");
        stepCounter++;
        thoughts.push({
          id: `tool-${stepCounter}`,
          stepNumber: stepCounter,
          title: `Инструмент: ${toolName}`,
          status: "running",
          detail: JSON.stringify(data.args || data.arguments || {}),
        });
      } else if (event === "tool_end" || event === "tool_call_finished") {
        const toolName = String(data.name || data.tool || "");
        const result = (data.result && typeof data.result === "object" ? data.result : undefined) as Record<string, unknown> | undefined;
        const lastThought = thoughts[thoughts.length - 1];
        if (lastThought && lastThought.status === "running") {
          lastThought.status = "done";
        }
        if (toolName === "update_tooth_status" && result) {
          const resolvedTooth = Number(result.toothNumber ?? result.tooth ?? activeTooth ?? 0);
          if (resolvedTooth > 0) {
            const rawState = String(result.newState ?? result.state ?? result.clinicalState ?? "caries");
            const label = typeof result.stateLabel === "string"
              ? result.stateLabel
              : typeof result.statusLabel === "string"
              ? result.statusLabel
              : (TOOTH_STATE_LABELS[rawState] || `Статус: ${rawState}`);
            toothProposal = {
              toothNumber: resolvedTooth,
              state: rawState,
              stateLabel: label,
              surfaces: Array.isArray(result.surfaces) && result.surfaces.length > 0 ? (result.surfaces as string[]) : ["O"],
              applied: false,
            };
          }
        } else if ((toolName === "generate_clinical_protocol_entry" || toolName === "generate_clinical_protocol") && result) {
          soapProposal = {
            complaint: String(result.complaints || result.complaint || ""),
            anamnesis: String(result.anamnesis || ""),
            objectiveStatus: String(result.statusLocalis || result.objectiveStatus || ""),
            diagnosis: String(result.diagnosisMkb || result.diagnosis || ""),
            treatmentPlan: String(result.treatmentProtocol || result.treatmentPlan || ""),
            recommendations: String(result.recommendations || ""),
            applied: false,
          };
        } else if (toolName === "calculate_anesthesia" && result) {
          anestheticProposal = {
            drugName: String(result.drugName || "Артикаин 4%"),
            carpulesCount: Number(result.carpulesCount || 1),
            patientWeightKg: Number(result.patientWeightKg || 70),
            maxCarpules: Number(result.maxCarpules || 7),
            epinephrineMcg: Number(result.epinephrineMcg || 8.5),
            isCardiovascularRisk: Boolean(result.isCardiovascularRisk),
            notes: typeof result.warning === "string" ? result.warning : undefined,
            applied: false,
          };
        }
      } else if (event === "token" || event === "delta") {
        finalVerdict += String(data.text || data.delta || "");
      } else if (event === "done" || event === "final") {
        if (typeof data.text === "string" && !finalVerdict) {
          finalVerdict = data.text;
        }
        for (const t of thoughts) {
          t.status = "done";
        }
      }
    };

    // Canonical SSOT Copilot Stream Client (Mandates: 8bf, 8e)
    const streamResult = await streamCopilotChat({
      messages: [{ role: "user", content: promptText }],
      patientId,
      activeVisitId: visitId,
      activeTooth,
      patientAllergies: params.patientAllergies,
      somaticHistory: params.somaticHistory,
      trustLevel: trustLevel || "balanced",
      maskPhiData: effectiveMaskPhi,
      headers,
      onEvent: (event, data) => processEvent(event, data),
    });

    if (!streamResult.ok) {
      return null;
    }

    for (const t of thoughts) {
      if (t.status === "running") {
        t.status = "done";
      }
    }

    const isLocalFallback =
      finalVerdict.includes("[ШЛЮЗ ИИ ВРЕМЕННО НЕДОСТУПЕН]") ||
      finalVerdict.includes("[СУВЕРЕННЫЙ EBM КЛИНИЧЕСКИЙ ДВИЖОК DENTE");

    if (thoughts.length > 0 || finalVerdict || toothProposal || soapProposal) {
      return {
        thoughts,
        ...(finalVerdict ? { verdict: finalVerdict } : {}),
        toothProposal,
        servicesProposal,
        soapProposal,
        anestheticProposal,
        safetyAlert,
        ...(isLocalFallback ? {
          isLocalFallback: true,
          fallbackMessage: "⚠️ Автономный режим: используется локальный клинический словарь (без ИИ)",
        } : {}),
      };
    }
    return null;
  } catch (err: unknown) {
    if ((err as Error)?.name !== "AbortError") {
      clientLogger.error("[agentSseChatClient] SSE stream connection failed:", err);
      showToast("Сбой потокового соединения с клиническим ассистентом", "warning", 5000);
    }
    return null;
  }
}
