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

export interface StreamAgentChatParams {
  promptText: string;
  activeTooth?: number | undefined;
  patientId?: string | undefined;
  visitId?: string | undefined;
  headers: Record<string, string>;
  trustLevel?: "confirm_all" | "balanced" | "autonomous" | undefined;
  onThoughtChunk?: ((chunk: string) => void) | undefined;
}

export async function requestAgentSseStream(
  params: StreamAgentChatParams
): Promise<CopilotExecutionResult | null> {
  const { promptText, activeTooth, patientId, visitId, headers, trustLevel, onThoughtChunk } = params;

  try {
    const sseHeaders: Record<string, string> = {
      ...headers,
      Accept: "text/event-stream",
    };

    const sseBody = {
      messages: [{ role: "user", content: promptText }],
      patientId: patientId?.trim() || undefined,
      activeVisitId: visitId || undefined,
      activeTooth: activeTooth ?? undefined,
      stream: true,
      trustLevel: trustLevel || "balanced",
    };

    const res = await fetch("/api/agent/chat", {
      method: "POST",
      headers: sseHeaders,
      body: JSON.stringify(sseBody),
    });

    if (!res.ok || !res.body) {
      return null;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let accumulatedThought = "";
    let finalVerdict = "";
    const thoughts: ChairsideThoughtStep[] = [];
    let toothProposal: ChairsideToothProposal | null = null;
    let servicesProposal: ChairsideServiceProposal[] | null = null;
    let soapProposal: ChairsideSoapProposal | null = null;
    let anestheticProposal: ChairsideAnestheticProposal | null = null;
    let safetyAlert: ChairsideSafetyAlert | null = null;
    let stepCounter = 0;

    const processEvent = (event: string, data: Record<string, any>) => {
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
        const result = data.result;
        const lastThought = thoughts[thoughts.length - 1];
        if (lastThought && lastThought.status === "running") {
          lastThought.status = "done";
        }
        if (toolName === "update_tooth_status" && result) {
          const resolvedTooth = Number(result.tooth || activeTooth || 0);
          if (resolvedTooth > 0) {
            toothProposal = {
              toothNumber: resolvedTooth,
              state: result.status || "C2",
              stateLabel: result.statusLabel || `Статус: ${result.status || "C2"}`,
              surfaces: Array.isArray(result.surfaces) ? result.surfaces : ["O"],
              applied: false,
            };
          }
        } else if ((toolName === "generate_clinical_protocol_entry" || toolName === "generate_form_043_entry") && result) {
          soapProposal = {
            complaint: result.complaints || result.complaint || "",
            anamnesis: result.anamnesis || "",
            objectiveStatus: result.statusLocalis || result.objectiveStatus || "",
            diagnosis: result.diagnosisMkb || result.diagnosis || "",
            treatmentPlan: result.treatmentProtocol || result.treatmentPlan || "",
            recommendations: result.recommendations || "",
            applied: false,
          };
        } else if (toolName === "calculate_anesthesia" && result) {
          anestheticProposal = {
            drugName: result.drugName || "Артикаин 4%",
            carpulesCount: result.carpulesCount || 1,
            patientWeightKg: result.patientWeightKg || 70,
            maxCarpules: result.maxCarpules || 7,
            epinephrineMcg: result.epinephrineMcg || 8.5,
            isCardiovascularRisk: Boolean(result.isCardiovascularRisk),
            notes: result.warning,
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const chunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        let event = "message";
        let dataString = "";
        for (const line of chunk.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataString += line.slice(5).trim();
        }
        if (dataString) {
          try {
            processEvent(event, JSON.parse(dataString));
          } catch {
            processEvent(event, { text: dataString });
          }
        }
        boundary = buffer.indexOf("\n\n");
      }
    }

    if (thoughts.length > 0 || finalVerdict || toothProposal || soapProposal) {
      return {
        thoughts,
        ...(finalVerdict ? { verdict: finalVerdict } : {}),
        toothProposal,
        servicesProposal,
        soapProposal,
        anestheticProposal,
        safetyAlert,
      };
    }
    return null;
  } catch (err: unknown) {
    if ((err as Error)?.name !== "AbortError") {
      console.error("[agentSseChatClient] SSE stream connection failed:", err);
      showToast("Сбой потокового соединения с клиническим ассистентом", "warning", 5000);
    }
    return null;
  }
}
