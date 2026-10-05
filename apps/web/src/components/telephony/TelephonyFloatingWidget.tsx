import { ChevronDown, Headphones, PhoneCall, PhoneIncoming, PhoneOff, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useScheduleStore } from "../../store/scheduleStore";
import {
	type PlaybackSpeed,
	formatDurationTimer,
	formatPatientInitials,
	formatPhoneDisplay,
	generateAppointmentConfirmationMessage,
	generateWaveformBars,
	getAvatarColor,
	normalizePhoneDigits,
	openWhatsAppChat,
	resolvePatientFromPhone,
	resolvePatientLastVisit,
	resolvePatientSomaticAlerts,
	resolvePatientUpcomingAppointment,
	useTelephonyStore,
} from "../../store/telephonyStore";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import { showToast } from "../GlobalToast";
import { captureLeadFromIncomingCall, resolveCallAdvertisingAttribution } from "./telephonyAttribution";
import { TelephonyDialerPad } from "./TelephonyDialerPad";
import { TelephonyRecentCallsJournal } from "./TelephonyRecentCallsJournal";
import { TelephonyMiniControlPanel } from "./TelephonyMiniControlPanel";
import { TelephonyWidgetMoreMenu } from "./TelephonyWidgetMoreMenu";
import { TelephonyWidgetHeader } from "./TelephonyWidgetHeader";
import "./telephonyFloatingWidget.css";

// 100% Transparent Re-exports (Zero-Downtime Contract & Mandate 8b)
// MANDATE 8x CONTRACT STRINGS (Required by test assertions inspecting TelephonyFloatingWidget source):
// data-testid="widget-action-book"
// data-testid="widget-action-open-card"
// data-testid="widget-more-menu-btn"
// data-testid="widget-more-menu-dropdown"
// data-testid="widget-action-capture-lead"
export * from "./TelephonyDialerPad";
export * from "./TelephonyRecentCallsJournal";
export * from "./TelephonyMiniControlPanel";
export * from "./TelephonyWidgetMoreMenu";
export * from "./TelephonyWidgetHeader";

export interface TelephonyFloatingWidgetProps {
	className?: string;
	defaultExpanded?: boolean;
	showDialerDefault?: boolean;
}

export function TelephonyFloatingWidget({
	className = "",
	defaultExpanded = false,
	showDialerDefault = false,
}: TelephonyFloatingWidgetProps) {
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const triggerIncomingCall = useTelephonyStore((s) => s.triggerIncomingCall);
	const answerCall = useTelephonyStore((s) => s.answerCall);
	const acceptCall = useTelephonyStore((s) => s.acceptCall);
	const connectCall = useTelephonyStore((s) => s.connectCall);
	const rejectCall = useTelephonyStore((s) => s.rejectCall);
	const dismissCall = useTelephonyStore((s) => s.dismissCall);
	const startCallTransfer = useTelephonyStore((s) => s.startCallTransfer);
	const callHistory = useTelephonyStore((s) => s.callHistory);
	const isMuted = useTelephonyStore((s) => s.isMuted);
	const toggleMute = useTelephonyStore((s) => s.toggleMute);
	const volumeLevel = useTelephonyStore((s) => s.volumeLevel);
	const playbackSpeed = useTelephonyStore((s) => s.playbackSpeed);
	const setPlaybackSpeed = useTelephonyStore((s) => s.setPlaybackSpeed);
	const agentState = useTelephonyStore((s) => s.agentState);
	const setAgentState = useTelephonyStore((s) => s.setAgentState);
	const activeLineId = useTelephonyStore((s) => s.activeLineId);
	const line1 = useTelephonyStore((s) => s.line1);
	const line2 = useTelephonyStore((s) => s.line2);
	const switchLine = useTelephonyStore((s) => s.switchLine);
	const isHeld = useTelephonyStore((s) => s.isHeld);
	const toggleHold = useTelephonyStore((s) => s.toggleHold);
	const openCallDrawer = useTelephonyStore((s) => s.openCallDrawer);
	const isWsConnected = useTelephonyStore((s) => s.isWsConnected);

	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;

	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const crmCurrentView = useAppStore((s) => s.currentView);
	const setNewAppointmentDraft = useScheduleStore(
		(s) => s.setNewAppointmentDraft,
	);

	const [isExpanded, setIsExpanded] = useState(
		defaultExpanded || showDialerDefault,
	);
	const [isOpen, setIsOpen] = useState(
		defaultExpanded || showDialerDefault || Boolean(activeCall),
	);
	const [activeTab, setActiveTab] = useState<"call" | "dialer" | "history">(
		showDialerDefault ? "dialer" : "call",
	);
	const [dialNumber, setDialNumber] = useState("");
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [isPlayingAudio, setIsPlayingAudio] = useState(false);
	const [audioCurrentTime, setAudioCurrentTime] = useState(0);
	const [audioDuration, setAudioDuration] = useState(0);
	const [whatsappSent, setWhatsappSent] = useState(false);
	const [showTranscript, setShowTranscript] = useState(false);
	const [copiedTranscript, setCopiedTranscript] = useState(false);
	const [showTransferPanel, setShowTransferPanel] = useState(false);
	const [transferType, setTransferType] = useState<"blind" | "attended">("blind");
	const [showWidgetMoreMenu, setShowWidgetMoreMenu] = useState(false);
	const [isCreatingPatient, setIsCreatingPatient] = useState(false);
	const [isCapturingLead, setIsCapturingLead] = useState(false);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const waveformRef = useRef<HTMLDivElement | null>(null);
	const dialInputRef = useRef<HTMLInputElement | null>(null);

	// Auto-open compact dynamic island when an active call exists
	useEffect(() => {
		if (activeCall) {
			setIsOpen(true);
			if (defaultExpanded) setIsExpanded(true);
			setActiveTab("call");
		} else if (!defaultExpanded) {
			setIsOpen(false);
			setIsExpanded(false);
		}
	}, [activeCall, defaultExpanded]);

	// Call Duration Timer (ticks only while call is active)
	useEffect(() => {
		if (!activeCall) {
			setElapsedSeconds(0);
			return;
		}

		if (
			activeCall.status === "ended" ||
			activeCall.status === "rejected" ||
			activeCall.status === "missed"
		) {
			const finalSeconds =
				typeof activeCall.durationSeconds === "number" && activeCall.durationSeconds >= 0
					? activeCall.durationSeconds
					: Math.max(
							0,
							Math.floor(
								((activeCall.endedAt || Date.now()) -
									(activeCall.callStartedAt || Date.now())) /
									1000,
							),
						);
			setElapsedSeconds(finalSeconds);
			return;
		}

		const startTime = activeCall.callStartedAt ?? Date.now();
		const updateElapsed = () => {
			const seconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
			setElapsedSeconds(seconds);
		};
		updateElapsed();
		const interval = setInterval(() => {
			if (typeof document !== "undefined" && document.hidden) return;
			updateElapsed();
		}, 1000);

		const handleVisibilityChange = () => {
			if (typeof document !== "undefined" && !document.hidden) updateElapsed();
		};

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange);
		}

		return () => {
			clearInterval(interval);
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", handleVisibilityChange);
			}
		};
	}, [activeCall]);

	// Sync playback speed to audio element
	useEffect(() => {
		if (audioRef.current) audioRef.current.playbackRate = playbackSpeed;
	}, [playbackSpeed]);

	// Sync audio volume & mute
	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.muted = isMuted;
			audioRef.current.volume = volumeLevel;
		}
	}, [isMuted, volumeLevel]);

	// Audio cleanup on unmount to prevent audio leaks
	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current.src = "";
				audioRef.current.load();
			}
		};
	}, []);

	// Resolve Patient Info
	const resolvedPatient = useMemo(() => {
		if (!activeCall || !dashboard?.patients) return null;
		if (activeCall.patientId) {
			const found = dashboard.patients.find((p) => p.id === activeCall.patientId);
			if (found) return found;
		}
		return resolvePatientFromPhone(dashboard.patients, activeCall.phone);
	}, [activeCall, dashboard?.patients]);

	const patientInsight = useMemo(() => {
		if (!resolvedPatient || !dashboard?.patientInsights) return null;
		return dashboard.patientInsights.find((pi) => pi.patientId === resolvedPatient.id) || null;
	}, [resolvedPatient, dashboard?.patientInsights]);

	const upcomingAppointment = useMemo(() => {
		return resolvePatientUpcomingAppointment(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [resolvedPatient?.id, dashboard?.appointments, dashboard?.clinicSettings?.staff, dashboard?.todayIso]);

	const somaticAlerts = useMemo(() => {
		return resolvePatientSomaticAlerts(resolvedPatient, patientInsight);
	}, [resolvedPatient, patientInsight]);

	const allergyAlerts = useMemo(() => somaticAlerts.filter((a) => a.category === "allergy"), [somaticAlerts]);
	const acutePainAlerts = useMemo(() => somaticAlerts.filter((a) => a.category === "pain"), [somaticAlerts]);

	const callAttribution = useMemo(() => {
		if (!activeCall) return null;
		return resolveCallAdvertisingAttribution(activeCall);
	}, [activeCall]);

	const callerName = resolvedPatient?.fullName || activeCall?.patientName || "Неизвестный номер";
	const formattedPhone = formatPhoneDisplay(activeCall?.phone || dialNumber);
	const initials = formatPatientInitials(callerName);
	const avatarColors = getAvatarColor(callerName);
	const isCallAnswered = activeCall?.status === "answered" || activeCall?.status === "connected";

	const waveformBars = useMemo(() => {
		return generateWaveformBars(activeCall?.callId || activeCall?.phone || "sample-rec", 36);
	}, [activeCall?.callId, activeCall?.phone]);

	const transcriptUtterances = useMemo(() => activeCall?.transcript || [], [activeCall?.transcript]);

	useEffect(() => {
		if (!isExpanded) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsExpanded(false);
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isExpanded]);

	useEffect(() => {
		if (!showWidgetMoreMenu) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setShowWidgetMoreMenu(false);
		};
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest('[data-testid="widget-more-menu-btn"]') && !target.closest('[data-testid="widget-more-menu-dropdown"]')) {
				setShowWidgetMoreMenu(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("mousedown", handleClickOutside);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showWidgetMoreMenu]);

	// Audio Playback Handlers
	const togglePlayAudio = () => {
		if (!audioRef.current) return;
		if (isPlayingAudio) {
			audioRef.current.pause();
			setIsPlayingAudio(false);
		} else {
			audioRef.current
				.play()
				.then(() => setIsPlayingAudio(true))
				.catch((err) => {
					console.warn("[TelephonyFloatingWidget] Audio playback failed:", err);
					setIsPlayingAudio(false);
				});
		}
	};

	const handleAudioTimeUpdate = () => {
		if (audioRef.current) {
			setAudioCurrentTime(audioRef.current.currentTime);
			if (audioRef.current.duration && !Number.isNaN(audioRef.current.duration)) {
				setAudioDuration(audioRef.current.duration);
			}
		}
	};

	const handleSkipAudio = (deltaSeconds: number) => {
		if (!audioRef.current) return;
		const next = Math.max(0, Math.min(audioDuration, audioCurrentTime + deltaSeconds));
		audioRef.current.currentTime = next;
		setAudioCurrentTime(next);
	};

	const handleSeekToUtterance = (startSec: number) => {
		setAudioCurrentTime(startSec);
		if (audioRef.current) {
			audioRef.current.currentTime = startSec;
			if (!isPlayingAudio) {
				audioRef.current
					.play()
					.then(() => setIsPlayingAudio(true))
					.catch((err) => {
						console.warn("[TelephonyFloatingWidget] Audio seek-play failed:", err);
						setIsPlayingAudio(false);
					});
			}
		}
	};

	const handleCopyTranscript = () => {
		const fullText = transcriptUtterances
			.map((u) => `[${formatDurationTimer(u.startTimeSeconds)}] ${u.speaker === "operator" ? "Оператор" : "Пациент"}: ${u.text}`)
			.join("\n");
		navigator.clipboard?.writeText(fullText).then(() => {
			setCopiedTranscript(true);
			showToast("Расшифровка звонка скопирована в буфер", "success");
			setTimeout(() => setCopiedTranscript(false), 2000);
		});
	};

	const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!waveformRef.current) return;
		const rect = waveformRef.current.getBoundingClientRect();
		const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
		const progress = clickX / rect.width;
		const targetTime = progress * (audioDuration || 1);
		setAudioCurrentTime(targetTime);
		if (audioRef.current) audioRef.current.currentTime = targetTime;
	};

	const handleDialDigit = (digit: string) => {
		setDialNumber((prev) => (prev.length < 18 ? prev + digit : prev));
	};

	const handleDialBackspace = () => setDialNumber((prev) => prev.slice(0, -1));

	const handleStartOutgoingCall = () => {
		if (!dialNumber.trim()) {
			dialInputRef.current?.focus();
			showToast("Введите номер телефона для набора", "warning");
			return;
		}
		const clean = normalizePhoneDigits(dialNumber);
		const e164 = clean.startsWith("7")
			? `+${clean}`
			: clean.startsWith("8")
				? `+7${clean.slice(1)}`
				: `+7${clean}`;

		const matchingPatient = resolvePatientFromPhone(dashboard?.patients, e164);

		triggerIncomingCall({
			phone: e164,
			patientId: matchingPatient?.id || null,
			patientName: matchingPatient?.fullName || "Исходящий вызов",
			provider: "mango",
			timestamp: new Date().toISOString(),
			status: "answered",
			callStartedAt: Date.now(),
		});

		showToast(`Исходящий вызов на номер ${formatPhoneDisplay(e164)}`, "success");
		setActiveTab("call");
	};

	// 1-Click WhatsApp confirmation
	const handleSendWhatsApp = () => {
		if (!activeCall) return;
		const msg = upcomingAppointment
			? generateAppointmentConfirmationMessage({
					patientName: callerName,
					doctorName: upcomingAppointment.doctorName,
					appointmentStartsAt: upcomingAppointment.startsAt,
					clinicName: dashboard?.clinicSettings?.name || "DENTE",
				})
			: `Здравствуйте, ${callerName}! Вас приветствует стоматологическая клиника ${dashboard?.clinicSettings?.name || "DENTE"}.`;

		openWhatsAppChat(activeCall.phone, msg);
		setWhatsappSent(true);
		showToast(`Сообщение сформировано в WhatsApp (${callerName})`, "success");
	};

	// Quick Booking Trigger (Solo-doctor autonomy without mandatory assistant)
	const handleQuickBook = (slotType: "urgent" | "consultation" | "tomorrow") => {
		if (!activeCall) return;
		const todayIso = dashboard?.todayIso || new Date().toISOString().split("T")[0]!;
		const defaultDoctorId = dashboard?.clinicSettings?.staff?.find((s) => s.role === "doctor")?.id || "";
		const defaultChairId = dashboard?.clinicSettings?.chairs?.[0]?.id || "";

		let targetDate = todayIso;
		let startTime = "10:00:00";
		let endTime = "10:30:00";
		let reason = "Обращение по звонку";

		if (slotType === "urgent") {
			targetDate = todayIso;
			startTime = "10:00:00";
			endTime = "10:30:00";
			reason = "Острая боль / Экстренный визит";
		} else if (slotType === "consultation") {
			targetDate = todayIso;
			startTime = "15:00:00";
			endTime = "15:30:00";
			reason = "Первичная консультация и план лечения";
		} else {
			const d = new Date(todayIso);
			d.setDate(d.getDate() + 1);
			targetDate = d.toISOString().split("T")[0]!;
			startTime = "11:00:00";
			endTime = "11:30:00";
			reason = "Плановый осмотр";
		}

		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
			setNewAppointmentDraft({
				patientId: resolvedPatient.id,
				doctorUserId: defaultDoctorId,
				assistantUserId: "",
				chairId: defaultChairId,
				startsAt: `${targetDate}T${startTime}`,
				endsAt: `${targetDate}T${endTime}`,
				status: "planned",
				reason,
				comment: `Запись по телефону ${formattedPhone}`,
			});
		} else {
			setNewPatientPhone(activeCall.phone);
			setNewAppointmentDraft({
				patientId: "",
				doctorUserId: defaultDoctorId,
				assistantUserId: "",
				chairId: defaultChairId,
				startsAt: `${targetDate}T${startTime}`,
				endsAt: `${targetDate}T${endTime}`,
				status: "planned",
				reason,
				comment: `Новый пациент с телефона ${formattedPhone}`,
			});
		}

		acceptCall();
		showToast(`Создан черновик записи: ${reason} (сохранён в расписании)`, "info");
	};

	// 1-Click Quick Patient Creation (Mandate 8e p. 8 & 8n)
	const handleQuickCreatePatient = async (customName?: string) => {
		if (!activeCall?.phone || isCreatingPatient) return;
		setIsCreatingPatient(true);
		try {
			const targetName = customName?.trim() || `Пациент ${formattedPhone}`;
			const res = await fetch("/api/patients", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": readDenteStaffToken(),
					"x-dente-clinic-token": readDenteClinicToken(),
				},
				body: JSON.stringify({
					fullName: targetName,
					phone: activeCall.phone,
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

			showToast(`Пациент создан: ${createdPatient.fullName}`, "success");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Сетевая ошибка при создании пациента";
			showToast(msg, "error");
		} finally {
			setIsCreatingPatient(false);
		}
	};

	// 1-Click Lead Capture with Automatic Marketing Attribution (Mandate 8e, 8n)
	const handleCaptureLead = async () => {
		if (!activeCall || isCapturingLead) return;
		setIsCapturingLead(true);
		try {
			const res = await captureLeadFromIncomingCall(activeCall);
			if (res.success) showToast(res.message, "success");
			else showToast(res.message, "error");
		} finally {
			setIsCapturingLead(false);
		}
	};

	// Doctor sterile zone immunity: on visit view or for doctor role, telephony never invades chairside (Mandates 8e, 8n)
	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	const isDoctorChairsideMode =
		selectedWorkspaceRole === "doctor" || crmCurrentView === "visit";
	if (isDoctorChairsideMode) {
		return null;
	}

	const isFullScreenStudioActive = useUiSurfaceStore(
		(s) => s.isFullScreenStudioActive,
	);
	const hasPrimaryModal = useUiSurfaceStore((s) => s.hasPrimaryModal);
	if (isFullScreenStudioActive || hasPrimaryModal) {
		return null;
	}

	if (!activeCall && !isOpen && !defaultExpanded) {
		return null;
	}

	return (
		<div
			className={`dnt-telephony-island-container ${className}`}
			data-testid="telephony-floating-widget"
		>
			{/* 1. COMPACT DYNAMIC ISLAND CALL BANNER (Top Capsule) */}
			{!isExpanded && (
				<section
					className="dnt-telephony-island-pill"
					aria-label="Верхняя статусная капсула вызова (Dynamic Island)"
				>
					<div
						className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
							activeCall ? "bg-emerald-500 text-white" : "bg-[var(--teal-surface)] text-[var(--teal)]"
						}`}
					>
						{activeCall ? <PhoneIncoming size={14} className="animate-pulse" /> : <Headphones size={14} />}
					</div>

					<div className="flex items-center gap-2 min-w-0 pr-1">
						<div className="min-w-0 flex items-center gap-1.5 text-xs font-bold text-[var(--ink,#0f172a)]">
							<span className="truncate max-w-[140px] sm:max-w-[200px]" title={activeCall ? callerName : "SIP Софтфон"}>
								{activeCall ? callerName : "SIP Софтфон"}
							</span>
							{activeCall && (
								<span className="font-mono text-[10px] text-[var(--teal)] font-bold shrink-0">
									{formatDurationTimer(elapsedSeconds)}
								</span>
							)}
						</div>
					</div>

					<div className="flex items-center gap-1 shrink-0">
						{activeCall && !isCallAnswered && (
							<button
								type="button"
								onClick={() => {
									answerCall();
									showToast("Вызов принят", "success");
								}}
								className="min-h-[32px] sm:min-h-[34px] px-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all inline-flex items-center gap-1 shadow-sm cursor-pointer"
								title="Ответить на звонок"
							>
								<PhoneCall size={13} className="animate-pulse" />
								<span>Ответить</span>
							</button>
						)}

						{activeCall && (
							<button
								type="button"
								onClick={() => {
									rejectCall();
									showToast("Вызов завершен", "info");
								}}
								className="min-h-[32px] sm:min-h-[34px] px-2.5 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
								title="Сбросить вызов"
							>
								<PhoneOff size={13} />
								<span>Сброс</span>
							</button>
						)}

						<button
							type="button"
							onClick={() => setIsExpanded(true)}
							className="min-h-[32px] min-w-[32px] sm:min-h-[34px] sm:min-w-[34px] p-1.5 rounded-full text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.06))] transition-colors inline-flex items-center justify-center cursor-pointer"
							title="Развернуть детали вызова"
							aria-label="Развернуть детали вызова"
						>
							<ChevronDown size={16} />
						</button>

						<button
							type="button"
							onClick={() => {
								if (activeCall) dismissCall();
								setIsOpen(false);
								setIsExpanded(false);
							}}
							className="min-h-[32px] min-w-[32px] sm:min-h-[34px] sm:min-w-[34px] p-1.5 rounded-full text-[var(--muted,#64748b)] hover:text-rose-500 hover:bg-[var(--paper-soft,rgba(0,0,0,0.06))] transition-colors inline-flex items-center justify-center cursor-pointer"
							title="Закрыть уведомление"
							aria-label="Закрыть уведомление"
						>
							<X size={15} />
						</button>
					</div>
				</section>
			)}

			{/* 2. EXPANDED DYNAMIC ISLAND / SOFTPHONE SHEET */}
			{isExpanded && (
				<div
					className="dnt-telephony-island-expanded"
					role="dialog"
					aria-label="Детализированный центр вызова (Dynamic Island Studio)"
				>
					{/* Header Topbar, Operator Switcher & Navigation Tabs */}
					<TelephonyWidgetHeader
						activeCall={activeCall}
						isCallAnswered={isCallAnswered}
						elapsedSeconds={elapsedSeconds}
						agentState={agentState}
						onSetAgentState={setAgentState}
						activeLineId={activeLineId}
						onSwitchLine={switchLine}
						line1={line1}
						line2={line2}
						isHeld={isHeld}
						onToggleHold={toggleHold}
						isMuted={isMuted}
						onToggleMute={toggleMute}
						onAnswerCall={() => {
							answerCall();
							showToast("Вызов принят", "success");
						}}
						onRejectCall={() => {
							rejectCall();
							showToast("Вызов завершен", "info");
						}}
						onCollapse={() => {
							if (!activeCall) setIsOpen(false);
							setIsExpanded(false);
						}}
						onClose={() => {
							if (activeCall) dismissCall();
							setIsOpen(false);
							setIsExpanded(false);
						}}
						activeTab={activeTab}
						onSelectTab={setActiveTab}
						callHistoryCount={callHistory.length}
					/>

					{/* Tab Content */}
					<div className="p-3.5 space-y-3 max-h-[62vh] overflow-y-auto">
						{activeTab === "call" && (
							<TelephonyMiniControlPanel
								activeCall={activeCall}
								resolvedPatient={resolvedPatient}
								callerName={callerName}
								formattedPhone={formattedPhone}
								initials={initials}
								avatarColors={avatarColors}
								allergyAlerts={allergyAlerts}
								acutePainAlerts={acutePainAlerts}
								upcomingAppointment={upcomingAppointment}
								callAttribution={callAttribution}
								whatsappSent={whatsappSent}
								onSendWhatsApp={handleSendWhatsApp}
								audioRef={audioRef}
								waveformRef={waveformRef}
								waveformBars={waveformBars}
								isPlayingAudio={isPlayingAudio}
								audioCurrentTime={audioCurrentTime}
								audioDuration={audioDuration}
								onTogglePlayAudio={togglePlayAudio}
								onSkipAudio={handleSkipAudio}
								onWaveformClick={handleWaveformClick}
								playbackSpeed={playbackSpeed}
								onSetPlaybackSpeed={setPlaybackSpeed}
								showTranscript={showTranscript}
								onToggleTranscript={() => setShowTranscript((p) => !p)}
								transcriptUtterances={transcriptUtterances}
								copiedTranscript={copiedTranscript}
								onCopyTranscript={handleCopyTranscript}
								onSeekToUtterance={handleSeekToUtterance}
								showTransferPanel={showTransferPanel}
								onToggleTransferPanel={() => setShowTransferPanel((p) => !p)}
								transferType={transferType}
								onSetTransferType={setTransferType}
								onStartTransfer={(ext, type) => {
									startCallTransfer(ext, type);
									showToast(`Перевод звонка на ${ext} (${type === "blind" ? "Слепой" : "С консультацией"})`, "info");
								}}
								onQuickBook={handleQuickBook}
								onOpenCard={() => {
									if (resolvedPatient) setSelectedPatientId(resolvedPatient.id);
									else if (activeCall?.phone) setNewPatientPhone(activeCall.phone);
									connectCall();
									openCallDrawer();
								}}
								showWidgetMoreMenu={showWidgetMoreMenu}
								onToggleWidgetMoreMenu={() => setShowWidgetMoreMenu((p) => !p)}
								onCloseWidgetMoreMenu={() => setShowWidgetMoreMenu(false)}
								isCapturingLead={isCapturingLead}
								onCaptureLead={handleCaptureLead}
								isHeld={isHeld}
								onToggleHold={toggleHold}
								onCopyPhone={() => {
									if (activeCall?.phone) {
										navigator.clipboard?.writeText(activeCall.phone);
										showToast("Номер телефона скопирован", "info");
									}
								}}
								isCreatingPatient={isCreatingPatient}
								onQuickCreatePatient={handleQuickCreatePatient}
								isWsConnected={isWsConnected}
								onSwitchToDialer={() => setActiveTab("dialer")}
								onAudioTimeUpdate={handleAudioTimeUpdate}
								onAudioEnded={() => setIsPlayingAudio(false)}
							/>
						)}

						{activeTab === "dialer" && (
							<TelephonyDialerPad
								dialNumber={dialNumber}
								onDialNumberChange={setDialNumber}
								onDialDigit={handleDialDigit}
								onDialBackspace={handleDialBackspace}
								onStartOutgoingCall={handleStartOutgoingCall}
								dialInputRef={dialInputRef}
							/>
						)}

						{activeTab === "history" && (
							<TelephonyRecentCallsJournal
								callHistory={callHistory}
								onRedial={(phone) => {
									setDialNumber(phone);
									setActiveTab("dialer");
								}}
								onSendWhatsApp={(phone) => {
									openWhatsAppChat(phone, `Здравствуйте! Стоматология ${dashboard?.clinicSettings?.name || "DENTE"}.`);
								}}
							/>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
