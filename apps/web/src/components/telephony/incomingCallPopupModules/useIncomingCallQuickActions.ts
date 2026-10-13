import type React from "react";
import { useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../../lib/safeLocalStorage";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import {
	type CallOutcome,
	type DashboardResponse,
	type IncomingCallPayload,
	type PatientRecord,
	type PatientUpcomingAppointment,
	type TelephonyLineSession,
	generateAppointmentConfirmationMessage,
	openWhatsAppChat,
	useTelephonyStore,
} from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import {
	computeQuickBookingSlots,
	type QuickSlotType,
} from "../IncomingCallQuickBooking";
import { captureLeadFromIncomingCall } from "../telephonyAttribution";
import {
	DEFAULT_CLINIC_BRAND_NAME,
	DEFAULT_DOCTOR_FALLBACK_ID,
	QUICK_BOOKING_REASON_BY_SLOT,
	QUICK_BOOKING_TOAST_LABEL_BY_SLOT,
} from "./incomingCallConstants";
import { buildQuickBookingComment } from "./incomingCallUtils";

interface UseIncomingCallQuickActionsParams {
	activeCall: IncomingCallPayload | null;
	currentCall: IncomingCallPayload | null;
	resolvedPatient: PatientRecord | null;
	upcomingAppointment: PatientUpcomingAppointment | null;
	callerName: string;
	formattedPhone: string;
	dashboard: DashboardResponse | null | undefined;
	setDashboard?:
		| React.Dispatch<React.SetStateAction<DashboardResponse | null>>
		| undefined;
	isCallDrawerOpen: boolean;
	isDndActive: boolean;
	activeLineId: 1 | 2;
	secondaryLine: TelephonyLineSession;
	newPatientNameInput: string;
	setNewPatientNameInput: React.Dispatch<React.SetStateAction<string>>;
	setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
	setShowOutcomePanel: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useIncomingCallQuickActions({
	activeCall,
	currentCall,
	resolvedPatient,
	upcomingAppointment,
	callerName,
	formattedPhone,
	dashboard,
	setDashboard,
	isCallDrawerOpen,
	isDndActive,
	activeLineId,
	secondaryLine,
	newPatientNameInput,
	setNewPatientNameInput,
	setIsExpanded,
	setShowOutcomePanel,
}: UseIncomingCallQuickActionsParams) {
	const answerCall = useTelephonyStore((s) => s.answerCall);
	const connectCall = useTelephonyStore((s) => s.connectCall);
	const rejectCall = useTelephonyStore((s) => s.rejectCall);
	const endCall = useTelephonyStore((s) => s.endCall);
	const dismissCall = useTelephonyStore((s) => s.dismissCall);
	const setAgentState = useTelephonyStore((s) => s.setAgentState);
	const closeCallDrawer = useTelephonyStore((s) => s.closeCallDrawer);
	const toggleCallDrawer = useTelephonyStore((s) => s.toggleCallDrawer);
	const recordCallOutcome = useTelephonyStore((s) => s.recordCallOutcome);
	const switchLine = useTelephonyStore((s) => s.switchLine);

	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const currentView = useAppStore((s) => s.currentView);
	const setNewAppointmentDraft = useScheduleStore(
		(s) => s.setNewAppointmentDraft,
	);

	const [smsCopied, setSmsCopied] = useState(false);
	const [isCreatingPatient, setIsCreatingPatient] = useState(false);
	const [isCapturingLead, setIsCapturingLead] = useState(false);

	const handleToggleCardDrawer = () => {
		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
		} else if (currentCall?.phone) {
			setNewPatientPhone(currentCall.phone);
			usePatientStore.getState().setPatientCoreDraft((d) => ({
				...d,
				phone: currentCall.phone,
			}));
		}
		if (activeCall && activeCall.status === "ringing") {
			connectCall();
		}
		toggleCallDrawer();
		const willBeOpen = !isCallDrawerOpen;
		if (willBeOpen) {
			showToast(
				Boolean(resolvedPatient)
					? `Карточка ${callerName} открыта в боковой шторке (визит сохранён)`
					: `Регистрация нового пациента (${formattedPhone}) в боковой шторке`,
				"info",
			);
		}
	};

	const handleOpenFullPatientView = () => {
		if (currentView === "visit") {
			showToast(
				"Приём пациента активен. Карта доступна в текущей шторке без сброса визита.",
				"warning",
			);
			return;
		}
		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
			setCurrentView("patients");
			if (activeCall && activeCall.status === "ringing") {
				connectCall();
			}
			showToast(`Открыта карта: ${resolvedPatient.fullName}`, "info");
		} else {
			if (currentCall?.phone) {
				setNewPatientPhone(currentCall.phone);
				usePatientStore.getState().setPatientCoreDraft((d) => ({
					...d,
					phone: currentCall.phone,
				}));
			}
			setCurrentView("patients");
			showToast(
				`Переход к созданию пациента по номеру ${formattedPhone}`,
				"info",
			);
		}
	};

	const { slots: quickSlots, getSlotInterval } = useMemo(
		() => computeQuickBookingSlots(dashboard, resolvedPatient?.id),
		[dashboard, resolvedPatient?.id],
	);

	const handleQuickBook = (slotType: QuickSlotType = "today_standard") => {
		const defaultDoctorId =
			dashboard?.clinicSettings?.staff?.find(
				(s) => s.active && (s.role === "doctor" || s.role === "owner"),
			)?.id ||
			dashboard?.clinicSettings?.staff?.[0]?.id ||
			DEFAULT_DOCTOR_FALLBACK_ID;
		const defaultChairId =
			dashboard?.clinicSettings?.chairs?.find((c) => c.active)?.id ||
			dashboard?.clinicSettings?.chairs?.[0]?.id ||
			"";

		const { startsAt, endsAt } = getSlotInterval(slotType);
		const comment = buildQuickBookingComment(slotType, formattedPhone);

		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
		} else if (currentCall?.phone) {
			setNewPatientPhone(currentCall.phone);
			usePatientStore.getState().setPatientCoreDraft((d) => ({
				...d,
				phone: currentCall.phone,
			}));
		}

		setNewAppointmentDraft({
			patientId: resolvedPatient?.id || "",
			doctorUserId: defaultDoctorId,
			status: "confirmed",
			chairId: defaultChairId,
			startsAt,
			endsAt,
			reason: QUICK_BOOKING_REASON_BY_SLOT[slotType],
			notes: comment,
			assistantUserId: "",
		});

		const slotInfo = {
			patientId: resolvedPatient?.id || null,
			patientName:
				resolvedPatient?.fullName ||
				(callerName && callerName !== "Неизвестный номер" ? callerName : ""),
			patientPhone: currentCall?.phone || "",
			doctorUserId: defaultDoctorId || null,
			chairId: defaultChairId || null,
			startsAt,
			endsAt,
			reason:
				QUICK_BOOKING_REASON_BY_SLOT[slotType] || "Запись по входящему звонку",
			isCitoEmergency: slotType === "today_cito",
		};
		useScheduleStore.getState().setPendingStageBooking(slotInfo);
		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(
					new CustomEvent("dente-book-stage-appointment", {
						detail: slotInfo,
					}),
				);
			} catch {
				// ignore in non-browser environment
			}
		}

		setCurrentView("schedule");
		closeCallDrawer();
		showToast(
			`Создан черновик записи (${QUICK_BOOKING_TOAST_LABEL_BY_SLOT[slotType]}). Заполните детали приёма.`,
			"success",
		);
	};

	const handleQuickCreatePatient = async (customName?: string) => {
		if (!currentCall?.phone || isCreatingPatient) return;
		setIsCreatingPatient(true);
		try {
			const entered =
				typeof customName === "string" ? customName : newPatientNameInput;
			const targetName = entered.trim() || `Пациент ${formattedPhone}`;
			const res = await fetch("/api/patients", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-clinic-id": readDenteClinicToken(),
					"x-staff-id": readDenteStaffToken(),
				},
				body: JSON.stringify({
					fullName: targetName,
					phone: currentCall.phone,
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || `Ошибка сервера: ${res.status}`);
			}

			const createdPatient = await res.json();
			setSelectedPatientId(createdPatient.id);
			setNewPatientNameInput("");

			const active = useTelephonyStore.getState().activeCall;
			if (active) {
				useTelephonyStore.getState().triggerIncomingCall({
					...active,
					patientId: createdPatient.id,
					patientName: createdPatient.fullName,
				});
			}

			if (setDashboard) {
				setDashboard((curr) =>
					curr
						? {
								...curr,
								patients: [
									createdPatient,
									...curr.patients.filter((p) => p.id !== createdPatient.id),
								],
							}
						: curr,
				);
			}

			showToast(
				`Создана амбулаторная карта: ${createdPatient.fullName} (${formattedPhone})`,
				"success",
			);
		} catch (err: unknown) {
			const msg =
				err instanceof Error
					? err.message
					: "Не удалось сохранить пациента";
			showToast(msg, "error");
		} finally {
			setIsCreatingPatient(false);
		}
	};

	const handleCaptureLead = async () => {
		if (!currentCall || isCapturingLead) return;
		setIsCapturingLead(true);
		try {
			const res = await captureLeadFromIncomingCall(currentCall, {
				customName: newPatientNameInput,
			});
			if (res.success) showToast(res.message, "success");
			else showToast(res.message, "error");
		} finally {
			setIsCapturingLead(false);
		}
	};

	const handleSendWhatsAppConfirmation = () => {
		if (!currentCall?.phone) return;
		const msg = generateAppointmentConfirmationMessage({
			patientName: callerName,
			doctorName: upcomingAppointment?.doctorName || null,
			appointmentStartsAt:
				upcomingAppointment?.startsAt || new Date().toISOString(),
			clinicName:
				dashboard?.clinicSettings?.profile?.clinicName ||
				(dashboard?.clinicSettings as any)?.name ||
				DEFAULT_CLINIC_BRAND_NAME,
		});
		openWhatsAppChat(currentCall.phone, msg);
		if (resolvedPatient?.id) {
			fetch("/api/whatsapp/send", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: resolvedPatient.id,
					message: msg,
				}),
			}).catch((err) => {
				console.warn(
					"[IncomingCallPopup] WhatsApp direct send API error:",
					err,
				);
			});
		}
		showToast(
			`Чат WhatsApp открыт для ${callerName} (${formattedPhone})`,
			"success",
		);
	};

	const handleCopySmsConfirmation = () => {
		if (!upcomingAppointment) {
			showToast(
				"Нет предстоящих запланированных записей для подтверждения",
				"info",
			);
			return;
		}

		const msg = generateAppointmentConfirmationMessage({
			patientName: callerName,
			doctorName: upcomingAppointment.doctorName,
			appointmentStartsAt: upcomingAppointment.startsAt,
			clinicName:
				dashboard?.clinicSettings?.profile?.clinicName ||
				(dashboard?.clinicSettings as any)?.name ||
				DEFAULT_CLINIC_BRAND_NAME,
		});

		navigator.clipboard?.writeText(msg).then(() => {
			setSmsCopied(true);
			showToast("Текст SMS-подтверждения скопирован в буфер", "success");
		});
	};

	const handleAnswerCall = () => {
		answerCall();
		showToast(`Вызов принят (${formattedPhone})`, "success");
	};

	const handleReject = () => {
		rejectCall();
		showToast(`Вызов ${formattedPhone} отклонён`, "info");
	};

	const handleEndCall = () => {
		endCall();
		setIsExpanded(true);
		setShowOutcomePanel(true);
		showToast(`Разговор завершён (${formattedPhone})`, "info");
	};

	const handleSwitchAndAnswerSecondaryLine = (
		mode: "capsule" | "expanded" = "expanded",
	) => {
		if (!secondaryLine?.call) return;
		switchLine(secondaryLine.lineId as 1 | 2);
		answerCall();
		showToast(
			mode === "capsule"
				? `Линия ${secondaryLine.lineId} активна (Линия ${activeLineId} на удержании)`
				: `Переключено на Линию ${secondaryLine.lineId} (Линия ${activeLineId} на удержании)`,
			"info",
		);
	};

	const handleResumeSecondaryLine = () => {
		if (!secondaryLine?.call) return;
		switchLine(secondaryLine.lineId as 1 | 2);
		showToast(`Возврат к Линии ${secondaryLine.lineId}`, "info");
	};

	const handleCopyPhone = () => {
		if (!currentCall?.phone) return;
		navigator.clipboard?.writeText(currentCall.phone);
		showToast("Номер телефона скопирован", "info");
	};

	const handleToggleDnd = () => {
		setAgentState(isDndActive ? "online" : "dnd");
		showToast(
			isDndActive
				? "Режим «Не беспокоить» выключен"
				: "Включен режим «Не беспокоить» (DND)",
			"info",
		);
	};

	const handleRecordOutcome = (outcome: CallOutcome) => {
		recordCallOutcome(outcome);
		dismissCall();
		showToast(
			outcome === "callback_15m"
				? "Запланирован перезвон через 15 минут"
				: "Исход зафиксирован",
			"info",
		);
	};

	const handleStartQuickCreateFromMenu = () => {
		if (currentCall?.phone) {
			setNewPatientPhone(currentCall.phone);
		}
		void handleQuickCreatePatient();
	};

	return {
		smsCopied,
		isCreatingPatient,
		isCapturingLead,
		quickSlots,
		handleToggleCardDrawer,
		handleOpenFullPatientView,
		handleQuickBook,
		handleQuickCreatePatient,
		handleCaptureLead,
		handleSendWhatsAppConfirmation,
		handleCopySmsConfirmation,
		handleAnswerCall,
		handleReject,
		handleEndCall,
		handleSwitchAndAnswerSecondaryLine,
		handleResumeSecondaryLine,
		handleCopyPhone,
		handleToggleDnd,
		handleRecordOutcome,
		handleStartQuickCreateFromMenu,
	};
}
