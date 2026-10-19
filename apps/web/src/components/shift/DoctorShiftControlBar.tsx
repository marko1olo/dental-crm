import React from "react";
import { ChairStatusQuickToggle } from "./controlBarModules/ChairStatusQuickToggle";
import { DoctorShiftActionsMenu } from "./controlBarModules/DoctorShiftActionsMenu";
import { ShiftKpiMetricStrip } from "./controlBarModules/ShiftKpiMetricStrip";
import { DoctorShiftPrimaryButtons } from "./controlBarModules/DoctorShiftPrimaryButtons";
import { DoctorShiftControlLeft } from "./controlBarModules/DoctorShiftControlLeft";
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
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "nowrap" }}>
				<DoctorShiftControlLeft
					isShiftOpen={isShiftOpen}
					cleanDocName={cleanDocName}
					cabinetName={cabinetName}
					shiftStats={shiftStats}
					isOffline={isOffline}
				/>

				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, flexWrap: "nowrap" }}>
					{onChangeChairStatus && (
						<ChairStatusQuickToggle currentStatus={chairStatus} onChangeStatus={onChangeChairStatus} />
					)}
					<DoctorShiftPrimaryButtons
						isShiftOpen={isShiftOpen}
						onToggleShift={onToggleShift}
						isChairRental={isChairRental}
						onOpenPayrollModal={onOpenPayrollModal}
					/>
					<DoctorShiftActionsMenu
						onPrintPreliminaryReport={onPrintPreliminaryReport}
						onCallAssistant={onCallAssistant}
						onOpenT13Timesheet={onOpenT13Timesheet}
					/>
				</div>
			</div>

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
