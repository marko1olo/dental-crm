/**
 * DoctorShiftEarningsWidget.tsx — Chairside HUD Doctor Shift Earnings Widget.
 * Mandate 8x: полное исключение канцелярита Т-51.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Banknote, ChevronDown, Printer, Wallet, X } from "lucide-react";
import { type ChairsideShiftEarningsSummary, calculateChairsideShiftEarnings } from "./doctorShiftEarnings.js";
import type { DoctorShiftAppointment } from "@dental/shared";
import { ShiftHudPayoutBanner } from "./shiftWidget/ShiftHudPayoutBanner.js";
import { ShiftHudMetricsGrid } from "./shiftWidget/ShiftHudMetricsGrid.js";
import { ShiftHudPatientsAccordion } from "./shiftWidget/ShiftHudPatientsAccordion.js";
import { printShiftPayslip } from "./shiftWidget/shiftPrintUtils.js";
import "./doctorShiftEarnings.css";

export interface DoctorShiftEarningsWidgetProps {
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly shiftDateIso?: string | undefined;
	readonly commissionPercent?: number | undefined;
	readonly appointments?: readonly DoctorShiftAppointment[] | undefined;
	readonly compact?: boolean | undefined;
	readonly onPrintPayslip?: (() => void) | undefined;
}

export const DoctorShiftEarningsWidget: React.FC<DoctorShiftEarningsWidgetProps> = ({
	doctorId = "doc-1",
	doctorName = "Д-р Смирнов Алексей Петрович",
	shiftDateIso = new Date().toISOString().split("T")[0]!,
	commissionPercent = 25,
	appointments,
	compact = false,
	onPrintPayslip,
}) => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [showPatientDetails, setShowPatientDetails] = useState<boolean>(false);
	const containerRef = useRef<HTMLDivElement | null>(null);

	const effectiveAppointments = useMemo(() => appointments ?? [], [appointments]);
	const summary: ChairsideShiftEarningsSummary = useMemo(() => {
		return calculateChairsideShiftEarnings({
			appointments: effectiveAppointments,
			doctorId,
			doctorName,
			shiftDateIso,
			defaultCommissionPercent: commissionPercent,
		});
	}, [effectiveAppointments, doctorId, doctorName, shiftDateIso, commissionPercent]);

	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
		const onClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
		};
		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("mousedown", onClickOutside);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("mousedown", onClickOutside);
		};
	}, [isOpen]);

	return (
		<div className="doctor-shift-hud-container" ref={containerRef} data-testid="doctor-shift-earnings-widget">
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
				<span className="text-emerald-800 dark:text-emerald-300 font-mono">{summary.formattedEarnedPayout}</span>
				{!compact && (
					<span className="text-[10px] text-[var(--muted)] font-normal border-l border-[var(--line)] pl-1.5 hidden xs:inline">
						{summary.patientsCompletedCount} пац.
					</span>
				)}
				<ChevronDown className={`w-3 h-3 text-[var(--muted)] transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
			</button>

			{isOpen && (
				<div className="doctor-shift-hud-popover" data-testid="doctor-shift-hud-popover" role="region" aria-label="Детализация заработка за смену">
					<div className="doctor-shift-hud-header">
						<div className="flex flex-col">
							<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)]">
								<Banknote className="w-3.5 h-3.5 text-emerald-600" />
								<span>Заработок за смену (Chairside HUD)</span>
							</div>
							<div className="text-[10px] text-[var(--muted)]">{summary.shiftDateRu} • {summary.doctorName}</div>
						</div>
						<button type="button" onClick={() => setIsOpen(false)} className="w-6 h-6 rounded-md border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer" aria-label="Закрыть панель заработка" data-testid="btn-close-shift-hud">
							<X className="w-3.5 h-3.5" />
						</button>
					</div>

					<ShiftHudPayoutBanner summary={summary} />
					<ShiftHudMetricsGrid summary={summary} />

					<div className="mx-3.5 mb-2 px-2.5 py-1.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[10px] font-mono text-[var(--muted)] text-center">
						<div className="text-[9px] uppercase font-bold text-[var(--ink)] mb-0.5">Формула начисления</div>
						{summary.formulaExplanationRu}
					</div>

					<ShiftHudPatientsAccordion summary={summary} isOpen={showPatientDetails} onToggle={() => setShowPatientDetails((prev) => !prev)} />

					<div className="doctor-shift-hud-footer">
						<span className="text-[10px] text-[var(--muted)]">Общеклинические расходники оплачены клиникой (0 ₽ вычет)</span>
						<button
							type="button"
							onClick={() => printShiftPayslip(summary, onPrintPayslip)}
							className="h-7 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[11px] font-bold text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
							data-testid="btn-print-shift-slip"
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
