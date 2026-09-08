/**
 * doctorWeeklyScheduleGenerator.ts
 *
 * DENTE Dental CRM — Weekly Doctor-to-Chair Shift Allocation Engine
 * Presets:
 * - "five_day": Mon-Fri standard schedule for active doctors and chairs
 * - "two_two": 2/2 rolling shifts across week (alternating pairs with zero double-booking)
 * - "morning": 08:00-14:00 on all chairs
 * - "evening": 14:00-20:00 on all chairs
 * - "full_day": 08:00-20:00 full-day coverage
 *
 * Mandates:
 * - Mandate 8e (Doctor & Staff Autonomy): Non-blocking shift presets, zero disabled buttons.
 * - Mandate 8k (CRM != Reality Simulator): 1-click weekly presets for rapid deployment.
 * - Mandate 8n (Solo Doctor & Small Clinic Sovereignty): Resilient fallbacks for 1-chair clinics.
 */

import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	type StaffMember,
	type DoctorChairRosterTemplateId,
	type DoctorChairRosterTemplate,
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
} from "./doctorShiftRosterPresets";
import type { DoctorShift } from "./doctorShiftRosterEngine";

/**
 * Weekly doctor-to-chair shift allocation engine with 1-click presets (Mandates 8e, 8k, 8n)
 */
export function generateWeeklyScheduleForStaffAndCabinets(
	startDateIso: string,
	staffList: StaffMember[] = DEFAULT_CLINIC_STAFF,
	cabinets: CabinetDefinition[] = CLINIC_CABINETS_CATALOG,
	preset: "five_day" | "two_two" | "morning" | "evening" | "full_day" = "five_day",
): DoctorShift[] {
	const allChairs: Array<{ cabinetId: string; chairId: string; name: string }> =
		[];
	for (const cab of cabinets) {
		for (const chair of cab.chairs) {
			allChairs.push({
				cabinetId: cab.id,
				chairId: chair.id,
				name: chair.name,
			});
		}
	}
	if (allChairs.length === 0) {
		allChairs.push({
			cabinetId: "cab-1",
			chairId: "chair-1a",
			name: "Кресло 1",
		});
	}

	const doctors = staffList.filter((s) => s.isDoctor);
	const assistants = staffList.filter((s) => s.isAssistant);
	const fallbackDoctors = DEFAULT_CLINIC_STAFF.filter((s) => s.isDoctor);
	const effectiveDoctors =
		doctors.length > 0 ? doctors : fallbackDoctors;

	function allocateChairForDoctor(
		doc: StaffMember,
		usedChairIds: Set<string>,
		preferredIndex: number,
	): { cabinetId: string; chairId: string; name: string } | null {
		if (doc.preferredChairId && !usedChairIds.has(doc.preferredChairId)) {
			const found = allChairs.find((c) => c.chairId === doc.preferredChairId);
			if (found) {
				usedChairIds.add(found.chairId);
				return found;
			}
		}
		const candidate = allChairs[preferredIndex % allChairs.length];
		if (candidate && !usedChairIds.has(candidate.chairId)) {
			usedChairIds.add(candidate.chairId);
			return candidate;
		}
		const freeChair = allChairs.find((c) => !usedChairIds.has(c.chairId));
		if (freeChair) {
			usedChairIds.add(freeChair.chairId);
			return freeChair;
		}
		return null;
	}

	function allocateAssistantForDoctor(
		doc: StaffMember,
		usedAssistantIds: Set<string>,
	): StaffMember | null {
		if (doc.defaultAssistantId && !usedAssistantIds.has(doc.defaultAssistantId)) {
			const asst = staffList.find((s) => s.id === doc.defaultAssistantId) || null;
			if (asst) {
				usedAssistantIds.add(asst.id);
				return asst;
			}
		}
		if (assistants.length > 0) {
			const freeAsst = assistants.find((a) => !usedAssistantIds.has(a.id));
			if (freeAsst) {
				usedAssistantIds.add(freeAsst.id);
				return freeAsst;
			}
		}
		return null;
	}

	const parts = (startDateIso || "").split("-").map(Number);
	const startYear = parts[0] || 2026;
	const startMonth = parts[1] || 8;
	const startDay = parts[2] || 24;

	const shifts: DoctorShift[] = [];

	for (let d = 0; d < 7; d++) {
		const curDate = new Date(
			Date.UTC(startYear, startMonth - 1, startDay + d),
		);
		const dateIso = curDate.toISOString().substring(0, 10);
		const dayOfWeek = curDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat

		if (preset === "five_day") {
			if (dayOfWeek >= 1 && dayOfWeek <= 5) {
				const numDocs = effectiveDoctors.length;

				let mornDocs: StaffMember[] = [];
				let eveDocs: StaffMember[] = [];

				if (numDocs === 1) {
					// Solo doctor works 1 morning shift per day (30h/week per TK RF Article 350)
					mornDocs = [effectiveDoctors[0]!];
				} else {
					// Split doctors across morning and evening shifts with daily rotation
					const half = Math.ceil(numDocs / 2);
					const rotatedDocs = Array.from(
						{ length: numDocs },
						(_, i) => effectiveDoctors[(i + d) % numDocs]!,
					);
					mornDocs = rotatedDocs.slice(0, half);
					eveDocs = rotatedDocs.slice(half);
				}

				// Morning shift allocation (08:00-14:00)
				const usedMornChairs = new Set<string>();
				const usedMornAssistants = new Set<string>();
				for (let j = 0; j < mornDocs.length; j++) {
					const mornDoc = mornDocs[j]!;
					const mornChair = allocateChairForDoctor(mornDoc, usedMornChairs, j);
					if (!mornChair) break;

					const mornAsst = allocateAssistantForDoctor(mornDoc, usedMornAssistants);

					shifts.push({
						id: `shift-${dateIso}-${mornChair.chairId}-${mornDoc.id}-morn`,
						doctorId: mornDoc.id,
						doctorName: mornDoc.shortName || mornDoc.fullName,
						doctorRole: mornDoc.role,
						assistantId: mornAsst ? mornAsst.id : null,
						assistantName: mornAsst ? mornAsst.shortName || mornAsst.fullName : null,
						cabinetId: mornChair.cabinetId,
						chairId: mornChair.chairId,
						dateIso,
						archetypeId: "morning_shift",
						startTime: "08:00",
						endTime: "14:00",
						durationHours: 6.0,
						breakMinutes: 0,
						isNight: false,
						nightHours: 0,
						status: "scheduled",
					});
				}

				// Evening shift allocation (14:00-20:00)
				const usedEveChairs = new Set<string>();
				const usedEveAssistants = new Set<string>();
				for (let j = 0; j < eveDocs.length; j++) {
					const eveDoc = eveDocs[j]!;
					const eveChair = allocateChairForDoctor(eveDoc, usedEveChairs, j);
					if (!eveChair) break;

					const eveAsst = allocateAssistantForDoctor(eveDoc, usedEveAssistants);

					shifts.push({
						id: `shift-${dateIso}-${eveChair.chairId}-${eveDoc.id}-eve`,
						doctorId: eveDoc.id,
						doctorName: eveDoc.shortName || eveDoc.fullName,
						doctorRole: eveDoc.role,
						assistantId: eveAsst ? eveAsst.id : null,
						assistantName: eveAsst ? eveAsst.shortName || eveAsst.fullName : null,
						cabinetId: eveChair.cabinetId,
						chairId: eveChair.chairId,
						dateIso,
						archetypeId: "evening_shift",
						startTime: "14:00",
						endTime: "20:00",
						durationHours: 6.0,
						breakMinutes: 0,
						isNight: false,
						nightHours: 0,
						status: "scheduled",
					});
				}
			} else if (dayOfWeek === 6 && effectiveDoctors.length > 1) {
				const chair = allChairs[0]!;
				const doc = effectiveDoctors[d % effectiveDoctors.length]!;
				shifts.push({
					id: `shift-${dateIso}-${chair.chairId}-${doc.id}-sat`,
					doctorId: doc.id,
					doctorName: doc.shortName || doc.fullName,
					doctorRole: doc.role,
					assistantId: null,
					assistantName: null,
					cabinetId: chair.cabinetId,
					chairId: chair.chairId,
					dateIso,
					archetypeId: "saturday_shift",
					startTime: "09:00",
					endTime: "17:00",
					durationHours: 7.0,
					breakMinutes: 60,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				});
			}
		} else if (preset === "two_two") {
			const numDocs = effectiveDoctors.length;
			const numChairs = allChairs.length;

			if (numDocs === 1) {
				if (d % 4 < 2) {
					const doc = effectiveDoctors[0]!;
					const chair = allChairs[0]!;
					const asst = allocateAssistantForDoctor(doc, new Set<string>());
					shifts.push({
						id: `shift-${dateIso}-${chair.chairId}-${doc.id}-2-2`,
						doctorId: doc.id,
						doctorName: doc.shortName || doc.fullName,
						doctorRole: doc.role,
						assistantId: asst ? asst.id : null,
						assistantName: asst ? asst.shortName || asst.fullName : null,
						cabinetId: chair.cabinetId,
						chairId: chair.chairId,
						dateIso,
						archetypeId: "morning_shift",
						startTime: "09:00",
						endTime: "21:00",
						durationHours: 11.0,
						breakMinutes: 60,
						isNight: false,
						nightHours: 0,
						status: "scheduled",
						customNotes: "Сменный график 2/2",
					});
				}
			} else if (numChairs >= numDocs) {
				const usedChairs = new Set<string>();
				const usedAssistants = new Set<string>();
				effectiveDoctors.forEach((doc, docIdx) => {
					const isWorkDay = (d + (docIdx % 2) * 2) % 4 < 2;
					if (isWorkDay) {
						const chair = allocateChairForDoctor(doc, usedChairs, docIdx);
						if (chair) {
							const asst = allocateAssistantForDoctor(doc, usedAssistants);
							shifts.push({
								id: `shift-${dateIso}-${chair.chairId}-${doc.id}-2-2`,
								doctorId: doc.id,
								doctorName: doc.shortName || doc.fullName,
								doctorRole: doc.role,
								assistantId: asst ? asst.id : null,
								assistantName: asst ? asst.shortName || asst.fullName : null,
								cabinetId: chair.cabinetId,
								chairId: chair.chairId,
								dateIso,
								archetypeId: "morning_shift",
								startTime: "09:00",
								endTime: "21:00",
								durationHours: 11.0,
								breakMinutes: 60,
								isNight: false,
								nightHours: 0,
								status: "scheduled",
								customNotes: "Сменный график 2/2",
							});
						}
					}
				});
			} else {
				const usedChairs = new Set<string>();
				const usedAssistants = new Set<string>();
				for (let c = 0; c < numChairs; c++) {
					const docTeam1 = effectiveDoctors[(2 * c) % numDocs];
					const docTeam2 = (2 * c + 1 < numDocs) ? effectiveDoctors[2 * c + 1] : null;

					const activeDoc = (d % 4 < 2) ? docTeam1 : docTeam2;
					if (activeDoc) {
						const chair = allocateChairForDoctor(activeDoc, usedChairs, c);
						if (chair) {
							const asst = allocateAssistantForDoctor(activeDoc, usedAssistants);
							shifts.push({
								id: `shift-${dateIso}-${chair.chairId}-${activeDoc.id}-2-2`,
								doctorId: activeDoc.id,
								doctorName: activeDoc.shortName || activeDoc.fullName,
								doctorRole: activeDoc.role,
								assistantId: asst ? asst.id : null,
								assistantName: asst ? asst.shortName || asst.fullName : null,
								cabinetId: chair.cabinetId,
								chairId: chair.chairId,
								dateIso,
								archetypeId: "morning_shift",
								startTime: "09:00",
								endTime: "21:00",
								durationHours: 11.0,
								breakMinutes: 60,
								isNight: false,
								nightHours: 0,
								status: "scheduled",
								customNotes: "Сменный график 2/2",
							});
						}
					}
				}
			}
		} else if (preset === "morning") {
			if (dayOfWeek !== 0) {
				const activeCount = Math.min(allChairs.length, effectiveDoctors.length);
				const usedChairs = new Set<string>();
				const usedAssistants = new Set<string>();
				for (let i = 0; i < activeCount; i++) {
					const doc = effectiveDoctors[(i + d) % effectiveDoctors.length]!;
					const chair = allocateChairForDoctor(doc, usedChairs, i + d);
					if (!chair) break;
					const asst = allocateAssistantForDoctor(doc, usedAssistants);

					shifts.push({
						id: `shift-${dateIso}-${chair.chairId}-${doc.id}-morn-fixed`,
						doctorId: doc.id,
						doctorName: doc.shortName || doc.fullName,
						doctorRole: doc.role,
						assistantId: asst ? asst.id : null,
						assistantName: asst ? asst.shortName || asst.fullName : null,
						cabinetId: chair.cabinetId,
						chairId: chair.chairId,
						dateIso,
						archetypeId: "morning_shift",
						startTime: "08:00",
						endTime: "14:00",
						durationHours: 6.0,
						breakMinutes: 0,
						isNight: false,
						nightHours: 0,
						status: "scheduled",
					});
				}
			}
		} else if (preset === "evening") {
			if (dayOfWeek !== 0) {
				const activeCount = Math.min(allChairs.length, effectiveDoctors.length);
				const usedChairs = new Set<string>();
				const usedAssistants = new Set<string>();
				for (let i = 0; i < activeCount; i++) {
					const doc = effectiveDoctors[(i + d) % effectiveDoctors.length]!;
					const chair = allocateChairForDoctor(doc, usedChairs, i + d);
					if (!chair) break;
					const asst = allocateAssistantForDoctor(doc, usedAssistants);

					shifts.push({
						id: `shift-${dateIso}-${chair.chairId}-${doc.id}-eve-fixed`,
						doctorId: doc.id,
						doctorName: doc.shortName || doc.fullName,
						doctorRole: doc.role,
						assistantId: asst ? asst.id : null,
						assistantName: asst ? asst.shortName || asst.fullName : null,
						cabinetId: chair.cabinetId,
						chairId: chair.chairId,
						dateIso,
						archetypeId: "evening_shift",
						startTime: "14:00",
						endTime: "20:00",
						durationHours: 6.0,
						breakMinutes: 0,
						isNight: false,
						nightHours: 0,
						status: "scheduled",
					});
				}
			}
		} else if (preset === "full_day") {
			if (dayOfWeek !== 0) {
				const activeCount = Math.min(allChairs.length, effectiveDoctors.length);
				const usedChairs = new Set<string>();
				const usedAssistants = new Set<string>();
				for (let i = 0; i < activeCount; i++) {
					const doc = effectiveDoctors[(i + d) % effectiveDoctors.length]!;
					const chair = allocateChairForDoctor(doc, usedChairs, i + d);
					if (!chair) break;
					const asst = allocateAssistantForDoctor(doc, usedAssistants);

					shifts.push({
						id: `shift-${dateIso}-${chair.chairId}-${doc.id}-fullday`,
						doctorId: doc.id,
						doctorName: doc.shortName || doc.fullName,
						doctorRole: doc.role,
						assistantId: asst ? asst.id : null,
						assistantName: asst ? asst.shortName || asst.fullName : null,
						cabinetId: chair.cabinetId,
						chairId: chair.chairId,
						dateIso,
						archetypeId: "morning_shift",
						startTime: "08:00",
						endTime: "20:00",
						durationHours: 11.0,
						breakMinutes: 60,
						isNight: false,
						nightHours: 0,
						status: "scheduled",
						customNotes: "Полный день 08:00–20:00",
					});
				}
			}
		}
	}

	return shifts;
}

/**
 * 1-Click Doctor-to-Chair Weekly Shift Template Application (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
 *
 * Templates:
 * - "mon_wed_fri_morning": Mon/Wed/Fri (08:00–14:00)
 * - "tue_thu_sat_evening": Tue/Thu/Sat (14:00–20:00)
 * - "two_two_full": 2/2 rolling full days (08:00–20:00)
 * - "five_day_standard": Mon-Fri (09:00–18:00)
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

	const normalizedId =
		templateId === "two_two_full_day"
			? "two_two_full"
			: templateId === "five_day_week"
				? "five_day_standard"
				: templateId;

	const template =
		DOCTOR_CHAIR_ROSTER_TEMPLATES.find(
			(t) => t.id === templateId || t.id === normalizedId,
		) || DOCTOR_CHAIR_ROSTER_TEMPLATES[0]!;

	const doc =
		staffList.find((s) => s.id === doctorId) ||
		DEFAULT_CLINIC_STAFF.find((s) => s.id === doctorId) ||
		staffList[0] ||
		DEFAULT_CLINIC_STAFF[0]!;

	const asstId = doc.preferredAssistantId || (doc as any).defaultAssistantId;
	const asst = asstId
		? staffList.find((s) => s.id === asstId) || null
		: staffList.find((s) => s.role === "assistant") || null;

	let targetCabId = cabinetId;
	if (!targetCabId) {
		const cabWithChair = cabinets.find(
			(c) => Array.isArray(c.chairs) && c.chairs.some((ch) => ch.id === chairId),
		);
		targetCabId = cabWithChair?.id || cabinets[0]?.id || "cab-1";
	}

	const parts = (weekStartDateIso || "").split("-").map(Number);
	const startYear = parts[0] || 2026;
	const startMonth = parts[1] || 8;
	const startDay = parts[2] || 24;

	const otherDoc =
		(doctorBId ? staffList.find((s) => s.id === doctorBId) : undefined) ||
		staffList.find((s) => s.isDoctor && s.id !== doc.id) ||
		DEFAULT_CLINIC_STAFF.find((s) => s.isDoctor && s.id !== doc.id) ||
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
					otherDoc.preferredAssistantId || (otherDoc as any).defaultAssistantId;
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
	// For dates in this week on this chair:
	// If a date is one of templateDates:
	//   - if even_odd_split, remove conflicting shifts on even/odd slots
	//   - if template is full coverage (>= 8h), remove all shifts on that chair for that date
	//   - if template is morning (08:00-14:00), remove existing morning/full_day shifts on that chair for that date
	//   - if template is evening (14:00-20:00), remove existing evening/full_day shifts on that chair for that date
	//   - always remove any shift for the same doctor on that chair/date to avoid self-collision
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
 * Add days to YYYY-MM-DD date string using UTC arithmetic (timezone-safe)
 */
export function addDaysToDateIso(dateIso: string, daysToAdd: number): string {
	const parts = (dateIso || "").split("-").map(Number);
	const y = parts[0] || 2026;
	const m = parts[1] || 8;
	const d = parts[2] || 24;
	const target = new Date(Date.UTC(y, m - 1, d + daysToAdd));
	return target.toISOString().substring(0, 10);
}

/**
 * Get 7 days (Monday to Sunday) of the week as ISO date strings
 */
export function getWeekDaysIso(weekStartDateIso: string): string[] {
	const days: string[] = [];
	for (let i = 0; i < 7; i++) {
		days.push(addDaysToDateIso(weekStartDateIso, i));
	}
	return days;
}

/**
 * 1-Click Copy Week Shifts to Target Week (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
 *
 * Copies all shifts of source week to target week (+7 days or arbitrary target week Monday).
 * Preserves doctorId, doctorName, doctorRole, assistantId, assistantName,
 * cabinetId, chairId, archetypeId, startTime, endTime, durationHours, breakMinutes,
 * isNight, nightHours, customNotes.
 *
 * Replaces existing shifts on target week dates to prevent duplicate overlaps.
 */
export function copyWeekShiftsToTargetWeek(
	currentShifts: DoctorShift[],
	sourceWeekStartDateIso: string,
	targetWeekStartDateIso: string,
): DoctorShift[] {
	const sourceDays = getWeekDaysIso(sourceWeekStartDateIso);
	const targetDays = getWeekDaysIso(targetWeekStartDateIso);
	const targetDaysSet = new Set(targetDays);

	const getShiftDate = (s: DoctorShift): string =>
		s.dateIso || (s as unknown as { date?: string }).date || "";

	const sourceShifts = currentShifts.filter(
		(s) => sourceDays.includes(getShiftDate(s)) && s.status !== "cancelled",
	);

	if (sourceShifts.length === 0) {
		return currentShifts;
	}

	// Filter out existing shifts in the target week
	const remainingShifts = currentShifts.filter(
		(s) => !targetDaysSet.has(getShiftDate(s)),
	);

	// Generate copied shifts for the target week
	const newShifts: DoctorShift[] = sourceShifts.map((s, idx) => {
		const shiftDate = getShiftDate(s);
		const dayIdx = sourceDays.indexOf(shiftDate);
		const targetDateIso = targetDays[dayIdx] || targetDays[0]!;
		return {
			...s,
			id: `shift-${targetDateIso}-${s.chairId}-${s.doctorId}-${s.startTime.replace(":", "")}-${s.endTime.replace(":", "")}-${idx}`,
			dateIso: targetDateIso,
			status: "scheduled",
		};
	});

	return [...remainingShifts, ...newShifts];
}

/**
 * 1-Click Copy Week Shifts to Next 4 Weeks / Month (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
 *
 * Iteratively copies the source week shifts across the next `weeksCount` (default: 4) weeks.
 */
export function copyWeekShiftsToMonth(
	currentShifts: DoctorShift[],
	sourceWeekStartDateIso: string,
	weeksCount = 4,
): DoctorShift[] {
	let accumulated = currentShifts;
	for (let w = 1; w <= weeksCount; w++) {
		const targetMonday = addDaysToDateIso(sourceWeekStartDateIso, w * 7);
		accumulated = copyWeekShiftsToTargetWeek(
			accumulated,
			sourceWeekStartDateIso,
			targetMonday,
		);
	}
	return accumulated;
}

/**
 * 1-Click Clear Week Shifts (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
 *
 * Removes all shifts in the specified week, returning a clean slate for the week.
 */
export function clearWeekShifts(
	currentShifts: DoctorShift[],
	weekStartDateIso: string,
): DoctorShift[] {
	const weekDays = getWeekDaysIso(weekStartDateIso);
	const weekDaysSet = new Set(weekDays);
	const getShiftDate = (s: DoctorShift): string =>
		s.dateIso || (s as unknown as { date?: string }).date || "";
	return currentShifts.filter((s) => !weekDaysSet.has(getShiftDate(s)));
}


