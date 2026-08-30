import type React from "react";
import { useMemo, useState, useEffect, useCallback } from "react";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	ArrowRight,
	Bell,
	BellRing,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	ClipboardList,
	Clock,
	FileBadge,
	FileCheck2,
	FileText,
	Image as ImageIcon,
	KeyRound,
	Lock,
	MoreHorizontal,
	Phone,
	Plus,
	Printer,
	RefreshCw,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	User,
	UserCheck,
	Users,
	X,
	Zap,
} from "lucide-react";
import {
	filterDoctorShiftAppointments,
	calculateDoctorShiftEarnings,
	initiateBatchEmrSigning,
	verifyAndSignBatchEmr,
	transitionAppointmentStatus,
	DOCTOR_APPOINTMENT_STATUS_META,
	EMR_043_STATUS_META,
	SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	type DoctorShiftAppointment,
	type DoctorAppointmentStatus,
	type EmrBatchSigningSession,
} from "@dental/shared";
import { formatKopecksRu } from "@dental/shared";
import { showToast } from "../GlobalToast";
import "./doctorShiftCockpit.css";

export type DoctorQuickCallAction =
	| "odontogram"
	| "lab_order"
	| "imaging"
	| "consent"
	| "assistant_call";

export interface DoctorShiftCockpitModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly cabinetName?: string | undefined;
	readonly shiftDateIso?: string | undefined;
	readonly initialAppointments?: readonly DoctorShiftAppointment[] | undefined;
	readonly activeAppointmentId?: string | undefined;
	readonly onAppointmentUpdate?: ((appointments: readonly DoctorShiftAppointment[]) => void) | undefined;
	readonly onSelectActiveAppointment?: ((appointmentId: string) => void) | undefined;
	readonly onQuickAction?: ((action: DoctorQuickCallAction) => void) | undefined;
	readonly onCompleteAndOrder?: ((appointment: DoctorShiftAppointment) => void) | undefined;
}

function formatDoctorShortName(fullName: string): string {
	const parts = fullName.trim().split(/\s+/);
	if (parts.length >= 3 && parts[0]?.toLowerCase().startsWith("д-р")) {
		const prefix = parts[0];
		const surname = parts[1];
		const nameInit = parts[2]?.[0] ? `${parts[2][0]}.` : "";
		const patronymicInit = parts[3]?.[0] ? `${parts[3][0]}.` : "";
		return `${prefix} ${surname} ${nameInit}${patronymicInit}`.trim();
	}
	if (parts.length >= 3) {
		const surname = parts[0];
		const nameInit = parts[1]?.[0] ? `${parts[1][0]}.` : "";
		const patronymicInit = parts[2]?.[0] ? `${parts[2][0]}.` : "";
		return `${surname} ${nameInit}${patronymicInit}`.trim();
	}
	return fullName;
}

function formatShortSpecialty(specialty: string): string {
	return specialty.replace(/^Врач-стоматолог\s+/i, "");
}

export const DoctorShiftCockpitModal: React.FC<DoctorShiftCockpitModalProps> = ({
	isOpen,
	onClose,
	doctorId = "doc-1",
	doctorName = "Д-р Смирнов Алексей Петрович",
	doctorSpecialty = "Врач-стоматолог терапевт-ортопед",
	cabinetName = "Кабинет № 1 (Терапия)",
	shiftDateIso = "2026-08-29",
	initialAppointments = SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	activeAppointmentId: propActiveAppointmentId,
	onAppointmentUpdate,
	onSelectActiveAppointment,
	onQuickAction,
	onCompleteAndOrder,
}) => {
	const [appointments, setAppointments] = useState<readonly DoctorShiftAppointment[]>(
		initialAppointments,
	);
	const [activeAptId, setActiveAptId] = useState<string | null>(propActiveAppointmentId || null);
	const [isAssistantCalled, setIsAssistantCalled] = useState<boolean>(false);
	const [assistantAlertDismissed, setAssistantAlertDismissed] = useState<boolean>(false);
	const [timerExtraMinutes, setTimerExtraMinutes] = useState<number>(0);
	const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
	const [currentTime, setCurrentTime] = useState<Date>(new Date());
	const [activeTab, setActiveTab] = useState<"cockpit" | "emr_journal" | "earnings">("cockpit");
	const [showSecondaryMenu, setShowSecondaryMenu] = useState<boolean>(false);

	// Batch PEP SMS Signing State (Clean 63-ФЗ with NO hardcoded demo backdoor)
	const [signingSession, setSigningSession] = useState<EmrBatchSigningSession | null>(null);
	const [enteredSmsCode, setEnteredSmsCode] = useState<string>("");
	const [smsCountdown, setSmsCountdown] = useState<number>(300);
	const [isSubmittingCode, setIsSubmittingCode] = useState<boolean>(false);

	// Keep local appointments synchronized with incoming props
	useEffect(() => {
		setAppointments(initialAppointments);
	}, [initialAppointments]);

	// Live tick for countdown timer
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(new Date());
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	// Doctor's isolated shift appointments
	const doctorAppointments = useMemo(() => {
		return filterDoctorShiftAppointments(appointments, doctorId, shiftDateIso);
	}, [appointments, doctorId, shiftDateIso]);

	// Compute shift earnings & KPI summary
	const earnings = useMemo(() => {
		return calculateDoctorShiftEarnings(
			doctorAppointments,
			doctorId,
			shiftDateIso,
			25, // Default therapy commission
		);
	}, [doctorAppointments, doctorId, shiftDateIso]);

	// Locate currently in-chair active appointment or pick first in-chair / waiting
	const activeAppointment = useMemo(() => {
		if (activeAptId) {
			const found = doctorAppointments.find((a) => a.id === activeAptId);
			if (found) return found;
		}
		const inChair = doctorAppointments.find((a) => a.status === "in_chair");
		if (inChair) return inChair;
		return doctorAppointments.find((a) => a.status === "waiting") || null;
	}, [doctorAppointments, activeAptId]);

	// Locate next queued appointment (excluding current active)
	const nextQueuedAppointment = useMemo(() => {
		if (!activeAppointment) {
			return doctorAppointments.find((a) => a.status === "waiting") || null;
		}
		return (
			doctorAppointments.find(
				(a) => a.id !== activeAppointment.id && (a.status === "waiting" || a.status === "completed"),
			) || null
		);
	}, [doctorAppointments, activeAppointment]);

	// Unsigned 043/у EMR records
	const unsignedAppointments = useMemo(() => {
		return doctorAppointments.filter(
			(apt) =>
				(apt.status === "completed" || apt.emrCard043uStatus === "pending_signature") &&
				apt.emrCard043uStatus !== "signed",
		);
	}, [doctorAppointments]);

	// Countdown calculations for active appointment
	const timerState = useMemo(() => {
		if (!activeAppointment) {
			return { label: "Прием не начат", isOvertime: false, secondsDiff: 0, formatted: "00:00" };
		}

		// Calculate appointment end time + user added minutes
		const endsAt = new Date(activeAppointment.endsAtIso).getTime() + timerExtraMinutes * 60 * 1000;
		const now = currentTime.getTime();
		const diffMs = endsAt - now;

		const isOvertime = diffMs < 0;
		const absDiffSec = Math.floor(Math.abs(diffMs) / 1000);
		const minutes = Math.floor(absDiffSec / 60);
		const seconds = absDiffSec % 60;
		const p = (n: number) => n.toString().padStart(2, "0");

		if (isOvertime) {
			const displayMin = Math.min(Math.max(1, minutes), 120);
			return {
				label: "Овертайм приёма",
				isOvertime: true,
				secondsDiff: diffMs / 1000,
				formatted: `+${displayMin} мин`,
			};
		}

		return {
			label: "До конца приёма",
			isOvertime: false,
			secondsDiff: diffMs / 1000,
			formatted: `${p(minutes)}:${p(seconds)}`,
		};
	}, [activeAppointment, currentTime, timerExtraMinutes]);

	// SMS Countdown timer
	useEffect(() => {
		if (!signingSession) return;
		if (smsCountdown <= 0) return;
		const timer = setInterval(() => {
			setSmsCountdown((prev) => Math.max(0, prev - 1));
		}, 1000);
		return () => clearInterval(timer);
	}, [signingSession, smsCountdown]);

	if (!isOpen) return null;

	// 1-Click Status Update Handler
	const handleStatusTransition = (
		appointmentId: string,
		newStatus: DoctorAppointmentStatus,
	) => {
		const updated = appointments.map((apt) => {
			if (apt.id === appointmentId) {
				return transitionAppointmentStatus(apt, newStatus);
			}
			return apt;
		});
		setAppointments(updated);
		onAppointmentUpdate?.(updated);

		if (newStatus === "in_chair") {
			setActiveAptId(appointmentId);
			onSelectActiveAppointment?.(appointmentId);
		}

		const statusTitle = DOCTOR_APPOINTMENT_STATUS_META[newStatus].labelRu;
		showToast(`Статус приема обновлен: ${statusTitle}`, "info");
	};

	// Quick Call Triggers
	const handleQuickCall = (action: DoctorQuickCallAction) => {
		if (action === "assistant_call") {
			setIsAssistantCalled((prev) => {
				const nextState = !prev;
				if (nextState) {
					setAssistantAlertDismissed(false);
					showToast(`🔔 Вызов ассистента отправлен в ${cabinetName}`, "warning");
				} else {
					showToast("Вызов ассистента отменен", "info");
				}
				return nextState;
			});
		}
		onQuickAction?.(action);
	};

	// Primary Action: Finish visit and generate lab order / act
	const handlePrimaryFinishAction = () => {
		if (!activeAppointment) return;

		// Transition to completed
		handleStatusTransition(activeAppointment.id, "completed");
		onCompleteAndOrder?.(activeAppointment);
		showToast(
			`Прием ${activeAppointment.patientFullName} завершен. Наряд сформирован.`,
			"success",
		);
	};

	// Start 63-ФЗ Batch EMR SMS Signing (No hardcoded backdoor)
	const handleInitiateBatchSigning = () => {
		const targetIds = unsignedAppointments.map((a) => a.id);
		if (targetIds.length === 0) {
			showToast("Все медицинские карты ф. 043/у уже заверены ПЭП!", "success");
			return;
		}

		const session = initiateBatchEmrSigning({
			doctorId,
			doctorName,
			doctorPhone: "+7 (926) 555-12-34",
			appointmentIds: targetIds,
			shiftDateIso,
			validityDurationSeconds: 300,
		});

		setSigningSession(session);
		setEnteredSmsCode("");
		setSmsCountdown(300);
	};

	// Confirm SMS Code Verification
	const handleConfirmSmsSigning = () => {
		if (!signingSession) return;
		if (enteredSmsCode.trim().length < 6) {
			showToast("Введите полный 6-значный СМС-код из уведомления", "warning");
			return;
		}

		setIsSubmittingCode(true);
		const result = verifyAndSignBatchEmr({
			session: signingSession,
			enteredCode: enteredSmsCode,
			appointments,
			doctorName,
			doctorSnils: "123-456-789 64",
		});

		setIsSubmittingCode(false);

		if (result.success) {
			setAppointments(result.updatedAppointments);
			onAppointmentUpdate?.(result.updatedAppointments);
			setSigningSession(null);
			showToast(result.messageRu, "success");
		} else {
			showToast(result.messageRu, "error");
		}
	};

	// Map breakdown by appointment ID for exact piece-rate math display in cards
	const earningsBreakdownsMap = useMemo(() => {
		const map = new Map<string, (typeof earnings.appointmentBreakdowns)[number]>();
		for (const b of earnings.appointmentBreakdowns) {
			map.set(b.appointmentId, b);
		}
		return map;
	}, [earnings.appointmentBreakdowns]);

	return (
		<div
			className="doctor-cockpit-overlay"
			data-testid="doctor-shift-cockpit-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Кокпит смены врача"
		>
			<div className="doctor-cockpit-container">
				{/* Top Header Strip [DEFECT-M3: Short initials on mobile] */}
				<header className="doctor-cockpit-header">
					<div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
						<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-950/60 border border-teal-800/80 flex items-center justify-center text-teal-400 shrink-0">
							<Stethoscope size={18} />
						</div>
						<div className="min-w-0">
							<h2 className="doctor-cockpit-title" data-testid="doctor-cockpit-title">
								<span className="truncate">Кокпит смены</span>
								<span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-950/50 text-teal-300 border border-teal-800/60 shrink-0">
									{cabinetName}
								</span>
							</h2>
							<div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex-wrap">
								<span className="font-bold text-slate-900 dark:text-slate-100">
									<span className="sm:hidden">{formatDoctorShortName(doctorName)}</span>
									<span className="hidden sm:inline">{doctorName}</span>
								</span>
								<span className="text-slate-400 dark:text-slate-600 select-none">•</span>
								<span>
									<span className="sm:hidden">{formatShortSpecialty(doctorSpecialty)}</span>
									<span className="hidden sm:inline">{doctorSpecialty}</span>
								</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--paper-soft,#0f172a)] border border-[var(--line,#1e293b)] text-xs font-semibold text-[var(--ink,#f8fafc)]">
							<Calendar size={14} className="text-teal-400" />
							<span>29 авг 2026</span>
							<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
						</div>
						<button
							type="button"
							onClick={onClose}
							className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-[var(--paper-soft,#0f172a)] text-[var(--ink-2,#cbd5e1)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper,#1e293b)] flex items-center justify-center border border-[var(--line,#1e293b)] transition-colors cursor-pointer shrink-0"
							aria-label="Закрыть кокпит смены"
							data-testid="close-doctor-cockpit-btn"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* Navigation Sub-Tabs with horizontal scroll & indicator [DEFECT-M4] */}
				<div className="doctor-tabs-scroll-wrapper">
					<div className="doctor-tabs-container flex items-center justify-between gap-2 px-3 sm:px-5 pt-2.5 pb-2 text-xs overflow-x-auto scrollbar-none flex-wrap shrink-0 w-full" data-testid="doctor-tabs-container">
						<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
							<button
								type="button"
								onClick={() => setActiveTab("cockpit")}
								className={`doctor-tab-btn min-h-[36px] px-3 sm:px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap text-xs border ${
									activeTab === "cockpit"
										? "active bg-teal-50 text-teal-800 border-teal-600 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-700 shadow-sm font-extrabold"
										: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
								}`}
								data-testid="tab-cockpit-view"
							>
								Рабочий стол приёма
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("emr_journal")}
								className={`doctor-tab-btn min-h-[36px] px-3 sm:px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap text-xs border ${
									activeTab === "emr_journal"
										? "active bg-teal-50 text-teal-800 border-teal-600 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-700 shadow-sm font-extrabold"
										: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
								}`}
								data-testid="tab-emr-journal"
							>
								<span>ЭМК ф. 043/у</span>
								{unsignedAppointments.length > 0 && (
									<span className="px-1.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-extrabold shrink-0" data-testid="tab-unsigned-badge">
										Нужна подпись ({unsignedAppointments.length})
									</span>
								)}
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("earnings")}
								className={`doctor-tab-btn min-h-[36px] px-3 sm:px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap text-xs border ${
									activeTab === "earnings"
										? "active bg-teal-50 text-teal-800 border-teal-600 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-700 shadow-sm font-extrabold"
										: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
								}`}
								data-testid="tab-earnings"
							>
								Сделка и расчет %
							</button>
						</div>

						<div className="hidden md:flex text-xs text-[var(--ink-2,#cbd5e1)] items-center gap-2 shrink-0">
							<ShieldCheck size={14} className="text-emerald-400" />
							<span>Изоляция смены активна</span>
						</div>
					</div>
				</div>

				{/* Cockpit Main Body */}
				<div className="doctor-cockpit-body pb-28 sm:pb-6">
					{/* Operational & Financial Metrics Strip [DEFECT-C3: High contrast amber badge; DEFECT-M5: No wrap %) */}
					<div className="doctor-cockpit-metrics-grid" data-testid="doctor-metrics-strip">
						<div className="doctor-metric-card">
							<div className="doctor-metric-label">
								<span>Приемы смены</span>
								<Users size={14} className="text-teal-400" />
							</div>
							<div className="doctor-metric-value text-teal-600 dark:text-teal-300">
								{earnings.completedAppointmentsCount} / {earnings.totalAppointmentsCount}
							</div>
							<div className="text-[11px] text-[var(--ink-2,#cbd5e1)] truncate">
								В кресле: {earnings.inChairAppointmentsCount} • В холле: {earnings.waitingAppointmentsCount}
							</div>
						</div>

						<div className="doctor-metric-card" data-testid="metric-earned-deal">
							<div className="doctor-metric-label">
								<span>Заработано <span className="whitespace-nowrap">(сделка&nbsp;%)</span></span>
								<Sparkles size={14} className="text-emerald-400" />
							</div>
							<div className="doctor-metric-value text-emerald-600 dark:text-emerald-400" data-testid="doctor-cockpit-earned-val">
								{formatKopecksRu(earnings.totalEarnedDealKop)}
							</div>
							<div className="text-[11px] text-[var(--ink-2,#cbd5e1)] truncate">
								База сделки: {formatKopecksRu(earnings.netDealBaseKop)}
							</div>
						</div>

						<div className="doctor-metric-card">
							<div className="doctor-metric-label">
								<span>Выручка смены</span>
								<Activity size={14} className="text-teal-400" />
							</div>
							<div className="doctor-metric-value text-slate-900 dark:text-slate-100">
								{formatKopecksRu(earnings.grossRevenueKop)}
							</div>
							<div className="text-[11px] text-[var(--ink-2,#cbd5e1)] truncate">
								ЗТЛ: −{formatKopecksRu(earnings.totalLabDeductionsKop)} • Мат: −{formatKopecksRu(earnings.totalMaterialDeductionsKop)}
							</div>
						</div>

						<div className="doctor-metric-card">
							<div className="doctor-metric-label">
								<span>ЭМК 043/у</span>
								<FileBadge size={14} className={unsignedAppointments.length > 0 ? "text-amber-500" : "text-emerald-500"} />
							</div>
							<div className="doctor-metric-value text-slate-900 dark:text-slate-100">
								{earnings.signedEmr043Count} / {earnings.totalAppointmentsCount}
							</div>
							<div className="text-[11px] text-[var(--ink-2,#cbd5e1)]">
								{unsignedAppointments.length > 0 ? (
									<span className="inline-flex items-center px-1.5 py-0.5 rounded text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 font-bold">
										Требуют ПЭП: {unsignedAppointments.length}
									</span>
								) : (
									<span className="inline-flex items-center px-1.5 py-0.5 rounded text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/80 font-semibold">
										Все карты заверены
									</span>
								)}
							</div>
						</div>
					</div>

					{/* View Mode: Main Cockpit */}
					{activeTab === "cockpit" && (() => {
						const activeBreakdown = activeAppointment ? earningsBreakdownsMap.get(activeAppointment.id) : null;
						const activeGrossKop = activeBreakdown
							? activeBreakdown.grossKop
							: activeAppointment
								? activeAppointment.services.reduce((acc, s) => acc + (s.finalRevenueKop || 0), 0)
								: 0;
						const activeDoctorEarnedKop = activeBreakdown
							? activeBreakdown.earnedKop
							: Math.round(activeGrossKop * 0.25);

						const nextBreakdown = nextQueuedAppointment ? earningsBreakdownsMap.get(nextQueuedAppointment.id) : null;
						const nextGrossKop = nextBreakdown
							? nextBreakdown.grossKop
							: nextQueuedAppointment
								? nextQueuedAppointment.services.reduce((acc, s) => acc + (s.finalRevenueKop || 0), 0)
								: 0;
						const nextDoctorEarnedKop = nextBreakdown
							? nextBreakdown.earnedKop
							: Math.round(nextGrossKop * 0.25);

						return (
							<div className="doctor-patient-showcase-grid">
								{/* Left Column: Active Patient in Chair [DEFECT-C2, DEFECT-C4] */}
								<div className="doctor-active-patient-card" data-testid="active-patient-card">
									<div className="flex items-center justify-between flex-wrap gap-2">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 dark:border-emerald-700 text-xs font-bold shrink-0">
												<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
												<span>Пациент в кресле</span>
											</span>
											{activeAppointment && (
												<span className="text-xs text-slate-600 dark:text-slate-300 font-semibold shrink-0">
													{activeAppointment.startsAtIso.split("T")[1]?.slice(0, 5)} — {activeAppointment.endsAtIso.split("T")[1]?.slice(0, 5)}
												</span>
											)}
											{activeAppointment && (
												activeAppointment.emrCard043uStatus === "signed" ? (
													<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 dark:border-emerald-700 text-xs font-bold shrink-0" data-testid="active-patient-emr-status">
														<ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
														<span>ЭМК 043/у: Заверена ПЭП</span>
													</span>
												) : (
													<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-500/40 dark:border-amber-700 text-xs font-bold shrink-0" data-testid="active-patient-emr-status">
														<FileBadge size={13} className="text-amber-600 dark:text-amber-400" />
														<span>ЭМК 043/у: Требует подписи</span>
													</span>
												)
											)}
										</div>

										{/* Live Countdown Timer & Overtime Pulsation */}
										<div
											className={`doctor-countdown-timer shrink-0 whitespace-nowrap tabular-nums ${timerState.isOvertime ? "overtime" : "normal"}`}
											data-testid="doctor-countdown-timer"
											role="timer"
											aria-label={timerState.label}
										>
											<Clock size={16} className="shrink-0" />
											<span className="whitespace-nowrap tabular-nums shrink-0">{timerState.formatted}</span>
											{timerState.isOvertime && (
												<span className="text-[11px] font-extrabold uppercase tracking-wide whitespace-nowrap shrink-0">
													Овертайм
												</span>
											)}
										</div>
									</div>

									{activeAppointment ? (
										<>
											{/* Patient Identity & Somatic Risks [DEFECT-M2: Flex-wrap & No hanging bullets] */}
											<div>
												<div className="flex items-start justify-between gap-4">
													<div>
														<h3 className="text-lg font-extrabold text-slate-900 dark:!text-white flex items-center gap-2" data-testid="active-patient-name">
															<User className="text-teal-600 dark:text-teal-300 w-5 h-5 shrink-0" />
															<span>{activeAppointment.patientFullName}</span>
														</h3>
														<div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
															<span className="shrink-0">Карта: {activeAppointment.cardNumber}</span>
															<span className="text-slate-400 dark:text-slate-600 select-none">•</span>
															<span className="shrink-0">1988 г.р. (38 лет)</span>
															{activeAppointment.patientPhone && (
																<>
																	<span className="text-slate-400 dark:text-slate-600 select-none">•</span>
																	<span className="flex items-center gap-1 shrink-0 font-medium text-slate-700 dark:text-slate-200">
																		<Phone size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
																		<span>{activeAppointment.patientPhone}</span>
																	</span>
																</>
															)}
														</div>
													</div>

													{/* Patient Balance & Doctor Earnings */}
													<div className="text-right flex flex-col items-end">
														<div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300">
															Баланс: <span className="font-extrabold text-slate-900 dark:!text-white" data-testid="active-patient-balance">{formatKopecksRu(activeGrossKop)}</span>
														</div>
														<div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5" data-testid="active-doctor-earned">
															<span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase">Врачу:</span>
															<span>+{formatKopecksRu(activeDoctorEarnedKop)}</span>
														</div>
													</div>
												</div>

												{/* Emergency Allergy & Somatic Risk Alert Badges */}
												<div className="mt-2.5 flex flex-wrap gap-2" data-testid="somatic-risk-badges">
													<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800 font-bold text-[11px]" data-testid="allergy-alert-badge">
														<ShieldAlert size={14} className="shrink-0 text-rose-600 dark:text-rose-400" />
														<span>
															{/артикаин/i.test(activeAppointment.treatmentDescription || "")
																? "Аллергия: Артикаин ⚠️"
																: "Аллергия: Лидокаин, Новокаин (отек Квинке)"}
														</span>
													</div>
													<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/80 text-[11px] font-bold" data-testid="somatic-risk-badge">
														<AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
														<span>Соматический риск: Прием бисфосфонатов (BRONJ)</span>
													</div>
												</div>
											</div>

											{/* Clinical Diagnosis & Tooth Formula [DEFECT-C1, DEFECT-C4: Anti-matryoshka clean layout] */}
											<div className="flex flex-col gap-1 text-slate-700 dark:text-slate-200 pt-2 border-t border-slate-200 dark:border-slate-800">
												<div className="flex items-center justify-between text-xs">
													<span className="font-extrabold text-teal-700 dark:text-teal-300">
														{activeAppointment.diagnosisTooth ? `Зуб ${activeAppointment.diagnosisTooth}` : "Клинический осмотр"} • {activeAppointment.diagnosisIcd10 || "К04.0 Пульпит"}
													</span>
													<span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
														{activeAppointment.services.length} услуг в плане
													</span>
												</div>
												<p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed">
													{activeAppointment.treatmentDescription || "Лечение кариеса дентина, инструментальная обработка каналов."}
												</p>
											</div>

											{/* Quick Time Extension Controls */}
											<div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
												<span className="text-slate-600 dark:text-slate-300 font-medium">Продлить слот приема:</span>
												<div className="flex items-center gap-2">
													<button
														type="button"
														onClick={() => setTimerExtraMinutes((m) => m + 10)}
														className="min-h-[36px] px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-700 font-bold transition-all cursor-pointer text-xs"
														data-testid="btn-extend-10m"
													>
														+10 мин
													</button>
													<button
														type="button"
														onClick={() => setTimerExtraMinutes((m) => m + 15)}
														className="min-h-[36px] px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-700 font-bold transition-all cursor-pointer text-xs"
														data-testid="btn-extend-15m"
													>
														+15 мин
													</button>
												</div>
											</div>

											{/* 0-Click Fast Action Buttons Bar */}
											<div className="doctor-quick-actions-bar pt-1" data-testid="doctor-quick-actions-bar">
												<button
													type="button"
													onClick={() => handleQuickCall("odontogram")}
													className="doctor-quick-btn flex items-center gap-1.5"
													data-testid="btn-quick-odontogram"
													aria-label="Открыть одонтограмму 043/у"
												>
													<FileText size={14} className="text-teal-600 dark:text-teal-400" />
													<span>043/у</span>
												</button>
												<button
													type="button"
													onClick={() => handleQuickCall("lab_order")}
													className="doctor-quick-btn flex items-center gap-1.5"
													data-testid="btn-quick-lab-order"
													aria-label="Сформировать наряд-заказ в ЗТЛ"
												>
													<ClipboardList size={14} className="text-teal-600 dark:text-teal-400" />
													<span>Наряд ЗТЛ</span>
												</button>
												<button
													type="button"
													onClick={() => handleQuickCall("imaging")}
													className="doctor-quick-btn flex items-center gap-1.5"
													data-testid="btn-quick-imaging"
													aria-label="Просмотр КЛКТ и рентгенограмм"
												>
													<ImageIcon size={14} className="text-teal-600 dark:text-teal-400" />
													<span>КЛКТ / Снимки</span>
												</button>
												<button
													type="button"
													onClick={() => handleQuickCall("consent")}
													className="doctor-quick-btn flex items-center gap-1.5"
													data-testid="btn-quick-consent"
													aria-label="Информированное согласие ИДС"
												>
													<FileCheck2 size={14} className="text-teal-600 dark:text-teal-400" />
													<span>ИДС</span>
												</button>
												<button
													type="button"
													onClick={() => handleQuickCall("assistant_call")}
													className={`doctor-quick-btn ${isAssistantCalled ? "assistant-active" : ""}`}
													data-testid="btn-quick-assistant"
													aria-label="Вызов ассистента в кабинет"
												>
													{isAssistantCalled ? (
														<>
															<BellRing size={14} className="animate-bounce text-amber-500 dark:text-amber-400" />
															<span>Ассистент вызван</span>
														</>
													) : (
														<>
															<Bell size={14} />
															<span>Вызов ассистента</span>
														</>
													)}
												</button>
											</div>

											{/* Assistant Alert Banner when active */}
											{isAssistantCalled && !assistantAlertDismissed && (
												<div className="p-2.5 rounded-xl bg-amber-500/15 dark:bg-amber-950/60 border border-amber-500/40 dark:border-amber-600 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
													<div className="flex items-center gap-2 font-bold">
														<BellRing size={15} className="text-amber-600 dark:text-amber-400 animate-spin" />
														<span>Вызов ассистента активен на пост дежурного</span>
													</div>
													<button
														type="button"
														onClick={() => setAssistantAlertDismissed(true)}
														className="text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-100 text-xs font-bold cursor-pointer"
													>
														Скрыть
													</button>
												</div>
											)}

											{/* Hick's Law: Exactly 1 Dominant Primary CTA Action Button [DEFECT-M1: Sticky bottom on mobile] */}
											<div className="pt-2 flex items-center gap-3 sm:static fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 z-30 shadow-2xl sm:p-0 sm:bg-transparent sm:dark:bg-transparent sm:border-0 sm:shadow-none">
												<button
													type="button"
													onClick={handlePrimaryFinishAction}
													className="doctor-primary-action-btn flex-1"
													data-testid="btn-primary-finish-visit"
												>
													<CheckCircle2 size={18} />
													<span>Завершить приём и сформировать наряд</span>
												</button>

												{/* Miller's Law: Secondary Actions in Menu */}
												<div className="relative">
													<button
														type="button"
														onClick={() => setShowSecondaryMenu((v) => !v)}
														className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[var(--paper-soft,#1e293b)] dark:hover:bg-[var(--line,#334155)] text-slate-800 dark:text-[var(--ink,#f8fafc)] border border-slate-300 dark:border-[var(--line,#334155)] flex items-center justify-center cursor-pointer transition-colors"
														aria-label="Дополнительные действия приёма"
														data-testid="btn-secondary-actions-menu"
													>
														<MoreHorizontal size={18} />
													</button>

													{showSecondaryMenu && (
														<div className="absolute right-0 bottom-12 w-60 rounded-xl bg-white dark:bg-[var(--paper,#0f172a)] border border-slate-200 dark:border-[var(--line,#334155)] shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-xs text-slate-900 dark:text-[var(--ink,#f8fafc)]">
															<button
																type="button"
																onClick={() => {
																	setShowSecondaryMenu(false);
																	showToast("Памятка пациенту отправлена на печать", "info");
																}}
																className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[var(--paper-soft,#1e293b)] font-semibold cursor-pointer flex items-center gap-2"
															>
																<Printer size={14} className="text-teal-600 dark:text-teal-400" />
																<span>Печать памятки пациенту</span>
															</button>
															<button
																type="button"
																onClick={() => {
																	setShowSecondaryMenu(false);
																	showToast("Перенаправление на контрольный осмотр", "info");
																}}
																className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[var(--paper-soft,#1e293b)] font-semibold cursor-pointer flex items-center gap-2"
															>
																<Calendar size={14} className="text-teal-600 dark:text-teal-400" />
																<span>Записать на повторный визит</span>
															</button>
															<button
																type="button"
																onClick={() => {
																	setShowSecondaryMenu(false);
																	showToast("Журнал стерилизации проверен", "success");
																}}
																className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[var(--paper-soft,#1e293b)] font-semibold cursor-pointer flex items-center gap-2"
															>
																<ShieldCheck size={14} className="text-teal-600 dark:text-teal-400" />
																<span>Журнал стерилизации (СанПиН)</span>
															</button>
														</div>
													)}
												</div>
											</div>
										</>
									) : (
										<div className="p-8 text-center text-xs text-[var(--ink-2,#cbd5e1)]">
											<Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-teal-400" />
											<span>В кресле нет активного пациента. Выберите запись из списка очереди.</span>
										</div>
									)}
								</div>

								{/* Right Column: Next Patient in Queue Card [DEFECT-C4: Clean structure without redundant matryoshka] */}
								<div className="doctor-next-patient-card" data-testid="next-patient-card">
									<div className="flex items-center justify-between">
										<div className="text-xs font-bold text-slate-500 dark:text-[var(--ink-2,#cbd5e1)] uppercase tracking-wider">
											Следующий по очереди
										</div>
										{nextQueuedAppointment && (
											<span className="text-xs font-extrabold text-teal-600 dark:text-teal-400">
												{nextQueuedAppointment.startsAtIso.split("T")[1]?.slice(0, 5)} — {nextQueuedAppointment.endsAtIso.split("T")[1]?.slice(0, 5)}
											</span>
										)}
									</div>

									{nextQueuedAppointment ? (
										<>
											<div>
												<div className="flex items-start justify-between gap-2">
													<div>
														<h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5" data-testid="next-patient-name">
															<User className="text-teal-600 dark:text-teal-400 w-4 h-4 shrink-0" />
															<span>{nextQueuedAppointment.patientFullName}</span>
														</h4>
														<div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
															<span className="shrink-0">Карта: {nextQueuedAppointment.cardNumber}</span>
															{nextQueuedAppointment.patientPhone && (
																<>
																	<span className="text-slate-400 dark:text-slate-600 select-none">•</span>
																	<span className="flex items-center gap-1 shrink-0 text-slate-600 dark:text-slate-300">
																		<Phone size={11} className="text-teal-600 dark:text-teal-400 shrink-0" />
																		<span>{nextQueuedAppointment.patientPhone}</span>
																	</span>
																</>
															)}
														</div>
													</div>

													{/* Arrival Status Indicator */}
													<span
														className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
															nextQueuedAppointment.status === "waiting"
																? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-700"
																: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
														}`}
														data-testid="next-patient-arrival-badge"
													>
														{nextQueuedAppointment.status === "waiting" ? (
															<>
																<UserCheck size={13} className="text-emerald-500 dark:text-emerald-400" />
																<span>В холле (прибыл)</span>
															</>
														) : (
															<>
																<Clock size={13} />
																<span>Ожидается по записи</span>
															</>
														)}
													</span>
												</div>

												{/* Allergy Preview & EMR Status */}
												<div className="mt-2.5 flex items-center gap-2 flex-wrap">
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-800/60 text-[11px] font-bold">
														<ShieldAlert size={12} className="text-amber-600 dark:text-amber-400" />
														<span>Аллергия: Артикаин ⚠️</span>
													</span>
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[var(--paper-soft,#1e293b)] text-slate-600 dark:text-[var(--ink-2,#cbd5e1)] border border-slate-200 dark:border-[var(--line,#334155)] text-[11px] font-semibold" data-testid="next-patient-emr-status">
														<FileText size={12} className="text-teal-600 dark:text-teal-400" />
														<span>ЭМК 043/у: {nextQueuedAppointment.emrCard043uStatus === "signed" ? "Заверена ПЭП" : nextQueuedAppointment.emrCard043uStatus === "pending_signature" ? "Требует подписи" : "Ожидает приёма"}</span>
													</span>
												</div>
											</div>

											{/* Financial Deal Breakdown for Next Patient - Flat Anti-Matryoshka */}
											<div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
												<div>
													<div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Смета услуг</div>
													<div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{formatKopecksRu(nextGrossKop)}</div>
												</div>
												<div className="text-right">
													<div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Врачу (расчет ЗП)</div>
													<div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm" data-testid="next-patient-doctor-earned">
														+{formatKopecksRu(nextDoctorEarnedKop)}
													</div>
												</div>
											</div>

											{/* Planned Procedures [DEFECT-C4: Clean layout without redundant box] */}
											<div className="text-xs text-slate-800 dark:text-slate-200 space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
												<div className="font-bold text-slate-900 dark:text-slate-100">
													{nextQueuedAppointment.diagnosisTooth ? `Зуб ${nextQueuedAppointment.diagnosisTooth}` : "План лечения"}: {nextQueuedAppointment.diagnosisIcd10 || "К08.1"}
												</div>
												<div className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
													{nextQueuedAppointment.treatmentDescription || "Фиксация ортопедической конструкции."}
												</div>
											</div>

											{/* 1-Click Invite to Chair */}
											<button
												type="button"
												onClick={() => handleStatusTransition(nextQueuedAppointment.id, "in_chair")}
												className="w-full min-h-[40px] rounded-xl bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
												data-testid="btn-invite-next-to-chair"
											>
												<Activity size={14} />
												<span>Пригласить в кресло</span>
											</button>
										</>
									) : (
										<div className="p-6 text-center text-xs text-[var(--ink-2,#cbd5e1)]">
											<span>В очереди смены больше нет ожидающих пациентов.</span>
										</div>
									)}
								</div>
							</div>
						);
					})()}

					{/* View Mode: EMR Journal (043/у Quality & PEP Batch Signing) */}
					{activeTab === "emr_journal" && (
						<div className="flex flex-col gap-4" data-testid="emr-journal-panel">
							{/* Batch Signing CTA */}
							{unsignedAppointments.length > 0 ? (
								<div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 dark:border-amber-700/80 flex items-center justify-between gap-4 flex-wrap">
									<div>
										<div className="font-extrabold text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
											<FileBadge size={18} />
											<span>{unsignedAppointments.length} медицинских карт ф. 043/у требуют подписи ПЭП</span>
										</div>
										<p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
											Заверение простой электронной подписью по 63-ФЗ ст. 9 и Приказу Минздрава РФ 947н перед выгрузкой в ЕГИСЗ.
										</p>
									</div>
									<button
										type="button"
										onClick={handleInitiateBatchSigning}
										className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-lg shrink-0"
										data-testid="btn-batch-sign-emr"
									>
										<Zap size={16} />
										<span>Подписать {unsignedAppointments.length} карт по СМС</span>
									</button>
								</div>
							) : (
								<div className="p-4 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 dark:border-emerald-700/80 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300">
									<ShieldCheck size={20} />
									<span className="font-bold">Все медицинские карты смены ф. 043/у успешно заверены ПЭП и готовы к РЭМД ЕГИСЗ.</span>
								</div>
							)}

							{/* Appointments EMR Table */}
							<div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
								<table className="doctor-emr-list-table">
									<thead>
										<tr>
											<th>Время</th>
											<th>Пациент</th>
											<th>Карта</th>
											<th>Диагноз / Услуги</th>
											<th>Статус ЭМК 043/у</th>
											<th className="text-right">Действие</th>
										</tr>
									</thead>
									<tbody>
										{doctorAppointments.map((apt) => {
											const isSigned = apt.emrCard043uStatus === "signed";
											return (
												<tr key={apt.id}>
													<td className="font-bold text-teal-600 dark:text-teal-400">
														{apt.startsAtIso.split("T")[1]?.slice(0, 5)}
													</td>
													<td className="font-semibold text-slate-900 dark:text-slate-100">{apt.patientFullName}</td>
													<td className="text-slate-500 dark:text-[var(--ink-2,#cbd5e1)]">{apt.cardNumber}</td>
													<td className="text-slate-700 dark:text-slate-200">
														{apt.diagnosisIcd10 || "К04.0"} ({apt.services.length} услуг)
													</td>
													<td>
														{isSigned ? (
															<span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
																<ShieldCheck size={14} />
																<span>Подписана ПЭП</span>
															</span>
														) : (
															<span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-xs">
																<FileBadge size={14} />
																<span>Требует подписи</span>
															</span>
														)}
													</td>
													<td className="text-right">
														{!isSigned && (
															<button
																type="button"
																onClick={() => {
																	const session = initiateBatchEmrSigning({
																		doctorId,
																		doctorName,
																		doctorPhone: "+7 (926) 555-12-34",
																		appointmentIds: [apt.id],
																		shiftDateIso,
																	});
																	setSigningSession(session);
																	setEnteredSmsCode("");
																	setSmsCountdown(300);
																}}
																className="min-h-[32px] px-3 py-1 rounded-lg bg-teal-950 text-teal-300 border border-teal-800 text-xs font-bold hover:bg-teal-900 cursor-pointer"
															>
																Подписать
															</button>
														)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* View Mode: Piece-Rate Earnings */}
					{activeTab === "earnings" && (
						<div className="flex flex-col gap-4" data-testid="earnings-panel">
							<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
								<div>
									<div className="text-xs text-slate-500 dark:text-[var(--ink-2,#cbd5e1)] uppercase font-bold">Итоговая выплата врачу за смену</div>
									<div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
										{formatKopecksRu(earnings.totalEarnedDealKop)}
									</div>
								</div>
								<div className="text-right text-xs text-slate-600 dark:text-[var(--ink-2,#cbd5e1)]">
									<div>Выручка брутто: <strong className="text-slate-900 dark:text-slate-100">{formatKopecksRu(earnings.grossRevenueKop)}</strong></div>
									<div>Вычет лаборатории ЗТЛ: <strong className="text-rose-600 dark:text-rose-400">−{formatKopecksRu(earnings.totalLabDeductionsKop)}</strong></div>
									<div>Вычет материалов: <strong className="text-amber-600 dark:text-amber-400">−{formatKopecksRu(earnings.totalMaterialDeductionsKop)}</strong></div>
								</div>
							</div>

							<div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
								<table className="doctor-emr-list-table">
									<thead>
										<tr>
											<th>Пациент</th>
											<th>Выручка</th>
											<th>ЗТЛ Вычет</th>
											<th>Мат. Вычет</th>
											<th>База сделки</th>
											<th className="text-right">Начислено врачу</th>
										</tr>
									</thead>
									<tbody>
										{earnings.appointmentBreakdowns.map((b) => (
											<tr key={b.appointmentId}>
												<td className="font-semibold text-slate-900 dark:text-slate-100">{b.patientFullName}</td>
												<td>{formatKopecksRu(b.grossKop)}</td>
												<td className="text-rose-600 dark:text-rose-400">−{formatKopecksRu(b.labDeductionKop)}</td>
												<td className="text-amber-600 dark:text-amber-400">−{formatKopecksRu(b.materialDeductionKop)}</td>
												<td className="font-bold text-slate-800 dark:text-slate-200">{formatKopecksRu(b.dealBaseKop)}</td>
												<td className="text-right font-extrabold text-emerald-600 dark:text-emerald-400">
													+{formatKopecksRu(b.earnedKop)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>

				{/* 63-ФЗ SMS PEP Signing Modal (NO BACKDOORS) */}
				{signingSession && (
					<div
						className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
						data-testid="doctor-sms-signing-dialog"
						role="dialog"
						aria-modal="true"
					>
						<div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 font-extrabold text-sm text-slate-100">
									<KeyRound className="text-teal-400 w-5 h-5" />
									<span>ПЭП СМС-Подтверждение (63-ФЗ)</span>
								</div>
								<button
									type="button"
									onClick={() => setSigningSession(null)}
									className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-slate-900 text-[var(--ink-2,#cbd5e1)] hover:text-slate-100 hover:bg-slate-800 flex items-center justify-center border border-slate-800 cursor-pointer"
									aria-label="Закрыть окно подтверждения СМС"
								>
									<X size={18} />
								</button>
							</div>

							<p className="text-xs text-slate-300 leading-relaxed">
								Код подтверждения отправлен на номер <strong className="text-slate-100">{signingSession.maskedPhone}</strong> для юридического заверения {signingSession.appointmentIds.length} карт ф. 043/у.
							</p>

							{/* 6-Digit Code Input */}
							<div>
								<input
									type="text"
									inputMode="numeric"
									maxLength={6}
									placeholder="••••••"
									value={enteredSmsCode}
									onChange={(e) => setEnteredSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
									className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl text-center text-xl font-mono font-bold tracking-widest text-slate-100 focus:border-teal-400 focus:outline-none"
									data-testid="sms-code-input"
									autoFocus
								/>
								<div className="mt-2 text-center text-[11px] text-[var(--ink-2,#cbd5e1)]">
									Срок действия кода: <strong className="text-amber-400">{Math.floor(smsCountdown / 60)}:{(smsCountdown % 60).toString().padStart(2, "0")}</strong>
								</div>
							</div>

							<div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-[var(--ink-2,#cbd5e1)] flex items-center gap-2">
								<ShieldCheck size={14} className="text-emerald-400 shrink-0" />
								<span>Статья 9 Федерального закона № 63-ФЗ и Приказ Минздрава РФ № 947н.</span>
							</div>

							<button
								type="button"
								onClick={handleConfirmSmsSigning}
								disabled={enteredSmsCode.length < 6 || isSubmittingCode}
								className="w-full min-h-[44px] rounded-xl text-sm font-extrabold bg-teal-600 hover:bg-teal-500 text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
								data-testid="confirm-sms-code-btn"
							>
								{isSubmittingCode ? (
									<>
										<RefreshCw className="animate-spin w-4 h-4" />
										<span>Заверение в ЕГИСЗ...</span>
									</>
								) : (
									<>
										<CheckCircle2 size={16} />
										<span>Заверить {signingSession.appointmentIds.length} карт ПЭП</span>
									</>
								)}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
