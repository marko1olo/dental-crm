import type { Chair, DentalSpecialty, StaffMember } from "@dental/shared";
import { specialtyLabels } from "../../../../workspaceUiLabels";
import type { ChairDoctorShiftAssignment } from "../gridTypes";

export function computeEffectiveChairAssignments(
	effectiveChairs: Chair[],
	doctors: StaffMember[],
	isSoloDoctor: boolean,
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined,
	localChairAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined,
): Record<string, ChairDoctorShiftAssignment> {
	const assignments: Record<string, ChairDoctorShiftAssignment> = {
		...(chairDoctorAssignments || {}),
		...(localChairAssignments || {}),
	};

	for (const chair of effectiveChairs) {
		if (
			assignments[chair.id]?.doctorId === "" ||
			(assignments[chair.id] as { unassigned?: boolean })?.unassigned
		) {
			continue;
		}
		if (!assignments[chair.id]) {
			const chairDefaultDocId = (chair as { defaultDoctorId?: string })?.defaultDoctorId;
			const defaultDoc = chairDefaultDocId
				? doctors.find((d) => d.id === chairDefaultDocId)
				: isSoloDoctor && doctors.length >= 1
					? doctors[0]
					: null;

			if (defaultDoc) {
				const specialty =
					defaultDoc.specialties && defaultDoc.specialties.length > 0
						? specialtyLabels[defaultDoc.specialties[0] as DentalSpecialty] ||
							defaultDoc.specialties[0]
						: defaultDoc.role === "doctor"
							? "Стоматолог"
							: "";
				assignments[chair.id] = {
					chairId: chair.id,
					doctorId: defaultDoc.id,
					doctorName: defaultDoc.fullName,
					doctorSpecialty: specialty,
					shiftPreset: "full",
					shiftLabel: chairDefaultDocId ? "Основной врач" : "Полный день",
					shiftHours: "08:00–20:00",
					startHour: 8,
					endHour: 20,
				};
			}
		}
	}

	return assignments;
}
