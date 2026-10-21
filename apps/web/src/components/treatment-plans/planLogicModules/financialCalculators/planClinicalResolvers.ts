import type { ToothData, TreatmentPlanDoctorOption, TreatmentPlanStage } from "../types.js";

export function resolveDoctorOptions(staffRaw: any[] | undefined): readonly TreatmentPlanDoctorOption[] {
	const staff = staffRaw ?? [];
	const activeStaff = staff.filter(
		(s) =>
			s.active !== false &&
			(s.role === "doctor" ||
				s.role === "owner" ||
				s.role === "therapist" ||
				s.role === "surgeon" ||
				s.role === "orthopedist" ||
				s.role === "orthodontist"),
	);
	if (activeStaff.length > 0) {
		return activeStaff.map((s) => ({
			id: s.id,
			fullName: s.name || s.fullName || "Врач-стоматолог",
			role: s.role,
			specialty: Array.isArray(s.specialties)
				? s.specialties.join(", ")
				: s.specialty || (s.role === "doctor" ? "Стоматолог" : s.role),
		}));
	}
	return [
		{ id: "doc-therapist-1", fullName: "Д-р Смирнова Е.А.", role: "doctor", specialty: "Терапевт" },
		{ id: "doc-surgeon-1", fullName: "Д-р Барабаш С.В.", role: "doctor", specialty: "Хирург-имплантолог" },
		{ id: "doc-orthopedist-1", fullName: "Д-р Ковалев В.Н.", role: "doctor", specialty: "Ортопед" },
		{ id: "doc-orthodontist-1", fullName: "Д-р Мельникова А.В.", role: "doctor", specialty: "Ортодонт" },
	];
}

export function resolveOrthopedicTeeth(
	stages: readonly TreatmentPlanStage[],
	effectiveTeethData: readonly ToothData[] | undefined,
): number[] {
	const teethFromStages = stages
		.filter((s) => s.stageKind === "stage_3_orthopedics" || s.stageNumber === 3)
		.flatMap((s) => s.items)
		.map((it) => it.toothNumber)
		.filter((t): t is number => typeof t === "number" && t > 0);

	if (teethFromStages.length > 0) {
		return Array.from(new Set(teethFromStages)).sort((a, b) => a - b);
	}

	const teethFromOdontogram = (effectiveTeethData || [])
		.filter((t) => {
			const s = String(t.state || "").toLowerCase();
			return (
				s.includes("crown") ||
				s.includes("bridge") ||
				s.includes("denture") ||
				s.includes("implant") ||
				Boolean((t as any).isCrown) ||
				Boolean((t as any).isBridge)
			);
		})
		.map((t) => (t as any).toothNumber ?? (t as any).id)
		.filter((id): id is number => typeof id === "number" && id > 0);

	if (teethFromOdontogram.length > 0) {
		return Array.from(new Set(teethFromOdontogram)).sort((a, b) => a - b);
	}

	return [21];
}

export function formatPlanContractNumber(patientId: string): string {
	return `D-${new Date().getFullYear()}-${patientId.slice(0, 6).toUpperCase()}`;
}
