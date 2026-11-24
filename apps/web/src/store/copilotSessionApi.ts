/**
 * @file copilotSessionApi.ts
 * @description REST API client for DENTE AI Copilot dialogue sessions and messages.
 * Integrates with Fastify backend /api/agent/sessions backed by PostgreSQL 18.
 * Supports graceful offline fallback and token-based multi-tenant authorization.
 * Mandate 8b <= 150 lines.
 */

import { generateUuidV7 } from "@dental/shared";
import { readDenteClinicToken, readDenteStaffToken } from "../lib/safeLocalStorage";
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

function getAuthHeaders(): Record<string, string> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	const staffToken = readDenteStaffToken();
	const clinicToken = readDenteClinicToken();
	const token = staffToken || clinicToken;
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}
	if (clinicToken) {
		headers["x-dente-clinic-token"] = clinicToken;
	}
	if (staffToken) {
		headers["x-dente-staff-token"] = staffToken;
	}
	return headers;
}

export async function fetchRemoteSessions(params?: { patientId?: string; q?: string }): Promise<CopilotThread[] | null> {
	try {
		const url = new URL("/api/agent/sessions", typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3000");
		if (params?.patientId) url.searchParams.set("patientId", params.patientId);
		if (params?.q) url.searchParams.set("q", params.q);

		const res = await fetch(url.pathname + url.search, {
			method: "GET",
			headers: getAuthHeaders(),
		});

		if (!res.ok) return null;
		const data = await res.json();
		const rawSessions = Array.isArray(data?.sessions) ? data.sessions : [];

		return rawSessions.map((s: unknown): CopilotThread => {
			const item = typeof s === "object" && s !== null ? (s as Record<string, unknown>) : {};
			const id = typeof item.id === "string" ? item.id : "";
			const title = typeof item.summary === "string" && item.summary ? item.summary : "Клинический диалог";
			const updatedAt = typeof item.updatedAt === "string" ? new Date(item.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Только что";
			const createdAt = typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString();
			const patientId = typeof item.patientId === "string" ? item.patientId : undefined;
			const patientName = typeof item.patientName === "string" ? item.patientName : (patientId ? "Пациент" : undefined);
			const messageCount = typeof item.messageCount === "number" ? item.messageCount : 0;
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
	title?: string;
	summary?: string;
	activeView?: string;
}): Promise<boolean> {
	if (!isSessionUuid(payload.id)) return false;
	try {
		const res = await fetch("/api/agent/sessions", {
			method: "POST",
			headers: getAuthHeaders(),
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
		const res = await fetch(`/api/agent/sessions/${encodeURIComponent(id)}`, {
			method: "PATCH",
			headers: getAuthHeaders(),
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
		const res = await fetch(`/api/agent/sessions/${encodeURIComponent(id)}`, {
			method: "DELETE",
			headers: getAuthHeaders(),
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
		const res = await fetch(`/api/agent/sessions/${encodeURIComponent(sessionId)}/messages`, {
			method: "GET",
			headers: getAuthHeaders(),
		});
		if (!res.ok) return null;
		const data = await res.json();
		return Array.isArray(data?.messages) ? data.messages : [];
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
		const res = await fetch(`/api/agent/sessions/${encodeURIComponent(sessionId)}/messages`, {
			method: "POST",
			headers: getAuthHeaders(),
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
		const res = await fetch("/api/agent/memory", {
			method: "GET",
			headers: getAuthHeaders(),
		});
		if (!res.ok) return null;
		const data = await res.json();
		return Array.isArray(data?.memoryFacts) ? data.memoryFacts : null;
	} catch (err) {
		logger.error("[copilotSessionApi] fetchRemoteMemoryFacts failed:", err);
		return null;
	}
}

export async function saveRemoteMemoryFacts(memoryFacts: AiMemoryFact[]): Promise<boolean> {
	try {
		const res = await fetch("/api/agent/memory", {
			method: "PUT",
			headers: getAuthHeaders(),
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

export async function fetchRemoteSettings(): Promise<Record<string, unknown> | null> {
	try {
		const res = await fetch("/api/agent/settings", {
			method: "GET",
			headers: getAuthHeaders(),
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { ok?: boolean; settings?: Record<string, unknown> };
		return (data?.settings && typeof data.settings === "object") ? data.settings : null;
	} catch (err) {
		logger.error("[copilotSessionApi] fetchRemoteSettings failed:", err);
		return null;
	}
}

export async function saveRemoteSettings(settings: Record<string, unknown>): Promise<boolean> {
	try {
		const res = await fetch("/api/agent/settings", {
			method: "PUT",
			headers: getAuthHeaders(),
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
