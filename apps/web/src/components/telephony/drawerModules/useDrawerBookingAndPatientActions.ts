import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import { useTelephonyStore } from "../../../store/telephonyStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { showToast } from "../../GlobalToast";
import type { QuickSlotType } from "../IncomingCallQuickBooking";
import { useDrawerConfirmationActions } from "./useDrawerConfirmationActions";
import { useDrawerPatientIntake } from "./useDrawerPatientIntake";

export function useDrawerBookingAndPatientActions(params: {
	currentCall: any; callData: any; dashboard: any; ctx: any;
	handleClose: () => void; isCallAnswered: boolean;
}) {
	const { currentCall, callData, dashboard, ctx, handleClose } = params;
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const answerCall = useTelephonyStore((s) => s.answerCall);
	const connectCall = useTelephonyStore((s) => s.connectCall);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const currentView = useAppStore((s) => s.currentView);
	const setNewAppointmentDraft = useScheduleStore((s) => s.setNewAppointmentDraft);

	const intake = useDrawerPatientIntake({ currentCall, callData, ctx });
	const { smsCopied, handleSendWhatsAppConfirmation, handleCopySmsConfirmation } =
		useDrawerConfirmationActions({ currentCall, callData, dashboard });

	const handleOpenFullPatientView = () => {
		if (currentView === "visit") {
			showToast("Приём пациента активен. Карта доступна в текущей шторке без сброса визита.", "warning");
			return;
		}
		if (callData.resolvedPatient) {
			setSelectedPatientId(callData.resolvedPatient.id);
			setCurrentView("patients");
			if (activeCall && activeCall.status === "ringing") connectCall();
			showToast(`Открыта карта: ${callData.resolvedPatient.fullName}`, "info");
		} else if (currentCall?.phone) {
			setNewPatientPhone(currentCall.phone);
			setCurrentView("patients");
			if (activeCall && activeCall.status === "ringing") connectCall();
			showToast(`Регистрация нового пациента с номером ${callData.formattedPhone}`, "info");
		}
		handleClose();
	};

	const handleQuickBook = (slotType: QuickSlotType) => {
		const todayIso = dashboard?.todayIso || new Date().toISOString().split("T")[0]!;
		const defaultDoctorId = dashboard?.clinicSettings?.staff?.find((s: any) => s.role === "doctor")?.id || "";
		const defaultChairId = dashboard?.clinicSettings?.chairs?.[0]?.id || "";
		let targetDate = todayIso;
		const startTime = slotType === "today_urgent" ? "10:00:00" : slotType === "tomorrow" ? "11:00:00" : "14:30:00";
		const endTime = slotType === "today_urgent" ? "10:30:00" : slotType === "tomorrow" ? "11:30:00" : "15:00:00";
		const reason = slotType === "today_urgent" ? "Острая боль / Экстренный приём" : slotType === "tomorrow" ? "Плановый визит по звонку" : "Первичная консультация и диагностика";
		if (slotType === "tomorrow") {
			const d = new Date(todayIso); d.setDate(d.getDate() + 1); targetDate = d.toISOString().split("T")[0]!;
		}

		if (callData.resolvedPatient) {
			setSelectedPatientId(callData.resolvedPatient.id);
			setNewAppointmentDraft({
				patientId: callData.resolvedPatient.id, doctorUserId: defaultDoctorId, assistantUserId: "",
				chairId: defaultChairId, startsAt: `${targetDate}T${startTime}`, endsAt: `${targetDate}T${endTime}`,
				status: "planned", reason, comment: `Запись по входящему звонку (${callData.formattedPhone})`,
			});
		} else if (currentCall?.phone) {
			setNewPatientPhone(currentCall.phone);
			setNewAppointmentDraft({
				patientId: "", doctorUserId: defaultDoctorId, assistantUserId: "",
				chairId: defaultChairId, startsAt: `${targetDate}T${startTime}`, endsAt: `${targetDate}T${endTime}`,
				status: "planned", reason, comment: `Новый пациент с телефона ${callData.formattedPhone}`,
			});
		}

		const slotInfo = {
			patientId: callData.resolvedPatient?.id || null,
			patientName: callData.resolvedPatient?.fullName || (callData.callerName && callData.callerName !== "Неизвестный номер" ? callData.callerName : ""),
			patientPhone: currentCall?.phone || "", doctorUserId: defaultDoctorId || null, chairId: defaultChairId || null,
			startsAt: `${targetDate}T${startTime}`, endsAt: `${targetDate}T${endTime}`, reason, isCitoEmergency: slotType === "today_cito",
		};
		useScheduleStore.getState().setPendingStageBooking(slotInfo);
		if (typeof window !== "undefined") {
			try { window.dispatchEvent(new CustomEvent("dente-book-stage-appointment", { detail: slotInfo })); } catch {}
		}
		if (activeCall && activeCall.status === "ringing") answerCall();
		if (useAppStore.getState().currentView !== "schedule") useAppStore.getState().setCurrentView("schedule");
		useUiSurfaceStore.getState().openDrawer("quick_booking");
		showToast(`Создана запись: ${callData.isKnownPatient ? callData.resolvedPatient?.fullName : callData.formattedPhone} (${reason})`, "info");
	};

	return {
		newPatientNameInput: intake.newPatientNameInput, setNewPatientNameInput: intake.setNewPatientNameInput,
		isCreatingPatient: intake.isCreatingPatient, isCapturingLead: intake.isCapturingLead, smsCopied,
		handleSendWhatsAppConfirmation, handleCopySmsConfirmation, handleOpenFullPatientView,
		handleQuickBook, handleQuickCreatePatient: intake.handleQuickCreatePatient, handleCaptureLead: intake.handleCaptureLead,
	};
}
