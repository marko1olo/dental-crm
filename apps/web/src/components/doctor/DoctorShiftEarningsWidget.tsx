/**
 * DoctorShiftEarningsWidget.tsx — Chairside HUD Doctor Shift Earnings Widget.
 * 
 * Compliance: Mandates 8d, 8e, 8n, 8p (Studio Clinical HIG / Apple WebKit Desktop Density).
 * Compact desktop widget (28-32px) that stays quiet during patient appointments
 * and expands on 1 click to reveal full transparent shift revenue and piece-rate accrual.
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
	Banknote,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	CreditCard,
	DollarSign,
	FileText,
	HelpCircle,
	Printer,
	User,
	Users,
	Wallet,
	X,
	Zap,
} from "lucide-react";
import {
	type ChairsideShiftEarningsSummary,
	calculateChairsideShiftEarnings,
} from "./doctorShiftEarnings.js";
import {
	type DoctorShiftAppointment,
	generateDoctorT51Html,
} from "@dental/shared";
import { showToast } from "../GlobalToast.js";
import "./doctorShiftEarnings.css";

export interface DoctorShiftEarningsWidgetProps {
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly shiftDateIso?: string | undefined;
	readonly commissionPercent?: number | undefined;
	readonly appointments?: readonly DoctorShiftAppointment[] | undefined;
	readonly compact?: boolean | undefined;
	readonly onPrintT51?: (() => void) | undefined;
}

export const DoctorShiftEarningsWidget: React.FC<DoctorShiftEarningsWidgetProps> = ({
	doctorId = "doc-1",
	doctorName = "Д-р Смирнов Алексей Петрович",
	shiftDateIso = new Date().toISOString().split("T")[0]!,
	commissionPercent = 25,
	appointments,
	compact = false,
	onPrintT51,
}) => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [showPatientDetails, setShowPatientDetails] = useState<boolean>(false);
	const containerRef = useRef<HTMLDivElement | null>(null);

	// Fallback to empty array if none provided (Zero-Mocks invariant, Mandates 8s, 8e)
	const effectiveAppointments = useMemo(() => {
		return appointments ?? [];
	}, [appointments]);

	// Calculate shift earnings
	const summary: ChairsideShiftEarningsSummary = useMemo(() => {
		return calculateChairsideShiftEarnings({
			appointments: effectiveAppointments,
			doctorId,
			doctorName,
			shiftDateIso,
			defaultCommissionPercent: commissionPercent,
		});
	}, [effectiveAppointments, doctorId, doctorName, shiftDateIso, commissionPercent]);

	// Outside click & ESC listener to close smoothly
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};

		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	// 1-Click Print T-51
	const handlePrintSlip = () => {
		if (onPrintT51) {
			onPrintT51();
			return;
		}

		try {
			const html = generateDoctorT51Html({
				organizationName: "ООО «ДЕНТЕ»",
				doctorName: summary.doctorName,
				specialtyTitle: "Врач-стоматолог терапевт-ортопед",
				periodFromIso: `${summary.shiftDateIso}T08:00:00.000Z`,
				periodToIso: `${summary.shiftDateIso}T20:00:00.000Z`,
				grossRevenueRub: summary.grossRevenueRub,
				netBaseRevenueRub: summary.netBaseRevenueRub,
				pieceworkAccruedRub: summary.totalEarnedPayoutRub,
				totalAccruedRub: summary.totalEarnedPayoutRub,
				ndflTaxRub: Math.round(summary.totalEarnedPayoutRub * 0.13),
				withheldLabRub: summary.labCostRub,
				withheldMaterialRub: summary.materialsCostRub,
				overheadConsumablesCoveredRub: 1500, // Clinic standard: 0 ₽ to doctor
				netPayoutRub: Math.round(summary.totalEarnedPayoutRub * 0.87),
			});

			const printWin = window.open("", "_blank");
			if (printWin) {
				printWin.document.write(html);
				printWin.document.close();
				printWin.focus();
				setTimeout(() => {
					printWin.print();
				}, 250);
			}
			showToast("Расчет зарплаты за смену отправлен на печать", "info");
		} catch (err) {
			showToast("Не удалось открыть окно печати", "error");
		}
	};

	return (
		<div className="doctor-shift-hud-container" ref={containerRef} data-testid="doctor-shift-earnings-widget">
			{/* Trigger Button — Ultra-compact desktop density (h-7/28px) */}
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="doctor-shift-hud-trigger"
				data-testid="btn-toggle-shift-earnings-hud"
				title="Нажмите, чтобы просмотреть прозрачный расчет заработка за смену"
				aria-expanded={isOpen}
				aria-haspopup="true"
			>
				<Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span className="text-emerald-800 dark:text-emerald-300 font-mono">
					{summary.formattedEarnedPayout}
				</span>
				{!compact && (
					<span className="text-[10px] text-[var(--muted)] font-normal border-l border-[var(--line)] pl-1.5 hidden xs:inline">
						{summary.patientsCompletedCount} пац.
					</span>
				)}
				<ChevronDown
					className={`w-3 h-3 text-[var(--muted)] transition-transform duration-150 ${
						isOpen ? "rotate-180" : ""
					}`}
				/>
			</button>

			{/* Expanded Chairside HUD Popover */}
			{isOpen && (
				<div
					className="doctor-shift-hud-popover"
					data-testid="doctor-shift-hud-popover"
					role="region"
					aria-label="Детализация заработка за смену"
				>
					{/* Header */}
					<div className="doctor-shift-hud-header">
						<div className="flex flex-col">
							<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)]">
								<Banknote className="w-3.5 h-3.5 text-emerald-600" />
								<span>Заработок за смену (Chairside HUD)</span>
							</div>
							<div className="text-[10px] text-[var(--muted)]">
								{summary.shiftDateRu} • {summary.doctorName}
							</div>
						</div>
						<button
							type="button"
							onClick={() => setIsOpen(false)}
							className="w-6 h-6 rounded-md border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							aria-label="Закрыть панель заработка"
							data-testid="btn-close-shift-hud"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					</div>

					{/* Dominant Shift Accrual Banner */}
					<div className="doctor-shift-hud-payout-banner" data-testid="hud-payout-banner">
						<div className="flex flex-col">
							<span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 dark:text-emerald-300">
								Начислено к выплате за смену
							</span>
							<span className="text-xl font-black font-mono text-emerald-900 dark:text-emerald-100">
								{summary.formattedEarnedPayout}
							</span>
						</div>
						<div className="text-right flex flex-col items-end">
							<span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-400">
								Ставка врача: {summary.doctorCommissionPercent}%
							</span>
							<span className="text-[10px] text-[var(--muted)] font-mono">
								{summary.patientsCompletedCount} из {summary.patientsTotalCount} пац. завершено
							</span>
						</div>
					</div>

					{/* 4-Step Breakdown Grid */}
					<div className="doctor-shift-hud-grid-metrics" data-testid="hud-metrics-grid">
						<div className="doctor-shift-hud-metric-card">
							<span className="text-[10px] font-bold text-[var(--muted)] uppercase">
								Выполнено услуг (Gross)
							</span>
							<span className="text-xs font-bold font-mono text-[var(--ink)]">
								{summary.formattedGross}
							</span>
						</div>

						<div className="doctor-shift-hud-metric-card">
							<span className="text-[10px] font-bold text-[var(--muted)] uppercase">
								Вычет ЗТЛ (Лаборатория)
							</span>
							<span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
								−{summary.formattedLab}
							</span>
						</div>

						<div className="doctor-shift-hud-metric-card">
							<span className="text-[10px] font-bold text-[var(--muted)] uppercase">
								Вычет прямых материалов
							</span>
							<span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
								−{summary.formattedMaterials}
							</span>
						</div>

						<div className="doctor-shift-hud-metric-card">
							<span className="text-[10px] font-bold text-[var(--muted)] uppercase">
								Чистая база (Net Base)
							</span>
							<span className="text-xs font-bold font-mono text-teal-700 dark:text-teal-400">
								{summary.formattedNetBase}
							</span>
						</div>
					</div>

					{/* Transparent Formula Explainer Banner */}
					<div className="mx-3.5 mb-2 px-2.5 py-1.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[10px] font-mono text-[var(--muted)] text-center">
						<div className="text-[9px] uppercase font-bold text-[var(--ink)] mb-0.5">
							Формула начисления
						</div>
						{summary.formulaExplanationRu}
					</div>

					{/* Toggle Patients Details */}
					<div className="px-3.5 pb-2">
						<button
							type="button"
							onClick={() => setShowPatientDetails((prev) => !prev)}
							className="w-full py-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-between border-t border-[var(--line)] pt-2 cursor-pointer"
							data-testid="btn-toggle-patient-details"
						>
							<span className="flex items-center gap-1">
								<Users className="w-3 h-3" />
								<span>Детализация по пациентам ({summary.patientItems.length})</span>
							</span>
							{showPatientDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
						</button>
					</div>

					{/* Patients Breakdown Accordion */}
					{showPatientDetails && (
						<div className="doctor-shift-hud-patients-list" data-testid="hud-patients-list">
							{summary.patientItems.length === 0 ? (
								<div className="text-[11px] text-[var(--muted)] text-center py-2">
									Нет завершенных приемов на текущую смену
								</div>
							) : (
								summary.patientItems.map((item) => (
									<div key={item.appointmentId} className="doctor-shift-hud-patient-row" data-testid={`patient-row-${item.patientId}`}>
										<div className="flex flex-col min-w-0 pr-2">
											<span className="font-bold text-[var(--ink)] truncate">
												{item.patientFullName}
											</span>
											<span className="text-[10px] text-[var(--muted)] truncate">
												{item.serviceTitles.join(", ") || "Консультация"}
											</span>
											{item.labCostKop > 0 && (
												<span className="text-[9px] text-rose-600">
													ЗТЛ: −{Math.round(item.labCostKop / 100).toLocaleString("ru-RU")} ₽
												</span>
											)}
										</div>
										<div className="text-right shrink-0">
											<span className="font-bold font-mono text-emerald-700 dark:text-emerald-400 block">
												+{Math.round(item.doctorEarnedKop / 100).toLocaleString("ru-RU")} ₽
											</span>
											<span className="text-[9px] text-[var(--muted)] font-mono">
												{Math.round(item.grossRevenueKop / 100).toLocaleString("ru-RU")} ₽
											</span>
										</div>
									</div>
								))
							)}
						</div>
					)}

					{/* Footer with 1-Click Print */}
					<div className="doctor-shift-hud-footer">
						<span className="text-[10px] text-[var(--muted)]">
							Общеклинические расходники оплачены клиникой (0 ₽ вычет)
						</span>
						<button
							type="button"
							onClick={handlePrintSlip}
							className="h-7 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[11px] font-bold text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
							data-testid="btn-print-shift-t51"
							title="Распечатать расчет зарплаты за смену"
						>
							<Printer className="w-3 h-3 text-teal-600" />
							<span>Печать зарплаты</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
