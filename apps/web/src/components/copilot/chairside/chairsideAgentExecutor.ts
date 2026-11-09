/**
 * chairsideAgentExecutor.ts — Autonomous AI Copilot Request Handler & Speech Parser.
 *
 * Compliance:
 * - Mandate 8b: Decomposed module <= 150 lines (Sweet Spot 200-300 lines overall).
 * - Mandate 8e: Doctor & Staff Autonomy (zero blocking gates, reversible actions).
 * - TABOO OF THE CREATOR: Strictly preserve anesthesia dosage and pediatric teeth logic.
 */

import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { useCopilotStore } from "../../../store/copilotStore";
import { findBestClinicalProtocol } from "../../visit/clinicalCatalog/clinicalProtocolsCatalog";
import type {
  ChairsideThoughtStep,
  ChairsideToothProposal,
  ChairsideServiceProposal,
  ChairsideSoapProposal,
  ChairsideAnestheticProposal,
  ChairsideConsentProposal,
  ChairsideSafetyAlert,
  MatchedProtocolInfo,
} from "./chairsideTypes";
import { parseAgentApiResponse } from "./executor/agentApiResponseParser";
import { tryParseVoiceFallback } from "./executor/agentVoiceFallbackParser";
import { matchPresetFallback } from "./executor/agentPresetFallbackParser";
import { requestAgentSseStream } from "./executor/agentSseChatClient";

export interface ExecuteCopilotAgentParams {
  promptText: string;
  activeTooth?: number | null | undefined;
  patientId?: string | undefined;
  visitId?: string | undefined;
  chairId?: string | undefined;
  patientAllergies?: readonly string[] | string[] | undefined;
  patientSomaticHistory?: string | readonly string[] | string[] | undefined;
  onThoughtChunk?: ((chunk: string) => void) | undefined;
}

export interface CopilotExecutionResult {
  thoughts?: ChairsideThoughtStep[];
  verdict?: string;
  safetyAlert?: ChairsideSafetyAlert | null;
  toothProposal?: ChairsideToothProposal | null;
  servicesProposal?: ChairsideServiceProposal[] | null;
  soapProposal?: ChairsideSoapProposal | null;
  anestheticProposal?: ChairsideAnestheticProposal | null;
  consentProposal?: ChairsideConsentProposal | null;
  matchedProtocol?: MatchedProtocolInfo | null;
  activePresetIndex?: number;
  toastMessage?: { text: string; type: "info" | "success" | "warning" };
}

export async function executeCopilotAgentRequest(
  params: ExecuteCopilotAgentParams
): Promise<CopilotExecutionResult> {
  const {
    promptText,
    activeTooth,
    patientId,
    visitId,
    chairId,
    patientAllergies = [],
    patientSomaticHistory,
  } = params;

  const text = promptText.trim();
  const effectiveTooth = typeof activeTooth === "number" ? activeTooth : undefined;
  const catalogMatch = findBestClinicalProtocol(text, effectiveTooth);

  let matchedProtocol: MatchedProtocolInfo | null = null;
  if (catalogMatch) {
    matchedProtocol = {
      procedureName: catalogMatch.procedureName,
      categoryKey: catalogMatch.categoryKey,
      tooth: catalogMatch.tooth,
      ...(catalogMatch.matchedIcd10 ? { matchedIcd10: catalogMatch.matchedIcd10 } : {}),
    };
  }

  const staffToken = readDenteStaffToken();
  const clinicToken = readDenteClinicToken();
  const authToken = staffToken || clinicToken;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  if (clinicToken) {
    headers["x-dente-clinic-token"] = clinicToken;
  }
  if (staffToken) {
    headers["x-dente-staff-token"] = staffToken;
  }

  const currentTrust = useCopilotStore.getState().settings.trustLevel;
  const activeMode = (currentTrust as string) === "confirm_all" || (currentTrust as string) === "cautious" ? "cautious" : currentTrust === "autonomous" ? "autonomous" : "supervised";

  const requestBody = {
    patientId: patientId?.trim() || undefined,
    prompt: text || undefined,
    toothNumber: effectiveTooth,
    complaints: text || undefined,
    allergies: patientAllergies && patientAllergies.length > 0 ? [...patientAllergies] : undefined,
    somaticHistory: Array.isArray(patientSomaticHistory)
      ? [...patientSomaticHistory]
      : typeof patientSomaticHistory === "string"
      ? [patientSomaticHistory]
      : undefined,
    appointmentRequest: visitId
      ? {
          startsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          chairId: chairId || undefined,
          reason: text || "Повторный клинический приём",
        }
      : undefined,
    mode: activeMode,
  };

  // 1. Canonical ReAct SSE streaming via /api/agent/chat
  const sseResult = await requestAgentSseStream({
    promptText: text,
    activeTooth: effectiveTooth,
    patientId: patientId?.trim() || undefined,
    visitId,
    headers,
    trustLevel: (currentTrust as string) === "confirm_all" || (currentTrust as string) === "cautious" ? "confirm_all" : currentTrust === "autonomous" ? "autonomous" : "balanced",
    onThoughtChunk: params.onThoughtChunk,
  });
  if (sseResult) {
    if (matchedProtocol) sseResult.matchedProtocol = matchedProtocol;
    return sseResult;
  }

  // 2. Secondary fallback via canonical Fastify copilot agent route (POST /api/agent/chat)
  try {
    const chatPayload = {
      message: text,
      messages: [{ role: "user" as const, content: text }],
      patientId: patientId?.trim() || undefined,
      activeVisitId: visitId || undefined,
      activeTooth: effectiveTooth,
      toothNumber: effectiveTooth,
      allergies: patientAllergies && patientAllergies.length > 0 ? [...patientAllergies] : undefined,
      stream: false,
      trustLevel: (currentTrust as string) === "confirm_all" || (currentTrust as string) === "cautious" ? "confirm_all" : currentTrust === "autonomous" ? "autonomous" : "balanced",
      context: {
        activeTooth: effectiveTooth,
        patientId: patientId?.trim() || undefined,
        visitId,
        allergies: patientAllergies && patientAllergies.length > 0 ? [...patientAllergies] : undefined,
        somaticHistory: patientSomaticHistory,
      },
    };

    const response = await fetch("/api/agent/chat", {
      method: "POST",
      headers,
      body: JSON.stringify(chatPayload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    const data = json?.data || json;

    if (data) {
      const normalizedData = {
        ...data,
        verdict: data.verdict || data.text || undefined,
        actions: Array.isArray(data.actions) ? data.actions : [],
      };
      if (Array.isArray(data.toolCalls)) {
        for (const tc of data.toolCalls) {
          const name = tc.name || tc.tool;
          const res = tc.result;
          if (name === "update_tooth_status" && res) {
            normalizedData.actions.push({
              type: "apply_tooth_status",
              payload: {
                tooth: res.tooth || effectiveTooth,
                statusCode: res.status,
                newStatus: res.statusLabel,
                surfaces: res.surfaces,
              },
            });
          } else if ((name === "generate_clinical_protocol_entry" || name === "generate_form_043_entry") && res) {
            normalizedData.actions.push({
              type: "apply_soap_diary",
              payload: {
                complaint: res.complaints || res.complaint,
                anamnesis: res.anamnesis,
                objectiveStatus: res.statusLocalis || res.objectiveStatus,
                diagnosis: res.diagnosisMkb || res.diagnosis,
                treatmentPlan: res.treatmentProtocol || res.treatmentPlan,
                recommendations: res.recommendations,
              },
            });
          } else if (name === "calculate_anesthesia" && res) {
            normalizedData.actions.push({
              type: "apply_anesthetic_dosage",
              payload: {
                drugName: res.drugName,
                carpulesCount: res.carpulesCount,
                patientWeightKg: res.patientWeightKg,
                maxCarpules: res.maxCarpules,
                epinephrineMcg: res.epinephrineMcg,
                isCardiovascularRisk: res.isCardiovascularRisk,
                notes: res.warning,
              },
            });
          }
        }
      }
      return parseAgentApiResponse(normalizedData, effectiveTooth || null, matchedProtocol);
    }
  } catch (err) {
    console.warn("[ChairsideCopilotHUD] API call failed, analyzing with local clinical speech parser and 1,142 catalog:", err);
  }

  // Local fallback parsing
  const voiceResult = tryParseVoiceFallback(text, effectiveTooth || null, catalogMatch, matchedProtocol);
  if (voiceResult) {
    return voiceResult;
  }

  // Fallback to presets
  return matchPresetFallback(text, effectiveTooth || null, matchedProtocol);
}
