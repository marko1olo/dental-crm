import { realVisitFieldId } from "../visitIdentity";
import { resolveValidVisitUuid } from "./visitOdontogramResolve";
import type {
	VisitOdontogramTabPatient,
	VisitOdontogramTabAppointment,
	VisitOdontogramTabDashboard,
} from "./visitOdontogramTabTypes";

interface UseVisitOdontogramIdsParams {
	activePatient?: VisitOdontogramTabPatient | null | undefined;
	activeAppointment?: VisitOdontogramTabAppointment | null | undefined;
	dashboard?: VisitOdontogramTabDashboard | null | undefined;
}

export function useVisitOdontogramIds({
	activePatient,
	activeAppointment,
	dashboard,
}: UseVisitOdontogramIdsParams) {
	const activeVisit = dashboard?.activeVisit ?? null;
	const openVisitId = realVisitFieldId(
		activeVisit && typeof activeVisit === "object"
			? (activeVisit as { id?: unknown }).id
			: null,
	);
	const openVisitAppointmentId = realVisitFieldId(
		activeVisit && typeof activeVisit === "object"
			? (activeVisit as { appointmentId?: unknown }).appointmentId
			: null,
	);
	const appointmentId = realVisitFieldId(activeAppointment?.id);

	const resolvedId = resolveValidVisitUuid(openVisitId, openVisitAppointmentId, appointmentId);
	const diaryVisitId = resolvedId ?? appointmentId ?? (activePatient?.id ? `visit-${activePatient.id}` : null);
	const diaryPatientId =
		realVisitFieldId(
			activeVisit && typeof activeVisit === "object"
				? (activeVisit as { patientId?: unknown }).patientId
				: null,
		) ?? realVisitFieldId(activePatient?.id);

	return {
		openVisitId: openVisitId ?? diaryVisitId,
		appointmentId,
		diaryVisitId,
		diaryPatientId,
	};
}
