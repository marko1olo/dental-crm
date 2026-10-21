import type { DentalSpecialty, StaffMember } from "@dental/shared";
import { specialtyLabels } from "../../../../workspaceUiLabels";
import { formatDoctorShortName } from "../../GridAppointmentCard";
import { CHAIR_SHIFT_PRESETS } from "../gridConstants";
import type { ChairDoctorShiftAssignment, ChairDoctorSubShift } from "../gridTypes";

export function buildChairShiftAssignment(
	chairId: string,
	docId: string,
	shiftPreset: "morning" | "morning_9" | "evening" | "evening_15" | "full" | "full_9_21" | "two_shifts",
	doctors: StaffMember[],
	effectiveChairAssignments: Record<string, ChairDoctorShiftAssignment>,
	eveningDocId?: string,
): ChairDoctorShiftAssignment {
	const doc = doctors.find((d) => d.id === docId);
	const specialty = doc?.specialties && doc.specialties.length > 0
		? specialtyLabels[doc.specialties[0] as DentalSpecialty] || doc.specialties[0]
		: doc?.role === "doctor" ? "Стоматолог" : "";
	const doctorName = doc?.fullName || "Врач";

	if (shiftPreset === "two_shifts") {
		const evDoc = doctors.find((d) => d.id === (eveningDocId || docId)) || doc;
		const evDocName = evDoc?.fullName || "Врач";
		const evDocSpecialty = evDoc?.specialties && evDoc.specialties.length > 0
			? specialtyLabels[evDoc.specialties[0] as DentalSpecialty] || evDoc.specialties[0]
			: evDoc?.role === "doctor" ? "Стоматолог" : "";
		const subShifts: ChairDoctorSubShift[] = [
			{ doctorId: docId, doctorName, doctorSpecialty: specialty, startHour: 8, endHour: 14, shiftHours: "08:00–14:00" },
			{ doctorId: evDoc?.id || docId, doctorName: evDocName, doctorSpecialty: evDocSpecialty, startHour: 14, endHour: 20, shiftHours: "14:00–20:00" },
		];
		return {
			chairId, doctorId: docId, doctorName, doctorSpecialty: specialty, shiftPreset: "custom",
			shiftLabel: `Утро: ${formatDoctorShortName(doctorName)} · Вечер: ${formatDoctorShortName(evDocName)}`,
			shiftHours: "08:00–20:00", startHour: 8, endHour: 20, subShifts,
		};
	}

	if (shiftPreset === "morning" || shiftPreset === "morning_9") {
		const isM9 = shiftPreset === "morning_9";
		const startHour = isM9 ? 9 : 8;
		const endHour = isM9 ? 15 : 14;
		const hoursLabel = isM9 ? "09:00–15:00" : "08:00–14:00";
		const existing = effectiveChairAssignments[chairId];
		const existingEve = existing?.shiftPreset === (isM9 ? "evening_15" : "evening")
			? { doctorId: existing.doctorId, doctorName: existing.doctorName, doctorSpecialty: existing.doctorSpecialty, startHour: isM9 ? 15 : 14, endHour: isM9 ? 21 : 20, shiftHours: isM9 ? "15:00–21:00" : "14:00–20:00" }
			: existing?.subShifts?.find((s) => s.startHour >= (isM9 ? 15 : 14));
		const morningSubShift: ChairDoctorSubShift = { doctorId: docId, doctorName, doctorSpecialty: specialty, startHour, endHour, shiftHours: hoursLabel };

		if (existingEve && existingEve.doctorId) {
			return {
				chairId, doctorId: docId,
				doctorName: `${formatDoctorShortName(doctorName)} / ${formatDoctorShortName(existingEve.doctorName)}`,
				doctorSpecialty: specialty, shiftPreset: "custom",
				shiftLabel: `${isM9 ? "1 см" : "Утро"}: ${formatDoctorShortName(doctorName)} · ${isM9 ? "2 см" : "Вечер"}: ${formatDoctorShortName(existingEve.doctorName)}`,
				shiftHours: `${hoursLabel} & ${existingEve.shiftHours}`, startHour, endHour: existingEve.endHour || (isM9 ? 21 : 20),
				subShifts: [morningSubShift, existingEve],
			};
		}
		const preset = CHAIR_SHIFT_PRESETS.find((p) => p.id === shiftPreset)!;
		return { chairId, doctorId: docId, doctorName, doctorSpecialty: specialty, shiftPreset, shiftLabel: preset.label, shiftHours: preset.hours, startHour: preset.startHour, endHour: preset.endHour, subShifts: [morningSubShift] };
	}

	if (shiftPreset === "evening" || shiftPreset === "evening_15") {
		const isE15 = shiftPreset === "evening_15";
		const startHour = isE15 ? 15 : 14;
		const endHour = isE15 ? 21 : 20;
		const hoursLabel = isE15 ? "15:00–21:00" : "14:00–20:00";
		const existing = effectiveChairAssignments[chairId];
		const existingMorn = existing?.shiftPreset === (isE15 ? "morning_9" : "morning")
			? { doctorId: existing.doctorId, doctorName: existing.doctorName, doctorSpecialty: existing.doctorSpecialty, startHour: isE15 ? 9 : 8, endHour: isE15 ? 15 : 14, shiftHours: isE15 ? "09:00–15:00" : "08:00–14:00" }
			: existing?.subShifts?.find((s) => s.startHour < (isE15 ? 15 : 14));
		const eveningSubShift: ChairDoctorSubShift = { doctorId: docId, doctorName, doctorSpecialty: specialty, startHour, endHour, shiftHours: hoursLabel };

		if (existingMorn && existingMorn.doctorId) {
			return {
				chairId, doctorId: existingMorn.doctorId,
				doctorName: `${formatDoctorShortName(existingMorn.doctorName)} / ${formatDoctorShortName(doctorName)}`,
				doctorSpecialty: existingMorn.doctorSpecialty || specialty, shiftPreset: "custom",
				shiftLabel: `${isE15 ? "1 см" : "Утро"}: ${formatDoctorShortName(existingMorn.doctorName)} · ${isE15 ? "2 см" : "Вечер"}: ${formatDoctorShortName(doctorName)}`,
				shiftHours: `${existingMorn.shiftHours} & ${hoursLabel}`, startHour: existingMorn.startHour || (isE15 ? 9 : 8), endHour,
				subShifts: [existingMorn, eveningSubShift],
			};
		}
		const preset = CHAIR_SHIFT_PRESETS.find((p) => p.id === shiftPreset)!;
		return { chairId, doctorId: docId, doctorName, doctorSpecialty: specialty, shiftPreset, shiftLabel: preset.label, shiftHours: preset.hours, startHour: preset.startHour, endHour: preset.endHour, subShifts: [eveningSubShift] };
	}

	const preset = CHAIR_SHIFT_PRESETS.find((p) => p.id === shiftPreset) || CHAIR_SHIFT_PRESETS[2]!;
	return {
		chairId, doctorId: docId, doctorName, doctorSpecialty: specialty, shiftPreset,
		shiftLabel: preset.label, shiftHours: preset.hours, startHour: preset.startHour, endHour: preset.endHour,
		subShifts: [{ doctorId: docId, doctorName, doctorSpecialty: specialty, startHour: preset.startHour, endHour: preset.endHour, shiftHours: preset.hours }],
	};
}
