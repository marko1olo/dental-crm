import { eq, ilike, or, sql } from "drizzle-orm";
import { withSuperuserBypass } from "../../db/rls.js";
import { clinics } from "../../db/schema.js";
import {
	type NormalizedPhone,
	UUID_REGEX,
} from "../../services/telephony/telephonySecurity.js";
import type { NormalizedCallAction, TelephonyProvider, TelephonyWebhookPayload } from "./types.js";

export function detectTelephonyProvider(
	data: TelephonyWebhookPayload,
	rawEvent: string,
): TelephonyProvider {
	if (data.vpbx_api_key || data.sign || rawEvent.includes("mango")) return "mango";
	if (data.cmd || data.callid || rawEvent.includes("domru")) return "domru";
	if (data.crm_token || (data.client && data.type) || rawEvent.includes("megafon")) return "megafon";
	if (data.call_session_id || data.from_number || data.notification_name) return "uis";
	if (data.CallerIdNum || data.uniqueid || data.CalledIdNum) return "asterisk";
	if (data.signature || data.caller_id) return "zadarma";
	return "generic";
}

export function parseTelephonyCallEvent(data: TelephonyWebhookPayload): NormalizedCallAction {
	const raw = (
		data.event ||
		data.notification_name ||
		data.event_type ||
		data.cmd ||
		"ringing"
	).toLowerCase();

	if (
		raw.includes("miss") ||
		raw.includes("no-answer") ||
		raw.includes("no_answer") ||
		raw.includes("lost") ||
		raw.includes("busy") ||
		raw.includes("cancel")
	) {
		return "missed";
	}
	if (raw.includes("ring") || raw.includes("start") || raw.includes("dial-in")) {
		return "ringing";
	}
	if (raw.includes("answer") || raw.includes("connect")) {
		return "answered";
	}
	if (raw.includes("end") || raw.includes("hangup") || raw.includes("cdr") || raw.includes("record")) {
		return "ended";
	}
	return "ringing";
}

export async function resolveWebhookOrgId(
	routeOrgId: string | undefined,
	targetPhone: NormalizedPhone,
): Promise<string | null> {
	if (routeOrgId && UUID_REGEX.test(routeOrgId)) {
		return routeOrgId;
	}
	if (!targetPhone.isValid) {
		return null;
	}
	const matchedClinic = await withSuperuserBypass(async (tx) => {
		return tx
			.select({ organizationId: clinics.organizationId })
			.from(clinics)
			.where(
				or(
					eq(clinics.phone, targetPhone.e164),
					ilike(clinics.phone, `%${targetPhone.national10}%`),
					sql`regexp_replace(coalesce(${clinics.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${targetPhone.national10}%`}`,
				),
			)
			.limit(1);
	});
	return matchedClinic[0]?.organizationId || null;
}

export function checkReplayTimestamp(
	data: TelephonyWebhookPayload,
): { valid: boolean; reason?: string } {
	let rawTs = data.timestamp || data.call_end;
	if (rawTs == null && data.call_start != null) {
		const startNum =
			typeof data.call_start === "number"
				? data.call_start
				: Number.parseInt(String(data.call_start), 10);
		const durationSec = Number(data.duration || data.billsec || data.call_duration || 0);
		rawTs =
			!Number.isNaN(startNum) && startNum > 0
				? startNum > 1e11
					? startNum + durationSec * 1000
					: startNum + durationSec
				: data.call_start;
	}
	if (rawTs == null) return { valid: true };

	const numTs = typeof rawTs === "number" ? rawTs : Number.parseInt(String(rawTs), 10);
	if (!Number.isNaN(numTs) && numTs > 0) {
		const msgTsSec = numTs > 1e11 ? Math.floor(numTs / 1000) : numTs;
		const nowSec = Math.floor(Date.now() / 1000);
		if (Math.abs(nowSec - msgTsSec) > 300) {
			return { valid: false, reason: "Timestamp drift window exceeded (>300s)" };
		}
	}
	return { valid: true };
}
