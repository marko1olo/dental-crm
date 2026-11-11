import type { QuickSlotType } from "../IncomingCallQuickBooking";
import type { TelephonyCall } from "./types";
import { resolveTelephonyWsUrl } from "../../../store/telephonyStore";

export { resolveTelephonyWsUrl };

export function formatShortCallerName(name: string): string {
	const parts = name.trim().split(/\s+/);
	const p0 = parts[0];
	const p1 = parts[1];
	const p2 = parts[2];
	if (p0 && p1 && p2 && p1[0] && p2[0]) {
		return `${p0} ${p1[0]}.${p2[0]}.`;
	}
	if (p0 && p1 && p1[0]) {
		return `${p0} ${p1[0]}.`;
	}
	return name;
}

export function isCallAnsweredStatus(activeCall: TelephonyCall): boolean {
	if (!activeCall) return true;
	return (
		activeCall.status === "answered" ||
		activeCall.status === "connected" ||
		activeCall.status === "ended"
	);
}

export function isCallEndedStatus(activeCall: TelephonyCall): boolean {
	return activeCall?.status === "ended";
}

export function buildQuickBookingComment(
	slotType: QuickSlotType,
	formattedPhone: string,
): string {
	if (slotType === "today_urgent") {
		return `Острая боль! Внеочередная запись из звонка (${formattedPhone})`;
	}
	if (slotType === "tomorrow") {
		return `Запись на завтра из звонка (${formattedPhone})`;
	}
	return `Быстрая запись из звонка (${formattedPhone})`;
}
