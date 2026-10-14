import React from "react";
import { ChevronRight } from "lucide-react";
import { money } from "../../../AppHelpers";
import type { DoctorShiftStats } from "./shiftControlBarTypes";

export interface ShiftKpiMetricStripProps {
	readonly shiftStats: DoctorShiftStats;
	readonly isChairRental: boolean;
	readonly chairRentalNetIncomeRub: number;
	readonly chairRentalRentExpenseRub: number;
	readonly onOpenPayrollModal: () => void;
	readonly onOpenChairRentalAct?: (() => void) | undefined;
}

export const ShiftKpiMetricStrip: React.FC<ShiftKpiMetricStripProps> = React.memo(({
	shiftStats,
	isChairRental,
	chairRentalNetIncomeRub,
	chairRentalRentExpenseRub,
	onOpenPayrollModal,
	onOpenChairRentalAct,
}) => {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
				gap: "8px",
			}}
			data-testid="shift-kpi-metric-strip"
		>
			{/* KPI 1: Patients Seen */}
			<div
				style={{
					padding: "8px 12px",
					borderRadius: "8px",
					background: "var(--paper-soft)",
					border: "1px solid var(--line)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "8px",
					minWidth: 0,
					height: "40px",
				}}
			>
				<span
					style={{
						fontSize: "11px",
						fontWeight: 600,
						color: "var(--muted)",
						textTransform: "uppercase",
						letterSpacing: "0.02em",
						whiteSpace: "nowrap",
					}}
				>
					Пациенты за смену
				</span>
				<div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
					<strong style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
						{shiftStats.completedCount}
					</strong>
					<span style={{ fontSize: "11px", color: "var(--muted)" }}>
						из {shiftStats.totalAppointments}
					</span>
				</div>
			</div>

			{/* KPI 2: Billed Services Revenue / Shift Gross Revenue */}
			<div
				style={{
					padding: "8px 12px",
					borderRadius: "8px",
					background: "var(--paper-soft)",
					border: "1px solid var(--line)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "8px",
					minWidth: 0,
					height: "40px",
				}}
			>
				<span
					style={{
						fontSize: "11px",
						fontWeight: 600,
						color: "var(--muted)",
						textTransform: "uppercase",
						letterSpacing: "0.02em",
						whiteSpace: "nowrap",
					}}
				>
					{isChairRental ? "Выручка за смену" : "Оказано услуг (касса)"}
				</span>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<strong style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
						{money(shiftStats.totalRevenueRub)}
					</strong>
					{isChairRental && (
						<span
							style={{
								fontSize: "11px",
								fontWeight: 600,
								color: "var(--danger, #e11d48)",
								whiteSpace: "nowrap",
							}}
						>
							Аренда: −{money(chairRentalRentExpenseRub)}
						</span>
					)}
				</div>
			</div>

			{/* KPI 3: Mode-Specific Doctor Income */}
			<div
				style={{
					padding: "8px 12px",
					borderRadius: "8px",
					background: "var(--teal-surface, rgba(13, 148, 136, 0.08))",
					border: "1px solid var(--teal-ring, rgba(13, 148, 136, 0.25))",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "8px",
					minWidth: 0,
					height: "40px",
				}}
			>
				<span
					style={{
						fontSize: "11px",
						fontWeight: 700,
						color: "var(--teal-dark, #0f766e)",
						textTransform: "uppercase",
						letterSpacing: "0.02em",
						whiteSpace: "nowrap",
					}}
				>
					{isChairRental
						? "Чистый доход (субаренда)"
						: `Гонорар врача (${shiftStats.doctorCommissionPct}%)`}
				</span>
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<strong
						style={{
							fontSize: "14px",
							fontWeight: 800,
							color: "var(--teal-dark, #0f766e)",
							fontVariantNumeric: "tabular-nums",
						}}
						data-testid="topbar-doctor-net-income"
					>
						{money(isChairRental ? chairRentalNetIncomeRub : shiftStats.estimatedDoctorPayoutRub)}
					</strong>
					<button
						type="button"
						onClick={isChairRental ? onOpenChairRentalAct : onOpenPayrollModal}
						style={{
							border: "none",
							background: "transparent",
							color: "var(--teal-dark, #0f766e)",
							padding: "0 2px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
						}}
						title={isChairRental ? "Акт сверки субаренды" : "Открыть зарплатную ведомость"}
						aria-label={isChairRental ? "Акт сверки субаренды" : "Открыть зарплатную ведомость"}
					>
						<ChevronRight size={13} />
					</button>
				</div>
			</div>
		</div>
	);
});

ShiftKpiMetricStrip.displayName = "ShiftKpiMetricStrip";
