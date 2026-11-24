import { generateUuidV7, type Appointment } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { clientLogger } from "../../../services/logging/clientLogger";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { playIntercomChime } from "../../../lib/intercomSound";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";

export async function openVisitWithBackendSync(
	appointment: Appointment,
	appointmentPatient: { id?: string | null | undefined } | null | undefined,
	onOpenVisit?: (() => void) | null | undefined,
): Promise<void> {
	const pid = appointmentPatient?.id || appointment.patientId;
	if (pid) {
		usePatientStore.getState().setSelectedPatientId(pid);
	}
	if (appointment.id) {
		try {
			const res = await fetch(
				`/api/appointments/${encodeURIComponent(appointment.id)}/visit`,
				{
					method: "POST",
					headers: denteClinicalMutationHeaders({
						"Idempotency-Key": generateUuidV7(),
					}),
				},
			);
			if (res.ok) {
				const data = await res.json();
				if (data?.visit) {
					useAppStore.setState((state) => ({
						dashboard: state.dashboard
							? { ...state.dashboard, activeVisit: data.visit }
							: state.dashboard,
					}));
				}
			}
		} catch (err) {
			clientLogger.warn("network fallback", err, { module: "openVisitWithBackendSync" });
		}
	}
	if (typeof window !== "undefined") {
		window.location.hash = "#visit";
	}
	if (onOpenVisit) {
		onOpenVisit();
	} else {
		useAppStore.getState().setCurrentView("visit");
	}
}

export async function handleStartTreatmentAndOpenVisit(
	appointment: Appointment,
	appointmentPatient: { id?: string | null | undefined } | null | undefined,
	handleQuickStatusChange: (status: Appointment["status"]) => Promise<void> | void,
	onOpenVisit?: (() => void) | null | undefined,
): Promise<void> {
	playIntercomChime("normal");
	void handleQuickStatusChange("in_treatment");
	await openVisitWithBackendSync(appointment, appointmentPatient, onOpenVisit);
	showToast("Пациент в кресле: открыта медицинская карта", "success");
}
