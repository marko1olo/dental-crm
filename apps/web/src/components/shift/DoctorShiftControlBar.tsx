import React from "react";
import {
	Radio,
	Stethoscope,
} from "lucide-react";
import {
	ShiftTimerDisplay,
} from "./controlBarModules/ShiftTimerDisplay";
import {
	ChairStatusQuickToggle,
} from "./controlBarModules/ChairStatusQuickToggle";
import {
	DoctorShiftActionsMenu,
} from "./controlBarModules/DoctorShiftActionsMenu";
import {
	ShiftKpiMetricStrip,
} from "./controlBarModules/ShiftKpiMetricStrip";
import {
	DoctorShiftFinancialModeToggle,
} from "./controlBarModules/DoctorShiftFinancialModeToggle";
import {
	DoctorShiftPrimaryButtons,
} from "./controlBarModules/DoctorShiftPrimaryButtons";
import type {
	ChairOperationalStatus,
	DoctorShiftControlBarProps,
	DoctorShiftFinancialMode,
	DoctorShiftStats,
	ShiftOperationalState,
} from "./controlBarModules/shiftControlBarTypes";

export type {
	ChairOperationalStatus,
	DoctorShiftControlBarProps,
	DoctorShiftFinancialMode,
	DoctorShiftStats,
	ShiftOperationalState,
};
export {
	ShiftTimerDisplay,
	ChairStatusQuickToggle,
	DoctorShiftActionsMenu,
	ShiftKpiMetricStrip,
	DoctorShiftFinancialModeToggle,
	DoctorShiftPrimaryButtons,
};

/**
 * DoctorShiftHeaderBar (DoctorShiftControlBar) — Unified compact shift cockpit header.
 * Strictly separates salaried piece-rate mode ('piece_rate') from independent chair rental ('chair_rental').
 * Optimized for low-spec chairside devices (RAF / 1s interval isolation, zero full-tree rerenders).
 */
export const DoctorShiftControlBar: React.FC<DoctorShiftControlBarProps> = React.memo(({
	isShiftOpen,
	onToggleShift,
	onOpenPayrollModal,
	onOpenT13Timesheet,
	shiftStats,
	doctorName,
	cabinetName = "Кабинет №1",
	isOffline = false,
	financialMode = "piece_rate",
	onChangeFinancialMode,
	chairRentalNetIncomeRub = 30200,
	chairRentalRentExpenseRub = 9000,
	onOpenChairRentalAct,
	chairStatus,
	onChangeChairStatus,
	onHandoverShift,
	onPrintPreliminaryReport,
	onCallAssistant,
	className = "",
}) => {
	const cleanDocName = (doctorName || "Барабаш С.В.")
		.replace(/^(доктор|д-р|врач)\s+/i, "")
		.trim();
	const isChairRental = financialMode === "chair_rental";

	return (
		<section
			className={`doctor-shift-control-bar ${className}`.trim()}
			aria-label="Управление сменой врача и сводка заработка"
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "12px",
				padding: "12px 16px",
				marginBottom: "12px",
				boxShadow: "var(--shadow-1)",
				display: "flex",
				flexDirection: "column",
				gap: "10px",
			}}
			data-testid="doctor-shift-control-bar"
		>
			{/* Top Line: Doctor & Cabinet, Status, Telemetry and Mode-Specific Actions */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "8px",
					flexWrap: "nowrap",
				}}
			>
				{/* Left: Doctor Identification, Shift Status & Timer */}
				<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
					<div
						style={{
							width: "30px",
							height: "30px",
							borderRadius: "8px",
							background: isShiftOpen
								? "var(--ok-bg, rgba(21, 128, 61, 0.1))"
								: "var(--warn-bg, rgba(234, 88, 12, 0.1))",
							color: isShiftOpen ? "var(--ok-fg, #15803d)" : "var(--warn-fg, #c2410c)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
						aria-hidden="true"
					>
						<Stethoscope size={15} />
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0, flexWrap: "nowrap" }}>
						<h3
							style={{
								margin: 0,
								fontSize: "13px",
								fontWeight: 700,
								color: "var(--ink)",
								lineHeight: 1.25,
								whiteSpace: "nowrap",
							}}
						>
							Д-р {cleanDocName} · {cabinetName}
						</h3>

						<span
							className={`status-pill ${isShiftOpen ? "status-in_treatment" : "status-pending"}`}
							style={{ fontSize: "10.5px", fontWeight: 700, padding: "2px 7px", whiteSpace: "nowrap", flexShrink: 0 }}
						>
							{isShiftOpen ? "Рабочая смена врача открыта" : "Рабочая смена врача закрыта"}
						</span>

						{isShiftOpen && (
							<ShiftTimerDisplay
								isShiftOpen={isShiftOpen}
								startTimeIso={shiftStats.shiftStartTimeIso}
								initialSeconds={shiftStats.shiftDurationSeconds}
							/>
						)}

						{isOffline && (
							<span
								style={{
									fontSize: "10.5px",
									fontWeight: 600,
									color: "var(--muted)",
									display: "inline-flex",
									alignItems: "center",
									gap: "4px",
									background: "var(--paper-soft)",
									padding: "2px 6px",
									borderRadius: "6px",
									border: "1px solid var(--line)",
									whiteSpace: "nowrap",
									flexShrink: 0,
								}}
							>
								<Radio size={11} aria-hidden="true" />
								<span>Офлайн</span>
							</span>
						)}
					</div>
				</div>

				{/* Right: Chair Status Toggle + Mode Switcher + Actions */}
				<div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, flexWrap: "nowrap" }}>
					{onChangeChairStatus && (
						<ChairStatusQuickToggle
							currentStatus={chairStatus}
							onChangeStatus={onChangeChairStatus}
						/>
					)}

					<DoctorShiftFinancialModeToggle
						financialMode={financialMode}
						onChangeFinancialMode={onChangeFinancialMode}
					/>

					<DoctorShiftPrimaryButtons
						isShiftOpen={isShiftOpen}
						onToggleShift={onToggleShift}
						isChairRental={isChairRental}
						onOpenPayrollModal={onOpenPayrollModal}
					/>

					<DoctorShiftActionsMenu
						onHandoverShift={onHandoverShift}
						onPrintPreliminaryReport={onPrintPreliminaryReport}
						onCallAssistant={onCallAssistant}
						onOpenT13Timesheet={onOpenT13Timesheet}
						onOpenChairRentalAct={onOpenChairRentalAct}
						isChairRental={isChairRental}
					/>
				</div>
			</div>

			{/* Metric Strip: Compact 1-line KPI tiles */}
			<ShiftKpiMetricStrip
				shiftStats={shiftStats}
				isChairRental={isChairRental}
				chairRentalNetIncomeRub={chairRentalNetIncomeRub}
				chairRentalRentExpenseRub={chairRentalRentExpenseRub}
				onOpenPayrollModal={onOpenPayrollModal}
				onOpenChairRentalAct={onOpenChairRentalAct}
			/>
		</section>
	);
});

DoctorShiftControlBar.displayName = "DoctorShiftControlBar";

export const DoctorShiftHeaderBar = DoctorShiftControlBar;
