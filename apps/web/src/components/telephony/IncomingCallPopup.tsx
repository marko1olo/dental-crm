import {
	AlertCircle,
	AlertTriangle,
	Building,
	Calendar,
	CalendarPlus,
	CreditCard,
	FileText,
	Phone,
	PhoneCall,
	PhoneIncoming,
	PhoneOff,
	Shield,
	ShieldAlert,
	Sliders,
	Stethoscope,
	User,
	UserCheck,
	Volume2,
	VolumeX,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWebsocket } from "../../hooks/useWebsocket";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useScheduleStore } from "../../store/scheduleStore";
import {
	calculatePatientFinancialStatus,
	formatPatientInitials,
	formatPhoneDisplay,
	getAvatarColor,
	resolvePatientFromPhone,
	resolvePatientLastVisit,
	useTelephonyStore,
} from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";

function resolveTelephonyWsUrl(): string {
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

/**
 * Web Audio API gentle softphone ringtone synthesizer.
 */
function playRingtoneChime(audioCtx: AudioContext) {
	try {
		const now = audioCtx.currentTime;

		const osc1 = audioCtx.createOscillator();
		const osc2 = audioCtx.createOscillator();
		const gain = audioCtx.createGain();

		osc1.type = "sine";
		osc2.type = "triangle";

		osc1.frequency.setValueAtTime(440, now); // A4
		osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

		osc2.frequency.setValueAtTime(554.37, now); // C#5
		osc2.frequency.exponentialRampToValueAtTime(1108.73, now + 0.15); // C#6

		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

		osc1.connect(gain);
		osc2.connect(gain);
		gain.connect(audioCtx.destination);

		osc1.start(now);
		osc2.start(now);
		osc1.stop(now + 0.36);
		osc2.stop(now + 0.36);

		// Second double chirp after 180ms
		const osc3 = audioCtx.createOscillator();
		const gain2 = audioCtx.createGain();
		osc3.type = "sine";
		osc3.frequency.setValueAtTime(587.33, now + 0.18); // D5
		osc3.frequency.exponentialRampToValueAtTime(1174.66, now + 0.32);

		gain2.gain.setValueAtTime(0.001, now + 0.18);
		gain2.gain.linearRampToValueAtTime(0.08, now + 0.22);
		gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

		osc3.connect(gain2);
		gain2.connect(audioCtx.destination);

		osc3.start(now + 0.18);
		osc3.stop(now + 0.46);
	} catch {
		// AudioContext suspended or unavailable in headless/silent browser
	}
}

export function IncomingCallPopup() {
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const triggerIncomingCall = useTelephonyStore((s) => s.triggerIncomingCall);
	const acceptCall = useTelephonyStore((s) => s.acceptCall);
	const rejectCall = useTelephonyStore((s) => s.rejectCall);
	const dismissCall = useTelephonyStore((s) => s.dismissCall);
	const isMuted = useTelephonyStore((s) => s.isMuted);
	const toggleMute = useTelephonyStore((s) => s.toggleMute);
	const openSimulator = useTelephonyStore((s) => s.openSimulator);

	const ctx = useAppLogicContext();
	const dashboard = ctx?.dashboard;

	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const setNewAppointmentDraft = useScheduleStore(
		(s) => s.setNewAppointmentDraft,
	);

	const { lastMessage } = useWebsocket(resolveTelephonyWsUrl());
	const audioCtxRef = useRef<AudioContext | null>(null);

	// Sync WebSocket Incoming Call Event to Telephony Store
	useEffect(() => {
		if (
			lastMessage?.type === "TELEPHONY_INCOMING_CALL" &&
			lastMessage.payload
		) {
			const p = lastMessage.payload;
			triggerIncomingCall({
				phone: p.phone || "",
				patientId: p.patientId || null,
				patientName: p.patientName || "Неизвестный номер",
				callId: p.callId,
				provider: p.provider || "mango",
				timestamp: p.timestamp || new Date().toISOString(),
				status: "ringing",
			});
		}
	}, [lastMessage, triggerIncomingCall]);

	// Ringtone playback loop while active call is ringing
	useEffect(() => {
		if (!activeCall || isMuted) return;

		let intervalId: ReturnType<typeof setInterval> | null = null;
		try {
			if (!audioCtxRef.current) {
				const AudioCtx =
					window.AudioContext ||
					// biome-ignore lint/suspicious/noExplicitAny: webkitAudioContext fallback
					(window as any).webkitAudioContext;
				if (AudioCtx) {
					audioCtxRef.current = new AudioCtx();
				}
			}
			if (audioCtxRef.current) {
				if (audioCtxRef.current.state === "suspended") {
					audioCtxRef.current.resume().catch(() => {});
				}
				playRingtoneChime(audioCtxRef.current);
				intervalId = setInterval(() => {
					if (audioCtxRef.current) {
						playRingtoneChime(audioCtxRef.current);
					}
				}, 3200);
			}
		} catch {
			// Web audio blocked by user gesture requirements
		}

		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	}, [activeCall, isMuted]);

	// Auto-dismiss call after 40 seconds if unhandled
	useEffect(() => {
		if (!activeCall) return;

		const timer = setTimeout(() => {
			dismissCall();
		}, 40000);

		return () => clearTimeout(timer);
	}, [activeCall, dismissCall]);

	// Resolve Patient Info from Dashboard
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
			dashboard.patientInsights.find(
				(pi) => pi.patientId === resolvedPatient.id,
			) || null
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

	if (!activeCall) return null;

	const callerName =
		resolvedPatient?.fullName || activeCall.patientName || "Неизвестный номер";
	const formattedPhone = formatPhoneDisplay(activeCall.phone);
	const initials = formatPatientInitials(callerName);
	const avatarColors = getAvatarColor(callerName);

	const isKnownPatient = Boolean(resolvedPatient);
	const hasNotes = Boolean(resolvedPatient?.notes?.trim());
	const hasDms = financialSummary.hasInsurance;
	const hasDebt = financialSummary.hasDebt;
	const isHighRisk =
		patientInsight?.riskLevel === "high" ||
		(resolvedPatient as { noShowRisk?: boolean })?.noShowRisk;

	// Provider label
	const providerLabel =
		activeCall.provider === "mango"
			? "Mango Telecom"
			: activeCall.provider === "uis"
				? "UIS / CoMagic"
				: activeCall.provider === "asterisk"
					? "Asterisk SIP"
					: activeCall.provider === "zadarma"
						? "Zadarma PBX"
						: "IP-Телефония";

	// Handlers
	const handleOpenCard = () => {
		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
			setCurrentView("patients");
			acceptCall();
			showToast(`Открыта карта: ${resolvedPatient.fullName}`, "info");
		} else {
			setNewPatientPhone(activeCall.phone);
			setCurrentView("patients");
			acceptCall();
			showToast(
				`Регистрация нового пациента с номером ${formattedPhone}`,
				"info",
			);
		}
	};

	const handleBookToday = () => {
		const todayIso =
			dashboard?.todayIso || new Date().toISOString().split("T")[0]!;
		const defaultDoctorId =
			dashboard?.clinicSettings?.staff?.find((s) => s.role === "doctor")?.id ||
			"";
		const defaultChairId =
			dashboard?.clinicSettings?.chairs?.[0]?.id || "";

		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
			setNewAppointmentDraft({
				patientId: resolvedPatient.id,
				doctorUserId: defaultDoctorId,
				assistantUserId: "",
				chairId: defaultChairId,
				startsAt: `${todayIso}T10:00:00`,
				endsAt: `${todayIso}T10:30:00`,
				status: "planned",
				reason: "Первичный звонок / Острая запись",
				comment: `Запись по входящему звонку (${formattedPhone})`,
			});
			setCurrentView("schedule");
			acceptCall();
			showToast(`Запись пациента ${resolvedPatient.fullName} на сегодня`, "info");
		} else {
			setNewPatientPhone(activeCall.phone);
			setNewAppointmentDraft({
				patientId: "",
				doctorUserId: defaultDoctorId,
				assistantUserId: "",
				chairId: defaultChairId,
				startsAt: `${todayIso}T10:00:00`,
				endsAt: `${todayIso}T10:30:00`,
				status: "planned",
				reason: "Первичный звонок",
				comment: `Новый пациент с телефона ${formattedPhone}`,
			});
			setCurrentView("schedule");
			acceptCall();
			showToast(`Новая запись на сегодня (${formattedPhone})`, "info");
		}
	};

	const handleReject = () => {
		rejectCall();
		showToast(`Вызов ${formattedPhone} отклонён`, "info");
	};

	return (
		<div
			className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto w-auto sm:w-[440px] max-w-[calc(100vw-32px)] z-[999999] flex flex-col gap-3 rounded-2xl border border-[var(--line,#334155)] bg-[var(--paper,#0f172a)] text-[var(--ink,#f8fafc)] shadow-2xl p-4 sm:p-5 backdrop-blur-xl animate-slide-in"
			style={{
				boxShadow:
					"0 20px 40px -15px rgba(0,0,0,0.5), 0 0 20px 2px rgba(15,118,110,0.25)",
			}}
			role="dialog"
			aria-labelledby="incoming-call-title"
			aria-modal="false"
		>
			{/* Top Bar: Provider Tag, Pulse Indicator & Controls */}
			<div className="flex items-center justify-between pb-2 border-b border-[var(--line,rgba(255,255,255,0.08))]">
				<div className="flex items-center gap-2">
					<span className="relative flex h-3 w-3">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
						<span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
					</span>
					<div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
						<PhoneIncoming size={15} className="animate-pulse" />
						<span id="incoming-call-title">Входящий звонок</span>
					</div>
					<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--paper-soft,rgba(255,255,255,0.06))] text-[var(--muted,#94a3b8)] border border-[var(--line,rgba(255,255,255,0.1))]">
						{providerLabel}
					</span>
				</div>

				<div className="flex items-center gap-1">
					{/* Mute Ringtone Toggle */}
					<button
						type="button"
						onClick={toggleMute}
						className="text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,rgba(255,255,255,0.1))] transition-colors rounded-lg p-1.5 min-h-[32px] min-w-[32px] inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0f766e)]"
						title={isMuted ? "Включить звонок" : "Отключить звук"}
						aria-label={isMuted ? "Включить звонок" : "Отключить звук"}
					>
						{isMuted ? (
							<VolumeX size={15} className="text-rose-400" />
						) : (
							<Volume2 size={15} />
						)}
					</button>

					{/* Simulator Modal Launcher */}
					<button
						type="button"
						onClick={openSimulator}
						className="text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,rgba(255,255,255,0.1))] transition-colors rounded-lg p-1.5 min-h-[32px] min-w-[32px] inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0f766e)]"
						title="Открыть симулятор телефонии"
						aria-label="Симулятор SIP телефонии"
					>
						<Sliders size={15} />
					</button>

					{/* Dismiss X */}
					<button
						type="button"
						onClick={dismissCall}
						className="text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,rgba(255,255,255,0.1))] transition-colors rounded-lg p-1.5 min-h-[32px] min-w-[32px] inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0f766e)]"
						aria-label="Свернуть уведомление"
					>
						<X size={16} />
					</button>
				</div>
			</div>

			{/* Patient Profile Card */}
			<div className="flex items-start gap-3.5 pt-1">
				{/* Avatar */}
				<div
					className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-inner border"
					style={{
						backgroundColor: avatarColors.bg,
						color: avatarColors.text,
						borderColor: avatarColors.border,
					}}
				>
					{isKnownPatient ? (
						initials
					) : (
						<User size={22} className="opacity-80" />
					)}
				</div>

				{/* Identity Info */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<h3 className="text-base font-bold text-[var(--ink,#f8fafc)] truncate leading-tight">
							{callerName}
						</h3>
						{isKnownPatient ? (
							<span
								className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-1.5 py-0.5 rounded-md"
								title="Пациент зарегистрирован в клинике"
							>
								<UserCheck size={11} /> Пациент
							</span>
						) : (
							<span
								className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/50 px-1.5 py-0.5 rounded-md"
								title="Номер не найден в базе пациентов"
							>
								<AlertCircle size={11} /> Новый лид
							</span>
						)}
					</div>
					<div className="flex items-center gap-2 text-sm font-semibold text-[var(--muted,#94a3b8)] mt-0.5">
						<Phone size={13} className="text-emerald-500" />
						<span>{formattedPhone}</span>
					</div>
				</div>
			</div>

			{/* Clinical & Financial Summary Panel */}
			<div className="grid grid-cols-2 gap-2 bg-[var(--paper-soft,rgba(30,41,59,0.5))] rounded-xl p-3 border border-[var(--line,rgba(255,255,255,0.06))] text-xs">
				{/* Financial Balance */}
				<div className="flex flex-col gap-0.5">
					<span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted,#94a3b8)] flex items-center gap-1">
						<CreditCard size={11} className="text-[var(--teal,#0f766e)]" />
						Баланс / Долг:
					</span>
					<div className="flex items-baseline gap-1.5">
						<span
							className={`font-black text-sm ${
								financialSummary.balanceRub < 0
									? "text-rose-400"
									: financialSummary.balanceRub > 0
										? "text-emerald-400"
										: "text-[var(--ink,#f8fafc)]"
							}`}
						>
							{financialSummary.formattedBalance}
						</span>
						{hasDebt && (
							<span className="text-[10px] font-bold text-rose-300 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-800/40">
								Долг {financialSummary.formattedDebt}
							</span>
						)}
					</div>
				</div>

				{/* Insurance Status */}
				<div className="flex flex-col gap-0.5">
					<span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted,#94a3b8)] flex items-center gap-1">
						<Shield size={11} className="text-cyan-400" />
						Страховка / ДМС:
					</span>
					<span className="font-semibold text-[var(--ink,#f8fafc)] truncate">
						{hasDms
							? financialSummary.insuranceName || "Полис ДМС активен"
							: "Без полиса ДМС"}
					</span>
				</div>

				{/* Last Visit */}
				<div className="col-span-2 pt-2 mt-1 border-t border-[var(--line,rgba(255,255,255,0.06))] flex items-start justify-between gap-2">
					<div className="flex items-start gap-1.5 text-[11px]">
						<Calendar
							size={13}
							className="text-[var(--muted,#94a3b8)] mt-0.5 flex-shrink-0"
						/>
						<div>
							<span className="text-[var(--muted,#94a3b8)]">
								Последний визит:{" "}
							</span>
							<strong className="text-[var(--ink,#f8fafc)]">
								{lastVisitSummary.formattedLastVisit}
							</strong>
						</div>
					</div>

					{lastVisitSummary.doctorName && (
						<div className="flex items-center gap-1 text-[11px] text-[var(--muted,#94a3b8)] truncate">
							<Stethoscope size={12} className="text-teal-400 flex-shrink-0" />
							<span className="truncate">{lastVisitSummary.doctorName}</span>
						</div>
					)}
				</div>
			</div>

			{/* Smart Telephony Script & Clinical Warnings */}
			<div className="space-y-1.5 text-xs">
				{!isKnownPatient && (
					<div className="flex items-center gap-2 bg-amber-950/30 border border-amber-800/40 text-amber-200 px-2.5 py-1.5 rounded-lg font-medium">
						<AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
						<span>
							Новое обращение! Уточните причину и предложите первичную
							диагностику.
						</span>
					</div>
				)}

				{hasDebt && (
					<div className="flex items-center gap-2 bg-rose-950/30 border border-rose-800/40 text-rose-200 px-2.5 py-1.5 rounded-lg font-medium">
						<AlertCircle size={14} className="text-rose-400 flex-shrink-0" />
						<span>
							Внимание: у пациента задолженность {financialSummary.formattedDebt}
							. Согласуйте погашение.
						</span>
					</div>
				)}

				{isHighRisk && (
					<div className="flex items-center gap-2 bg-rose-950/20 border border-rose-700/30 text-rose-300 px-2.5 py-1.5 rounded-lg font-medium">
						<ShieldAlert size={14} className="text-rose-400 flex-shrink-0" />
						<span>
							Риск неявки (No-Show). Подтвердите запись и время дважды!
						</span>
					</div>
				)}

				{hasNotes && (
					<div className="flex items-start gap-2 bg-[var(--paper-soft,rgba(255,255,255,0.04))] border border-[var(--line,rgba(255,255,255,0.06))] px-2.5 py-1.5 rounded-lg text-[var(--muted,#94a3b8)] italic">
						<FileText
							size={13}
							className="mt-0.5 text-[var(--teal,#0f766e)] flex-shrink-0 not-italic"
						/>
						<span className="line-clamp-2">
							«{resolvedPatient?.notes}»
						</span>
					</div>
				)}
			</div>

			{/* Quick Actions Action Bar */}
			<div className="flex items-center gap-2 pt-1">
				{/* Reject Call Button */}
				<button
					type="button"
					onClick={handleReject}
					className="px-3.5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 active:scale-[0.98] border border-rose-800/50 text-rose-300 hover:text-rose-100 text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-rose-500"
					aria-label="Отклонить входящий звонок"
				>
					<PhoneOff size={15} />
					<span>Отклонить</span>
				</button>

				{/* Book Today Button */}
				<button
					type="button"
					onClick={handleBookToday}
					className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--paper-soft,#1e293b)] hover:bg-[var(--line,#334155)] active:scale-[0.98] border border-[var(--line,#475569)] text-[var(--ink,#f8fafc)] text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 min-h-[40px] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0f766e)]"
					aria-label="Записать пациента на сегодня"
				>
					<CalendarPlus size={15} className="text-teal-400" />
					<span>Записать на сегодня</span>
				</button>

				{/* Accept / Open Card Button */}
				<button
					type="button"
					onClick={handleOpenCard}
					className="flex-1 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-[0.98] text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 min-h-[40px] shadow-lg shadow-teal-950/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
					aria-label={
						isKnownPatient
							? "Принять звонок и открыть карту пациента"
							: "Принять звонок и зарегистрировать пациента"
					}
				>
					<PhoneCall size={15} />
					<span>
						{isKnownPatient ? "Открыть карту" : "Принять / Создать"}
					</span>
				</button>
			</div>
		</div>
	);
}
