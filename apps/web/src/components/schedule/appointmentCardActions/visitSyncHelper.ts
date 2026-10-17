import type { Appointment } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { playIntercomChime } from "../../../lib/intercomSound";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";

export async function openVisitWithBackendSync(
	appointment: Appointment,
	appointmentPatient: any,
	onOpenVisit?: () => void,
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
					headers: denteAdminSecretRequestHeaders(),
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
			console.warn("[openVisitWithBackendSync] network fallback:", err);
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
	appointmentPatient: any,
	handleQuickStatusChange: (status: Appointment["status"]) => Promise<void>,
	onOpenVisit?: () => void,
): Promise<void> {
	playIntercomChime("normal");
	void handleQuickStatusChange("in_treatment");
	await openVisitWithBackendSync(appointment, appointmentPatient, onOpenVisit);
	showToast("Пациент в кресле: открыта медицинская карта", "success");
}
