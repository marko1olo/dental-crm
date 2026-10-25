import type { Patient } from "@dental/shared";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import type { AppView } from "../../../utils/routeUtils";
import { showToast } from "../../GlobalToast";

export function executeOpenPatientVisitAutonomy({
	selectedPatient,
	setSelectedPatientId = (id: string) => usePatientStore.getState().setSelectedPatientId(id),
	setCurrentView = (view: AppView) => useAppStore.getState().setCurrentView(view),
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	visitId?: string;
	setSelectedPatientId?: (id: string) => void;
	setCurrentView?: (view: AppView) => void;
	showToastFn?: (text: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
}) {
	if (!selectedPatient) {
		showToastFn("Выберите пациента из списка слева для открытия приёма", "info");
		return { executed: false, reason: "no_patient" as const };
	}
	setSelectedPatientId(selectedPatient.id);
	setCurrentView("visit");
	showToastFn(`Открыт приём: ${selectedPatient.fullName}`, "success");
	return { executed: true, reason: "visit_opened" as const };
}

export function executeBookPatientAppointmentAutonomy({
	selectedPatient,
	setNewAppointmentDraft = (draft: any) => useScheduleStore.getState().setNewAppointmentDraft(draft),
	setCurrentView = (view: AppView) => useAppStore.getState().setCurrentView(view),
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	setNewAppointmentDraft?: (draft: any) => void;
	setCurrentView?: (view: AppView) => void;
	showToastFn?: (text: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
}) {
	if (!selectedPatient) {
		showToastFn("Выберите пациента из списка слева для записи в расписание", "info");
		return { executed: false, reason: "no_patient" as const };
	}
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const currentHour = now.getHours();
	const startHour = Math.min(Math.max(currentHour + 1, 9), 20);
	const endHour = Math.min(startHour + 1, 21);
	const startsAt = `${todayIso}T${pad(startHour)}:00:00.000Z`;
	const endsAt = `${todayIso}T${pad(endHour)}:00:00.000Z`;

	setNewAppointmentDraft({
		patientId: selectedPatient.id,
		doctorUserId: "",
		assistantUserId: "",
		chairId: "",
		status: "planned",
		startsAt,
		endsAt,
		reason: "Первичный приём и консультация",
		comment: "",
	});
	setCurrentView("schedule");
	showToastFn(`Пациент ${selectedPatient.fullName} выбран для записи в расписание`, "success");
	return { executed: true, reason: "appointment_drafted" as const };
}
