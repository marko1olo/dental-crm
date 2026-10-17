/**
 * initiateOutboundCall.ts
 *
 * 1-Click Outbound Call Bridge (Mandates 8e: Doctor Autonomy & 8n: Solo Doctor).
 * Connects directly to clinic PBX via Fastify API (/api/telephony/outbound-call),
 * activates softphone HUD, registers communication event and falls back gracefully.
 */

import { formatPhoneDisplay, normalizePhoneDigits, useTelephonyStore } from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";

export interface OutboundCallRequest {
	phone: string;
	patientId?: string | null;
	patientName?: string | null;
}

export async function initiateOutboundCall(req: OutboundCallRequest): Promise<boolean> {
	const rawPhone = (req.phone || "").trim();
	if (!rawPhone) {
		showToast("Номер телефона не указан", "warning");
		return false;
	}

	const digits = normalizePhoneDigits(rawPhone);
	if (digits.length < 4) {
		showToast("Некорректный номер телефона для вызова", "warning");
		return false;
	}

	const e164 = digits.startsWith("7")
		? `+${digits}`
		: digits.startsWith("8")
			? `+7${digits.slice(1)}`
			: `+7${digits}`;

	const store = useTelephonyStore.getState();
	const callId = `outbound-${Date.now()}`;
	const patientName = req.patientName || "Пациент";

	// 1. Immediately activate softphone floating HUD with active outgoing call
	store.triggerIncomingCall({
		id: callId,
		callId,
		phone: e164,
		patientId: req.patientId || null,
		patientName,
		provider: "mango",
		timestamp: new Date().toISOString(),
		status: "connected",
		callStartedAt: Date.now(),
	});

	// Open drawer / HUD
	store.openCallDrawer();

	showToast(`Звонок на номер ${formatPhoneDisplay(e164)}...`, "info");

	// 2. Dispatch call request to backend API
	try {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json",
		};
		const clinicToken = readDenteClinicToken();
		const staffToken = readDenteStaffToken();
		if (clinicToken) headers["x-dente-clinic-token"] = clinicToken;
		if (staffToken) headers["x-dente-staff-token"] = staffToken;

		await fetch("/api/telephony/outbound-call", {
			method: "POST",
			headers,
			body: JSON.stringify({
				phone: e164,
				patientId: req.patientId || undefined,
				patientName,
			}),
		}).catch(() => {
			// Quiet fallback: softphone HUD is already active
		});
	} catch {
		// Non-blocking catch
	}

	return true;
}
