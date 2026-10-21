import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import { showToast } from "../../GlobalToast";
import type { PatientHeaderQuickActionsProps } from "./patientHeaderTypes";

export function usePatientQuickActions({
	resolvedPatient,
	fullName,
}: Pick<PatientHeaderQuickActionsProps, "resolvedPatient" | "fullName">) {
	const handleOpenVisit = () => {
		if (!resolvedPatient?.id) return;
		usePatientStore.getState().setSelectedPatientId(resolvedPatient.id);
		useAppStore.getState().setCurrentView("visit");
		showToast(`Открыт приём: ${fullName}`, "success");
	};

	const handleBookAppointment = () => {
		if (!resolvedPatient?.id) return;
		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, "0");
		const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
		const currentHour = now.getHours();
		const startHour = Math.min(Math.max(currentHour + 1, 9), 20);
		const endHour = Math.min(startHour + 1, 21);
		const startsAt = `${todayIso}T${pad(startHour)}:00:00.000Z`;
		const endsAt = `${todayIso}T${pad(endHour)}:00:00.000Z`;

		useScheduleStore.getState().setNewAppointmentDraft({
			patientId: resolvedPatient.id,
			doctorUserId: "",
			assistantUserId: "",
			chairId: "",
			status: "planned",
			startsAt,
			endsAt,
			reason: "Консультация и осмотр",
			comment: "",
		});
		useAppStore.getState().setCurrentView("schedule");
		showToast(`Пациент ${fullName} выбран для записи в расписание`, "success");
	};

	return {
		handleOpenVisit,
		handleBookAppointment,
	};
}
