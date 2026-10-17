/**
 * @file resolveFloatingPatient.ts
 * @description Pure helper for resolving patient and somatic alerts in floating telephony.
 */

import {
	getDemoShowcasePatients,
	isDemoShowcaseMode,
} from "../../../lib/demoMode";
import {
	type DashboardResponse,
	type IncomingCallPayload,
	type SomaticAlertItem,
	resolvePatientFromPhone,
} from "../../../store/telephonyStore";

export function resolveFloatingPatient(
	activeCall: IncomingCallPayload | null,
	dashboard: DashboardResponse | null | undefined,
) {
	if (!activeCall) return null;
	if (dashboard?.patients && dashboard.patients.length > 0) {
		if (activeCall.patientId) {
			const found = dashboard.patients.find((p) => p.id === activeCall.patientId);
			if (found) return found;
		}
		const foundByPhone = resolvePatientFromPhone(dashboard.patients, activeCall.phone);
		if (foundByPhone) return foundByPhone;
		if (activeCall.patientName) {
			const foundByName = dashboard.patients.find((p) => p.fullName === activeCall.patientName);
			if (foundByName) return foundByName;
		}
	}
	if (isDemoShowcaseMode()) {
		const demoPatient = dashboard?.patients?.find(
			(p) =>
				p.id === "01a00000-0000-0000-0000-000000000001" ||
				p.fullName === "Смирнова Анна Сергеевна" ||
				p.phone === "+7 916 234-56-78",
		);
		if (demoPatient) return demoPatient;
		const demoList = getDemoShowcasePatients();
		return demoList[0] || null;
	}
	return null;
}

export function filterUniqueAllergies(somaticAlerts: SomaticAlertItem[]) {
	const raw = somaticAlerts.filter((a) => a.category === "allergy");
	const seen = new Set<string>();
	return raw.filter((alert) => {
		const lower = alert.label.toLowerCase();
		const key =
			lower.includes("пенициллин") || lower.includes("амокси")
				? "penicillin"
				: lower.includes("лидокаин") || lower.includes("анестети")
					? "anesthetic"
					: lower.includes("латекс")
						? "latex"
						: lower;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}
