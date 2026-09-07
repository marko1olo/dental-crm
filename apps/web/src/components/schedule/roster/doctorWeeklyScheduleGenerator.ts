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

				// Morning shift allocation (08:30-14:30)
				const usedMornChairs = new Set<string>();
				const usedMornAssistants = new Set<string>();
				for (let i = 0; i < mornDocs.length; i++) {
					const doc = mornDocs[i]!;
					const chair = allocateChairForDoctor(doc, usedMornChairs, i);
					if (!chair) break;

					const asst = allocateAssistantForDoctor(doc, usedMornAssistants);

					shifts.push({
						id: `shift-${dateIso}-${chair.chairId}-${doc.id}-morn`,
						doctorId: doc.id,
						doctorName: doc.shortName || doc.fullName,
						doctorRole: doc.role,
						assistantId: asst ? asst.id : null,
						assistantName: asst ? asst.shortName || asst.fullName : null,
						cabinetId: chair.cabinetId,
						chairId: chair.chairId,
						dateIso,
						archetypeId: "morning_shift",
						startTime: "08:30",
						endTime: "14:30",
						durationHours: 6.0,
						breakMinutes: 0,
						isNight: false,
						nightHours: 0,
						status: "scheduled",
					});
				}

				// Evening shift allocation (14:30-20:30)
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
						startTime: "14:30",
						endTime: "20:30",
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
