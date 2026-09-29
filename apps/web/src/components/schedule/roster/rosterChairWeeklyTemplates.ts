/**
 * DENTE Dental CRM — Doctor-to-Chair Weekly Template Application
 * Compliance: StomX / DentalPRO Parity, Mandates 8e, 8k, 8n
 */

import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	type StaffMember,
	type MedicalStaffRole,
	type DoctorChairRosterTemplateId,
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
} from "./doctorShiftRosterPresets";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import type { DoctorShift } from "./doctorShiftRosterEngine";

/**
 * 1-Click Apply Doctor-to-Chair Weekly Shift Template (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
 */
export function applyDoctorChairWeeklyTemplate(
	currentShifts: DoctorShift[],
	params: {
		weekStartDateIso: string;
		templateId: DoctorChairRosterTemplateId;
		doctorId: string;
		doctorBId?: string | undefined;
		chairId: string;
		cabinetId?: string | undefined;
		staffList?: StaffMember[] | undefined;
		cabinets?: CabinetDefinition[] | undefined;
	},
): DoctorShift[] {
	const {
		weekStartDateIso,
		templateId,
		doctorId,
		doctorBId,
		chairId,
		cabinetId,
		staffList = DEFAULT_CLINIC_STAFF,
		cabinets = CLINIC_CABINETS_CATALOG,
	} = params;

	const template = DOCTOR_CHAIR_ROSTER_TEMPLATES.find((t) => t.id === templateId);
	if (!template) {
		return currentShifts;
	}

	const parts = (weekStartDateIso || "").split("-").map(Number);
	const startYear = parts[0] || 2026;
	const startMonth = parts[1] || 8;
	const startDay = parts[2] || 24;

	// Resolve cabinet
	let targetCabId = cabinetId;
	if (!targetCabId) {
		const cabWithChair = cabinets.find(
			(c) => Array.isArray(c.chairs) && c.chairs.some((ch) => ch.id === chairId),
		);
		targetCabId = cabWithChair?.id || cabinets[0]?.id || "cab-1";
	}

	const foundDoc =
		staffList.find((s) => s.id === doctorId) ||
		(isDemoShowcaseMode()
			? DEFAULT_CLINIC_STAFF.find((s) => s.id === doctorId)
			: undefined);
	const doc =
		foundDoc || {
			id: doctorId,
			fullName: `Врач ${doctorId}`,
			shortName: `Врач ${doctorId}`,
			role: "therapist" as MedicalStaffRole,
			tabNumber: "001",
			isDoctor: true,
			isAssistant: false,
			weeklyHourLimit: 33,
			avatarColor: "#2563eb",
		};

	const asstId =
		(doc as any).preferredAssistantId || (doc as any).defaultAssistantId;
	const asst = asstId
		? staffList.find((s) => s.id === asstId) || null
		: staffList.find((s) => s.role === "assistant") || null;

	const otherDoc =
		(doctorBId ? staffList.find((s) => s.id === doctorBId) : null) ||
		staffList.find((s) => s.isDoctor && s.id !== doc.id) ||
		(isDemoShowcaseMode()
			? DEFAULT_CLINIC_STAFF.find((s) => s.isDoctor && s.id !== doc.id)
			: null) ||
		doc;

	// Determine dates belonging to the active template
	const templateDates = new Set<string>();
	const newShiftsByDate = new Map<string, DoctorShift>();

	for (const dayIdx of template.daysOfWeekIndices) {
		const curDate = new Date(Date.UTC(startYear, startMonth - 1, startDay + dayIdx));
		const dateIso = curDate.toISOString().substring(0, 10);
		const dayOfMonth = curDate.getUTCDate();
		const isEven = dayOfMonth % 2 === 0;

		if (template.dayOfMonthFilter === "even" && !isEven) {
			continue;
		}
		if (template.dayOfMonthFilter === "odd" && isEven) {
			continue;
		}

		templateDates.add(dateIso);

		if (template.dayOfMonthFilter === "even_odd_split") {
			// Doctor A — even days 1st shift (08:00–14:00)
			// Doctor B — odd days 2nd shift (14:00–20:00)
			if (isEven) {
				newShiftsByDate.set(`${dateIso}-morn`, {
					id: `shift-${dateIso}-${chairId}-${doc.id}-even-morn`,
					doctorId: doc.id,
					doctorName: doc.shortName || doc.fullName,
					doctorRole: doc.role,
					assistantId: asst ? asst.id : null,
					assistantName: asst ? asst.shortName || asst.fullName : null,
					cabinetId: targetCabId,
					chairId,
					dateIso,
					archetypeId: "morning_shift",
					startTime: "08:00",
					endTime: "14:00",
					durationHours: 6.0,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
					customNotes: "Чётное число: 1-я смена (08:00–14:00)",
				});
			} else {
				const asstBId =
					(otherDoc as any).preferredAssistantId || (otherDoc as any).defaultAssistantId;
				const asstB = asstBId
					? staffList.find((s) => s.id === asstBId) || null
					: staffList.find((s) => s.role === "assistant") || null;
				newShiftsByDate.set(`${dateIso}-eve`, {
					id: `shift-${dateIso}-${chairId}-${otherDoc.id}-odd-eve`,
					doctorId: otherDoc.id,
					doctorName: otherDoc.shortName || otherDoc.fullName,
					doctorRole: otherDoc.role,
					assistantId: asstB ? asstB.id : null,
					assistantName: asstB ? asstB.shortName || asstB.fullName : null,
					cabinetId: targetCabId,
					chairId,
					dateIso,
					archetypeId: "evening_shift",
					startTime: "14:00",
					endTime: "20:00",
					durationHours: 6.0,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
					customNotes: "Нечётное число: 2-я смена (14:00–20:00)",
				});
			}
		} else {
			newShiftsByDate.set(dateIso, {
				id: `shift-${dateIso}-${chairId}-${doc.id}-${template.id}`,
				doctorId: doc.id,
				doctorName: doc.shortName || doc.fullName,
				doctorRole: doc.role,
				assistantId: asst ? asst.id : null,
				assistantName: asst ? asst.shortName || asst.fullName : null,
				cabinetId: targetCabId,
				chairId,
				dateIso,
				archetypeId: template.archetypeId,
				startTime: template.startTime,
				endTime: template.endTime,
				durationHours: template.durationHours,
				breakMinutes: template.breakMinutes,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
				customNotes: template.title,
			});
		}
	}

	// Filter currentShifts:
	const filtered = currentShifts.filter((s) => {
		if (s.chairId !== chairId || !templateDates.has(s.dateIso)) {
			return true;
		}
		if (template.dayOfMonthFilter === "even_odd_split") {
			const dayOfMonth = Number.parseInt(s.dateIso.slice(8, 10), 10);
			const isEven = dayOfMonth % 2 === 0;
			if (isEven && (s.startTime < "14:00" || s.doctorId === doc.id)) {
				return false;
			}
			if (!isEven && (s.startTime >= "14:00" || s.doctorId === otherDoc.id)) {
				return false;
			}
			return true;
		}
		if (s.doctorId === doc.id) {
			return false;
		}
		const isFullCoverage = template.durationHours >= 8.0;
		if (isFullCoverage) {
			return false;
		}
		if (
			template.startTime < "14:00" &&
			(s.startTime < "14:00" || s.archetypeId === "morning_shift")
		) {
			return false;
		}
		if (
			template.startTime >= "14:00" &&
			(s.startTime >= "14:00" || s.archetypeId === "evening_shift")
		) {
			return false;
		}
		return true;
	});

	return [...filtered, ...Array.from(newShiftsByDate.values())];
}

/**
 * 1-Click Generate Weekly Shifts for Doctor and Chair from Template (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
 */
export function generateWeeklyDoctorSchedule(params: {
	weekStartDateIso: string;
	templateId: DoctorChairRosterTemplateId;
	doctorId: string;
	doctorBId?: string | undefined;
	chairId: string;
	cabinetId?: string | undefined;
	staffList?: StaffMember[] | undefined;
	cabinets?: CabinetDefinition[] | undefined;
}): DoctorShift[] {
	return applyDoctorChairWeeklyTemplate([], params);
}
