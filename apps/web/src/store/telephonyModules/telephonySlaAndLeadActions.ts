import type { StoreApi } from "zustand";
import { logger } from "../../utils/logger.js";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../lib/safeLocalStorage";
import { resolveCanonicalCallStatus } from "../../components/telephony/telephonyCatalogData";
import {
	type CallHistoryItem,
	type MissedCallSlaItem,
	type MissedCallsSlaSummary,
	type TelephonyStore,
	SLA_CALLBACK_WINDOW_MS,
} from "./telephonyStoreTypes";

type SetState = StoreApi<TelephonyStore>["setState"];
type GetState = StoreApi<TelephonyStore>["getState"];

export function isUnhandledMissedCall(item: CallHistoryItem): boolean {
	const isMissedOrRejected =
		item.status === "missed" ||
		item.status === "rejected" ||
		item.outcome === "callback_15m";
	if (!isMissedOrRejected) return false;
	if (
		item.actionTaken === "accepted" ||
		item.actionTaken === "transferred" ||
		item.actionTaken === "spam" ||
		item.outcome === "accepted" ||
		item.outcome === "transferred" ||
		item.outcome === "spam"
	) {
		return false;
	}
	return true;
}

export function computeMissedCallsSlaSummary(
	callHistory: CallHistoryItem[],
	nowMs: number = Date.now(),
): MissedCallsSlaSummary {
	const unhandled = callHistory.filter(isUnhandledMissedCall);
	const items: MissedCallSlaItem[] = unhandled.map((call) => {
		const missedAtMs =
			call.callStartedAt ||
			(call.timestamp ? new Date(call.timestamp).getTime() : nowMs);
		const slaDeadlineMs = call.callbackDueAt
			? new Date(call.callbackDueAt).getTime()
			: missedAtMs + SLA_CALLBACK_WINDOW_MS;
		const remainingSeconds = Math.floor((slaDeadlineMs - nowMs) / 1000);
		return {
			call,
			missedAtMs,
			slaDeadlineMs,
			remainingSeconds,
			isOverdue: remainingSeconds <= 0,
		};
	});

	const overdueCount = items.filter((i) => i.isOverdue).length;
	const withinSlaCount = items.length - overdueCount;
	const positiveRemaining = items
		.filter((i) => !i.isOverdue)
		.map((i) => i.remainingSeconds);
	const nearestRemainingSeconds =
		positiveRemaining.length > 0 ? Math.min(...positiveRemaining) : null;

	return {
		totalUnhandledCount: items.length,
		overdueCount,
		withinSlaCount,
		nearestRemainingSeconds,
		items,
	};
}

interface ApiCallRecord {
	id: string;
	patientPhone?: string;
	callerPhone?: string;
	patientName?: string;
	patientId?: string | null;
	status?: string;
	recordingUrl?: string | null;
	durationSeconds?: number | null;
	createdAt?: string;
	message?: string | null;
}

export async function fetchCallHistoryAction(set: SetState, get: GetState): Promise<void> {
	try {
		const staffToken = readDenteStaffToken();
		const clinicToken = readDenteClinicToken();
		const res = await fetch("/api/telephony/calls?limit=50", {
			headers: {
				...(staffToken ? { "x-dente-staff-token": staffToken } : {}),
				...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
			},
		});
		if (!res.ok) return;
		const json = (await res.json()) as {
			success?: boolean;
			data?: { calls?: unknown };
			calls?: unknown;
		};
		const payload = json?.data ?? json;
		const rawCallsList = payload?.calls ?? json?.calls;
		if (rawCallsList && Array.isArray(rawCallsList)) {
			const existing = get().callHistory;
			const rawCalls = rawCallsList as ApiCallRecord[];
			const mapped: CallHistoryItem[] = rawCalls.map((c) => {
				const resolvedPhone = c.patientPhone || c.callerPhone || "";
				const patientName = c.patientName && !c.patientName.startsWith("Входящий вызов")
					? c.patientName
					: c.patientName || (resolvedPhone ? `Абонент ${resolvedPhone}` : "Неизвестный номер");
				const status: CallHistoryItem["status"] = resolveCanonicalCallStatus(
					c.status,
					typeof c.durationSeconds === "number" ? c.durationSeconds : undefined,
				);

				return {
					id: c.id,
					callId: c.id,
					phone: resolvedPhone,
					patientId: c.patientId || null,
					patientName,
					status,
					recordingUrl: c.recordingUrl || undefined,
					durationSeconds: c.durationSeconds || undefined,
					timestamp: c.createdAt,
					callStartedAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
					outcome: c.status === "completed" ? ("accepted" as const) : undefined,
					outcomeNote: c.message || undefined,
				};
			});
			const unsynced = existing.filter(
				(item) => !rawCalls.some((c) => c.id === item.id || (item.callId && c.id === item.callId)),
			);
			set({ callHistory: [...unsynced, ...mapped].slice(0, 50) });
		}
	} catch (err) {
		logger.warn("[telephonyStore] Failed to fetch call history:", err);
	}
}

