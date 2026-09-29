/**
 * DENTE Dental CRM — Default Weekly Roster Schedule Initializer
 */

import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	type StaffMember,
} from "./doctorShiftRosterPresets";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import type { DoctorShift } from "./rosterLaborComplianceT13";

/**
 * Generate a realistic initial weekly schedule
 */
export function createDefaultWeeklySchedule(
	startDateIso: string,
	staffList: StaffMember[] = isDemoShowcaseMode() ? DEFAULT_CLINIC_STAFF : [],
	cabinets: CabinetDefinition[] = isDemoShowcaseMode() ? CLINIC_CABINETS_CATALOG : [],
): DoctorShift[] {
	if (staffList.length === 0 || cabinets.length === 0) {
		return [];
	}
	const shifts: DoctorShift[] = [];
	const startDate = new Date(startDateIso);
	const fallbackDoc =
		staffList[0] ||
		(isDemoShowcaseMode() ? DEFAULT_CLINIC_STAFF[0]! : undefined);
	if (!fallbackDoc) return [];

	// Create 7 days of shifts
	for (let d = 0; d < 7; d++) {
		const curDate = new Date(startDate);
		curDate.setDate(startDate.getDate() + d);
		const dateIso = curDate.toISOString().substring(0, 10);
		const dayOfWeek = curDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

		if (dayOfWeek === 0) {
			// Sunday Duty (10:00 - 16:00)
			const doc = staffList.find((s) => s.id === "doc-volkov") || fallbackDoc;
			const asst = staffList.find((s) => s.id === "asst-kovaleva") || null;
			shifts.push({
				id: `shift-${dateIso}-sun-1`,
				doctorId: doc.id,
				doctorName: doc.shortName,
				doctorRole: doc.role,
				assistantId: asst ? asst.id : null,
				assistantName: asst ? asst.shortName : null,
				cabinetId: "cab-2",
				chairId: "chair-2",
				dateIso,
				archetypeId: "sunday_duty",
				startTime: "10:00",
				endTime: "16:00",
				durationHours: 6.0,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
				customNotes: "Дежурный прием по неотложным показаниям",
			});
			continue;
		}

		if (dayOfWeek === 6) {
			// Saturday Shift (09:00 - 17:00, 7.0 hours)
			const docTherapy = staffList.find((s) => s.id === "doc-smirnov") || fallbackDoc;
			const asst1 = staffList.find((s) => s.id === "asst-ivanova") || null;
			shifts.push({
				id: `shift-${dateIso}-sat-1`,
				doctorId: docTherapy.id,
				doctorName: docTherapy.shortName,
				doctorRole: docTherapy.role,
				assistantId: asst1 ? asst1.id : null,
				assistantName: asst1 ? asst1.shortName : null,
				cabinetId: "cab-1",
				chairId: "chair-1a",
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

			const docPediatric = staffList.find((s) => s.id === "doc-mikhailova");
			if (docPediatric) {
				const asst2 = staffList.find((s) => s.id === "asst-sokolova") || null;
				shifts.push({
					id: `shift-${dateIso}-sat-2`,
					doctorId: docPediatric.id,
					doctorName: docPediatric.shortName,
					doctorRole: docPediatric.role,
					assistantId: asst2 ? asst2.id : null,
					assistantName: asst2 ? asst2.shortName : null,
					cabinetId: "cab-4",
					chairId: "chair-4",
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
			continue;
		}

		// Weekdays (Mon-Fri)
		// Cab 1 Morning: Smirnov (Therapist) + Ivanova
		const doc1 = staffList.find((s) => s.id === "doc-smirnov");
		if (doc1) {
			const asst = staffList.find((s) => s.id === "asst-ivanova") || null;
			shifts.push({
				id: `shift-${dateIso}-cab1-morn`,
				doctorId: doc1.id,
				doctorName: doc1.shortName,
				doctorRole: doc1.role,
				assistantId: asst ? asst.id : null,
				assistantName: asst ? asst.shortName : null,
				cabinetId: "cab-1",
				chairId: "chair-1a",
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

		// Cab 2 Morning: Volkov (Surgeon) + Kovaleva
		const doc2 = staffList.find((s) => s.id === "doc-volkov");
		if (doc2) {
			const asst = staffList.find((s) => s.id === "asst-kovaleva") || null;
			shifts.push({
				id: `shift-${dateIso}-cab2-morn`,
				doctorId: doc2.id,
				doctorName: doc2.shortName,
				doctorRole: doc2.role,
				assistantId: asst ? asst.id : null,
				assistantName: asst ? asst.shortName : null,
				cabinetId: "cab-2",
				chairId: "chair-2",
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

		// Cab 3 Evening: Kuznetsova (Orthopedist) + Sokolova
		const doc3 = staffList.find((s) => s.id === "doc-kuznetsova");
		if (doc3) {
			const asst = staffList.find((s) => s.id === "asst-sokolova") || null;
			shifts.push({
				id: `shift-${dateIso}-cab3-eve`,
				doctorId: doc3.id,
				doctorName: doc3.shortName,
				doctorRole: doc3.role,
				assistantId: asst ? asst.id : null,
				assistantName: asst ? asst.shortName : null,
				cabinetId: "cab-3",
				chairId: "chair-3",
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

		// Cab 4 Evening: Lebedeva (Orthodontist) / Mikhailova (Pediatric)
		const doc4 = dayOfWeek % 2 === 1 ? staffList.find((s) => s.id === "doc-lebedeva") : staffList.find((s) => s.id === "doc-mikhailova");
		if (doc4) {
			const asst = staffList.find((s) => s.id === "asst-ivanova") || null;
			shifts.push({
				id: `shift-${dateIso}-cab4-eve`,
				doctorId: doc4.id,
				doctorName: doc4.shortName,
				doctorRole: doc4.role,
				assistantId: asst ? asst.id : null,
				assistantName: asst ? asst.shortName : null,
				cabinetId: "cab-4",
				chairId: "chair-4",
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
	}

	return shifts;
}
