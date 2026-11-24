import type { Dashboard } from "@dental/shared";
import type { IncomingCallPayload } from "../../../store/telephonyTypes";
import type { UseIncomingCallDataResult } from "../useIncomingCallData";
import type { AppLogicContextType } from "../../../contexts/AppLogicContext";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import { useTelephonyStore } from "../../../store/telephonyStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { showToast } from "../../GlobalToast";
import { computeQuickBookingSlots, type QuickSlotType } from "../IncomingCallQuickBooking";
import {
	QUICK_BOOKING_REASON_BY_SLOT,
	QUICK_BOOKING_TOAST_LABEL_BY_SLOT,
} from "../incomingCallPopupModules/incomingCallConstants";
import { buildQuickBookingComment } from "../incomingCallPopupModules/incomingCallUtils";
import { useDrawerConfirmationActions } from "./useDrawerConfirmationActions";
import { useDrawerPatientIntake } from "./useDrawerPatientIntake";

export function useDrawerBookingAndPatientActions(params: {
	currentCall: IncomingCallPayload | null;
	callData: UseIncomingCallDataResult;
	dashboard: Dashboard | null | undefined;
	ctx: AppLogicContextType | null | undefined;
	handleClose: () => void;
	isCallAnswered: boolean;
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
		const { slots: quickSlots, getSlotInterval } = computeQuickBookingSlots(
			dashboard,
			callData.resolvedPatient?.id,
		);
		const { startsAt, endsAt } = getSlotInterval(slotType);

		const defaultDoctorId =
			dashboard?.clinicSettings?.staff?.find((s) => s.active && (s.role === "doctor" || s.role === "owner"))?.id ||
			dashboard?.clinicSettings?.staff?.find((s) => s.role === "doctor" || s.role === "owner")?.id ||
			dashboard?.clinicSettings?.staff?.[0]?.id ||
			"";
		const defaultChairId =
			dashboard?.clinicSettings?.chairs?.find((c) => c.active)?.id ||
			dashboard?.clinicSettings?.chairs?.[0]?.id ||
			"";

		const reason =
			QUICK_BOOKING_REASON_BY_SLOT[slotType] ||
			(slotType === "today_urgent"
				? "Острая боль / Экстренный приём"
				: slotType === "tomorrow"
				? "Плановый визит по звонку"
				: "Первичная консультация и диагностика");

		const comment = buildQuickBookingComment(slotType, callData.formattedPhone);

		if (callData.resolvedPatient) {
			setSelectedPatientId(callData.resolvedPatient.id);
			setNewAppointmentDraft({
				patientId: callData.resolvedPatient.id,
				doctorUserId: defaultDoctorId,
				assistantUserId: "",
				chairId: defaultChairId,
				startsAt,
				endsAt,
				status: "planned",
				reason,
				comment,
				notes: comment,
			});
		} else if (currentCall?.phone) {
			setNewPatientPhone(currentCall.phone);
			setNewAppointmentDraft({
				patientId: null,
				doctorUserId: defaultDoctorId,
				assistantUserId: "",
				chairId: defaultChairId,
				startsAt,
				endsAt,
				status: "planned",
				reason,
				comment,
				notes: comment,
			});
		}

		const slotInfo = {
			patientId: callData.resolvedPatient?.id || null,
			patientName:
				callData.resolvedPatient?.fullName ||
				(callData.callerName && callData.callerName !== "Неизвестный номер" ? callData.callerName : ""),
			patientPhone: currentCall?.phone || "",
			doctorUserId: defaultDoctorId || null,
			chairId: defaultChairId || null,
			startsAt,
			endsAt,
			reason,
			isCitoEmergency: slotType === "today_cito",
		};
		useScheduleStore.getState().setPendingStageBooking(slotInfo);
		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(new CustomEvent("dente-book-stage-appointment", { detail: slotInfo }));
			} catch (dispatchErr) {
				console.warn("[TelephonyDrawer] Ошибка отправки события dente-book-stage-appointment:", dispatchErr);
			}
		}
		if (activeCall && activeCall.status === "ringing") answerCall();
		if (useAppStore.getState().currentView !== "schedule") useAppStore.getState().setCurrentView("schedule");
		useUiSurfaceStore.getState().openDrawer("quick_booking");

		// 1-Click instant schedule reservation: record booked outcome in CTI store
		useTelephonyStore.getState().recordCallOutcome("booked");

		const targetSlot = quickSlots.find((s) => s.type === slotType);
		const slotLabel = targetSlot?.title || QUICK_BOOKING_TOAST_LABEL_BY_SLOT[slotType] || "Слот зарезервирован";
		showToast(`Создана запись: ${slotLabel}. Слот зарезервирован в расписании.`, "success");
	};

	return {
		newPatientNameInput: intake.newPatientNameInput, setNewPatientNameInput: intake.setNewPatientNameInput,
		isCreatingPatient: intake.isCreatingPatient, isCapturingLead: intake.isCapturingLead, smsCopied,
		handleSendWhatsAppConfirmation, handleCopySmsConfirmation, handleOpenFullPatientView,
		handleQuickBook, handleQuickCreatePatient: intake.handleQuickCreatePatient, handleCaptureLead: intake.handleCaptureLead,
	};
}
