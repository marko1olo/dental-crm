import React, { useId, useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { Wallet, Calendar, FileSpreadsheet, RefreshCw } from "lucide-react";
import "../../../styles/modules/mobile-doctor-payout.css";

import type { DoctorPayoutRow } from "../../../pages/payoutDashboard/types.js";
import {
	DEMO_SHOWCASE_DOCTOR,
	formatMonthLabel,
} from "./types.js";
import type {
	DoctorPayoutMobileWalletProps,
} from "./types.js";

import { DoctorWalletBalanceHeader } from "./DoctorWalletBalanceHeader.js";
import {
	DoctorEarningsBreakdownCard,
	computeCategoryCards,
} from "./DoctorEarningsBreakdownCard.js";
import {
	DoctorPayoutHistoryList,
	computeDoctorShifts,
} from "./DoctorPayoutHistoryList.js";

export * from "./types.js";
export * from "./DoctorWalletBalanceHeader.js";
export * from "./DoctorEarningsBreakdownCard.js";
export * from "./DoctorPayoutHistoryList.js";

export function DoctorPayoutMobileWallet({
	report,
	month,
	onMonthChange,
	onRefresh,
	onOpenPayrollModal,
	isLoading,
	onRequestPayout,
}: DoctorPayoutMobileWalletProps) {
	const monthInputId = useId();
	const isDemo = isDemoShowcaseMode();

	// Active doctors list from report or fallback demo
	const availableDoctors: readonly DoctorPayoutRow[] = useMemo(() => {
		if (report && report.rows.length > 0) {
			return report.rows;
		}
		if (isDemo) {
			return [DEMO_SHOWCASE_DOCTOR];
		}
		return [];
	}, [report, isDemo]);

	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => {
		return availableDoctors[0]?.doctorUserId ?? "";
	});

	// Currently active doctor row
	const currentDoctor: DoctorPayoutRow | null = useMemo(() => {
		if (availableDoctors.length === 0) return null;
		const found = availableDoctors.find((d) => d.doctorUserId === selectedDoctorId);
		return found ?? availableDoctors[0] ?? null;
	}, [availableDoctors, selectedDoctorId]);

	// Shift bottom sheet drawer state
	const [activeShiftDate, setActiveShiftDate] = useState<string | null>(null);

	// Group visits into shifts for current doctor
	const shifts = useMemo(() => computeDoctorShifts(currentDoctor), [currentDoctor]);

	// Currently inspected shift for Bottom Sheet
	const activeShift = useMemo(() => {
		if (!activeShiftDate) return null;
		return shifts.find((s) => s.date === activeShiftDate) ?? null;
	}, [shifts, activeShiftDate]);

	// Categories breakdown calculation
	const categoryCards = useMemo(() => computeCategoryCards(currentDoctor), [currentDoctor]);

	const monthLabel = formatMonthLabel(month);

	// Total deductions
	const totalWithheld = useMemo(() => {
		if (!currentDoctor) return 0;
		const lab = currentDoctor.withheldLabRub ?? 0;
		const mat = currentDoctor.withheldMaterialRub ?? 0;
		return lab + mat;
	}, [currentDoctor]);

	// Render empty state if no doctor exists and not in demo
	if (!currentDoctor) {
		return (
			<div className="doctor-wallet-container">
				<header className="doctor-wallet-header">
					<div className="doctor-wallet-title-wrap">
						<h2 className="doctor-wallet-title">Выплаты врачам</h2>
						<span className="doctor-wallet-subtitle">Расчётный кошелёк сотрудника</span>
					</div>
					<label htmlFor={monthInputId} className="doctor-wallet-month-badge">
						<Calendar size={16} />
						<span>{monthLabel}</span>
						<input
							id={monthInputId}
							type="month"
							className="doctor-wallet-month-input"
							value={month}
							onChange={(e) => onMonthChange(e.target.value)}
						/>
					</label>
				</header>

				<div className="doctor-wallet-empty">
					<div className="doctor-wallet-empty-icon">
						<Wallet size={24} />
					</div>
					<h3 className="doctor-wallet-empty-title">Нет начислений за выбранный месяц</h3>
					<p className="doctor-wallet-empty-sub">
						В периоде {monthLabel} отсутствуют закрытые приёмы или наряды лаборатории.
					</p>
					<button
						type="button"
						className="doctor-wallet-primary-cta"
						onClick={onRefresh}
						disabled={isLoading}
					>
						<RefreshCw size={16} />
						<span>Обновить данные</span>
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="doctor-wallet-container">
			{/* Top Header & Apple Wallet Balance Card */}
			<DoctorWalletBalanceHeader
				monthLabel={monthLabel}
				month={month}
				monthInputId={monthInputId}
				onMonthChange={onMonthChange}
				availableDoctors={availableDoctors}
				currentDoctor={currentDoctor}
				onSelectDoctor={setSelectedDoctorId}
				totalWithheld={totalWithheld}
				onRequestPayout={onRequestPayout}
			/>

			{/* ── Category Breakdown Cards ── */}
			<DoctorEarningsBreakdownCard categoryCards={categoryCards} />

			{/* ── Shift & Appointment History (Grouped Inset Cards) ── */}
			<DoctorPayoutHistoryList
				shifts={shifts}
				activeShift={activeShift}
				onSelectShiftDate={setActiveShiftDate}
				currentDoctor={currentDoctor}
			/>

			{/* ── Sticky Bottom Thumb Zone Action Bar ── */}
			<div className="doctor-wallet-bottom-bar">
				<button
					type="button"
					className="doctor-wallet-primary-cta"
					onClick={() => onOpenPayrollModal(currentDoctor)}
					aria-label="Открыть расчётную ведомость Т-51"
				>
					<FileSpreadsheet size={18} />
					<span>Ведомость Т-51</span>
				</button>

				<button
					type="button"
					className="doctor-wallet-sec-cta"
					onClick={onRefresh}
					disabled={isLoading}
					aria-label="Обновить расчёт выплат"
					title="Обновить"
				>
					<RefreshCw size={18} />
				</button>
			</div>
		</div>
	);
}
