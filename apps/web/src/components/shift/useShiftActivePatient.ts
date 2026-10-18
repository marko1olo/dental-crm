import { useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import { NIL_UUID } from "./shiftPrintStatements";

export interface UseShiftActivePatientParams {
	dashboard?: Dashboard | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: patient map
	patientsById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: appointment
	inChairAppointment: any;
}

export function useShiftActivePatient({ dashboard, patientsById, inChairAppointment }: UseShiftActivePatientParams) {
	const currentPatient = useMemo(() => {
		const visit = dashboard?.activeVisit;
		if (visit?.id && visit.id !== NIL_UUID && visit.patientId && visit.patientId !== NIL_UUID && visit.status === "draft") {
			const p = patientsById.get(visit.patientId ?? "");
			if (p) return p;
		}

		if (inChairAppointment?.patientId && inChairAppointment.patientId !== NIL_UUID) {
			const p = patientsById.get(inChairAppointment.patientId ?? "");
			if (p) return p;
			// biome-ignore lint/suspicious/noExplicitAny: patient
			const inChairAny = inChairAppointment as any;
			if (inChairAny?.patient) return inChairAny.patient;
			if (inChairAny?.patientFullName) {
				return { id: inChairAppointment.patientId, fullName: inChairAny.patientFullName, phone: inChairAny.patientPhone ?? "" };
			}
		}

		return null;
	}, [dashboard?.activeVisit, inChairAppointment, patientsById]);

	const currentPatientCallablePhone = (currentPatient?.phone ?? "").trim().replace(/[^\d+]/g, "");
	const currentPatientHasCallablePhone = currentPatientCallablePhone.length >= 5;

	const currentAppointmentReason = useMemo(() => {
		if (!inChairAppointment) return "";
		// biome-ignore lint/suspicious/noExplicitAny: appointment
		const appAny = inChairAppointment as any;
		return (
			inChairAppointment.reason ||
			appAny.treatmentDescription ||
			appAny.serviceTitle ||
			appAny.complaint ||
			appAny.complaints ||
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
