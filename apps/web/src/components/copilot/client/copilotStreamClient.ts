/**
 * copilotStreamClient.ts — Canonical SSOT SSE Stream Client for DENTE Copilot ReAct.
 * Mandates: 8b (< 200 lines), 8bf (Single Door / SSOT Client), 8e (Autonomous ReAct), 8be (Zero any).
 */

import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { readEventStream } from "../useCopilotModules/copilotStreamReader";

export const UUID_V1_TO_V8_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Normalizes string to a clean lowercase UUID or undefined.
 */
export function toCleanUuid(val?: string | null | undefined): string | undefined {
  if (!val || typeof val !== "string") return undefined;
  const trimmed = val.trim();
  return UUID_V1_TO_V8_REGEX.test(trimmed) ? trimmed.toLowerCase() : undefined;
}

/**
 * Validates tooth number according to FDI standard (11-48, 51-85).
 */
export function toCleanToothNumber(val?: number | string | null | undefined): number | undefined {
  if (val === null || val === undefined) return undefined;
  const num = typeof val === "number" ? val : parseInt(String(val), 10);
  if (!Number.isFinite(num)) return undefined;
  if ((num >= 11 && num <= 48) || (num >= 51 && num <= 85)) {
    return num;
  }
  return undefined;
}

export type CopilotChatRole = "system" | "user" | "assistant" | "tool";

export interface CopilotChatMessageItem {
  role: CopilotChatRole;
  content: string | null;
  name?: string | undefined;
  tool_call_id?: string | undefined;
  tool_calls?: Array<Record<string, unknown>> | undefined;
}

export interface GranularCopilotPermissions {
  autoApproveFileReads?: boolean | undefined;
  autoApproveFileWrites?: boolean | undefined;
  autoApproveClinicalMutations?: boolean | undefined;
  autoApproveFinancialDrafts?: boolean | undefined;
  autoApproveExternalSoftware?: boolean | undefined;
}

export interface StreamCopilotChatOptions {
  apiBaseUrl?: string | undefined;
  endpoint?: string | undefined;
  messages?: CopilotChatMessageItem[] | undefined;
  message?: string | undefined;
  patientId?: string | null | undefined;
  activeVisitId?: string | null | undefined;
  visitId?: string | null | undefined;
  sessionId?: string | undefined;
  conversationId?: string | undefined;
  activeTooth?: number | null | undefined;
  tooth?: number | null | undefined;
  toothNumber?: number | null | undefined;
  runtimeMode?: "web_browser" | "desktop_native" | "chairside_tablet" | "mobile_tablet" | undefined;
  trustLevel?: "confirm_all" | "balanced" | "autonomous" | undefined;
  maskPhiData?: boolean | undefined;
  speedMode?: "turbo" | "deep_reasoning" | undefined;
  doctorSpecialization?: string | undefined;
  customInstructions?: string | undefined;
  memoryFacts?: string[] | undefined;
  granularPermissions?: GranularCopilotPermissions | undefined;
  temperature?: number | undefined;
  contextLimitTokens?: number | undefined;
  showTypingAnimation?: boolean | undefined;
  patientAllergies?: readonly string[] | string[] | undefined;
  allergies?: readonly string[] | string[] | undefined;
  somaticHistory?: string | readonly string[] | string[] | undefined;
  modelRoutingMode?: "server_managed" | "custom_byok" | undefined;
  byokProvider?: string | undefined;
  byokApiKey?: string | undefined;
  byokModel?: string | undefined;
  byokBaseUrl?: string | undefined;
  headers?: Record<string, string> | undefined;
  signal?: AbortSignal | undefined;
  rawBody?: Record<string, unknown> | undefined;
  onEvent: (event: string, data: Record<string, unknown>) => void;
}

export interface CopilotStreamResult {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly error?: string | undefined;
}

/**
 * Canonical Single Door execution method for streaming ReAct Copilot interactions.
 */
export async function streamCopilotChat(
  options: StreamCopilotChatOptions,
): Promise<CopilotStreamResult> {
  const requestHeaders: Record<string, string> = denteClinicalMutationHeaders({
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    "Idempotency-Key": generateUuidV7(),
    ...(options.headers || {}),
  });

  const raw = options.rawBody || {};

  // 1. Resolve normalized UUIDs
  const patientId = toCleanUuid(
    options.patientId ?? (typeof raw.patientId === "string" ? raw.patientId : undefined),
  );
  const activeVisitId = toCleanUuid(
    options.activeVisitId ??
      options.visitId ??
      (typeof raw.activeVisitId === "string" ? raw.activeVisitId : undefined) ??
      (typeof raw.visitId === "string" ? raw.visitId : undefined),
  );
  const sessionId = toCleanUuid(
    options.sessionId ??
      options.conversationId ??
      (typeof raw.sessionId === "string" ? raw.sessionId : undefined) ??
      (typeof raw.conversationId === "string" ? raw.conversationId : undefined),
  );

  // 2. Resolve normalized tooth number (FDI 11..85)
  const activeTooth = toCleanToothNumber(
    options.activeTooth ??
      options.tooth ??
      options.toothNumber ??
      (typeof raw.activeTooth === "number" || typeof raw.activeTooth === "string" ? raw.activeTooth : undefined) ??
      (typeof raw.toothNumber === "number" || typeof raw.toothNumber === "string" ? raw.toothNumber : undefined),
  );

  // 3. Resolve messages array
  let messages: CopilotChatMessageItem[] = [];
  if (options.messages && options.messages.length > 0) {
    messages = options.messages;
  } else if (Array.isArray(raw.messages) && raw.messages.length > 0) {
    messages = raw.messages as CopilotChatMessageItem[];
  } else if (typeof options.message === "string" && options.message.trim().length > 0) {
    messages = [{ role: "user", content: options.message.trim() }];
  } else if (typeof raw.message === "string" && raw.message.trim().length > 0) {
    messages = [{ role: "user", content: raw.message.trim() }];
  } else {
    messages = [{ role: "user", content: "" }];
  }

  // 4. Resolve clinical safety metadata
  const allergiesList =
    options.patientAllergies ??
    options.allergies ??
    (Array.isArray(raw.patientAllergies) ? (raw.patientAllergies as string[]) : undefined) ??
    (Array.isArray(raw.allergies) ? (raw.allergies as string[]) : undefined);

  const payload: Record<string, unknown> = {
    ...raw,
    messages,
    patientId,
    activeVisitId,
    sessionId,
    activeTooth,
    stream: true,
    runtimeMode: options.runtimeMode ?? (raw.runtimeMode as string | undefined) ?? "web_browser",
    trustLevel: options.trustLevel ?? (raw.trustLevel as string | undefined) ?? "balanced",
    maskPhiData: options.maskPhiData ?? (raw.maskPhiData as boolean | undefined) ?? true,
    speedMode: options.speedMode ?? (raw.speedMode as string | undefined),
    doctorSpecialization: options.doctorSpecialization ?? (raw.doctorSpecialization as string | undefined),
    customInstructions: options.customInstructions ?? (raw.customInstructions as string | undefined),
    memoryFacts: options.memoryFacts ?? (raw.memoryFacts as string[] | undefined),
    granularPermissions: options.granularPermissions ?? (raw.granularPermissions as Record<string, boolean> | undefined),
    temperature: options.temperature ?? (raw.temperature as number | undefined),
    contextLimitTokens: options.contextLimitTokens ?? (raw.contextLimitTokens as number | undefined),
    showTypingAnimation: options.showTypingAnimation ?? (raw.showTypingAnimation as boolean | undefined),
    patientAllergies: allergiesList && allergiesList.length > 0 ? [...allergiesList] : undefined,
    allergies: allergiesList && allergiesList.length > 0 ? [...allergiesList] : undefined,
    somaticHistory: options.somaticHistory ?? (raw.somaticHistory as string | string[] | undefined),
    modelRoutingMode: options.modelRoutingMode ?? (raw.modelRoutingMode as string | undefined),
    byokProvider: options.byokProvider ?? (raw.byokProvider as string | undefined),
    byokApiKey: options.byokApiKey ?? (raw.byokApiKey as string | undefined),
    byokModel: options.byokModel ?? (raw.byokModel as string | undefined),
    byokBaseUrl: options.byokBaseUrl ?? (raw.byokBaseUrl as string | undefined),
  };

  const baseUrl = (options.apiBaseUrl || "").replace(/\/+$/, "");
  const targetPath = options.endpoint || "/api/agent/chat";
  const endpoint = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
  const url = `${baseUrl}${endpoint}`;

  const fetchInit: RequestInit = {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(payload),
    ...(options.signal ? { signal: options.signal } : {}),
  };

  const response = await fetch(url, fetchInit);

  if (!response.ok || !response.body) {
    return {
      ok: false,
      status: response.status,
      statusText: response.statusText,
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
  }

  await readEventStream(response.body, options.onEvent, options.signal);

  return {
    ok: true,
    status: response.status,
    statusText: response.statusText,
  };
}
