/**
 * DENTE Dental CRM — Statutory Doctor Schedule Date & Shift Preset Utilities
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13
 * Architecture: Pure functions for dynamic date handling and 1-click shift allocation
 */

import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	type ShiftArchetypeId,
	type StaffMember,
	type MedicalStaffRole,
} from "./doctorShiftRosterPresets";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import type { DoctorShift } from "./doctorShiftRosterEngine";

/**
 * Dynamic Monday calculation without hardcoded historical dates (Mandates 8e, 8n)
 */
export function getMondayOfWeekIso(dateIso?: string): string {
	let targetDate: Date;
	if (dateIso && /^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
		const parts = dateIso.split("-").map(Number);
		targetDate = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!));
	} else if (dateIso) {
		const parsed = new Date(dateIso);
		if (Number.isNaN(parsed.getTime())) {
			const now = new Date();
			targetDate = new Date(
				Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
			);
		} else {
			targetDate = new Date(
				Date.UTC(
					parsed.getUTCFullYear(),
					parsed.getUTCMonth(),
					parsed.getUTCDate(),
				),
			);
		}
	} else {
		const now = new Date();
		targetDate = new Date(
			Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
		);
	}

	const day = targetDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
	const diff = targetDate.getUTCDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(
		Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), diff),
	);
	return monday.toISOString().slice(0, 10);
}

/**
 * 1-Click Chair-Doctor Shift Preset Application Engine (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
 */
export function applyCellShiftPreset(
	currentShifts: DoctorShift[],
	params: {
		dateIso: string;
		cabinetId: string;
		chairId: string;
		presetType: "morning" | "morning_9" | "evening" | "evening_15" | "full_day" | "clear";
		doctorId?: string | undefined;
		assistantId?: string | null | undefined;
		staffList?: StaffMember[] | undefined;
		cabinets?: CabinetDefinition[] | undefined;
	},
): DoctorShift[] {
	const {
		dateIso,
		cabinetId,
		chairId,
		presetType,
		doctorId,
		assistantId,
		staffList = isDemoShowcaseMode() ? DEFAULT_CLINIC_STAFF : [],
		cabinets = isDemoShowcaseMode() ? CLINIC_CABINETS_CATALOG : [],
	} = params;

	if (presetType === "clear") {
		return currentShifts.filter(
			(s) =>
				!(
					s.dateIso === dateIso &&
					(chairId ? s.chairId === chairId : true) &&
					(!doctorId || s.doctorId === doctorId)
				),
		);
	}

	const foundDoc = doctorId
		? staffList.find((s) => s.id === doctorId) ||
			(isDemoShowcaseMode()
				? DEFAULT_CLINIC_STAFF.find((s) => s.id === doctorId)
				: undefined)
		: null;
	const doc =
		foundDoc ||
		(doctorId
			? {
					id: doctorId,
					fullName: `Врач ${doctorId}`,
					shortName: `Врач ${doctorId}`,
					role: "therapist" as MedicalStaffRole,
					tabNumber: "001",
					isDoctor: true,
					isAssistant: false,
					weeklyHourLimit: 33,
					avatarColor: "#2563eb",
				}
			: staffList.find((s) => s.isDoctor) ||
				staffList[0] ||
				(isDemoShowcaseMode() ? DEFAULT_CLINIC_STAFF[0]! : undefined));

	if (!doc) {
		return currentShifts;
	}

	const asst =
		assistantId !== undefined
			? assistantId
				? staffList.find((s) => s.id === assistantId) || null
				: null
			: doc.defaultAssistantId
				? staffList.find((s) => s.id === doc.defaultAssistantId) || null
				: null;

	let startTime = "08:00";
	let endTime = "14:00";
	let durationHours = 6.0;
	let archetypeId: ShiftArchetypeId = "morning_shift";
	let breakMinutes = 0;
	let customNotes = "";

	if (presetType === "morning") {
		startTime = "08:00";
		endTime = "14:00";
		durationHours = 6.0;
		archetypeId = "morning_shift";
		breakMinutes = 0;
		customNotes = "1 смена (08:00–14:00)";
	} else if (presetType === "morning_9") {
		startTime = "09:00";
		endTime = "15:00";
		durationHours = 6.0;
		archetypeId = "morning_shift";
		breakMinutes = 0;
		customNotes = "1 смена (09:00–15:00)";
	} else if (presetType === "evening") {
		startTime = "14:00";
		endTime = "20:00";
		durationHours = 6.0;
		archetypeId = "evening_shift";
		breakMinutes = 0;
		customNotes = "2 смена (14:00–20:00)";
	} else if (presetType === "evening_15") {
		startTime = "15:00";
		endTime = "21:00";
		durationHours = 6.0;
		archetypeId = "evening_shift";
		breakMinutes = 0;
		customNotes = "2 смена (15:00–21:00)";
	} else if (presetType === "full_day") {
		startTime = "08:00";
		endTime = "20:00";
		durationHours = 11.0;
		archetypeId = "morning_shift";
		breakMinutes = 60;
		customNotes = "Весь день (08:00–20:00)";
	}

	const targetCab =
		cabinets.find((c) => c.id === cabinetId) ||
		cabinets[0] ||
		CLINIC_CABINETS_CATALOG[0]!;
	const targetChair =
		targetCab.chairs.find((ch) => ch.id === chairId) ||
		(chairId
			? { id: chairId, name: `Кресло ${chairId}`, equipment: "" }
			: targetCab.chairs[0] || {
					id: "chair-1a",
					name: "Кресло 1А",
					equipment: "",
				});

	const newShift: DoctorShift = {
		id: `shift-${dateIso}-${targetChair.id}-${doc.id}-${presetType}-${Date.now()}`,
		doctorId: doc.id,
		doctorName: doc.shortName || doc.fullName,
		doctorRole: doc.role,
		assistantId: asst ? asst.id : null,
		assistantName: asst ? asst.shortName || asst.fullName : null,
		cabinetId: targetCab.id,
		chairId: targetChair.id,
		dateIso,
		archetypeId,
		startTime,
		endTime,
		durationHours,
		breakMinutes,
		isNight: false,
		nightHours: 0,
		status: "scheduled",
		customNotes,
	};

	const filtered = currentShifts.filter((s) => {
		if (s.dateIso !== dateIso || s.chairId !== targetChair.id) {
			return true;
		}
		if (presetType === "full_day") {
			return false;
		}
		if (s.doctorId === doc.id) {
			return false;
		}
		const isMorningPreset = presetType === "morning" || presetType === "morning_9";
		const isEveningPreset = presetType === "evening" || presetType === "evening_15";
		if (
			isMorningPreset &&
			(s.startTime < "14:00" || s.archetypeId === "morning_shift")
		) {
			return false;
		}
		if (
			isEveningPreset &&
			(s.startTime >= "14:00" || s.archetypeId === "evening_shift")
		) {
			return false;
		}
		return true;
	});

	return [...filtered, newShift];
}
