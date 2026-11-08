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
} from "./chairsideTypes";
import type { MatchedProtocolInfo } from "./ChairsideClinicalInsights";
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
  const activeMode = currentTrust === "cautious" ? "cautious" : currentTrust === "autonomous" ? "autonomous" : "supervised";

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
    trustLevel: currentTrust === "cautious" ? "confirm_all" : currentTrust === "autonomous" ? "autonomous" : "balanced",
    onThoughtChunk: params.onThoughtChunk,
  });
  if (sseResult) {
    if (matchedProtocol) sseResult.matchedProtocol = matchedProtocol;
    return sseResult;
  }

  // 2. Secondary fallback via Fastify copilot agent route
  try {
    const response = await fetch("/api/v1/copilot/agent/execute", {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    const data = json?.data;

    if (data) {
      return parseAgentApiResponse(data, effectiveTooth || 16, matchedProtocol);
    }
  } catch (err) {
    console.warn("[ChairsideCopilotHUD] API call failed, analyzing with local clinical speech parser and 1,142 catalog:", err);
  }

  // Local fallback parsing
  const voiceResult = tryParseVoiceFallback(text, effectiveTooth || 16, catalogMatch, matchedProtocol);
  if (voiceResult) {
    return voiceResult;
  }

  // Fallback to presets
  return matchPresetFallback(text, effectiveTooth || 16, matchedProtocol);
}
