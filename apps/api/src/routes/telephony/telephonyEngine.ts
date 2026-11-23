import { eq, ilike, or, sql } from "drizzle-orm";
import { namedDevelopmentModeActive } from "../../accessGuard.js";
import { withSuperuserBypass } from "../../db/rls.js";
import { clinics, organizations } from "../../db/schema.js";
import {
	type NormalizedPhone,
	UUID_REGEX,
} from "../../services/telephony/telephonySecurity.js";
import type { NormalizedCallAction, TelephonyProvider, TelephonyWebhookPayload } from "./types.js";

export function detectTelephonyProvider(
	data: TelephonyWebhookPayload,
	rawEvent: string = "",
): TelephonyProvider {
	const eventStr = `${rawEvent} ${data.event || ""} ${data.notification_name || ""}`.toLowerCase();
	if (data.vpbx_api_key || data.sign || eventStr.includes("mango")) return "mango";
	if (data.cmd || data.callid || eventStr.includes("domru")) return "domru";
	if (data.crm_token || (data.client && data.type) || eventStr.includes("megafon")) return "megafon";
	if (data.call_session_id || data.from_number || data.notification_name) return "uis";
	if (data.CallerIdNum || data.uniqueid || data.CalledIdNum) return "asterisk";
	if (data.hash || data.user || eventStr.includes("sipuni")) return "sipuni";
	if (
		eventStr.includes("gravitel") ||
		data.gravitel_call_id ||
		data.provider === "gravitel" ||
		(data as Record<string, unknown>).gravitel
	) {
		return "gravitel";
	}
	if (
		eventStr.includes("exolve") ||
		eventStr.includes("mts") ||
		data.voice_call_id ||
		data.provider === "mts_exolve" ||
		(data as Record<string, unknown>).exolve
	) {
		return "mts_exolve";
	}
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
		const orgExists = await withSuperuserBypass(async (tx) => {
			return tx
				.select({ id: organizations.id })
				.from(organizations)
				.where(eq(organizations.id, routeOrgId))
				.limit(1);
		});
		return orgExists[0]?.id ?? null;
	}
	if (!targetPhone.isValid) {
		return null;
	}
	const matchedClinics = await withSuperuserBypass(async (tx) => {
		return tx
			.selectDistinct({ organizationId: clinics.organizationId })
			.from(clinics)
			.where(
				or(
					eq(clinics.phone, targetPhone.e164),
					ilike(clinics.phone, `%${targetPhone.national10}%`),
					sql`regexp_replace(coalesce(${clinics.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${targetPhone.national10}%`}`,
				),
			)
			.limit(2);
	});
	// Collision safety: If multiple distinct organizations share the same target phone,
	// do NOT blindly pick one via limit(1) (tenant collision / spoofing risk).
	if (matchedClinics.length === 1 && matchedClinics[0]?.organizationId) {
		return matchedClinics[0].organizationId;
	}
	return null;
}

export function checkReplayTimestamp(
	data: TelephonyWebhookPayload,
): { valid: boolean; reason?: string } {
	const event = parseTelephonyCallEvent(data);
	const isEndedOrCdr = event === "ended" || event === "missed";
	const maxDriftSec = isEndedOrCdr ? 3600 : 300;

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
	if (rawTs == null) {
		if (namedDevelopmentModeActive()) {
			return { valid: true };
		}
		return { valid: false, reason: "Missing timestamp in production webhook payload" };
	}

	const numTs = typeof rawTs === "number" ? rawTs : Number.parseInt(String(rawTs), 10);
	if (Number.isNaN(numTs) || numTs <= 0) {
		if (namedDevelopmentModeActive()) {
			return { valid: true };
		}
		return { valid: false, reason: "Invalid or non-positive timestamp in production webhook payload" };
	}

	const msgTsSec = numTs > 1e11 ? Math.floor(numTs / 1000) : numTs;
	const nowSec = Math.floor(Date.now() / 1000);
	if (Math.abs(nowSec - msgTsSec) > maxDriftSec) {
		return { valid: false, reason: `Timestamp drift window exceeded (>${maxDriftSec}s)` };
	}
	return { valid: true };
}
