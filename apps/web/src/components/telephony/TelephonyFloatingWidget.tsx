import {
	AlertCircle,
	AlertTriangle,
	Calendar,
	CalendarCheck,
	Check,
	ChevronDown,
	ChevronUp,
	Clock,
	Copy,
	CreditCard,
	Delete,
	FileText,
	Headphones,
	History,
	Maximize2,
	MessageSquare,
	Mic,
	MicOff,
	Minimize2,
	Pause,
	Phone,
	PhoneCall,
	PhoneForwarded,
	PhoneIncoming,
	PhoneOff,
	PhoneOutgoing,
	Play,
	Plus,
	RotateCcw,
	RotateCw,
	Send,
	Shield,
	ShieldAlert,
	Sliders,
	Sparkles,
	Stethoscope,
	User,
	UserCheck,
	Volume2,
	VolumeX,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useScheduleStore } from "../../store/scheduleStore";
import {
	calculatePatientFinancialStatus,
	formatDurationTimer,
	formatPatientInitials,
	formatPhoneDisplay,
	generateAppointmentConfirmationMessage,
	generateCallTranscript,
	generateWaveformBars,
	generateWhatsAppConfirmationUrl,
	getAvatarColor,
	normalizePhoneDigits,
	openWhatsAppChat,
	type PlaybackSpeed,
	resolvePatientFromPhone,
	resolvePatientLastVisit,
	resolvePatientUpcomingAppointment,
	useTelephonyStore,
} from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";
import "./telephonyFloatingWidget.css";

export interface TelephonyFloatingWidgetProps {
	className?: string;
	defaultExpanded?: boolean;
	showDialerDefault?: boolean;
}

/**
 * Floating Softphone / Telephony Widget with prominent >=48x48px call buttons,
 * >=44x44px audio recording controls & speed toggles, quick dialing pad, and patient clinical summary.
 */
export function TelephonyFloatingWidget({
	className = "",
	defaultExpanded = false,
	showDialerDefault = false,
}: TelephonyFloatingWidgetProps) {
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const triggerIncomingCall = useTelephonyStore((s) => s.triggerIncomingCall);
	const answerCall = useTelephonyStore((s) => s.answerCall);
	const acceptCall = useTelephonyStore((s) => s.acceptCall);
	const rejectCall = useTelephonyStore((s) => s.rejectCall);
	const dismissCall = useTelephonyStore((s) => s.dismissCall);
	const startCallTransfer = useTelephonyStore((s) => s.startCallTransfer);
	const transferState = useTelephonyStore((s) => s.transferState);
	const callHistory = useTelephonyStore((s) => s.callHistory);
	const isMuted = useTelephonyStore((s) => s.isMuted);
	const toggleMute = useTelephonyStore((s) => s.toggleMute);
	const volumeLevel = useTelephonyStore((s) => s.volumeLevel);
	const playbackSpeed = useTelephonyStore((s) => s.playbackSpeed);
	const setPlaybackSpeed = useTelephonyStore((s) => s.setPlaybackSpeed);
	const agentState = useTelephonyStore((s) => s.agentState);
	const setAgentState = useTelephonyStore((s) => s.setAgentState);
	const activeLineId = useTelephonyStore((s) => s.activeLineId);
	const switchLine = useTelephonyStore((s) => s.switchLine);
	const isHeld = useTelephonyStore((s) => s.isHeld);
	const toggleHold = useTelephonyStore((s) => s.toggleHold);
	const openSimulator = useTelephonyStore((s) => s.openSimulator);

	const ctx = useAppLogicContext();
	const dashboard = ctx?.dashboard;

	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const setNewAppointmentDraft = useScheduleStore((s) => s.setNewAppointmentDraft);

	const [isExpanded, setIsExpanded] = useState(defaultExpanded || Boolean(activeCall));
	const [activeTab, setActiveTab] = useState<"call" | "dialer" | "history">("call");
	const [dialNumber, setDialNumber] = useState("");
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [isPlayingAudio, setIsPlayingAudio] = useState(false);
	const [audioCurrentTime, setAudioCurrentTime] = useState(0);
	const [audioDuration, setAudioDuration] = useState(45);
	const [whatsappSent, setWhatsappSent] = useState(false);
	const [smsCopied, setSmsCopied] = useState(false);
	const [showTranscript, setShowTranscript] = useState(false);
	const [copiedTranscript, setCopiedTranscript] = useState(false);
	const [showTransferPanel, setShowTransferPanel] = useState(false);
	const [transferType, setTransferType] = useState<"blind" | "attended">("blind");

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const waveformRef = useRef<HTMLDivElement | null>(null);

	// Expand automatically when an incoming call arrives
	useEffect(() => {
		if (activeCall) {
			setIsExpanded(true);
			setActiveTab("call");
		}
	}, [activeCall]);

	// Call Duration Timer
	useEffect(() => {
		if (!activeCall) {
			setElapsedSeconds(0);
			return;
		}
		const startTime = activeCall.callStartedAt ?? Date.now();
		const interval = setInterval(() => {
			const seconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
			setElapsedSeconds(seconds);
		}, 1000);
		return () => clearInterval(interval);
	}, [activeCall]);

	// Sync playback speed to audio element
	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.playbackRate = playbackSpeed;
		}
	}, [playbackSpeed]);

	// Sync audio volume & mute
	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.muted = isMuted;
			audioRef.current.volume = volumeLevel;
		}
	}, [isMuted, volumeLevel]);

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
		return (
			dashboard.patientInsights.find((pi) => pi.patientId === resolvedPatient.id) ||
			null
		);
	}, [resolvedPatient, dashboard?.patientInsights]);

	const financialSummary = useMemo(() => {
		return calculatePatientFinancialStatus(
			resolvedPatient,
			patientInsight,
			dashboard?.insuranceContracts,
		);
	}, [resolvedPatient, patientInsight, dashboard?.insuranceContracts]);

	const lastVisitSummary = useMemo(() => {
		return resolvePatientLastVisit(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		resolvedPatient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const upcomingAppointment = useMemo(() => {
		return resolvePatientUpcomingAppointment(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		resolvedPatient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const callerName =
		resolvedPatient?.fullName || activeCall?.patientName || "Неизвестный номер";
	const formattedPhone = formatPhoneDisplay(activeCall?.phone || dialNumber);
	const initials = formatPatientInitials(callerName);
	const avatarColors = getAvatarColor(callerName);
	const isCallAnswered = activeCall?.status === "answered";

	const waveformBars = useMemo(() => {
		return generateWaveformBars(activeCall?.callId || activeCall?.phone || "sample-rec", 36);
	}, [activeCall?.callId, activeCall?.phone]);

	const transcriptUtterances = useMemo(() => {
		return generateCallTranscript(activeCall?.callId || activeCall?.phone || "sample-rec", audioDuration);
	}, [activeCall?.callId, activeCall?.phone, audioDuration]);

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
				.catch(() => setIsPlayingAudio(true));
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
				audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => setIsPlayingAudio(true));
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
		if (audioRef.current) {
			audioRef.current.currentTime = targetTime;
		}
	};

	// Dialpad Handlers
	const handleDialDigit = (digit: string) => {
		setDialNumber((prev) => (prev.length < 18 ? prev + digit : prev));
	};

	const handleDialBackspace = () => {
		setDialNumber((prev) => prev.slice(0, -1));
	};

	const handleStartOutgoingCall = () => {
		if (!dialNumber.trim()) {
			showToast("Введите номер телефона для совершения вызова", "warning");
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
			recordingUrl: `https://records.mango-office.ru/out-${Date.now()}.mp3`,
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

	// Quick Booking Trigger
	const handleQuickBook = (slotType: "urgent" | "consultation" | "tomorrow") => {
		if (!activeCall) return;
		const todayIso = dashboard?.todayIso || new Date().toISOString().split("T")[0]!;
		const defaultDoctorId =
			dashboard?.clinicSettings?.staff?.find((s) => s.role === "doctor")?.id || "";
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

		setCurrentView("schedule");
		acceptCall();
		showToast(`Создан черновик записи: ${reason}`, "info");
	};

	const speeds: PlaybackSpeed[] = [1, 1.25, 1.5, 2];
	const audioProgressPct =
		audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0;

	if (typeof document === "undefined") return null;

	return createPortal(
		<div
			className={`dnt-telephony-floating ${className}`}
			data-testid="telephony-floating-widget"
		>
			{/* Collapsed Floating Launcher (44px compact badge on desktop/mobile) */}
			{!isExpanded && !activeCall && (
				<button
					type="button"
					onClick={() => setIsExpanded(true)}
					className={`dnt-telephony-launcher ${
						activeCall ? "dnt-telephony-launcher--active" : ""
					}`}
					title={activeCall ? "Активный вызов телефонии" : "Открыть софтфон телефонии (44px)"}
					aria-label={activeCall ? "Активный вызов телефонии" : "Открыть софтфон телефонии"}
				>
					<div
						className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
							activeCall ? "bg-white/20 text-white" : "bg-[var(--teal-surface)] text-[var(--teal)]"
						}`}
					>
						{activeCall ? (
							<PhoneIncoming size={18} className="animate-bounce" />
						) : (
							<Phone size={18} />
						)}
					</div>

					<div className="dnt-telephony-launcher-text pr-1">
						<div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
							<span>{activeCall ? "Телефония" : "Софтфон"}</span>
							{activeCall && (
								<span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
							)}
						</div>
						<span className="text-[11px] font-mono opacity-90 truncate max-w-[140px]">
							{activeCall ? formattedPhone : "АТС Готова"}
						</span>
					</div>

					<ChevronUp size={16} className="dnt-telephony-launcher-chevron opacity-70 group-hover:opacity-100 transition-opacity" />
				</button>
			)}

			{/* Expanded Floating Softphone Card */}
			{isExpanded && (
				<div
					className="dnt-telephony-card"
					role="region"
					aria-label="Плавающий виджет софтфона телефонии"
				>
					{/* Header Topbar (Dense 32px toolbars) */}
					<div className="flex items-center justify-between px-3.5 py-2 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))]">
						<div className="flex items-center gap-2 min-w-0">
							<div className="w-7 h-7 rounded-lg bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] flex-shrink-0">
								{activeCall ? <PhoneCall size={14} /> : <Headphones size={14} />}
							</div>
							<div className="min-w-0">
								<div className="flex items-center gap-1.5">
									<h4 className="text-xs font-black uppercase tracking-wider text-[var(--ink,#0f172a)] truncate">
										{activeCall
											? isCallAnswered
												? "Разговор"
												: "Входящий"
											: "SIP Софтфон"}
									</h4>
									{activeCall && (
										<span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]">
											{formatDurationTimer(elapsedSeconds)}
										</span>
									)}
								</div>
								<div className="flex items-center gap-1 text-[10px] text-[var(--muted,#64748b)]">
									<span
										className={`w-1.5 h-1.5 rounded-full ${
											agentState === "online"
												? "bg-emerald-400"
												: agentState === "dnd"
													? "bg-rose-400"
													: agentState === "pause"
														? "bg-amber-400"
														: "bg-slate-400"
										}`}
									/>
									<span className="truncate">
										{agentState === "online"
											? "Онлайн"
											: agentState === "dnd"
												? "Занят"
												: agentState === "pause"
													? "Перерыв"
													: "Офлайн"}
									</span>
								</div>
							</div>
						</div>

						<div className="flex items-center gap-1">
							{/* Simulator launcher - 32px */}
							<button
								type="button"
								onClick={openSimulator}
								className="min-h-[32px] min-w-[32px] h-8 w-8 p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] transition-colors inline-flex items-center justify-center cursor-pointer"
								title="Симулятор SIP телефонии"
								aria-label="Симулятор SIP телефонии"
							>
								<Sliders size={15} />
							</button>

							{/* Mute toggle - 32px */}
							<button
								type="button"
								onClick={toggleMute}
								className="min-h-[32px] min-w-[32px] h-8 w-8 p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] transition-colors inline-flex items-center justify-center cursor-pointer"
								title={isMuted ? "Включить звук звонка" : "Выключить звук звонка"}
								aria-label={isMuted ? "Включить звук звонка" : "Выключить звук звонка"}
							>
								{isMuted ? (
									<VolumeX size={15} className="text-rose-500" />
								) : (
									<Volume2 size={15} />
								)}
							</button>

							{/* Minimize/Collapse - 32px */}
							<button
								type="button"
								onClick={() => setIsExpanded(false)}
								className="min-h-[32px] min-w-[32px] h-8 w-8 p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] transition-colors inline-flex items-center justify-center cursor-pointer"
								title="Свернуть софтфон"
								aria-label="Свернуть софтфон"
							>
								<ChevronDown size={16} />
							</button>
						</div>
					</div>

					{/* Operator Readiness State & Multi-Line Switcher Bar (Dense 28px) */}
					<div className="flex items-center justify-between px-3 py-1 bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border-b border-[var(--line,#e2e8f0)] gap-1 text-xs">
						{/* Agent State Pills */}
						<div className="flex items-center gap-1">
							{(
								[
									{ id: "online", label: "Онлайн", color: "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800/60" },
									{ id: "dnd", label: "Занят", color: "text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800/60" },
									{ id: "pause", label: "Пауза", color: "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800/60" },
								] as const
							).map((st) => (
								<button
									key={st.id}
									type="button"
									onClick={() => setAgentState(st.id)}
									className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all h-6 inline-flex items-center ${
										agentState === st.id
											? `${st.color} shadow-xs`
											: "text-[var(--muted,#64748b)] border-transparent hover:text-[var(--ink,#0f172a)]"
									}`}
								>
									{st.label}
								</button>
							))}
						</div>

						{/* Line 1 & Line 2 Switcher Pills (Dense & compact) */}
						<div className="flex items-center gap-1 bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-lg p-0.5 border border-[var(--line,#e2e8f0)]">
							<button
								type="button"
								onClick={() => switchLine(1)}
								className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all h-6 inline-flex items-center ${
									activeLineId === 1
										? "bg-[var(--teal)] text-white shadow-xs"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Л1 {activeCall ? "●" : "○"}
							</button>
							<button
								type="button"
								onClick={() => switchLine(2)}
								className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all h-6 inline-flex items-center ${
									activeLineId === 2
										? "bg-[var(--teal)] text-white shadow-xs"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Л2 ○
							</button>
							{activeCall && (
								<button
									type="button"
									onClick={toggleHold}
									className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all h-6 inline-flex items-center ${
										isHeld
											? "bg-amber-500 text-slate-950 border-amber-400 shadow-xs"
											: "text-amber-500 border-transparent hover:bg-amber-500/10"
									}`}
									title={isHeld ? "Снять с удержания" : "Поставить звонок на удержание (Hold)"}
								>
									{isHeld ? "Удержание" : "Hold"}
								</button>
							)}
						</div>
					</div>

					{/* Navigation Tabs (Dense 32px Segmented Control) */}
					<div className="p-1 bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] border-b border-[var(--line,#e2e8f0)] flex items-center gap-1">
						<button
							type="button"
							onClick={() => setActiveTab("call")}
							className={`flex-1 min-h-[32px] h-8 px-2 py-1 rounded-lg text-[11px] font-bold transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 min-w-max ${
								activeTab === "call"
									? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--teal)] shadow-xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.04))] border border-transparent"
							}`}
						>
							<PhoneIncoming size={13} className="flex-shrink-0" />
							<span className="whitespace-nowrap flex-shrink-0 min-w-max">{activeCall ? "Вызов" : "Вызов"}</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("dialer")}
							className={`flex-1 min-h-[32px] h-8 px-2 py-1 rounded-lg text-[11px] font-bold transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 min-w-max ${
								activeTab === "dialer"
									? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--teal)] shadow-xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.04))] border border-transparent"
							}`}
						>
							<PhoneOutgoing size={13} className="flex-shrink-0" />
							<span className="whitespace-nowrap flex-shrink-0 min-w-max">Набор</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("history")}
							className={`flex-1 min-h-[32px] h-8 px-2 py-1 rounded-lg text-[11px] font-bold transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 min-w-max ${
								activeTab === "history"
									? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--teal)] shadow-xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.04))] border border-transparent"
							}`}
						>
							<History size={13} className="flex-shrink-0" />
							<span className="whitespace-nowrap flex-shrink-0 min-w-max">Журнал{callHistory.length > 0 ? ` (${callHistory.length})` : ""}</span>
						</button>
					</div>

					{/* Tab Content */}
					<div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
						{/* TAB 1: CALL VIEW */}
						{activeTab === "call" && (
							<>
								{activeCall ? (
									<>
										{/* Patient Profile Header - Clean 2-Line Name Wrap */}
										<div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)]">
											<div
												className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 border"
												style={{
													backgroundColor: avatarColors.bg,
													color: avatarColors.text,
													borderColor: avatarColors.border,
												}}
											>
												{resolvedPatient ? initials : <User size={18} />}
											</div>

											<div className="flex-1 min-w-0">
												<div className="flex items-start justify-between gap-1.5">
													<span className="font-bold text-xs sm:text-sm text-[var(--ink,#0f172a)] leading-snug break-words line-clamp-2 max-w-full">
														{callerName}
													</span>
													{resolvedPatient ? (
														<span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/60 px-1.5 py-0.2 rounded shrink-0 self-start">
															<UserCheck size={10} /> Пациент
														</span>
													) : (
														<span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800/60 px-1.5 py-0.2 rounded shrink-0 self-start">
															<AlertCircle size={10} /> Новый лид
														</span>
													)}
												</div>
												<div className="text-[11px] font-mono text-[var(--muted,#64748b)] mt-0.5">
													{formattedPhone}
												</div>
											</div>
										</div>

										{/* Upcoming Appointment & WhatsApp Reminder */}
										{upcomingAppointment && (
											<div className="p-2.5 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex flex-col gap-2">
												<div className="flex flex-wrap items-center justify-between text-xs gap-1">
													<div className="flex items-center gap-1.5 font-bold text-[var(--teal)] min-w-0">
														<CalendarCheck size={14} className="text-[var(--teal)] flex-shrink-0" />
														<span className="break-words">
															{upcomingAppointment.isToday
																? "Запись сегодня"
																: upcomingAppointment.isTomorrow
																	? "Запись завтра"
																	: upcomingAppointment.formattedDate}
															{" в "}
															{upcomingAppointment.formattedTime}
														</span>
													</div>
													{upcomingAppointment.doctorName && (
														<span className="text-[11px] text-[var(--ink,#0f172a)] font-medium break-words">
															{upcomingAppointment.doctorName}
														</span>
													)}
												</div>
												<button
													type="button"
													onClick={handleSendWhatsApp}
													className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-2 shadow-sm"
												>
													<MessageSquare size={14} />
													<span>
														{whatsappSent ? "Отправлено в WhatsApp ✓" : "1-Click WhatsApp"}
													</span>
												</button>
											</div>
										)}

										{/* Audio Recording Player Strip with Waveform & Speed Toggles */}
										{activeCall.recordingUrl && (
											<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--glass-border,var(--line,#e2e8f0))] text-[var(--ink,#0f172a)] flex flex-col gap-2 shadow-xs">
												<audio
													ref={audioRef}
													src={activeCall.recordingUrl}
													onTimeUpdate={handleAudioTimeUpdate}
													onEnded={() => setIsPlayingAudio(false)}
												/>
												<div className="flex flex-wrap items-center justify-between gap-2">
													<div className="flex items-center gap-2">
														{/* Play / Pause button >= 44x44px */}
														<button
															type="button"
															onClick={togglePlayAudio}
															className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white flex items-center justify-center transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
															title={isPlayingAudio ? "Пауза" : "Воспроизвести запись"}
															aria-label={isPlayingAudio ? "Пауза" : "Воспроизвести запись"}
														>
															{isPlayingAudio ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
														</button>

														{/* Skip -10s >= 44x44px */}
														<button
															type="button"
															onClick={() => handleSkipAudio(-10)}
															className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] inline-flex items-center justify-center transition-colors"
															title="Назад на 10 сек"
														>
															<RotateCcw size={16} />
														</button>

														{/* Skip +10s >= 44x44px */}
														<button
															type="button"
															onClick={() => handleSkipAudio(10)}
															className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] inline-flex items-center justify-center transition-colors"
															title="Вперед на 10 сек"
														>
															<RotateCw size={16} />
														</button>
													</div>

													{/* Speed toggles >= 44x44px */}
													<div className="flex items-center bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-xl p-1 border border-[var(--line,#e2e8f0)] gap-1">
														{speeds.map((s) => (
															<button
																key={s}
																type="button"
																onClick={() => setPlaybackSpeed(s)}
																className={`min-h-[44px] min-w-[44px] px-2 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center ${
																	playbackSpeed === s
																		? "bg-[var(--teal)] text-white shadow-xs"
																		: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))]"
																}`}
																title={`Скорость ${s}x`}
															>
																{s}x
															</button>
														))}
													</div>
												</div>

												{/* Waveform Scrubber */}
												<div
													ref={waveformRef}
													onClick={handleWaveformClick}
													className="h-9 w-full flex items-center justify-between gap-[2px] px-1.5 py-1 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] cursor-pointer relative overflow-hidden transition-colors"
													role="slider"
													aria-valuemin={0}
													aria-valuemax={audioDuration}
													aria-valuenow={audioCurrentTime}
													aria-label="Интерактивная звуковая волна записи звонка"
												>
													{waveformBars.map((amp, idx) => {
														const barPct = (idx / waveformBars.length) * 100;
														const isPast = barPct <= audioProgressPct;
														const barHeight = Math.max(3, Math.round(amp * 24));
														return (
															<div
																// biome-ignore lint/suspicious/noArrayIndexKey: fixed count bars
																key={idx}
																style={{ height: `${barHeight}px` }}
																className={`flex-1 rounded-full transition-colors ${
																	isPast ? "bg-[var(--teal)] shadow-xs" : "bg-[var(--line-strong,var(--line,#cbd5e1))] hover:bg-[var(--muted,#94a3b8)]"
																}`}
															/>
														);
													})}
													<div
														className="absolute top-0 bottom-0 w-[2px] bg-emerald-500 pointer-events-none"
														style={{ left: `${audioProgressPct}%` }}
													/>
												</div>

												{/* Speech-to-Text Transcript Drawer Toggle */}
												<div className="pt-1 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between">
													<button
														type="button"
														onClick={() => setShowTranscript((prev) => !prev)}
														className="text-xs font-bold text-[var(--teal)] hover:opacity-90 inline-flex items-center gap-1.5 min-h-[36px] py-1 transition-colors"
													>
														<Sparkles size={13} className="text-amber-500" />
														<span>{showTranscript ? "Скрыть расшифровку" : "Расшифровка речи (AI STT)"}</span>
													</button>

													{showTranscript && (
														<button
															type="button"
															onClick={handleCopyTranscript}
															className="text-[11px] font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] transition-colors"
															title="Скопировать текст диалога"
														>
															{copiedTranscript ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
															<span>{copiedTranscript ? "Скопировано" : "Копировать"}</span>
														</button>
													)}
												</div>

												{/* Expanded Speech Transcript Dialogue Utterances */}
												{showTranscript && (
													<div className="space-y-2 max-h-40 overflow-y-auto pr-1 pt-1 animate-fade-in">
														{transcriptUtterances.map((u) => (
															<div
																key={`${u.speaker}-${u.startTimeSeconds}`}
																onClick={() => handleSeekToUtterance(u.startTimeSeconds)}
																className={`p-2 rounded-lg cursor-pointer transition-all border ${
																	audioCurrentTime >= u.startTimeSeconds && audioCurrentTime <= u.endTimeSeconds
																		? "bg-[var(--teal-surface)] border-[var(--teal-soft)] shadow-xs"
																		: "bg-[var(--paper-strong,var(--paper,#ffffff))] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))]"
																}`}
																title="Кликните для перехода к реплике"
															>
																<div className="flex items-center justify-between text-[10px] mb-1">
																	<div className="flex items-center gap-1.5 font-bold">
																		<span
																			className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
																				u.speaker === "operator"
																					? "bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]"
																					: "bg-[var(--info-bg,rgba(2,132,199,0.1))] text-[var(--info-fg,#0284c7)] border border-[var(--info-fg,rgba(2,132,199,0.3))]"
																			}`}
																		>
																			{u.speaker === "operator" ? "Оператор" : "Пациент"}
																		</span>
																		<span className="font-mono text-[var(--muted,#64748b)]">
																			{formatDurationTimer(u.startTimeSeconds)} - {formatDurationTimer(u.endTimeSeconds)}
																		</span>
																	</div>
																	<span className="text-[9px] text-[var(--muted,#64748b)]">
																		{(u.confidence * 100).toFixed(0)}%
																	</span>
																</div>
																<p className="text-[var(--ink,#0f172a)] text-[11px] leading-relaxed">
																	{u.text}
																</p>
															</div>
														))}
													</div>
												)}
											</div>
										)}

										{/* WebRTC SIP Call Transfer Panel (when active call is present) */}
										{activeCall && (
											<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] flex flex-col gap-2.5 text-xs">
												<button
													type="button"
													onClick={() => setShowTransferPanel((prev) => !prev)}
													className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--teal)] transition-all flex items-center justify-between shadow-xs active:scale-[0.99]"
												>
													<div className="flex items-center gap-2">
														<PhoneForwarded size={16} className="text-[var(--teal)] flex-shrink-0" />
														<span>{showTransferPanel ? "Скрыть перевод звонка" : "Перевод звонка (SIP Transfer)"}</span>
													</div>
													<ChevronDown
														size={16}
														className={`transition-transform duration-200 ${showTransferPanel ? "rotate-180" : ""}`}
													/>
												</button>

												{showTransferPanel && (
													<div className="space-y-2.5 pt-1 animate-fade-in">
														<div className="flex items-center gap-1 bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-lg p-1 border border-[var(--line,#e2e8f0)] text-xs">
															<button
																type="button"
																onClick={() => setTransferType("blind")}
																className={`flex-1 min-h-[38px] py-1.5 px-2 rounded-md font-bold text-xs transition-all flex items-center justify-center ${
																	transferType === "blind"
																		? "bg-[var(--teal)] text-white shadow-xs"
																		: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
																}`}
															>
																Слепой
															</button>
															<button
																type="button"
																onClick={() => setTransferType("attended")}
																className={`flex-1 min-h-[38px] py-1.5 px-2 rounded-md font-bold text-xs transition-all flex items-center justify-center ${
																	transferType === "attended"
																		? "bg-[var(--teal)] text-white shadow-xs"
																		: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
																}`}
															>
																С консультацией
															</button>
														</div>

														<div className="grid grid-cols-4 gap-1.5">
															{[
																{ ext: "101", label: "101 Терапевт" },
																{ ext: "102", label: "102 Хирург" },
																{ ext: "103", label: "103 Ортопед" },
																{ ext: "104", label: "104 Ресепшн" },
															].map((item) => (
																<button
																	key={item.ext}
																	type="button"
																	onClick={() => {
																		startCallTransfer(item.ext, transferType);
																		showToast(
																			`Перевод звонка на ${item.label} (${transferType === "blind" ? "Слепой" : "С консультацией"})`,
																			"info",
																		);
																	}}
																	className="min-h-[48px] px-1.5 py-1.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-[10px] font-bold text-center flex flex-col items-center justify-center transition-all active:scale-95 shadow-xs"
																>
																	<span className="font-mono text-[var(--teal)]">{item.ext}</span>
																	<span className="text-[9px] font-normal text-[var(--muted,#64748b)] truncate w-full">
																		{item.label.split(" ")[1]}
																	</span>
																</button>
															))}
														</div>
													</div>
												)}
											</div>
										)}

										{/* Touch-First Quick Booking Presets */}
										<div className="space-y-1.5">
											<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1">
												<Zap size={11} className="text-amber-400" />
												Быстрая запись в 1 касание:
											</span>
											<div className="grid grid-cols-3 gap-1.5">
												<button
													type="button"
													onClick={() => handleQuickBook("urgent")}
													className="min-h-[44px] p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center leading-tight active:scale-95"
												>
													<span>⚡ Острая боль</span>
													<span className="text-[9px] opacity-80">10:00</span>
												</button>

												<button
													type="button"
													onClick={() => handleQuickBook("consultation")}
													className="min-h-[44px] p-2 rounded-xl bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] border border-[var(--teal-soft)] text-[var(--teal)] text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center leading-tight active:scale-95"
												>
													<span>📅 Консультация</span>
													<span className="text-[9px] opacity-80">15:00</span>
												</button>

												<button
													type="button"
													onClick={() => handleQuickBook("tomorrow")}
													className="min-h-[44px] p-2 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] hover:bg-[var(--paper-soft,#e2e8f0)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center leading-tight active:scale-95"
												>
													<span>🗓️ Завтра</span>
													<span className="text-[9px] opacity-80">11:00</span>
												</button>
											</div>
										</div>

										{/* PROMINENT LARGE CALL ACTION BUTTONS (>= 48x48px) */}
										<div className="flex items-center gap-2 pt-1">
											{/* Hangup / Reject Button >= 48x48px */}
											<button
												type="button"
												onClick={() => {
													rejectCall();
													showToast("Вызов завершен", "info");
												}}
												className="min-h-[48px] min-w-[48px] px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 active:scale-95 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100 text-sm font-bold transition-all inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-rose-500"
												aria-label="Отклонить вызов"
											>
												<PhoneOff size={18} />
												<span>Сброс</span>
											</button>

											{/* Answer Button >= 48x48px (if ringing) */}
											{!isCallAnswered && (
												<button
													type="button"
													onClick={() => {
														answerCall();
														showToast("Вызов принят", "success");
													}}
													className="min-h-[48px] min-w-[48px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-bold transition-all inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
													aria-label="Ответить на входящий вызов"
												>
													<PhoneCall size={18} className="animate-pulse" />
													<span>Ответить</span>
												</button>
											)}

											{/* Accept & Open Patient Card */}
											<button
												type="button"
												onClick={() => {
													if (resolvedPatient) {
														setSelectedPatientId(resolvedPatient.id);
														setCurrentView("patients");
														acceptCall();
													} else {
														setNewPatientPhone(activeCall.phone);
														setCurrentView("patients");
														acceptCall();
													}
												}}
												className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white text-sm font-bold transition-all inline-flex items-center justify-center gap-2 shadow-lg shadow-teal-950/40 focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
											>
												<UserCheck size={18} />
												<span>{resolvedPatient ? "Открыть карту" : "Создать"}</span>
											</button>
										</div>
									</>
								) : (
									<div className="py-8 px-4 text-center space-y-3">
										<div className="w-14 h-14 rounded-2xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center mx-auto">
											<Phone size={24} />
										</div>
										<div>
											<h4 className="text-sm font-bold text-[var(--ink,#0f172a)]">
												Нет активных входящих звонков
											</h4>
											<p className="text-xs text-[var(--muted,#64748b)] mt-1">
												Используйте вкладку «Набор номера» для исходящего вызова или симулятор.
											</p>
										</div>
										<button
											type="button"
											onClick={() => setActiveTab("dialer")}
											className="min-h-[44px] px-4 py-2 rounded-xl bg-[var(--teal)] hover:opacity-90 text-white text-xs font-bold transition-all inline-flex items-center gap-2"
										>
											<PhoneOutgoing size={14} />
											<span>Набрать номер</span>
										</button>
									</div>
								)}
							</>
						)}

						{/* TAB 2: DIALER PAD */}
						{activeTab === "dialer" && (
							<div className="space-y-3">
								{/* Number Display Input */}
								<div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)]">
									<input
										type="text"
										value={dialNumber}
										onChange={(e) => setDialNumber(e.target.value)}
										placeholder="+7 (___) ___-__-__"
										className="flex-1 bg-transparent text-[var(--ink,#0f172a)] text-base font-mono font-bold tracking-wider focus:outline-none px-2"
									/>
									{dialNumber && (
										<button
											type="button"
											onClick={handleDialBackspace}
											className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--muted,#64748b)] hover:text-rose-500 hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] transition-colors inline-flex items-center justify-center"
											aria-label="Стереть цифру"
										>
											<Delete size={18} />
										</button>
									)}
								</div>

								{/* Touch-Friendly Numeric Keypad (48px min touch target per key) */}
								<div className="grid grid-cols-3 gap-2">
									{[
										{ d: "1", sub: "" },
										{ d: "2", sub: "ABC" },
										{ d: "3", sub: "DEF" },
										{ d: "4", sub: "GHI" },
										{ d: "5", sub: "JKL" },
										{ d: "6", sub: "MNO" },
										{ d: "7", sub: "PQRS" },
										{ d: "8", sub: "TUV" },
										{ d: "9", sub: "WXYZ" },
										{ d: "*", sub: "" },
										{ d: "0", sub: "+" },
										{ d: "#", sub: "" },
									].map((k) => (
										<button
											key={k.d}
											type="button"
											onClick={() => handleDialDigit(k.d)}
											className="min-h-[48px] py-2.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] active:scale-95 border border-[var(--line,#e2e8f0)] hover:border-[var(--teal)] text-[var(--ink,#0f172a)] transition-all flex flex-col items-center justify-center select-none shadow-xs"
										>
											<span className="text-base font-black leading-none">{k.d}</span>
											{k.sub && (
												<span className="text-[9px] font-semibold text-[var(--muted,#64748b)] mt-0.5">
													{k.sub}
												</span>
											)}
										</button>
									))}
								</div>

								{/* Large Prominent Outgoing Call Action Button (>= 48x48px) */}
								<button
									type="button"
									onClick={handleStartOutgoingCall}
									disabled={!dialNumber.trim()}
									className="w-full min-h-[48px] py-3 rounded-xl bg-[var(--teal)] hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none active:scale-98 text-white text-sm font-bold transition-all inline-flex items-center justify-center gap-2 shadow-lg shadow-teal-950/40"
									aria-label="Совершить исходящий вызов"
								>
									<PhoneCall size={18} />
									<span>Позвонить</span>
								</button>
							</div>
						)}

						{/* TAB 3: CALL HISTORY */}
						{activeTab === "history" && (
							<div className="space-y-2">
								{callHistory.length === 0 ? (
									<div className="py-8 text-center text-xs text-[var(--muted,#64748b)]">
										История звонков пуста.
									</div>
								) : (
									callHistory.slice(0, 15).map((item) => (
										<div
											key={item.id}
											className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] text-xs shadow-xs"
										>
											<div className="flex items-center gap-2.5 min-w-0">
												<div
													className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
														item.status === "answered"
															? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
															: item.status === "rejected"
																? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
																: "bg-amber-500/10 text-amber-600 dark:text-amber-400"
													}`}
												>
													{item.status === "answered" ? (
														<PhoneIncoming size={13} />
													) : item.status === "rejected" ? (
														<PhoneOff size={13} />
													) : (
														<PhoneIncoming size={13} />
													)}
												</div>

												<div className="min-w-0">
													<div className="font-bold text-[var(--ink,#0f172a)] truncate">
														{item.patientName || formatPhoneDisplay(item.phone)}
													</div>
													<div className="text-[10px] font-mono text-[var(--muted,#64748b)]">
														{formatPhoneDisplay(item.phone)}
													</div>
												</div>
											</div>

											<div className="flex items-center gap-1.5 flex-shrink-0">
												{/* Quick Call Button >= 44x44px */}
												<button
													type="button"
													onClick={() => {
														setDialNumber(item.phone);
														setActiveTab("dialer");
													}}
													className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--teal)] hover:bg-[var(--teal-surface)] transition-colors inline-flex items-center justify-center"
													title="Перезвонить"
													aria-label={`Перезвонить ${item.phone}`}
												>
													<Phone size={14} />
												</button>

												{/* Quick WhatsApp Trigger >= 44x44px */}
												<button
													type="button"
													onClick={() => {
														openWhatsAppChat(
															item.phone,
															`Здравствуйте! Стоматология ${dashboard?.clinicSettings?.name || "DENTE"}.`,
														);
													}}
													className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors inline-flex items-center justify-center"
													title="WhatsApp"
													aria-label={`Написать в WhatsApp ${item.phone}`}
												>
													<MessageSquare size={14} />
												</button>
											</div>
										</div>
									))
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</div>,
		document.body,
	);
}
