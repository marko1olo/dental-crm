/**
 * @file copilotSessionApi.ts
 * @description REST API client for DENTE AI Copilot dialogue sessions and messages.
 * Integrates with Fastify backend /api/agent/sessions backed by PostgreSQL 18.
 * Supports graceful offline fallback and token-based multi-tenant authorization.
 * Mandate 8b <= 150 lines.
 */

import { generateUuidV7 } from "@dental/shared";
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from "../lib/denteRequestHeaders";
import { resolveApiOrigin, resolveApiUrl } from "../lib/resolveApiUrl";
import { showToast } from "../components/GlobalToast";
import { logger } from "../utils/logger";
import type { CopilotThread, AiMemoryFact } from "./copilotStore";

export function generateSessionUuid(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return generateUuidV7();
}

export function isSessionUuid(id: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function getReadAuthHeaders(): Record<string, string> {
	return denteClinicalReadHeaders({
		Accept: "application/json",
	});
}

function getMutationAuthHeaders(): Record<string, string> {
	return denteClinicalMutationHeaders({
		"Content-Type": "application/json",
	});
}

function readProp(obj: unknown, key: string): unknown {
	if (!obj || typeof obj !== "object") return undefined;
	return Reflect.get(obj, key);
}

function unwrapEnvelope<T>(json: unknown): T {
	if (json && typeof json === "object" && "data" in json && readProp(json, "data") !== undefined) {
		return readProp(json, "data") as T;
	}
	return json as T;
}

export async function fetchRemoteSessions(params?: { patientId?: string; q?: string }): Promise<CopilotThread[] | null> {
	try {
		const url = new URL("/api/agent/sessions", resolveApiOrigin());
		if (params?.patientId) url.searchParams.set("patientId", params.patientId);
		if (params?.q) url.searchParams.set("q", params.q);

		const res = await fetch(url.toString(), {
			method: "GET",
			credentials: "include",
			headers: getReadAuthHeaders(),
		});

		if (!res.ok) return null;
		const rawJson: unknown = await res.json();
		const unwrapped = unwrapEnvelope<{ sessions?: unknown[] } | unknown[]>(rawJson);
		const rootObj = rawJson as { sessions?: unknown[] } | null;
		const rawSessions = Array.isArray(unwrapped)
			? unwrapped
			: Array.isArray(unwrapped?.sessions)
				? unwrapped.sessions
				: Array.isArray(rootObj?.sessions)
					? rootObj.sessions
					: [];

		return rawSessions.map((s: unknown): CopilotThread => {
			const rawId = readProp(s, "id");
			const rawSummary = readProp(s, "summary");
			const rawUpdatedAt = readProp(s, "updatedAt");
			const rawCreatedAt = readProp(s, "createdAt");
			const rawPatientId = readProp(s, "patientId");
			const rawPatientName = readProp(s, "patientName");
			const rawMessageCount = readProp(s, "messageCount");

			const id = typeof rawId === "string" ? rawId : "";
			const title = typeof rawSummary === "string" && rawSummary ? rawSummary : "Клинический диалог";
			const updatedAt = typeof rawUpdatedAt === "string" ? new Date(rawUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Только что";
			const createdAt = typeof rawCreatedAt === "string" ? rawCreatedAt : new Date().toISOString();
			const patientId = typeof rawPatientId === "string" ? rawPatientId : undefined;
			const patientName = typeof rawPatientName === "string" ? rawPatientName : (patientId ? "Пациент" : undefined);
			const messageCount = typeof rawMessageCount === "number" ? rawMessageCount : 0;
			const thread: CopilotThread = {
				id,
				title,
				updatedAt,
				createdAt,
				messageCount,
				...(patientId !== undefined ? { patientId } : {}),
				...(patientName !== undefined ? { patientName } : {}),
			};
			return thread;
		});
	} catch (err) {
		logger.error("[copilotSessionApi] fetchRemoteSessions failed:", err);
		return null;
	}
}

export async function createRemoteSession(payload: {
	id: string;
	patientId?: string | null;
	activeView?: string;
	summary?: string;
	title?: string;
}): Promise<boolean> {
	if (!isSessionUuid(payload.id)) return false;
	try {
		const res = await fetch(resolveApiUrl("/api/agent/sessions"), {
			method: "POST",
			credentials: "include",
			headers: { ...getMutationAuthHeaders(), "Idempotency-Key": generateUuidV7() },
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			logger.error(`[copilotSessionApi] createRemoteSession HTTP ${res.status}`);
			showToast("Не удалось сохранить сессию ассистента на сервере", "error");
			return false;
		}
		return true;
	} catch (err) {
		logger.error("[copilotSessionApi] createRemoteSession failed:", err);
		showToast("Не удалось создать сессию ассистента на сервере", "error");
		return false;
	}
}

export async function updateRemoteSession(id: string, patch: {
	summary?: string;
	patientId?: string | null;
	activeView?: string;
}): Promise<boolean> {
	if (!isSessionUuid(id)) return false;
	try {
		const res = await fetch(resolveApiUrl(`/api/agent/sessions/${encodeURIComponent(id)}`), {
			method: "PATCH",
			credentials: "include",
			headers: { ...getMutationAuthHeaders(), "Idempotency-Key": generateUuidV7() },
			body: JSON.stringify(patch),
		});
		if (!res.ok) {
			logger.error(`[copilotSessionApi] updateRemoteSession HTTP ${res.status}`);
			showToast("Не удалось обновить сессию ассистента на сервере", "error");
			return false;
		}
		return true;
	} catch (err) {
		logger.error("[copilotSessionApi] updateRemoteSession failed:", err);
		showToast("Не удалось обновить сессию ассистента на сервере", "error");
		return false;
	}
}

export async function deleteRemoteSession(id: string): Promise<boolean> {
	if (!isSessionUuid(id)) return false;
	try {
		const res = await fetch(resolveApiUrl(`/api/agent/sessions/${encodeURIComponent(id)}`), {
			method: "DELETE",
			credentials: "include",
			headers: { ...getMutationAuthHeaders(), "Idempotency-Key": generateUuidV7() },
		});
		if (!res.ok) {
			logger.error(`[copilotSessionApi] deleteRemoteSession HTTP ${res.status}`);
			showToast("Не удалось удалить сессию ассистента на сервере", "error");
			return false;
		}
		return true;
	} catch (err) {
		logger.error("[copilotSessionApi] deleteRemoteSession failed:", err);
		showToast("Не удалось удалить сессию ассистента на сервере", "error");
		return false;
	}
}

export async function fetchRemoteMessages(sessionId: string): Promise<unknown[] | null> {
	if (!isSessionUuid(sessionId)) return null;
	try {
		const res = await fetch(resolveApiUrl(`/api/agent/sessions/${encodeURIComponent(sessionId)}/messages`), {
			method: "GET",
			credentials: "include",
			headers: getReadAuthHeaders(),
		});
		if (!res.ok) return null;
		const rawJson: unknown = await res.json();
		const unwrapped = unwrapEnvelope<{ messages?: unknown[] } | unknown[]>(rawJson);
		const rootObj = rawJson as { messages?: unknown[] } | null;
		if (Array.isArray(unwrapped)) return unwrapped;
		if (Array.isArray(unwrapped?.messages)) return unwrapped.messages;
		return Array.isArray(rootObj?.messages) ? rootObj.messages : [];
	} catch (err) {
		logger.error("[copilotSessionApi] fetchRemoteMessages failed:", err);
		return null;
	}
}

export async function appendRemoteMessage(sessionId: string, message: {
	role: "user" | "assistant" | "system" | "tool";
	content: string;
	toolCalls?: unknown[] | null;
}): Promise<boolean> {
	if (!isSessionUuid(sessionId)) return false;
	try {
		const res = await fetch(resolveApiUrl(`/api/agent/sessions/${encodeURIComponent(sessionId)}/messages`), {
			method: "POST",
			credentials: "include",
			headers: { ...getMutationAuthHeaders(), "Idempotency-Key": generateUuidV7() },
			body: JSON.stringify(message),
		});
		if (!res.ok) {
			logger.error(`[copilotSessionApi] appendRemoteMessage HTTP ${res.status}`);
			showToast("Не удалось сохранить сообщение в историю сессии", "error");
			return false;
		}
		return true;
	} catch (err) {
		logger.error("[copilotSessionApi] appendRemoteMessage failed:", err);
		showToast("Не удалось сохранить сообщение в историю сессии", "error");
		return false;
	}
}

export async function fetchRemoteMemoryFacts(): Promise<AiMemoryFact[] | null> {
	try {
		const res = await fetch(resolveApiUrl("/api/agent/memory"), {
			method: "GET",
			credentials: "include",
			headers: getReadAuthHeaders(),
		});
		if (!res.ok) return null;
		const rawJson: unknown = await res.json();
		const unwrapped = unwrapEnvelope<{ memoryFacts?: AiMemoryFact[] } | AiMemoryFact[]>(rawJson);
		const rootObj = rawJson as { memoryFacts?: AiMemoryFact[] } | null;
		if (Array.isArray(unwrapped)) return unwrapped;
		if (Array.isArray(unwrapped?.memoryFacts)) return unwrapped.memoryFacts;
		return Array.isArray(rootObj?.memoryFacts) ? rootObj.memoryFacts : null;
	} catch (err) {
		logger.error("[copilotSessionApi] fetchRemoteMemoryFacts failed:", err);
		return null;
	}
}

export async function saveRemoteMemoryFacts(memoryFacts: AiMemoryFact[]): Promise<boolean> {
	try {
		const res = await fetch(resolveApiUrl("/api/agent/memory"), {
			method: "PUT",
			credentials: "include",
			headers: { ...getMutationAuthHeaders(), "Idempotency-Key": generateUuidV7() },
			body: JSON.stringify({ memoryFacts }),
		});
		if (!res.ok) {
			logger.error(`[copilotSessionApi] saveRemoteMemoryFacts HTTP ${res.status}`);
			showToast("Не удалось сохранить клиническую память на сервере", "error");
			return false;
		}
		return true;
	} catch (err) {
		logger.error("[copilotSessionApi] saveRemoteMemoryFacts failed:", err);
		showToast("Не удалось сохранить клиническую память на сервере", "error");
		return false;
	}
}

type CopilotSessionSettingsMap = { [key: string]: unknown };

export async function fetchRemoteSettings(): Promise<Record<string, unknown> | null> {
	try {
		const res = await fetch(resolveApiUrl("/api/agent/settings"), {
			method: "GET",
			credentials: "include",
			headers: getReadAuthHeaders(),
		});
		if (!res.ok) return null;
		const rawJson: unknown = await res.json();
		const unwrapped = unwrapEnvelope<{ settings?: Record<string, unknown> }>(rawJson);
		const rootObj = rawJson as { settings?: Record<string, unknown> } | null;
		const candidate = (unwrapped && typeof unwrapped === "object" && "settings" in unwrapped && unwrapped.settings && typeof unwrapped.settings === "object")
			? unwrapped.settings
			: (rootObj?.settings && typeof rootObj.settings === "object")
				? rootObj.settings
				: (unwrapped && typeof unwrapped === "object" && !("ok" in unwrapped) && !("settings" in unwrapped) ? (unwrapped as CopilotSessionSettingsMap) : null);
		return candidate as Record<string, unknown> | null;
	} catch (err) {
		logger.error("[copilotSessionApi] fetchRemoteSettings failed:", err);
		return null;
	}
}

export async function saveRemoteSettings(settings: Record<string, unknown>): Promise<boolean> {
	try {
		const res = await fetch(resolveApiUrl("/api/agent/settings"), {
			method: "PUT",
			credentials: "include",
			headers: { ...getMutationAuthHeaders(), "Idempotency-Key": generateUuidV7() },
			body: JSON.stringify({ settings }),
		});
		if (!res.ok) {
			logger.error(`[copilotSessionApi] saveRemoteSettings HTTP ${res.status}`);
			showToast("Не удалось сохранить настройки ассистента на сервере", "error");
			return false;
		}
		return true;
	} catch (err) {
		logger.error("[copilotSessionApi] saveRemoteSettings failed:", err);
		showToast("Не удалось сохранить настройки ассистента на сервере", "error");
		return false;
	}
}

export async function executeRemoteAgentAction(payload: {
	callId?: string;
	decision?: "confirm" | "reject";
	toolName: string;
	args: Record<string, unknown>;
	confirmed: boolean;
	sessionId?: string;
	patientId?: string;
	runtimeMode: "web_browser" | "desktop_native";
}): Promise<{ ok: boolean; errorText?: string }> {
	const res = await fetch(resolveApiUrl("/api/agent/action"), {
		method: "POST",
		credentials: "include",
		headers: denteClinicalMutationHeaders({
			"Content-Type": "application/json",
			"Idempotency-Key": generateUuidV7(),
			"x-agent-runtime": payload.runtimeMode,
		}),
		body: JSON.stringify(payload),
	});
	let raw: {
		ok?: boolean;
		error?: string;
		message?: string;
		data?: { ok?: boolean; error?: string; message?: string };
	} = {};
	try {
		raw = (await res.json()) as typeof raw;
	} catch (parseErr) {
		logger.warn("[copilotSessionApi] executeRemoteAgentAction invalid JSON:", parseErr);
	}
	const unwrapped = unwrapEnvelope<{ ok?: boolean; error?: string; message?: string }>(raw);
	const ok = res.ok && raw?.ok !== false && unwrapped?.ok !== false;
	const errorText =
		unwrapped?.message ||
		raw?.message ||
		unwrapped?.error ||
		raw?.error ||
		res.statusText ||
		`HTTP ${res.status}`;
	return ok ? { ok: true } : { ok: false, errorText };
}

export async function fetchSpeechGatewayHealth(): Promise<Record<string, unknown> | null> {
	try {
		const res = await fetch(resolveApiUrl("/api/speech/gateway-health"), {
			method: "GET",
			credentials: "include",
			headers: denteClinicalReadHeaders({
				Accept: "application/json",
			}),
		});
		if (!res.ok) return null;
		const rawJson: unknown = await res.json();
		const unwrapped = unwrapEnvelope<Record<string, unknown> | null>(rawJson);
		return unwrapped && typeof unwrapped === "object" ? unwrapped : null;
	} catch (err) {
		logger.info("[copilotSessionApi] Speech gateway health check offline:", err);
		return null;
	}
}
