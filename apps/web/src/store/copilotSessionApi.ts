/**
 * @file copilotSessionApi.ts
 * @description REST API client for DENTE AI Copilot dialogue sessions and messages.
 * Integrates with Fastify backend /api/agent/sessions backed by PostgreSQL 18.
 * Supports graceful offline fallback and token-based multi-tenant authorization.
 * Mandate 8b <= 150 lines.
 */

import { readDenteClinicToken, readDenteStaffToken } from "../lib/safeLocalStorage";
import type { CopilotThread } from "./copilotStore";

export function generateSessionUuid(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

export function isSessionUuid(id: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
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

		return rawSessions.map((s: any): CopilotThread => ({
			id: s.id,
			title: s.summary || "Клинический диалог",
			updatedAt: s.updatedAt ? new Date(s.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Только что",
			createdAt: s.createdAt || new Date().toISOString(),
			patientId: s.patientId || undefined,
			patientName: s.patientName || (s.patientId ? "Пациент" : undefined),
			messageCount: typeof s.messageCount === "number" ? s.messageCount : 0,
		}));
	} catch {
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
		return res.ok;
	} catch {
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
		return res.ok;
	} catch {
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
		return res.ok;
	} catch {
		return false;
	}
}

export async function fetchRemoteMessages(sessionId: string): Promise<any[] | null> {
	if (!isSessionUuid(sessionId)) return null;
	try {
		const res = await fetch(`/api/agent/sessions/${encodeURIComponent(sessionId)}/messages`, {
			method: "GET",
			headers: getAuthHeaders(),
		});
		if (!res.ok) return null;
		const data = await res.json();
		return Array.isArray(data?.messages) ? data.messages : [];
	} catch {
		return null;
	}
}

export async function appendRemoteMessage(sessionId: string, message: {
	role: "user" | "assistant" | "system" | "tool";
	content: string;
	toolCalls?: any[] | null;
}): Promise<boolean> {
	if (!isSessionUuid(sessionId)) return false;
	try {
		const res = await fetch(`/api/agent/sessions/${encodeURIComponent(sessionId)}/messages`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(message),
		});
		return res.ok;
	} catch {
		return false;
	}
}
