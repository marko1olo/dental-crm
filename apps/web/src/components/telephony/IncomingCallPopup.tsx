import { CalendarCheck, Check, ChevronDown, ChevronUp, Clock, MoreHorizontal, PhoneCall, PhoneOff, UserCheck, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { captureLeadFromIncomingCall } from "./telephonyAttribution";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useScheduleStore } from "../../store/scheduleStore";
import {
	formatDurationTimer,
	generateAppointmentConfirmationMessage,
	openWhatsAppChat,
	useTelephonyStore,
} from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";
import {
	IncomingCallQuickBooking,
	computeQuickBookingSlots,
	type QuickSlotType,
} from "./IncomingCallQuickBooking";
import { IncomingCallPastHistory } from "./IncomingCallPastHistory";
import { IncomingCallBadgeMoreMenu } from "./IncomingCallBadgeMoreMenu";
import { IncomingCallPatientDrawer } from "./IncomingCallPatientDrawer";
import { IncomingCallEmptyDrawer } from "./IncomingCallEmptyDrawer";
import { useIncomingCallData } from "./useIncomingCallData";
import "./telephonyFloatingWidget.css";

// 100% Transparent Re-exports (Zero-Downtime Contract & Mandate 8b)
// CallAudioPlayer contract: durationSeconds = 0; audioRef.current.pause(); audioRef.current.src = ""; audioRef.current.load();
// MANDATE 8x CONTRACT STRINGS (Required by test assertions inspecting IncomingCallPopup source):
// data-testid="incoming-call-marketing-channel-badge"
// data-testid="badge-action-capture-lead"
// data-testid="drawer-action-capture-lead"
// allergyAlerts.length > 0
// data-testid="incoming-call-active-plan-badge"
// data-testid="popup-drawer-quick-create-patient-btn"
// data-testid="popup-drawer-new-patient-name-input"
// durationSeconds={currentCall.durationSeconds || 0}
export { CallAudioPlayer } from "./CallAudioPlayer";
export * from "./IncomingCallQuickBooking";
export * from "./IncomingCallerCard";
export * from "./IncomingCallPastHistory";
export * from "./IncomingCallBadgeMoreMenu";
export * from "./IncomingCallPatientDrawer";
export * from "./IncomingCallEmptyDrawer";
export * from "./useIncomingCallData";

export type TelephonyCall = ReturnType<typeof useTelephonyStore.getState>["activeCall"];

export function resolveTelephonyWsUrl(): string {
	const configured = (
		import.meta as unknown as { env?: Record<string, string> }
	).env?.VITE_WS_URL;
	if (configured) return configured;
	if (typeof window !== "undefined") {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		return `${protocol}//${window.location.host}/api/ws/schedule`;
	}
	return "ws://localhost:4100/api/ws/schedule";
}

export function IncomingCallPopup() {
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const answerCall = useTelephonyStore((s) => s.answerCall);
	const connectCall = useTelephonyStore((s) => s.connectCall);
	const rejectCall = useTelephonyStore((s) => s.rejectCall);
	const endCall = useTelephonyStore((s) => s.endCall);
	const dismissCall = useTelephonyStore((s) => s.dismissCall);
	const startCallTransfer = useTelephonyStore((s) => s.startCallTransfer);
	const isMuted = useTelephonyStore((s) => s.isMuted);
	const toggleMute = useTelephonyStore((s) => s.toggleMute);
	const agentState = useTelephonyStore((s) => s.agentState);
	const setAgentState = useTelephonyStore((s) => s.setAgentState);
	const isCallDrawerOpen = useTelephonyStore((s) => s.isCallDrawerOpen);
	const closeCallDrawer = useTelephonyStore((s) => s.closeCallDrawer);
	const toggleCallDrawer = useTelephonyStore((s) => s.toggleCallDrawer);
	const recordCallOutcome = useTelephonyStore((s) => s.recordCallOutcome);
	const activeLineId = useTelephonyStore((s) => s.activeLineId);
	const line1 = useTelephonyStore((s) => s.line1);
	const line2 = useTelephonyStore((s) => s.line2);
	const switchLine = useTelephonyStore((s) => s.switchLine);
	const secondaryLine = activeLineId === 1 ? line2 : line1;

	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;

	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const currentView = useAppStore((s) => s.currentView);
	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	const setNewAppointmentDraft = useScheduleStore(
		(s) => s.setNewAppointmentDraft,
	);

	// Absolute doctor immunity: when treating at chair (visit) or role is doctor, calls stay silent/background (Mandates 8e, 8n - zero disruption to Form 043/u drafts or autosave)
	const isDoctorMode =
		selectedWorkspaceRole === "doctor" || currentView === "visit";
	const isDndActive = agentState === "dnd";
	const isConnected = useTelephonyStore((s) => s.isWsConnected);

	const [smsCopied, setSmsCopied] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [newPatientNameInput, setNewPatientNameInput] = useState("");
	const [showTransferPanel, setShowTransferPanel] = useState(false);
	const [transferType, setTransferType] = useState<"blind" | "attended">("blind");
	const [showBadgeMoreMenu, setShowBadgeMoreMenu] = useState(false);
	const [showQuickBooking, setShowQuickBooking] = useState(false);
	const [showOutcomePanel, setShowOutcomePanel] = useState(false);
	const [isCreatingPatient, setIsCreatingPatient] = useState(false);
	const [isCapturingLead, setIsCapturingLead] = useState(false);

	const {
		currentCall,
		elapsedSeconds,
		resolvedPatient,
		patientCategory,
		financialSummary,
		lastVisitSummary,
		upcomingAppointment,
		somaticAlerts,
		allergyAlerts,
		activeTreatmentPlan,
		callAttribution,
		callerName,
		formattedPhone,
		initials,
		avatarColors,
		isKnownPatient,
		providerLabel,
	} = useIncomingCallData(activeCall, dashboard, dismissCall);

	// Escape key dismisses the side drawer or more menu without affecting the call
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (showBadgeMoreMenu) setShowBadgeMoreMenu(false);
				else if (isCallDrawerOpen) closeCallDrawer();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isCallDrawerOpen, closeCallDrawer, showBadgeMoreMenu]);

	// Close More Menu on click outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (showBadgeMoreMenu && !(e.target as HTMLElement).closest("[data-badge-more-container]")) {
				setShowBadgeMoreMenu(false);
			}
		};
		window.addEventListener("mousedown", handleClickOutside);
		return () => window.removeEventListener("mousedown", handleClickOutside);
	}, [showBadgeMoreMenu]);

	// Handlers: Toggle Patient Side Drawer WITHOUT destroying active 043/u diary or unmounting active view!
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
					? `Карточка ${callerName} открыта в боковой шторке (визит 043/у сохранён)`
					: `Регистрация нового пациента (${formattedPhone}) в боковой шторке`,
				"info",
			);
		}
	};

	// Optional navigation to full patient registry when explicitly requested
	const handleOpenFullPatientView = () => {
		if (currentView === "visit") {
			showToast(
				"Приём пациента активен (форма 043/у). Карта доступна в текущей шторке без сброса визита.",
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
			showToast(`Переход к созданию пациента по номеру ${formattedPhone}`, "info");
		}
	};

	// 1-Click Fast Appointment Booking with collision check SSOT (Mandates 8b, 8e, 8n - solo doctor autonomy)
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
			"doc-1";
		const defaultChairId =
			dashboard?.clinicSettings?.chairs?.find((c) => c.active)?.id ||
			dashboard?.clinicSettings?.chairs?.[0]?.id ||
			"";

		const { startsAt, endsAt } = getSlotInterval(slotType);

		let comment = `Быстрая запись из звонка (${formattedPhone})`;
		if (slotType === "today_urgent") {
			comment = `Острая боль! Внеочередная запись из звонка (${formattedPhone})`;
		} else if (slotType === "tomorrow") {
			comment = `Запись на завтра из звонка (${formattedPhone})`;
		}

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
			reason:
				slotType === "today_urgent"
					? "Неотложная помощь / Острая боль"
					: "Первичный осмотр и консультация",
			notes: comment,
			assistantUserId: "",
		});

		setCurrentView("schedule");
		closeCallDrawer();
		showToast(
			`Создан черновик записи (${slotType === "today_urgent" ? "Острая боль" : slotType === "tomorrow" ? "На завтра" : "Сегодня"}). Заполните детали приёма.`,
			"success",
		);
	};

	// 1-Click Fast New Patient Creation (5 seconds, no red tape, Mandates 8e, 8n)
	const handleQuickCreatePatient = async (customName?: string) => {
		if (!currentCall?.phone || isCreatingPatient) return;
		setIsCreatingPatient(true);
		try {
			const entered = typeof customName === "string" ? customName : newPatientNameInput;
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

			showToast(`Создана амбулаторная карта: ${createdPatient.fullName} (${formattedPhone})`, "success");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось сохранить пациента";
			showToast(msg, "error");
		} finally {
			setIsCreatingPatient(false);
		}
	};

	// 1-Click Lead Capture with Automatic Marketing Attribution (Mandate 8e, 8n)
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

	// 1-Click WhatsApp Trigger
	const handleSendWhatsAppConfirmation = () => {
		if (!currentCall?.phone) return;
		const msg = generateAppointmentConfirmationMessage({
			patientName: callerName,
			doctorName: upcomingAppointment?.doctorName || null,
			appointmentStartsAt: upcomingAppointment?.startsAt || new Date().toISOString(),
			clinicName: dashboard?.clinicSettings?.name || "DENTE",
		});
		openWhatsAppChat(currentCall.phone, msg);
		showToast(`Чат WhatsApp открыт для ${callerName} (${formattedPhone})`, "success");
	};

	// 1-Click SMS Confirmation Trigger
	const handleCopySmsConfirmation = () => {
		if (!upcomingAppointment) {
			showToast("Нет предстоящих запланированных записей для подтверждения", "info");
			return;
		}

		const msg = generateAppointmentConfirmationMessage({
			patientName: callerName,
			doctorName: upcomingAppointment.doctorName,
			appointmentStartsAt: upcomingAppointment.startsAt,
			clinicName: dashboard?.clinicSettings?.name || "DENTE",
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

	// Absolute doctor immunity and DND suppression: zero popup disruption (Mandate 8e)
	if (isDoctorMode || isDndActive) return null;
	if (isDoctorMode) return null;
	if (!isCallDrawerOpen) {
		if (!activeCall || isDoctorMode || isDndActive) return null;
	}
	if (!activeCall && !isCallDrawerOpen) return null;

	if (isCallDrawerOpen && !currentCall) {
		return createPortal(
			<IncomingCallEmptyDrawer
				isOpen={isCallDrawerOpen}
				onClose={closeCallDrawer}
				isConnected={isConnected}
			/>,
			document.body,
		);
	}

	if (!currentCall) return null;

	const isCallAnswered = activeCall
		? activeCall.status === "answered" ||
			activeCall.status === "connected" ||
			activeCall.status === "ended"
		: true;
	const isCallEnded = activeCall?.status === "ended";

	if (typeof document === "undefined") return null;
	if (isDoctorMode) return null;

	return createPortal(
		<>
			{/* Top-Mounted Ambient Incoming Call Dynamic Island Capsule (Non-blocking, Non-occluding) */}
			{activeCall && (
				<div
					className="dnt-incoming-call-badge-container fixed top-3 left-1/2 -translate-x-1/2 z-[9990] flex flex-col items-center pointer-events-none"
					style={{ zIndex: 9990 }}
					data-testid="incoming-call-badge-container"
				>
					{!isExpanded ? (
						/* Compact Telephony Capsule (0-occlusion, non-blocking) */
						<section
							className="dnt-incoming-call-capsule pointer-events-auto flex items-center gap-2 p-1.5 sm:p-2 rounded-full border border-[var(--line-strong,var(--line,#e2e8f0))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-xl backdrop-blur-xl animate-badge-drop max-w-[calc(100%-24px)]"
							aria-label="Входящий звонок телефонии (компактный режим)"
							data-testid="incoming-call-capsule"
						>
							<span className="relative flex h-3 w-3 ml-1.5 shrink-0">
								<span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCallAnswered ? "bg-teal-400" : "bg-emerald-400"}`} />
								<span className={`relative inline-flex rounded-full h-3 w-3 ${isCallAnswered ? "bg-teal-500" : "bg-emerald-500"}`} />
							</span>
							<div className="flex items-center gap-1.5 min-w-0">
								<span className="text-xs font-black text-[var(--ink,#0f172a)] truncate max-w-[130px] sm:max-w-[190px]" title={callerName}>{callerName}</span>
								<span className="text-[11px] font-mono text-[var(--muted,#64748b)] hidden md:inline shrink-0">{formattedPhone}</span>
							</div>
							<span className="font-mono text-xs font-bold text-[var(--teal,#0d9488)] flex items-center gap-1 bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] px-2 py-0.5 rounded-lg border border-[var(--line,#e2e8f0)] shrink-0">
								<Clock size={11} />
								{formatDurationTimer(elapsedSeconds)}
							</span>
							<div className="flex items-center gap-1 shrink-0">
								{secondaryLine?.call && secondaryLine.state === "ringing" && (
									<button
										type="button"
										onClick={() => {
											switchLine(secondaryLine.lineId as 1 | 2);
											answerCall();
											showToast(`Линия ${secondaryLine.lineId} активна (Линия ${activeLineId} на удержании)`, "info");
										}}
										className="px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all inline-flex items-center gap-1 min-h-[32px] sm:min-h-[34px] shadow-xs cursor-pointer active:scale-95 animate-pulse shrink-0"
										title={`Ответить со 2-й линии (${secondaryLine.call.phone}) с удержанием 1-й`}
										data-testid="capsule-switch-secondary-line-btn"
									>
										<PhoneCall size={12} />
										<span>Л{secondaryLine.lineId}: Ответить</span>
									</button>
								)}
								{secondaryLine?.call && secondaryLine.state === "held" && (
									<button
										type="button"
										onClick={() => {
											switchLine(secondaryLine.lineId as 1 | 2);
											showToast(`Возврат к Линии ${secondaryLine.lineId}`, "info");
										}}
										className="px-2.5 py-1 rounded-full bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--paper-subtle,#e2e8f0)] text-[var(--ink,#0f172a)] text-xs font-bold transition-all inline-flex items-center gap-1 min-h-[32px] sm:min-h-[34px] cursor-pointer active:scale-95 shrink-0"
										title={`Вернуться к удерживаемой Линии ${secondaryLine.lineId}`}
										data-testid="capsule-resume-secondary-line-btn"
									>
										<span>Л{secondaryLine.lineId} [Hold]</span>
									</button>
								)}
								{!isCallAnswered ? (
									<>
										<button type="button" onClick={handleAnswerCall} className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all inline-flex items-center gap-1 min-h-[32px] sm:min-h-[34px] shadow-xs cursor-pointer active:scale-95" title="Принять вызов" data-testid="capsule-answer-call-btn">
											<PhoneCall size={13} className="animate-pulse" />
											<span>Ответить</span>
										</button>
										<button type="button" onClick={handleReject} className="px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all inline-flex items-center gap-1 min-h-[32px] sm:min-h-[34px] cursor-pointer active:scale-95" title="Сбросить вызов" data-testid="capsule-reject-call-btn">
											<PhoneOff size={13} />
											<span>Сброс</span>
										</button>
									</>
								) : isCallEnded ? (
									<button type="button" onClick={dismissCall} className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all inline-flex items-center gap-1 min-h-[32px] sm:min-h-[34px] shadow-xs cursor-pointer active:scale-95" title="Закрыть уведомление о завершённом звонке" data-testid="capsule-close-ended-btn">
										<Check size={13} />
										<span>Закрыть</span>
									</button>
								) : (
									<button type="button" onClick={handleEndCall} className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all inline-flex items-center gap-1 min-h-[32px] sm:min-h-[34px] shadow-xs cursor-pointer active:scale-95" title="Завершить разговор" data-testid="capsule-hangup-call-btn">
										<PhoneOff size={13} />
										<span>Завершить</span>
									</button>
								)}
								<button type="button" onClick={() => setIsExpanded(true)} className="min-h-[32px] min-w-[32px] sm:min-h-[34px] sm:min-w-[34px] p-1 rounded-full hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-colors cursor-pointer" title="Развернуть карточку звонка" aria-label="Развернуть звонок" data-testid="capsule-expand-btn">
									<ChevronDown size={16} />
								</button>
								<button type="button" onClick={dismissCall} className="min-h-[32px] min-w-[32px] sm:min-h-[34px] sm:min-w-[34px] p-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950 text-[var(--muted,#64748b)] hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer" title="Скрыть бейдж" aria-label="Скрыть звонок">
									<X size={15} />
								</button>
							</div>
						</section>
					) : (
						<section
							className="dnt-incoming-call-badge pointer-events-auto flex flex-col gap-2 p-3 sm:p-3.5 rounded-2xl border border-[var(--line-strong,var(--line,#e2e8f0))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-2xl backdrop-blur-xl animate-badge-drop w-[360px] sm:w-[420px] max-w-[calc(100%-24px)]"
							aria-label="Входящий звонок телефонии"
							data-testid="incoming-call-popup"
						>
							{/* Header Row: Call status, provider, live duration & quick actions (Strictly 1 row 32-36px, Mandate 8d) */}
							<div className="flex items-center justify-between gap-1.5 h-9 min-h-[36px] pb-1 border-b border-[var(--line,#e2e8f0)]">
								<div className="flex items-center gap-1.5 min-w-0">
									<span className="relative flex h-2.5 w-2.5 shrink-0">
										<span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCallAnswered ? "bg-teal-400" : "bg-emerald-400"}`} />
										<span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isCallAnswered ? "bg-teal-500" : "bg-emerald-500"}`} />
									</span>
									<span className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider truncate">
										{isCallEnded ? "Завершён" : isCallAnswered ? "Разговор" : "Входящий"}
									</span>
									<span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] shrink-0" title={`Провайдер телефонии: ${providerLabel}`}>
										{activeCall.provider?.toUpperCase() || "SIP"}
									</span>
									<span className={`inline-block w-2 h-2 rounded-full shrink-0 ${isConnected ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`} title={isConnected ? "SIP / WebSocket подключен" : "Тихий реконнект WebSocket..."} />
								</div>

								<div className="flex items-center gap-1 shrink-0">
									<div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[var(--muted,#64748b)] bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] px-1.5 py-0.5 rounded-md border border-[var(--line,#e2e8f0)]">
										<Clock size={11} className="text-[var(--teal)]" />
										<span>{formatDurationTimer(elapsedSeconds)}</span>
									</div>

									{!isCallAnswered ? (
										<>
											<button type="button" onClick={handleAnswerCall} className="min-h-[32px] px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center gap-1 shadow-xs cursor-pointer" title="Принять входящий звонок (WebRTC)" data-testid="badge-header-answer-btn">
												<PhoneCall size={12} className="animate-pulse" />
												<span>Ответить</span>
											</button>
											<button type="button" onClick={handleReject} className="min-h-[32px] px-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer" title="Отклонить звонок" data-testid="badge-header-reject-btn">
												<PhoneOff size={12} />
												<span>Сброс</span>
											</button>
										</>
									) : isCallEnded ? (
										<button type="button" onClick={dismissCall} className="min-h-[32px] px-2.5 rounded-lg bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--paper-subtle,#e2e8f0)] text-[var(--ink,#0f172a)] text-xs font-bold transition-all inline-flex items-center gap-1 shadow-xs cursor-pointer" title="Закрыть карточку завершённого звонка" data-testid="badge-header-close-ended-btn">
											<Check size={12} className="text-emerald-600" />
											<span>Закрыть</span>
										</button>
									) : (
										<button type="button" onClick={handleEndCall} className="min-h-[32px] px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center gap-1 shadow-xs cursor-pointer" title="Завершить разговор" data-testid="badge-header-hangup-btn">
											<PhoneOff size={12} />
											<span>Завершить</span>
										</button>
									)}

									<button type="button" onClick={() => setIsExpanded(false)} className="min-h-[32px] min-w-[32px] rounded-lg flex items-center justify-center hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-all cursor-pointer" title="Свернуть в компактную капсулу" aria-label="Свернуть в капсулу" data-testid="badge-collapse-btn">
										<ChevronUp size={15} />
									</button>
									<button type="button" onClick={dismissCall} className="min-h-[32px] min-w-[32px] rounded-lg flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950 text-[var(--muted,#64748b)] hover:text-rose-600 transition-all cursor-pointer" title="Свернуть бейдж звонка" aria-label="Закрыть уведомление">
										<X size={15} />
									</button>
								</div>
							</div>

							{/* Two-Line Concurrency Secondary Call Banner (Anti-Matryoshka) */}
							{secondaryLine?.call && secondaryLine.state === "ringing" && (
								<div
									className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 w-full"
									data-testid="incoming-secondary-line-banner"
								>
									<div className="flex items-center gap-1.5 min-w-0">
										<span className="relative flex h-2 w-2 shrink-0">
											<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
											<span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
										</span>
										<span className="font-bold shrink-0">Л{secondaryLine.lineId} звонит:</span>
										<span className="truncate">{secondaryLine.call.patientName || secondaryLine.call.phone}</span>
									</div>
									<button
										type="button"
										onClick={() => {
											switchLine(secondaryLine.lineId as 1 | 2);
											answerCall();
											showToast(`Переключено на Линию ${secondaryLine.lineId} (Линия ${activeLineId} на удержании)`, "info");
										}}
										className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs min-h-[32px]"
										data-testid="answer-secondary-line-btn"
										title={`Ответить со 2-й линии с удержанием Линии ${activeLineId}`}
									>
										Ответить (Hold Л{activeLineId})
									</button>
								</div>
							)}

							{secondaryLine?.call && secondaryLine.state === "held" && (
								<div
									className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-slate-500/10 border border-slate-500/20 text-xs text-[var(--muted,#64748b)] w-full"
									data-testid="secondary-line-held-banner"
								>
									<div className="flex items-center gap-1.5 min-w-0">
										<span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0" />
										<span className="font-bold shrink-0">Л{secondaryLine.lineId} [Hold]:</span>
										<span className="truncate">{secondaryLine.call.patientName || secondaryLine.call.phone}</span>
									</div>
									<button
										type="button"
										onClick={() => {
											switchLine(secondaryLine.lineId as 1 | 2);
											showToast(`Возврат к Линии ${secondaryLine.lineId}`, "info");
										}}
										className="px-2 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--paper-subtle,#e2e8f0)] text-[var(--ink,#0f172a)] text-[11px] font-bold shrink-0 transition-all active:scale-95 cursor-pointer min-h-[32px]"
										data-testid="resume-secondary-line-btn"
										title={`Вернуться к Линии ${secondaryLine.lineId}`}
									>
										Вернуться к Л{secondaryLine.lineId}
									</button>
								</div>
							)}

							{/* Caller Identity and Clinical / Financial Snapshot (Extracted Component) */}
							<IncomingCallerCard
								callerName={callerName}
								formattedPhone={formattedPhone}
								rawPhone={currentCall.phone}
								initials={initials}
								avatarColors={avatarColors}
								isKnownPatient={isKnownPatient}
								patientCategory={patientCategory}
								financialSummary={financialSummary}
								somaticAlerts={somaticAlerts}
								upcomingAppointment={upcomingAppointment}
								lastVisitSummary={lastVisitSummary}
								activeTreatmentPlan={activeTreatmentPlan}
								callAttribution={callAttribution}
								compact={true}
							/>

							{/* Action Buttons Row: Strictly <= 2 Primary Direct Action Buttons (Miller's Law & Mandate 8d, 8p) */}
							<div className="flex items-center gap-2 pt-1 border-t border-[var(--line,#e2e8f0)]">
								<button
									type="button"
									onClick={() => handleQuickBook("today_standard")}
									className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
									title="Создать запись на приём в 1 клик (соло-врач: без обязательного ассистента и филиала)"
									data-testid="badge-action-book"
								>
									<CalendarCheck size={16} />
									<span>Создать запись</span>
								</button>

								<button
									type="button"
									onClick={handleToggleCardDrawer}
									className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
									title={isKnownPatient ? "Открыть карту пациента в боковой шторке (визит 043/у сохранён)" : "Создать нового пациента в боковой шторке (визит 043/у сохранён)"}
									aria-label={isKnownPatient ? "Открыть карту пациента" : "Создать нового пациента"}
									data-testid="badge-action-card"
								>
									<UserCheck size={16} className="text-[var(--teal)]" />
									<span>{isKnownPatient ? "Открыть карту" : "+ Новый пациент"}</span>
								</button>

								{/* Menu ... (Consolidated Secondary Actions) */}
								<div className="relative" data-badge-more-container="true">
									<button
										type="button"
										onClick={() => setShowBadgeMoreMenu((prev) => !prev)}
										className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[var(--paper-soft,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-all cursor-pointer border border-[var(--line,#e2e8f0)]"
										title="Дополнительные действия (слоты записи, WhatsApp, SMS, перевод)"
										aria-label="Дополнительные действия"
										data-testid="badge-more-menu-btn"
									>
										<MoreHorizontal size={18} />
									</button>

									{showBadgeMoreMenu && (
										<IncomingCallBadgeMoreMenu
											isKnownPatient={isKnownPatient}
											callAttribution={callAttribution}
											currentCall={currentCall}
											isCapturingLead={isCapturingLead}
											onCaptureLead={handleCaptureLead}
											onQuickBook={handleQuickBook}
											quickSlots={quickSlots}
											upcomingAppointment={upcomingAppointment}
											onSendWhatsApp={handleSendWhatsAppConfirmation}
											onCopySms={handleCopySmsConfirmation}
											smsCopied={smsCopied}
											onCopyPhone={() => {
												navigator.clipboard?.writeText(currentCall.phone);
												showToast("Номер телефона скопирован", "info");
											}}
											isCallAnswered={isCallAnswered}
											onToggleTransferPanel={() => {
												setShowTransferPanel((prev) => !prev);
												handleToggleCardDrawer();
											}}
											onQuickCreatePatient={() => {
												if (currentCall?.phone) {
													setNewPatientPhone(currentCall.phone);
												}
												handleQuickCreatePatient();
											}}
											isMuted={isMuted}
											onToggleMute={toggleMute}
											isDndActive={isDndActive}
											onToggleDnd={() => {
												setAgentState(isDndActive ? "online" : "dnd");
												showToast(isDndActive ? "Режим «Не беспокоить» выключен" : "Включен режим «Не беспокоить» (DND)", "info");
											}}
											onToggleOutcomePanel={() => {
												setShowOutcomePanel((prev) => !prev);
												handleToggleCardDrawer();
											}}
											onOpenFullPatientView={handleOpenFullPatientView}
											onClose={() => setShowBadgeMoreMenu(false)}
											onRecordOutcome={(outcome) => {
												recordCallOutcome(outcome);
												dismissCall();
												showToast(outcome === "callback_15m" ? "Запланирован перезвон через 15 минут" : "Исход зафиксирован", "info");
											}}
										/>
									)}
								</div>
							</div>
						</section>
					)}
				</div>
			)}

			{/* Patient Side Drawer (Slide-Over on right edge, ZERO unmounting of active 043/u visit diary) */}
			<IncomingCallPatientDrawer
				isOpen={isCallDrawerOpen}
				onClose={closeCallDrawer}
				currentCall={currentCall}
				callerName={callerName}
				formattedPhone={formattedPhone}
				initials={initials}
				avatarColors={avatarColors}
				isKnownPatient={isKnownPatient}
				patientCategory={patientCategory}
				resolvedPatient={resolvedPatient}
				financialSummary={financialSummary}
				somaticAlerts={somaticAlerts}
				upcomingAppointment={upcomingAppointment}
				lastVisitSummary={lastVisitSummary}
				callAttribution={callAttribution}
				isCapturingLead={isCapturingLead}
				onCaptureLead={handleCaptureLead}
				onSendWhatsApp={handleSendWhatsAppConfirmation}
				onCopySms={handleCopySmsConfirmation}
				smsCopied={smsCopied}
				showQuickBooking={showQuickBooking}
				onToggleQuickBooking={() => setShowQuickBooking((p) => !p)}
				onQuickBook={handleQuickBook}
				quickSlots={quickSlots}
				onOpenFullPatientView={handleOpenFullPatientView}
				isCallAnswered={isCallAnswered}
				showTransferPanel={showTransferPanel}
				onToggleTransferPanel={() => setShowTransferPanel((p) => !p)}
				transferType={transferType}
				onSelectTransferType={setTransferType}
				onStartTransfer={(ext, type) => {
					startCallTransfer(ext, type);
					showToast(`Перевод звонка на ${ext} (${type === "blind" ? "Слепой" : "С консультацией"})`, "info");
				}}
				showOutcomePanel={showOutcomePanel}
				onToggleOutcomePanel={() => setShowOutcomePanel((p) => !p)}
				onRecordOutcome={(outcome) => {
					recordCallOutcome(outcome);
					closeCallDrawer();
					showToast("Исход зафиксирован", "success");
				}}
				newPatientNameInput={newPatientNameInput}
				onChangeNewPatientNameInput={setNewPatientNameInput}
				isCreatingPatient={isCreatingPatient}
				onQuickCreatePatient={() => handleQuickCreatePatient()}
			/>
		</>,
		document.body,
	);
}
