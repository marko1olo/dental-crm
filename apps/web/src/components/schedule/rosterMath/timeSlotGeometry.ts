/**
 * DENTE Dental CRM — Time Slot Geometry, Date Bounds & Duty Doctor Resolution (timeSlotGeometry.ts)
 *
 * Principles & Compliance:
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, non-blocking 1-tap actions)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (resilient defaults for 1 chair / 1 doctor)
 * - Mandate 8d: Apple HIG & Medical Density (touch targets >= 44x44px, 0 emojis)
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { safeLocalStorageGetJson } from "../../../lib/safeLocalStorage";
import {
	addDaysToDateIso,
	getWeekDaysIso,
} from "../roster/doctorWeeklyScheduleGenerator";
import type {
	ChairDoctorShiftAssignment,
	SyncShiftPayload,
} from "./types";

/**
 * Returns ISO date (YYYY-MM-DD) for Monday of the given date's week.
 */
export function getMondayOfWeekIso(dateIso?: string): string {
	const base = dateIso ? new Date(dateIso) : new Date();
	const day = base.getDay(); // 0 is Sun
	const diff = base.getDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(base.setDate(diff));
	return monday.toISOString().slice(0, 10);
}

export { addDaysToDateIso, getWeekDaysIso };

/**
 * Formats doctor's full name to compact Russian clinical short name: "Иванов И.И."
 */
export function formatDoctorShortName(fullName: string): string {
	if (!fullName) return "";
	const cleaned = fullName.trim().replace(/^(д-р|доктор|врач)\s+/i, "");
	const parts = cleaned.trim().split(/\s+/);
	if (parts.length === 0 || !parts[0]) return fullName;
	const lastName = parts[0];
	if (parts.length === 1) return lastName;
	if (parts[1]?.includes(".")) {
		return `${lastName} ${parts.slice(1).join(" ")}`.trim();
	}
	const firstInitial = parts[1]?.[0] ? `${parts[1][0].toUpperCase()}.` : "";
	const middleInitial = parts[2]?.[0] ? `${parts[2][0].toUpperCase()}.` : "";
	return `${lastName} ${firstInitial}${middleInitial}`.trim();
}

/**
 * Resolves which doctor is on duty for a given chair at a specific time/slot.
 * Resilient multi-tier fallback:
 * 1. Active chair doctor shift assignment for the date (morning vs evening vs custom sub-shifts vs presets).
 * 2. In-memory safeLocalStorage assignment.
 * 3. Initial slot doctor.
 * 4. Default doctor fallback for chair.
 * 5. Default doctor from chair settings stored in safeLocalStorage.
 */
export function resolveChairDutyDoctor(
	chairId: string | null | undefined,
	startsAtIsoOrLocal: string | null | undefined,
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined,
	dateKeyFallback?: string | undefined,
	initialSlotDoctorId?: string | null | undefined,
	defaultDoctorIdFallback?: string | null | undefined,
): { doctorId: string | null; shiftHours: string } {
	if (!chairId) {
		return { doctorId: initialSlotDoctorId || defaultDoctorIdFallback || null, shiftHours: "08:00–20:00" };
	}

	// 1. Check passed chairDoctorAssignments
	let assignment = chairDoctorAssignments?.[chairId];

	// 2. Fallback to in-memory safeLocalStorage
	const targetDateKey =
		startsAtIsoOrLocal && startsAtIsoOrLocal.length >= 10
			? startsAtIsoOrLocal.slice(0, 10)
			: (dateKeyFallback || "");
	if (!assignment && targetDateKey) {
		const parsed = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment> | null>(
			`dente_chair_doctor_assignments_${targetDateKey}`,
			null,
		);
		if (parsed?.[chairId]) {
			assignment = parsed[chairId];
		}
	}

	if (assignment && (assignment.doctorId || (assignment.subShifts && assignment.subShifts.length > 0))) {
		let hourNum = NaN;
		if (startsAtIsoOrLocal) {
			if (startsAtIsoOrLocal.length >= 13) {
				hourNum = Number.parseInt(startsAtIsoOrLocal.slice(11, 13), 10);
			} else if (/^\d{2}:\d{2}/.test(startsAtIsoOrLocal)) {
				hourNum = Number.parseInt(startsAtIsoOrLocal.slice(0, 2), 10);
			}
		}

		// 1. Two-shift chair handling: morning (< 14:00) vs evening (>= 14:00)
		if (
			(assignment.subShifts && assignment.subShifts.length > 1) ||
			assignment.shiftPreset === "two_shifts"
		) {
			const mornSub = assignment.subShifts?.[0] || {
				doctorId: assignment.doctorId,
				doctorName: assignment.doctorName,
				startHour: 8,
				endHour: 14,
				shiftHours: "08:00–14:00",
			};
			const eveSub = assignment.subShifts?.[1] || {
				doctorId: assignment.doctorId,
				doctorName: assignment.doctorName,
				startHour: 14,
				endHour: 20,
				shiftHours: "14:00–20:00",
			};

			const mornStart = mornSub.startHour ?? 8;
			const eveEnd = eveSub.endHour ?? 20;

			if (!Number.isNaN(hourNum)) {
				if (hourNum < mornStart || (hourNum >= eveEnd && (eveEnd < 20 || hourNum > 20))) {
					return { doctorId: null, shiftHours: assignment.shiftHours || "08:00–20:00" };
				}
				if (hourNum < 14) {
					return {
						doctorId: mornSub.doctorId || assignment.doctorId || null,
						shiftHours: mornSub.shiftHours || "08:00–14:00",
					};
				}
				return {
					doctorId: eveSub.doctorId || mornSub.doctorId || assignment.doctorId || null,
					shiftHours: eveSub.shiftHours || "14:00–20:00",
				};
			}
			return {
				doctorId: assignment.doctorId,
				shiftHours: assignment.shiftHours || "08:00–20:00",
			};
		}

		// 2. Custom sub-shifts array
		if (assignment.subShifts && assignment.subShifts.length > 0) {
			if (!Number.isNaN(hourNum)) {
				const matchingSub = assignment.subShifts.find(
					(s) =>
						hourNum >= s.startHour &&
						(hourNum < s.endHour || (s.endHour >= 20 && hourNum <= 20)),
				);
				if (matchingSub) {
					return {
						doctorId: matchingSub.doctorId,
						shiftHours:
							matchingSub.shiftHours ||
							`${String(matchingSub.startHour).padStart(2, "0")}:00–${String(matchingSub.endHour).padStart(2, "0")}:00`,
					};
				}
				return { doctorId: null, shiftHours: assignment.shiftHours || "08:00–20:00" };
			}
			return {
				doctorId: assignment.doctorId,
				shiftHours: assignment.shiftHours || "08:00–20:00",
			};
		}

		// 3. Preset bounds: morning only vs evening only
		if (assignment.shiftPreset === "morning") {
			if (!Number.isNaN(hourNum) && hourNum >= 14) {
				return { doctorId: null, shiftHours: "08:00–14:00" };
			}
			return { doctorId: assignment.doctorId, shiftHours: "08:00–14:00" };
		}
		if (assignment.shiftPreset === "evening") {
			if (!Number.isNaN(hourNum) && (hourNum < 14 || hourNum > 20)) {
				return { doctorId: null, shiftHours: "14:00–20:00" };
			}
			return { doctorId: assignment.doctorId, shiftHours: "14:00–20:00" };
		}

		// 4. Start/End hour limits
		const sHour = assignment.startHour ?? 8;
		const eHour = assignment.endHour ?? 20;
		if (!Number.isNaN(hourNum)) {
			if (hourNum >= sHour && (hourNum < eHour || (eHour >= 20 && hourNum <= 20))) {
				return {
					doctorId: assignment.doctorId,
					shiftHours:
						assignment.shiftHours ||
						`${String(sHour).padStart(2, "0")}:00–${String(eHour).padStart(2, "0")}:00`,
				};
			}
			return {
				doctorId: null,
				shiftHours:
					assignment.shiftHours ||
					`${String(sHour).padStart(2, "0")}:00–${String(eHour).padStart(2, "0")}:00`,
			};
		}

		return {
			doctorId: assignment.doctorId,
			shiftHours: assignment.shiftHours || "08:00–20:00",
		};
	}

	// 3. Fallback: if slot was explicitly booked for this chair with a doctor
	if (initialSlotDoctorId) {
		return { doctorId: initialSlotDoctorId, shiftHours: "08:00–20:00" };
	}

	// 4. Fallback: explicit defaultDoctorIdFallback (e.g. from chair.defaultDoctorId or solo doctor)
	if (defaultDoctorIdFallback) {
		return { doctorId: defaultDoctorIdFallback, shiftHours: "08:00–20:00" };
	}

	// 5. Fallback: check stored default doctor for chair in localStorage
	if (chairId) {
		try {
			const storedChairDef = safeLocalStorageGetJson<Record<string, string>>(
				"dente_chair_default_doctors",
				{},
			);
			if (storedChairDef?.[chairId]) {
				return { doctorId: storedChairDef[chairId], shiftHours: "08:00–20:00" };
			}
		} catch {}
	}

	return { doctorId: null, shiftHours: "08:00–20:00" };
}

/**
 * Synchronizes chair shift assignments with server API with soft fallback (Mandate 8e, 8n).
 */
export async function syncShiftsWithServer(
	targetDateKey: string,
	currentAssignments: Record<string, ChairDoctorShiftAssignment>,
	chairsList?: readonly { id: string; name?: string; roomNumber?: string; room?: string }[],
): Promise<boolean> {
	if (!targetDateKey || !currentAssignments) return false;

	const shiftsToSend: SyncShiftPayload[] = [];

	for (const [chairId, assignment] of Object.entries(currentAssignments)) {
		if (!assignment) continue;
		const chairObj = chairsList?.find((c) => c.id === chairId);
		const cabinetId =
			(chairObj as any)?.roomNumber ||
			(chairObj as any)?.room ||
			"cab-1";

		if (assignment.subShifts && assignment.subShifts.length > 0) {
			for (const sub of assignment.subShifts) {
				const startH = sub.startHour ?? 8;
				const endH = sub.endHour ?? 14;
				shiftsToSend.push({
					id: `shift-${sub.doctorId}-${chairId}-${targetDateKey}-${startH}-${endH}`,
					doctorId: sub.doctorId,
					doctorName: sub.doctorName,
					doctorSpecialty: sub.doctorSpecialty,
					cabinetId,
					chairId,
					dateIso: targetDateKey,
					startTime: `${String(startH).padStart(2, "0")}:00`,
					endTime: `${String(endH).padStart(2, "0")}:00`,
					durationHours: endH - startH,
					status: "scheduled",
					shiftPreset: assignment.shiftPreset || "two_shifts",
				});
			}
		} else if (assignment.doctorId) {
			const startH = assignment.startHour ?? 8;
			const endH = assignment.endHour ?? 20;
			shiftsToSend.push({
				id: `shift-${assignment.doctorId}-${chairId}-${targetDateKey}-${startH}-${endH}`,
				doctorId: assignment.doctorId,
				doctorName: assignment.doctorName,
				doctorSpecialty: assignment.doctorSpecialty,
				cabinetId,
				chairId,
				dateIso: targetDateKey,
				startTime: `${String(startH).padStart(2, "0")}:00`,
				endTime: `${String(endH).padStart(2, "0")}:00`,
				durationHours: endH - startH,
				status: "scheduled",
				shiftPreset: assignment.shiftPreset || "full",
			});
		}
	}

	if (typeof window !== "undefined" && typeof fetch === "function") {
		try {
			const response = await fetch("/api/schedule/shifts", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ shifts: shiftsToSend }),
			});
			return response.ok;
		} catch {
			// Soft fallback per Mandate 8n & 8e (offline / isolated / network degradation)
			return false;
		}
	}

	return true;
}
