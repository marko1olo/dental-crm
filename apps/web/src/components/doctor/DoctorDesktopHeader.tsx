import type React from "react";
import { useState, useEffect, useMemo } from "react";
import {
	AlertTriangle,
	Bell,
	BellRing,
	Calendar,
	CheckCircle2,
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
		return "Аллергический статус проверен";
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

		return {
			isOvertime,
			formatted: isOvertime ? `+${p(minutes)}:${p(seconds)}` : `${p(minutes)}:${p(seconds)}`,
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
				<div className="doctor-desktop-header-section shrink-0">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] flex items-center justify-center text-teal-400">
							<Stethoscope size={16} />
						</div>
						<div className="flex flex-col">
							<div className="flex items-center gap-1.5 leading-tight">
								<span className="font-extrabold text-xs text-[var(--ink,#f8fafc)]">{doctorName}</span>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper,#0f172a)] text-teal-400 border border-[var(--line,#334155)] font-bold">
									{effectiveCabinetName}
								</span>
							</div>
							<span className="text-[10px] text-[var(--ink-2,var(--muted,#cbd5e1))] leading-tight">
								{doctorSpecialty}
							</span>
						</div>
					</div>
				</div>

				{/* 2. Middle: Active Patient Context & Dynamic Emergency Alert Badge */}
				{currentAppointment ? (
					<div className="doctor-desktop-header-section flex-1 min-w-0 justify-center max-w-2xl px-2">
						<div className="flex items-center gap-2.5 bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] px-3 py-1 rounded-xl truncate">
							<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink,#f8fafc)] shrink-0">
								<User size={14} className="text-teal-400" />
								<span className="truncate" data-testid="header-patient-name">{currentAppointment.patientFullName}</span>
							</div>

							<span className="text-[11px] text-teal-400 font-semibold shrink-0">
								{currentAppointment.diagnosisTooth ? `Зуб ${currentAppointment.diagnosisTooth}` : "Осмотр"} ({currentAppointment.diagnosisIcd10 || "К04.0"})
							</span>

							{/* Emergency Allergy Alert Badge */}
							{dynamicAllergyText && (
								<div
									className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-950/70 border border-red-800 text-red-300 text-[10px] font-extrabold shrink-0"
									data-testid="header-allergy-alert"
								>
									<ShieldAlert size={12} className="text-red-400" />
									<span>{dynamicAllergyText}</span>
								</div>
							)}

							<span className="text-[11px] font-extrabold text-emerald-400 shrink-0">
								{formatKopecksRu(activePatientBalanceKop)}
							</span>
						</div>
					</div>
				) : (
					<div className="doctor-desktop-header-section flex-1 justify-center text-xs text-[var(--ink-2,var(--muted,#cbd5e1))]">
						<span>Нет активного приема в кресле</span>
					</div>
				)}

				{/* 3. Middle-Right: Live Countdown Timer */}
				<div className="doctor-desktop-header-section shrink-0">
					<div
						className={`doctor-countdown-timer !py-1 !px-2.5 !text-xs whitespace-nowrap tabular-nums shrink-0 ${
							timerState.isOvertime ? "overtime" : "normal"
						}`}
						data-testid="header-countdown-timer"
						role="timer"
					>
						<Clock size={14} className="shrink-0" />
						<span className="whitespace-nowrap tabular-nums shrink-0">{timerState.formatted}</span>
						{timerState.isOvertime && (
							<span className="text-[9px] font-extrabold uppercase whitespace-nowrap shrink-0">Овертайм</span>
						)}
					</div>
				</div>

				{/* 4. Right: 0-Click Fast Action Buttons & Hick's 1-Primary Action */}
				<div className="doctor-desktop-header-section shrink-0">
					{/* 0-Click Tools (Fitts touch-compliant) */}
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => handleQuickCall("odontogram")}
							className="min-h-[36px] px-2.5 rounded-lg bg-[var(--paper,#0f172a)] hover:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#f8fafc)] border border-[var(--line,#334155)] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
							data-testid="header-btn-odontogram"
							title="Одонтограмма 043/у"
						>
							<FileText size={14} className="text-teal-400" />
							<span>043/у</span>
						</button>
						<button
							type="button"
							onClick={() => handleQuickCall("lab_order")}
							className="min-h-[36px] px-2.5 rounded-lg bg-[var(--paper,#0f172a)] hover:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#f8fafc)] border border-[var(--line,#334155)] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
							data-testid="header-btn-lab-order"
							title="Наряд-заказ в зуботехническую лабораторию"
						>
							<ClipboardList size={14} className="text-teal-400" />
							<span>Наряд</span>
						</button>
						<button
							type="button"
							onClick={() => handleQuickCall("imaging")}
							className="min-h-[36px] px-2.5 rounded-lg bg-[var(--paper,#0f172a)] hover:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#f8fafc)] border border-[var(--line,#334155)] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
							data-testid="header-btn-imaging"
							title="КЛКТ и рентгенограммы"
						>
							<ImageIcon size={14} className="text-teal-400" />
							<span>Снимки</span>
						</button>
						<button
							type="button"
							onClick={() => handleQuickCall("consent")}
							className="min-h-[36px] px-2.5 rounded-lg bg-[var(--paper,#0f172a)] hover:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#f8fafc)] border border-[var(--line,#334155)] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
							data-testid="header-btn-consent"
							title="Информированное добровольное согласие"
						>
							<FileSignature size={14} className="text-teal-400" />
							<span>ИДС</span>
						</button>
						<button
							type="button"
							onClick={() => handleQuickCall("assistant_call")}
							className={`min-h-[36px] px-2.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation ${
								isAssistantCalled
									? "bg-amber-950/70 border-amber-500 text-amber-300 animate-pulse"
									: "bg-[var(--paper,#0f172a)] hover:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#f8fafc)] border-[var(--line,#334155)]"
							}`}
							data-testid="header-btn-assistant"
							title="Вызов ассистента в кабинет"
						>
							{isAssistantCalled ? <BellRing size={14} className="text-amber-400" /> : <Bell size={14} />}
							<span>Ассистент</span>
						</button>
					</div>

					{/* Hick's Law: 1 Dominant Primary Action CTA */}
					<button
						type="button"
						onClick={handleFinishVisit}
						className="min-h-[36px] px-3.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0 touch-manipulation"
						data-testid="header-btn-finish-visit"
					>
						<CheckCircle2 size={15} />
						<span>Завершить приём</span>
					</button>

					{/* Shift Cockpit Modal Trigger Button */}
					<button
						type="button"
						onClick={() => {
							setIsCockpitOpen(true);
							onOpenCockpitModal?.();
						}}
						className="min-h-[36px] px-3 rounded-lg bg-[var(--paper,#0f172a)] hover:bg-[var(--paper-soft,#1e293b)] text-teal-400 border border-teal-800/80 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 touch-manipulation"
						data-testid="header-btn-open-cockpit"
					>
						<Layers size={15} />
						<span>Кокпит</span>
						{unsignedCount > 0 && (
							<span className="px-1.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-extrabold">
								{unsignedCount}
							</span>
						)}
					</button>

					{/* Miller's Law: Secondary Dropdown Menu */}
					<div className="relative">
						<button
							type="button"
							onClick={() => setShowSecondaryDropdown((v) => !v)}
							className="w-9 h-9 rounded-lg bg-[var(--paper,#0f172a)] hover:bg-[var(--paper-soft,#1e293b)] text-[var(--ink-2,var(--muted,#cbd5e1))] hover:text-[var(--ink,#f8fafc)] border border-[var(--line,#334155)] flex items-center justify-center cursor-pointer transition-colors touch-manipulation"
							aria-label="Дополнительные опции"
							data-testid="header-secondary-dropdown-btn"
						>
							<MoreHorizontal size={16} />
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
