import { useEffect, useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../../lib/safeLocalStorage";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import {
	type CallHistoryItem,
	type IncomingCallPayload,
	type PatientRecord,
	generateAppointmentConfirmationMessage,
	openWhatsAppChat,
	useTelephonyStore,
} from "../../../store/telephonyStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { showToast } from "../../GlobalToast";
import type { QuickSlotType } from "../IncomingCallQuickBooking";
import { captureLeadFromIncomingCall } from "../telephonyAttribution";
import { useIncomingCallData } from "../useIncomingCallData";
import type { TelephonyCallLogFilter } from "./telephonyDrawerTypes";

export function useTelephonyDrawerController(
	propIsOpen?: boolean,
	propOnClose?: () => void,
	propCall?: IncomingCallPayload | null,
) {
	const storeIsOpen = useTelephonyStore((s) => s.isCallDrawerOpen);
	const closeCallDrawer = useTelephonyStore((s) => s.closeCallDrawer);
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const isConnected = useTelephonyStore((s) => s.isWsConnected);
	const callHistory = useTelephonyStore((s) => s.callHistory);
	const startCallTransfer = useTelephonyStore((s) => s.startCallTransfer);
	const recordCallOutcome = useTelephonyStore((s) => s.recordCallOutcome);
	const answerCall = useTelephonyStore((s) => s.answerCall);
	const connectCall = useTelephonyStore((s) => s.connectCall);
	const triggerIncomingCall = useTelephonyStore((s) => s.triggerIncomingCall);

	const isDrawerOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;
	const handleClose = propOnClose || closeCallDrawer;
	const currentCall = propCall !== undefined ? propCall : activeCall;
	const hasPrimaryModal = useUiSurfaceStore((s) => s.hasPrimaryModal);
	const isFullScreenStudioActive = useUiSurfaceStore(
		(s) => s.isFullScreenStudioActive,
	);

	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;

	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const currentView = useAppStore((s) => s.currentView);
	const setNewAppointmentDraft = useScheduleStore(
		(s) => s.setNewAppointmentDraft,
	);

	const [activeTab, setActiveTab] = useState<"call" | "journal">(() =>
		currentCall ? "call" : "journal",
	);
	const [activeFilter, setActiveFilter] =
		useState<TelephonyCallLogFilter>("all");
	const [showQuickBooking, setShowQuickBooking] = useState(false);
	const [showTransferPanel, setShowTransferPanel] = useState(false);
	const [transferType, setTransferType] = useState<"blind" | "attended">(
		"blind",
	);
	const [showOutcomePanel, setShowOutcomePanel] = useState(false);
	const [newPatientNameInput, setNewPatientNameInput] = useState("");
	const [isCreatingPatient, setIsCreatingPatient] = useState(false);
	const [isCapturingLead, setIsCapturingLead] = useState(false);
	const [smsCopied, setSmsCopied] = useState(false);
	const [isDialerOpen, setIsDialerOpen] = useState(false);

	useEffect(() => {
		if (currentCall) setActiveTab("call");
	}, [currentCall]);

	useEffect(() => {
		if (!isDrawerOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") handleClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isDrawerOpen, handleClose]);

	useEffect(() => {
		if (isDrawerOpen && !hasPrimaryModal && !isFullScreenStudioActive) {
			useUiSurfaceStore.getState().openDrawer("telephony");
		} else if (useUiSurfaceStore.getState().activeDrawer === "telephony") {
			useUiSurfaceStore.getState().closeDrawer("telephony");
		}
	}, [isDrawerOpen, hasPrimaryModal, isFullScreenStudioActive]);

	const callData = useIncomingCallData(currentCall, dashboard, () => {});

	const isCallAnswered =
		currentCall?.status === "answered" ||
		currentCall?.status === "connected" ||
		currentCall?.status === "ended";

	const handleSendWhatsAppConfirmation = () => {
		if (!callData.upcomingAppointment || !currentCall?.phone) {
			showToast(
				"Нет предстоящих запланированных записей для подтверждения",
				"info",
			);
			return;
		}
		const msg = generateAppointmentConfirmationMessage({
			patientName: callData.callerName,
			doctorName: callData.upcomingAppointment.doctorName,
			appointmentStartsAt: callData.upcomingAppointment.startsAt,
			clinicName: dashboard?.clinicSettings?.name || "DENTE",
		});
		openWhatsAppChat(currentCall.phone, msg);
		showToast(
			`Подтверждение приёма отправлено в WhatsApp (${callData.callerName})`,
			"success",
		);
	};

	const handleCopySmsConfirmation = () => {
		if (!callData.upcomingAppointment) {
			showToast(
				"Нет предстоящих запланированных записей для подтверждения",
				"info",
			);
			return;
		}
		const msg = generateAppointmentConfirmationMessage({
			patientName: callData.callerName,
			doctorName: callData.upcomingAppointment.doctorName,
			appointmentStartsAt: callData.upcomingAppointment.startsAt,
			clinicName: dashboard?.clinicSettings?.name || "DENTE",
		});
		navigator.clipboard?.writeText(msg).then(() => {
			setSmsCopied(true);
			showToast("Текст SMS-подтверждения скопирован в буфер", "success");
			setTimeout(() => setSmsCopied(false), 2000);
		});
	};

	const handleOpenFullPatientView = () => {
		if (currentView === "visit") {
			showToast(
				"Приём пациента активен. Карта доступна в текущей шторке без сброса визита.",
				"warning",
			);
			return;
		}
		if (callData.resolvedPatient) {
			setSelectedPatientId(callData.resolvedPatient.id);
			setCurrentView("patients");
			if (activeCall && activeCall.status === "ringing") {
				connectCall();
			}
			showToast(`Открыта карта: ${callData.resolvedPatient.fullName}`, "info");
		} else if (currentCall?.phone) {
			setNewPatientPhone(currentCall.phone);
			setCurrentView("patients");
			if (activeCall && activeCall.status === "ringing") {
				connectCall();
			}
			showToast(
				`Регистрация нового пациента с номером ${callData.formattedPhone}`,
				"info",
			);
		}
		handleClose();
	};

	const handleQuickBook = (slotType: QuickSlotType) => {
		const todayIso =
			dashboard?.todayIso || new Date().toISOString().split("T")[0]!;
		const defaultDoctorId =
			dashboard?.clinicSettings?.staff?.find((s) => s.role === "doctor")?.id ||
			"";
		const defaultChairId = dashboard?.clinicSettings?.chairs?.[0]?.id || "";

		let targetDate = todayIso;
		let startTime = "10:00:00";
		let endTime = "10:30:00";
		let reason = "Первичный звонок";

		if (slotType === "today_urgent") {
			targetDate = todayIso;
			startTime = "10:00:00";
			endTime = "10:30:00";
			reason = "Острая боль / Экстренный приём";
		} else if (slotType === "today_standard") {
			targetDate = todayIso;
			startTime = "14:30:00";
			endTime = "15:00:00";
			reason = "Первичная консультация и диагностика";
		} else if (slotType === "tomorrow") {
			const d = new Date(todayIso);
			d.setDate(d.getDate() + 1);
			targetDate = d.toISOString().split("T")[0]!;
			startTime = "11:00:00";
			endTime = "11:30:00";
			reason = "Плановый визит по звонку";
		}

		if (callData.resolvedPatient) {
			setSelectedPatientId(callData.resolvedPatient.id);
			setNewAppointmentDraft({
				patientId: callData.resolvedPatient.id,
				doctorUserId: defaultDoctorId,
				assistantUserId: "",
				chairId: defaultChairId,
				startsAt: `${targetDate}T${startTime}`,
				endsAt: `${targetDate}T${endTime}`,
				status: "planned",
				reason,
				comment: `Запись по входящему звонку (${callData.formattedPhone})`,
			});
		} else if (currentCall?.phone) {
			setNewPatientPhone(currentCall.phone);
			setNewAppointmentDraft({
				patientId: "",
				doctorUserId: defaultDoctorId,
				assistantUserId: "",
				chairId: defaultChairId,
				startsAt: `${targetDate}T${startTime}`,
				endsAt: `${targetDate}T${endTime}`,
				status: "planned",
				reason,
				comment: `Новый пациент с телефона ${callData.formattedPhone}`,
			});
		}

		const slotInfo = {
			patientId: callData.resolvedPatient?.id || null,
			patientName:
				callData.resolvedPatient?.fullName ||
				(callData.callerName && callData.callerName !== "Неизвестный номер"
					? callData.callerName
					: ""),
			patientPhone: currentCall?.phone || "",
			doctorUserId: defaultDoctorId || null,
			chairId: defaultChairId || null,
			startsAt: `${targetDate}T${startTime}`,
			endsAt: `${targetDate}T${endTime}`,
			reason,
			isCitoEmergency: slotType === "today_cito",
		};
		useScheduleStore.getState().setPendingStageBooking(slotInfo);
		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(
					new CustomEvent("dente-book-stage-appointment", { detail: slotInfo }),
				);
			} catch {
				// ignore
			}
		}

		if (activeCall && activeCall.status === "ringing") {
			answerCall();
		}
		if (currentView !== "visit") {
			setCurrentView("schedule");
			handleClose();
		}
		showToast(
			`Создана запись: ${callData.isKnownPatient ? callData.resolvedPatient?.fullName : callData.formattedPhone} (${reason})`,
			"info",
		);
	};

	const handleQuickCreatePatient = async (customName?: string) => {
		if (!currentCall?.phone || isCreatingPatient) return;
		setIsCreatingPatient(true);
		try {
			const entered =
				typeof customName === "string" ? customName : newPatientNameInput;
			const targetName =
				entered.trim() || `Пациент ${callData.formattedPhone}`;
			const res = await fetch("/api/patients", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": readDenteStaffToken(),
					"x-dente-clinic-token": readDenteClinicToken(),
				},
				body: JSON.stringify({
					fullName: targetName,
					phone: currentCall.phone,
				}),
			});

			if (!res.ok) {
				let errMsg = "Ошибка при создании пациента";
				try {
					const data = await res.json();
					if (data?.message) errMsg = data.message;
				} catch {}
				showToast(errMsg, "error");
				return;
			}

			const createdPatient = await res.json();
			setSelectedPatientId(createdPatient.id);
			setNewPatientNameInput("");

			const active = useTelephonyStore.getState().activeCall;
			if (active) {
				triggerIncomingCall({
					...active,
					patientId: createdPatient.id,
					patientName: createdPatient.fullName,
				});
			}

			if (ctx?.setDashboard) {
				ctx.setDashboard((curr) =>
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
				`Создана амбулаторная карта: ${createdPatient.fullName} (${callData.formattedPhone})`,
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

	const handleQuickBookFromLog = (
		item: CallHistoryItem,
		matched: PatientRecord | null,
	) => {
		if (matched) setSelectedPatientId(matched.id);
		else setNewPatientPhone(item.phone);

		const todayIso =
			dashboard?.todayIso || new Date().toISOString().split("T")[0]!;
		const defaultDoctorId =
			dashboard?.clinicSettings?.staff?.find((s) => s.role === "doctor")?.id ||
			"";
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
		showToast(
			`Создан черновик записи для ${matched?.fullName || item.phone}`,
			"success",
		);
	};

	const handleCallbackFromLog = (item: CallHistoryItem) => {
		triggerIncomingCall({
			phone: item.phone,
			patientId: item.patientId || null,
			patientName: item.patientName || "Исходящий вызов",
			provider: item.provider || "mango",
			timestamp: new Date().toISOString(),
			status: "answered",
			direction: "outbound",
			callStartedAt: Date.now(),
		});
		showToast(`Исходящий вызов на ${item.phone}`, "info");
	};

	const handleOpenPatientFromLog = (
		item: CallHistoryItem,
		matched: PatientRecord | null,
	) => {
		if (matched) {
			setSelectedPatientId(matched.id);
			if (currentView !== "visit") setCurrentView("patients");
			handleClose();
			showToast(`Открыта карта: ${matched.fullName}`, "info");
		} else {
			handleCallbackFromLog(item);
		}
	};

	return {
		isDrawerOpen,
		handleClose,
		currentCall,
		hasPrimaryModal,
		isFullScreenStudioActive,
		dashboard,
		isConnected,
		callHistory,
		activeTab,
		setActiveTab,
		activeFilter,
		setActiveFilter,
		showQuickBooking,
		setShowQuickBooking,
		showTransferPanel,
		setShowTransferPanel,
		transferType,
		setTransferType,
		showOutcomePanel,
		setShowOutcomePanel,
		newPatientNameInput,
		setNewPatientNameInput,
		isCreatingPatient,
		isCapturingLead,
		smsCopied,
		isDialerOpen,
		setIsDialerOpen,
		isCallAnswered,
		callData,
		handleSendWhatsAppConfirmation,
		handleCopySmsConfirmation,
		handleOpenFullPatientView,
		handleQuickBook,
		handleQuickCreatePatient,
		handleCaptureLead,
		handleQuickBookFromLog,
		handleCallbackFromLog,
		handleOpenPatientFromLog,
		startCallTransfer,
		recordCallOutcome,
	};
}
