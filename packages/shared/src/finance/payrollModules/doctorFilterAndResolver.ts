/**
 * packages/shared/src/finance/payrollModules/doctorFilterAndResolver.ts
 * Filters services by doctor and resolves specialty presets.
 * Mandate 8b: <= 120 lines.
 */

import type { DoctorCompletedServiceItem } from "./payrollTypes.js";
import type { DoctorSpecialtyCommissionRule } from "./payrollPresetTypes.js";
import { DOCTOR_SPECIALTY_PAYROLL_PRESETS } from "./doctorSpecialtyPresets.js";

export function splitVisitServicesByDoctor(
	services: readonly DoctorCompletedServiceItem[],
	fallbackDoctorId?: string
): Map<string, DoctorCompletedServiceItem[]> {
	const map = new Map<string, DoctorCompletedServiceItem[]>();
	for (const service of services) {
		const targetDoctorId = service.performerId ?? service.doctorId ?? fallbackDoctorId ?? "unassigned";
		const list = map.get(targetDoctorId) ?? [];
		list.push(service);
		map.set(targetDoctorId, list);
	}
	return map;
}

export function filterServicesForDoctor(
	services: readonly DoctorCompletedServiceItem[],
	doctorId: string
): DoctorCompletedServiceItem[] {
	return services.filter((srv) => {
		const assigned = srv.performerId ?? srv.doctorId;
		return !assigned || assigned === doctorId;
	});
}

const SPECIALTY_ALIAS_MAP: Record<string, string> = {
	therapy: "therapist",
	orthopedics: "orthopedist",
	surgery: "surgeon_implantologist",
	hygiene: "hygienist",
	pediatric: "pediatric_dentist",
	"solo-doctor": "general_dentist",
	solo_rental: "solo_practitioner",
};

export function resolveDoctorPreset(specialtyId: string): DoctorSpecialtyCommissionRule {
	const defaultPreset =
		DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "general_dentist") ??
		DOCTOR_SPECIALTY_PAYROLL_PRESETS[0]!;

	const normalizedSpecialty = SPECIALTY_ALIAS_MAP[specialtyId] ?? specialtyId;

	return (
		DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === normalizedSpecialty) ??
		DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === specialtyId) ??
		defaultPreset
	);
}
