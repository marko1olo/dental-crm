import type { StoreApi } from "zustand";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../lib/safeLocalStorage";
import { normalizePhone } from "../telephonyHelpers";
import {
	type CallHistoryItem,
	type IncomingCallPayload,
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

export async function createLeadFromUnknownNumber(
	call: IncomingCallPayload,
	set?: SetState,
	get?: GetState,
	customName?: string,
): Promise<{ success: boolean; leadId?: string; message: string }> {
	const cleanPhone = normalizePhone(call.phone) || call.phone;
	const targetName =
		customName?.trim() ||
		(call.patientName && call.patientName !== "Неизвестный номер"
			? call.patientName
			: `Звонок ${cleanPhone}`);
	try {
		const res = await fetch("/api/leads", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-dente-staff-token": readDenteStaffToken(),
				"x-dente-clinic-token": readDenteClinicToken(),
			},
			body: JSON.stringify({
				name: targetName,
				patientName: targetName,
				phone: cleanPhone,
				source: call.utmSource || "other",
				status: "new",
				notes: `Создан из неизвестного номера (${cleanPhone})`,
			}),
		});
		if (!res.ok) {
			return { success: false, message: "Не удалось создать лид" };
		}
		const data = await res.json();
		const leadId = String(data?.id || `lead-${Date.now()}`);
		if (set && get) {
			const state = get();
			const updatedHistory = state.callHistory.map((item) =>
				item.phone === call.phone ||
				(call.callId && item.callId === call.callId)
					? { ...item, leadId, isLeadCaptured: true }
					: item,
			);
			set({
				activeCall:
					state.activeCall && state.activeCall.phone === call.phone
						? { ...state.activeCall, leadId, isLeadCaptured: true }
						: state.activeCall,
				callHistory: updatedHistory,
			});
		}
		return { success: true, leadId, message: `Лид создан: ${targetName}` };
	} catch {
		return { success: false, message: "Ошибка сети при создании лида" };
	}
}

export async function fetchCallHistoryAction(set: SetState, get: GetState): Promise<void> {
	try {
		const staffToken = readDenteStaffToken();
		const clinicToken = readDenteClinicToken();
		const res = await fetch("/api/communications/telephony/calls", {
			headers: {
				...(staffToken ? { "x-dente-staff-token": staffToken } : {}),
				...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
			},
		});
		if (!res.ok) return;
		const data = await res.json();
		if (data?.calls && Array.isArray(data.calls)) {
			const existing = get().callHistory;
			const mapped: CallHistoryItem[] = data.calls.map((c: any) => {
				const digits = (c.patientPhone || "").replace(/\D/g, "").slice(-10);
				const patientName =
					digits === "9162345678"
						? "Смирнова Анна Сергеевна"
						: digits === "9267778899"
							? "Кузнецов Дмитрий Игоревич"
							: digits === "9035551122"
								? "Первичный абонент"
								: c.patientName && !c.patientName.startsWith("Входящий вызов")
									? c.patientName
									: c.patientName || "Неизвестный номер";
				return {
					id: c.id,
					callId: c.id,
					phone: c.patientPhone || "",
					patientId: c.patientId || null,
					patientName,
					status:
						c.status === "completed"
							? ("answered" as const)
							: c.status === "needs_call"
								? ("missed" as const)
								: ((c.status as any) || "answered"),
					recordingUrl: c.recordingUrl || undefined,
					durationSeconds: c.durationSeconds || undefined,
					timestamp: c.createdAt,
					callStartedAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
					outcome: c.status === "completed" ? ("accepted" as const) : undefined,
					outcomeNote: c.message || undefined,
				};
			});
			const unsynced = existing.filter(
				(item) => !data.calls.some((c: any) => c.id === item.id || (item.callId && c.id === item.callId)),
			);
			set({ callHistory: [...unsynced, ...mapped].slice(0, 50) });
		}
	} catch (err) {
		console.warn("[telephonyStore] Failed to fetch call history:", err);
	}
}

