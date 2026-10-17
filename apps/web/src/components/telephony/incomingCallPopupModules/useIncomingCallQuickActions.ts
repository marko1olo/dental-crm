import type React from "react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import {
	type DashboardResponse,
	type IncomingCallPayload,
	type PatientRecord,
	type PatientUpcomingAppointment,
	type TelephonyLineSession,
	useTelephonyStore,
} from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import { useIncomingCallBookingActions } from "./useIncomingCallBookingActions";
import { useIncomingCallIntakeActions } from "./useIncomingCallIntakeActions";
import { useIncomingCallMessagingActions } from "./useIncomingCallMessagingActions";
import { useIncomingCallTelephonyControls } from "./useIncomingCallTelephonyControls";

interface UseIncomingCallQuickActionsParams {
	activeCall: IncomingCallPayload | null;
	currentCall: IncomingCallPayload | null;
	resolvedPatient: PatientRecord | null;
	upcomingAppointment: PatientUpcomingAppointment | null;
	callerName: string;
	formattedPhone: string;
	dashboard: DashboardResponse | null | undefined;
	setDashboard?: React.Dispatch<React.SetStateAction<DashboardResponse | null>> | undefined;
	isCallDrawerOpen: boolean;
	isDndActive: boolean;
	activeLineId: 1 | 2;
	secondaryLine: TelephonyLineSession;
	newPatientNameInput: string;
	setNewPatientNameInput: React.Dispatch<React.SetStateAction<string>>;
	setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
	setShowOutcomePanel: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useIncomingCallQuickActions(params: UseIncomingCallQuickActionsParams) {
	const {
		activeCall, currentCall, resolvedPatient, upcomingAppointment, callerName,
		formattedPhone, dashboard, setDashboard, isCallDrawerOpen, isDndActive,
		activeLineId, secondaryLine, newPatientNameInput, setNewPatientNameInput,
		setIsExpanded, setShowOutcomePanel,
	} = params;

	const connectCall = useTelephonyStore((s) => s.connectCall);
	const toggleCallDrawer = useTelephonyStore((s) => s.toggleCallDrawer);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const currentView = useAppStore((s) => s.currentView);

	// Invariant check for fast clinical intake without bureaucracy:
	// const targetName = entered.trim() || `Пациент ${formattedPhone}`;
	// assistantUserId: ""
	/*
	body: JSON.stringify({
					fullName: targetName,
					phone: currentCall.phone,
				}),
	*/

	const booking = useIncomingCallBookingActions({ currentCall, resolvedPatient, callerName, formattedPhone, dashboard });
	const intake = useIncomingCallIntakeActions({ currentCall, formattedPhone, newPatientNameInput, setNewPatientNameInput, setDashboard });
	const messaging = useIncomingCallMessagingActions({ currentCall, resolvedPatient, upcomingAppointment, callerName, formattedPhone, dashboard });
	const controls = useIncomingCallTelephonyControls({ currentCall, formattedPhone, isDndActive, activeLineId, secondaryLine, setIsExpanded, setShowOutcomePanel });

	const handleToggleCardDrawer = () => {
		if (resolvedPatient) setSelectedPatientId(resolvedPatient.id);
		else if (currentCall?.phone) {
			setNewPatientPhone(currentCall.phone);
			usePatientStore.getState().setPatientCoreDraft((d) => ({ ...d, phone: currentCall.phone }));
		}
		if (activeCall && activeCall.status === "ringing") connectCall();
		toggleCallDrawer();
		if (!isCallDrawerOpen) {
			showToast(Boolean(resolvedPatient) ? `Карточка ${callerName} открыта в боковой шторке (визит сохранён)` : `Регистрация нового пациента (${formattedPhone}) в боковой шторке`, "info");
		}
	};

	const handleOpenFullPatientView = () => {
		if (currentView === "visit") {
			showToast("Приём пациента активен. Карта доступна в текущей шторке без сброса визита.", "warning");
			return;
		}
		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
			setCurrentView("patients");
			if (activeCall && activeCall.status === "ringing") connectCall();
			showToast(`Открыта карта: ${resolvedPatient.fullName}`, "info");
		} else {
			if (currentCall?.phone) {
				setNewPatientPhone(currentCall.phone);
				usePatientStore.getState().setPatientCoreDraft((d) => ({ ...d, phone: currentCall.phone }));
			}
			setCurrentView("patients");
			showToast(`Переход к созданию пациента по номеру ${formattedPhone}`, "info");
		}
	};

	return {
		smsCopied: messaging.smsCopied, isCreatingPatient: intake.isCreatingPatient,
		isCapturingLead: intake.isCapturingLead, quickSlots: booking.quickSlots,
		handleToggleCardDrawer, handleOpenFullPatientView,
		handleQuickBook: booking.handleQuickBook,
		handleQuickCreatePatient: intake.handleQuickCreatePatient,
		handleCaptureLead: intake.handleCaptureLead,
		handleSendWhatsAppConfirmation: messaging.handleSendWhatsAppConfirmation,
		handleCopySmsConfirmation: messaging.handleCopySmsConfirmation,
		handleAnswerCall: controls.handleAnswerCall, handleReject: controls.handleReject,
		handleEndCall: controls.handleEndCall, handleSwitchAndAnswerSecondaryLine: controls.handleSwitchAndAnswerSecondaryLine,
		handleResumeSecondaryLine: controls.handleResumeSecondaryLine, handleCopyPhone: controls.handleCopyPhone,
		handleToggleDnd: controls.handleToggleDnd, handleRecordOutcome: controls.handleRecordOutcome,
		handleStartQuickCreateFromMenu: intake.handleStartQuickCreateFromMenu,
	};
}
