import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import { type CallHistoryItem, type PatientRecord } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import { initiateOutboundCall } from "../initiateOutboundCall";

export function useDrawerLogActions(params: { dashboard: any; handleClose: () => void }) {
	const { dashboard, handleClose } = params;
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const currentView = useAppStore((s) => s.currentView);
	const setNewAppointmentDraft = useScheduleStore((s) => s.setNewAppointmentDraft);

	const handleCallbackFromLog = (item: CallHistoryItem) => {
		void initiateOutboundCall({
			phone: item.phone,
			patientId: item.patientId || null,
			patientName: item.patientName || undefined,
		});
	};

	const handleQuickBookFromLog = (item: CallHistoryItem, matched: PatientRecord | null) => {
		if (matched) setSelectedPatientId(matched.id);
		else setNewPatientPhone(item.phone);

		const todayIso = dashboard?.todayIso || new Date().toISOString().split("T")[0]!;
		const defaultDoctorId = dashboard?.clinicSettings?.staff?.find((s: any) => s.role === "doctor")?.id || "";
		const defaultChairId = dashboard?.clinicSettings?.chairs?.[0]?.id || "";

		setNewAppointmentDraft({
			patientId: matched?.id || "",
			doctorUserId: defaultDoctorId,
			assistantUserId: "",
			chairId: defaultChairId,
			startsAt: `${todayIso}T12:00:00`,
			endsAt: `${todayIso}T12:30:00`,
			status: "planned",
			reason: "Запись по журналу звонков",
			comment: `Звонок: ${item.phone}`,
		});

		if (currentView !== "visit") setCurrentView("schedule");
		handleClose();
		showToast(`Создан черновик записи для ${matched?.fullName || item.phone}`, "success");
	};

	const handleOpenPatientFromLog = (item: CallHistoryItem, matched: PatientRecord | null) => {
		if (matched) {
			setSelectedPatientId(matched.id);
			if (currentView !== "visit") setCurrentView("patients");
			handleClose();
			showToast(`Открыта карта: ${matched.fullName}`, "info");
		} else {
			handleCallbackFromLog(item);
		}
	};

	return { handleQuickBookFromLog, handleCallbackFromLog, handleOpenPatientFromLog };
}
