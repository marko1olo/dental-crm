import { useMemo } from "react";
import type { Dashboard, Patient } from "@dental/shared";
import { NIL_UUID } from "./shiftPrintStatements";

export type ShiftActivePatient = Pick<Patient, "id" | "fullName"> & {
	readonly phone?: string | null | undefined;
};

export interface ShiftActiveInChairAppointment {
	readonly id?: string | undefined;
	readonly patientId?: string | null | undefined;
	readonly reason?: string | null | undefined;
	readonly treatmentDescription?: string | null | undefined;
	readonly serviceTitle?: string | null | undefined;
	readonly complaint?: string | null | undefined;
	readonly complaints?: string | null | undefined;
	readonly patient?: ShiftActivePatient | null | undefined;
	readonly patientFullName?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
}

export interface UseShiftActivePatientParams {
	dashboard?: Dashboard | null | undefined;
	patientsById: ReadonlyMap<string, ShiftActivePatient>;
	inChairAppointment?: ShiftActiveInChairAppointment | null | undefined;
}

export function useShiftActivePatient({ dashboard, patientsById, inChairAppointment }: UseShiftActivePatientParams) {
	const currentPatient = useMemo<ShiftActivePatient | null>(() => {
		const visit = dashboard?.activeVisit;
		if (visit?.id && visit.id !== NIL_UUID && visit.patientId && visit.patientId !== NIL_UUID && visit.status === "draft") {
			const p = patientsById.get(visit.patientId ?? "");
			if (p) return p;
		}

		if (inChairAppointment?.patientId && inChairAppointment.patientId !== NIL_UUID) {
			const p = patientsById.get(inChairAppointment.patientId ?? "");
			if (p) return p;
			if (inChairAppointment.patient) return inChairAppointment.patient;
			if (inChairAppointment.patientFullName) {
				return {
					id: inChairAppointment.patientId,
					fullName: inChairAppointment.patientFullName,
					phone: inChairAppointment.patientPhone ?? "",
				};
			}
		}

		return null;
	}, [dashboard?.activeVisit, inChairAppointment, patientsById]);

	const currentPatientCallablePhone = (currentPatient?.phone ?? "").trim().replace(/[^\d+]/g, "");
	const currentPatientHasCallablePhone = currentPatientCallablePhone.length >= 5;

	const currentAppointmentReason = useMemo(() => {
		if (!inChairAppointment) return "";
		return (
			inChairAppointment.reason ||
			inChairAppointment.treatmentDescription ||
			inChairAppointment.serviceTitle ||
			inChairAppointment.complaint ||
			inChairAppointment.complaints ||
			""
		);
	}, [inChairAppointment]);

	return {
		currentPatient,
		currentPatientCallablePhone,
		currentPatientHasCallablePhone,
		currentAppointmentReason,
	};
}
