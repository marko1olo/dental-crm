import type React from "react";
import { useState, useEffect, useMemo } from "react";
import {
	AlertTriangle,
	Bell,
	BellRing,
	Calendar,
	CheckCircle2,
	ChevronDown,
	Clock,
	ClipboardList,
	FileBadge,
	FileSignature,
	FileText,
	Image as ImageIcon,
	Layers,
	LayoutDashboard,
	MoreHorizontal,
	Phone,
	Printer,
	RefreshCw,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	User,
	X,
} from "lucide-react";
import {
	type DoctorShiftAppointment,
	SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	filterDoctorShiftAppointments,
	formatKopecksRu,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import { DoctorShiftCockpitModal, type DoctorQuickCallAction } from "./DoctorShiftCockpitModal";
import "./doctorShiftCockpit.css";

export interface DoctorDesktopHeaderProps {
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly cabinetName?: string | undefined;
	readonly chairName?: string | undefined;
	readonly shiftDateIso?: string | undefined;
	readonly appointments?: readonly DoctorShiftAppointment[] | undefined;
	readonly activeAppointment?: DoctorShiftAppointment | null | undefined;
	readonly patientAllergyAlert?: string | undefined;
	readonly onQuickAction?: ((action: DoctorQuickCallAction) => void) | undefined;
	readonly onFinishVisit?: ((appointment: DoctorShiftAppointment) => void) | undefined;
	readonly onOpenCockpitModal?: (() => void) | undefined;
	readonly onOpenCockpit?: (() => void) | undefined;
	readonly onInitiateBatchSign?: (() => void) | undefined;
}

export const DoctorDesktopHeader: React.FC<DoctorDesktopHeaderProps> = ({
	doctorId = "doc-1",
	doctorName = "Д-р Смирнов Алексей Петрович",
	doctorSpecialty = "Терапевт-ортопед",
	cabinetName,
	chairName,
	shiftDateIso = "2026-08-29",
	appointments = SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	activeAppointment: propActiveAppointment,
	patientAllergyAlert,
	onQuickAction,
	onFinishVisit,
	onOpenCockpitModal,
	onOpenCockpit,
	onInitiateBatchSign,
}) => {
	const effectiveCabinetName = cabinetName || chairName || "Кабинет № 1";
	const [isCockpitOpen, setIsCockpitOpen] = useState<boolean>(false);
	const [isAssistantCalled, setIsAssistantCalled] = useState<boolean>(false);
	const [currentTime, setCurrentTime] = useState<Date>(new Date());
	const [showDocsDropdown, setShowDocsDropdown] = useState<boolean>(false);
	const [showSecondaryDropdown, setShowSecondaryDropdown] = useState<boolean>(false);

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

	// Resolve active appointment
	const currentAppointment = useMemo(() => {
		if (propActiveAppointment) return propActiveAppointment;
		const inChair = doctorAppointments.find((a) => a.status === "in_chair");
		if (inChair) return inChair;
		return doctorAppointments.find((a) => a.status === "waiting") || null;
	}, [propActiveAppointment, doctorAppointments]);

	// Dynamic calculation of active patient balance from services in kopecks
	const activePatientBalanceKop = useMemo(() => {
		if (!currentAppointment || !currentAppointment.services) return 0;
		return currentAppointment.services.reduce((acc, s) => acc + (s.finalRevenueKop || 0), 0);
	}, [currentAppointment]);

	// Dynamic detection of critical allergy / somatic risks
	const dynamicAllergyText = useMemo(() => {
		if (patientAllergyAlert) return patientAllergyAlert;
		if (!currentAppointment) return null;
		const text = `${currentAppointment.treatmentDescription || ""} ${currentAppointment.patientFullName || ""}`;
		if (/лидокаин/i.test(text)) return "Аллергия: Лидокаин";
		if (/новокаин/i.test(text)) return "Аллергия: Новокаин";
		if (/артикаин/i.test(text)) return "Аллергия: Артикаин";
		if (/бисфосфонат/i.test(text)) return "Риск: Бисфосфонаты (BRONJ)";
		return "Аллергостатус: норма";
	}, [patientAllergyAlert, currentAppointment]);

	// Unsigned 043/у EMR count
	const unsignedCount = useMemo(() => {
		return doctorAppointments.filter(
			(a) => (a.status === "completed" || a.emrCard043uStatus === "pending_signature") && a.emrCard043uStatus !== "signed",
		).length;
	}, [doctorAppointments]);

	// Countdown calculations for active appointment
	const timerState = useMemo(() => {
		if (!currentAppointment) {
			return { isOvertime: false, formatted: "00:00" };
		}
		const endsAt = new Date(currentAppointment.endsAtIso).getTime();
		if (!Number.isFinite(endsAt)) {
			return { isOvertime: false, formatted: "00:00" };
		}
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
				isOvertime: true,
				formatted: `+${displayMin} мин`,
			};
		}

		return {
			isOvertime: false,
			formatted: `${p(minutes)}:${p(seconds)}`,
		};
	}, [currentAppointment, currentTime]);

	// Handle Quick Action Call
	const handleQuickCall = (action: DoctorQuickCallAction) => {
		if (action === "assistant_call") {
			setIsAssistantCalled((prev) => {
				const nextState = !prev;
				if (nextState) {
					showToast(`Вызов ассистента в ${effectiveCabinetName}`, "warning");
				} else {
					showToast("Вызов ассистента отменен", "info");
				}
				return nextState;
			});
		}
		onQuickAction?.(action);
	};

	const handleFinishVisit = () => {
		if (currentAppointment) {
			onFinishVisit?.(currentAppointment);
			showToast(`Прием ${currentAppointment.patientFullName} завершен.`, "success");
		}
	};

	return (
		<>
			<header
				className="doctor-desktop-header-strip"
				data-testid="doctor-desktop-header"
				role="banner"
				aria-label="Панель рабочего стола врача"
			>
				{/* 1. Left: Doctor & Cabinet Identity */}
				<div className="doctor-desktop-header-section shrink-0 min-w-fit">
					<div className="flex items-center gap-1.5">
						<div className="w-7 h-7 rounded-lg bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] flex items-center justify-center text-teal-400 shrink-0">
							<Stethoscope size={15} />
						</div>
						<div className="flex flex-col min-w-fit shrink-0">
							<div className="flex items-center gap-1 leading-tight">
								<span className="font-extrabold text-xs text-slate-900 dark:text-[var(--ink,#f8fafc)] whitespace-nowrap min-w-fit shrink-0">{doctorName}</span>
								<span className="text-[10px] px-1 py-0.5 rounded bg-teal-50 dark:bg-[var(--paper,#0f172a)] text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-[var(--line,#334155)] font-bold whitespace-nowrap shrink-0">
									{effectiveCabinetName}
								</span>
							</div>
							<span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-tight whitespace-nowrap">
								{doctorSpecialty}
							</span>
						</div>
					</div>
				</div>

				{/* 2. Middle: Active Patient Context, Emergency Allergy Badge & Overtime Timer [Clean flex-nowrap container] */}
				{currentAppointment ? (
					<div className="flex items-center gap-1.5 flex-nowrap shrink-0">
						<div className="flex items-center gap-1.5 flex-nowrap bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] px-2 py-1 rounded-xl">
							<div className="flex items-center gap-1 font-bold text-xs text-[var(--ink,#f8fafc)] shrink-0">
								<User size={13} className="text-teal-400 shrink-0" />
								<span className="whitespace-nowrap font-bold" data-testid="header-patient-name">{currentAppointment.patientFullName}</span>
							</div>

							<span className="text-[11px] text-teal-400 font-semibold shrink-0 whitespace-nowrap">
								{currentAppointment.diagnosisTooth ? `Зуб ${currentAppointment.diagnosisTooth}` : "Осмотр"}
							</span>

							{/* Emergency Allergy Alert Badge */}
							{dynamicAllergyText && (
								dynamicAllergyText.includes("норма") ? (
									<div
										className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold shrink-0 whitespace-nowrap"
										data-testid="header-allergy-alert"
										title="Аллергологический анамнез в норме"
									>
										<ShieldCheck size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
										<span>{dynamicAllergyText}</span>
									</div>
								) : (
									<div
										className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-600/15 text-rose-950 dark:text-rose-100 border-2 border-rose-600 text-[10px] font-black shrink-0 whitespace-nowrap shadow-xs animate-pulse"
										data-testid="header-allergy-alert"
										role="alert"
										title="Внимание: клинический стоп-фактор пациента!"
									>
										<ShieldAlert size={12} className="text-rose-600 dark:text-rose-400 shrink-0" />
										<span>{dynamicAllergyText}</span>
									</div>
								)
							)}

							<span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0 whitespace-nowrap">
								{formatKopecksRu(activePatientBalanceKop)}
							</span>
						</div>

						{/* Live Countdown Timer in the same flex-nowrap flow */}
						<div
							className={`doctor-countdown-timer !py-1 !px-2 !text-xs whitespace-nowrap tabular-nums shrink-0 ${
								timerState.isOvertime ? "overtime" : "normal"
							}`}
							data-testid="header-countdown-timer"
							role="timer"
						>
							<Clock size={13} className="shrink-0" />
							<span className="whitespace-nowrap tabular-nums shrink-0">{timerState.formatted}</span>
							{timerState.isOvertime && (
								<span className="text-[9px] font-extrabold uppercase whitespace-nowrap shrink-0">Овертайм</span>
							)}
						</div>
					</div>
				) : (
					<div className="flex items-center justify-center text-xs text-[var(--ink-2,var(--muted,#cbd5e1))] px-2">
						<span>Нет активного приема в кресле</span>
					</div>
				)}

				{/* 3. Right: Action Buttons & Clean Hick's/Miller's Toolbar */}
				<div className="doctor-desktop-header-section shrink-0">
					{/* Cockpit trigger */}
					<button
						type="button"
						onClick={() => {
							setIsCockpitOpen(true);
							onOpenCockpitModal?.();
							onOpenCockpit?.();
						}}
						className="min-h-[32px] px-2 rounded-lg bg-[var(--paper,#0f172a)] hover:bg-[var(--paper-soft,#1e293b)] text-teal-400 border border-teal-800/80 font-extrabold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0 touch-manipulation"
						data-testid="header-btn-open-cockpit"
						title="Открыть полный кокпит смены врача"
					>
						<Layers size={13} />
						<span>Кокпит</span>
						{unsignedCount > 0 && (
							<span className="px-1 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700 text-[9px] font-extrabold">
								{unsignedCount}
							</span>
						)}
					</button>

					{/* 0-Click Primary Chart Tool: 043/у */}
					<button
						type="button"
						onClick={() => handleQuickCall("odontogram")}
						className="min-h-[32px] px-2 rounded-lg bg-[var(--paper,#0f172a)] hover:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#f8fafc)] border border-[var(--line,#334155)] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer touch-manipulation shrink-0"
						data-testid="header-btn-odontogram"
						title="Одонтограмма 043/у"
					>
						<FileText size={13} className="text-teal-400" />
						<span>043/у</span>
					</button>

					{/* Grouped Documents Dropdown (Наряд, Снимки, ИДС) */}
					<div className="relative">
						<button
							type="button"
							onClick={() => setShowDocsDropdown((v) => !v)}
							className="min-h-[32px] px-2 rounded-lg bg-[var(--paper,#0f172a)] hover:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#f8fafc)] border border-[var(--line,#334155)] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer touch-manipulation shrink-0"
							title="Документы и наряды"
							data-testid="header-btn-docs-group"
						>
							<ClipboardList size={13} className="text-teal-400" />
							<span>Документы</span>
							<ChevronDown size={11} className="text-[var(--ink-2,#cbd5e1)]" />
						</button>

						{/* Dropdown Menu with Secondary Document Tools */}
						<div className={`absolute right-0 top-10 w-52 rounded-xl bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-xs text-[var(--ink,#f8fafc)] ${showDocsDropdown ? "block" : "hidden"}`}>
							<button
								type="button"
								onClick={() => {
									setShowDocsDropdown(false);
									handleQuickCall("lab_order");
								}}
								className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--paper-soft,#1e293b)] font-semibold cursor-pointer flex items-center gap-2"
								data-testid="header-btn-lab-order"
								title="Наряд-заказ в зуботехническую лабораторию"
							>
								<ClipboardList size={14} className="text-teal-400" />
								<span>Наряд ЗТЛ</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setShowDocsDropdown(false);
									handleQuickCall("imaging");
								}}
								className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--paper-soft,#1e293b)] font-semibold cursor-pointer flex items-center gap-2"
								data-testid="header-btn-imaging"
								title="КЛКТ и рентгенограммы"
							>
								<ImageIcon size={14} className="text-teal-400" />
								<span>Снимки КЛКТ</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setShowDocsDropdown(false);
									handleQuickCall("consent");
								}}
								className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--paper-soft,#1e293b)] font-semibold cursor-pointer flex items-center gap-2"
								data-testid="header-btn-consent"
								title="Информированное добровольное согласие"
							>
								<FileSignature size={14} className="text-teal-400" />
								<span>ИДС</span>
							</button>
						</div>
					</div>

					{/* Assistant Call Button */}
					<button
						type="button"
						onClick={() => handleQuickCall("assistant_call")}
						className={`min-h-[32px] px-2 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer touch-manipulation shrink-0 ${
							isAssistantCalled
								? "bg-amber-950/70 border-amber-500 text-amber-300 animate-pulse"
								: "bg-[var(--paper,#0f172a)] hover:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#f8fafc)] border-[var(--line,#334155)]"
						}`}
						data-testid="header-btn-assistant"
						title="Вызов ассистента в кабинет"
					>
						{isAssistantCalled ? <BellRing size={13} className="text-amber-400" /> : <Bell size={13} />}
						<span>Ассистент</span>
					</button>

					{/* Visual Divider separating tools and primary CTA */}
					<div className="w-px h-5 bg-[var(--line,#334155)] mx-0.5 shrink-0" />

					{/* Hick's Law: 1 Dominant Primary Action CTA */}
					<button
						type="button"
						onClick={handleFinishVisit}
						className="min-h-[32px] px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-extrabold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0 touch-manipulation border-0 shadow-none outline-none"
						data-testid="header-btn-finish-visit"
					>
						<CheckCircle2 size={14} />
						<span className="whitespace-nowrap">Завершить</span>
					</button>

					{/* Miller's Law: Secondary Dropdown Menu */}
					<div className="relative">
						<button
							type="button"
							onClick={() => setShowSecondaryDropdown((v) => !v)}
							className="w-8 h-8 rounded-lg bg-[var(--paper,#0f172a)] hover:bg-[var(--paper-soft,#1e293b)] text-[var(--ink-2,var(--muted,#cbd5e1))] hover:text-[var(--ink,#f8fafc)] border border-[var(--line,#334155)] flex items-center justify-center cursor-pointer transition-colors touch-manipulation"
							aria-label="Дополнительные опции"
							data-testid="header-secondary-dropdown-btn"
						>
							<MoreHorizontal size={14} />
						</button>

						{showSecondaryDropdown && (
							<div className="absolute right-0 top-11 w-56 rounded-xl bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-xs text-[var(--ink,#f8fafc)]">
								<button
									type="button"
									onClick={() => {
										setShowSecondaryDropdown(false);
										setIsCockpitOpen(true);
									}}
									className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--paper-soft,#1e293b)] font-semibold cursor-pointer flex items-center gap-2"
								>
									<LayoutDashboard size={14} className="text-teal-400" />
									<span>Полный кокпит смены</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setShowSecondaryDropdown(false);
										showToast("Печать карты 043/у...", "info");
									}}
									className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--paper-soft,#1e293b)] font-semibold cursor-pointer flex items-center gap-2"
								>
									<Printer size={14} className="text-teal-400" />
									<span>Печать карты 043/у</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setShowSecondaryDropdown(false);
										showToast("Запрос на смену рабочего кресла", "info");
									}}
									className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--paper-soft,#1e293b)] font-semibold cursor-pointer flex items-center gap-2"
								>
									<RefreshCw size={14} className="text-teal-400" />
									<span>Сменить рабочее кресло</span>
								</button>
							</div>
						)}
					</div>
				</div>
			</header>

			{/* Integrated Doctor Shift Cockpit Modal */}
			<DoctorShiftCockpitModal
				isOpen={isCockpitOpen}
				onClose={() => setIsCockpitOpen(false)}
				doctorId={doctorId}
				doctorName={doctorName}
				doctorSpecialty={doctorSpecialty}
				cabinetName={cabinetName}
				shiftDateIso={shiftDateIso}
				initialAppointments={appointments}
				activeAppointmentId={currentAppointment?.id}
				onQuickAction={handleQuickCall}
				onCompleteAndOrder={onFinishVisit}
			/>
		</>
	);
};

