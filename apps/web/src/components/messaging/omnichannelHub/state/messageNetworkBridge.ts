/**
 * messageNetworkBridge.ts — Сетевой мост к API коммуникаций Fastify (/api/communications/inbox).
 * Строго <= 120 строк по Мандату 8b.
 */

import type { OmnichannelMessage } from "../types.js";

export async function fetchPatientThreadEvents(patientId: string): Promise<OmnichannelMessage[]> {
	const res = await fetch(`/api/communications/inbox/${encodeURIComponent(patientId)}`);
	if (!res.ok) return [];
	const events = await res.json();
	if (!Array.isArray(events)) return [];

	return events.map((e: any) => ({
		id: e.id,
		patientId: e.patientId,
		channel: e.channel || "whatsapp",
		direction: e.direction || "inbound",
		senderName: e.direction === "inbound" ? (e.patientName || "Пациент") : "Администратор",
		senderType: e.direction === "inbound" ? "patient" : "clinic_staff",
		timestamp: e.createdAt || new Date().toISOString(),
		body: e.message || "",
		status: e.status || "delivered",
	}));
}

export async function sendOutboundMessageToApi(
	patientId: string,
	channel: string,
	message: string,
): Promise<void> {
	await fetch(`/api/communications/inbox/${encodeURIComponent(patientId)}/send`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ channel, message }),
	});
}
