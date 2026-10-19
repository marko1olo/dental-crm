import React from "react";
import { Award, ChevronRight, FileText, TrendingUp } from "lucide-react";
import { money } from "../../../AppHelpers";

export interface DoctorShiftEarningsCardProps {
	readonly totalRevenueRub: number;
	readonly doctorCommissionPct: number;
	readonly estimatedDoctorPayoutRub: number;
	readonly doctorFullName?: string | undefined;
	readonly completedPatientsCount?: number | undefined;
	readonly totalAppointmentsCount?: number | undefined;
	readonly onPrintStatement?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export const DoctorShiftEarningsCard: React.FC<DoctorShiftEarningsCardProps> = ({
	totalRevenueRub,
	doctorCommissionPct,
	estimatedDoctorPayoutRub,
	doctorFullName = "Лечащий врач",
	completedPatientsCount = 0,
	totalAppointmentsCount = 0,
	onPrintStatement,
	className = "",
}) => {
	return (
		<section
			className={`doctor-shift-earnings-card ${className}`.trim()}
			aria-label="Выработка и начисления врача"
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "12px",
				padding: "16px",
				boxShadow: "var(--shadow-1)",
				display: "flex",
				flexDirection: "column",
				gap: "14px",
			}}
			data-testid="doctor-shift-earnings-card"
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "10px",
					flexWrap: "wrap",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
					<div
						style={{
							width: "34px",
							height: "34px",
							borderRadius: "8px",
							background: "var(--teal-surface, rgba(13, 148, 136, 0.1))",
							color: "var(--teal-dark, #0f766e)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
					>
						<TrendingUp size={17} aria-hidden="true" />
					</div>
					<div style={{ minWidth: 0 }}>
						<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>
							Выработка и доход за смену
						</h3>
						<p style={{ margin: "1px 0 0", fontSize: "12px", color: "var(--muted)", lineHeight: 1.35 }}>
							Личные финансовые показатели приёма ({doctorFullName})
						</p>
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
					<span
						className="status-pill status-in_treatment"
						style={{
							fontSize: "11px",
							fontWeight: 700,
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<Award size={12} aria-hidden="true" />
						{doctorCommissionPct}% гонорар
					</span>
					{onPrintStatement && (
						<button
							type="button"
							onClick={onPrintStatement}
							className="secondary-button"
							style={{
								height: "30px",
								fontSize: "12px",
								padding: "0 10px",
								display: "inline-flex",
								alignItems: "center",
								gap: "5px",
							}}
							data-testid="btn-doctor-statement"
							title="Печать расчетного листа за смену"
						>
							<FileText size={13} aria-hidden="true" />
							<span>Ведомость смены</span>
						</button>
					)}
				</div>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))",
					gap: "8px",
				}}
			>
				<div
					style={{
						padding: "12px 14px",
						borderRadius: "10px",
						background: "var(--teal-surface, rgba(13, 148, 136, 0.08))",
						border: "1px solid var(--teal-border, rgba(13, 148, 136, 0.25))",
						display: "flex",
						flexDirection: "column",
						gap: "4px",
					}}
				>
					<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal-dark, #0f766e)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
						Начислено к выплате
					</span>
					<strong style={{ fontSize: "20px", fontWeight: 800, color: "var(--teal-dark, #0f766e)", fontVariantNumeric: "tabular-nums" }}>
						{money(estimatedDoctorPayoutRub)}
					</strong>
					<span style={{ fontSize: "11px", color: "var(--muted)" }}>
						Ставка гонорара: {doctorCommissionPct}%
					</span>
				</div>

				<div
					style={{
						padding: "12px 14px",
						borderRadius: "10px",
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						display: "flex",
						flexDirection: "column",
						gap: "4px",
					}}
				>
					<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
						Выработка по услугам
					</span>
					<strong style={{ fontSize: "18px", fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
						{money(totalRevenueRub)}
					</strong>
					<span style={{ fontSize: "11px", color: "var(--muted)" }}>
						Сумма выполненных процедур
					</span>
				</div>

				<div
					style={{
						padding: "12px 14px",
						borderRadius: "10px",
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						display: "flex",
						flexDirection: "column",
						gap: "4px",
					}}
				>
					<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
						Пациенты за смену
					</span>
					<div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
						<strong style={{ fontSize: "18px", fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
							{completedPatientsCount}
						</strong>
						<span style={{ fontSize: "13px", color: "var(--muted)" }}>
							из {totalAppointmentsCount}
						</span>
					</div>
					<span style={{ fontSize: "11px", color: "var(--muted)" }}>
						{completedPatientsCount >= totalAppointmentsCount && totalAppointmentsCount > 0
							? "Все приёмы выполнены"
							: `В очереди: ${Math.max(0, totalAppointmentsCount - completedPatientsCount)}`}
					</span>
				</div>
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					paddingTop: "8px",
					borderTop: "1px solid var(--line)",
					fontSize: "11.5px",
					color: "var(--muted)",
				}}
			>
				<span>Личный расчет ведётся автоматически по прайс-листу клиники</span>
				{onPrintStatement && (
					<button
						type="button"
						onClick={onPrintStatement}
						style={{
							background: "transparent",
							border: "none",
							color: "var(--teal)",
							fontSize: "12px",
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							padding: 0,
						}}
					>
						<span>Расчётный лист</span>
						<ChevronRight size={13} aria-hidden="true" />
					</button>
				)}
			</div>
		</section>
	);
};

DoctorShiftEarningsCard.displayName = "DoctorShiftEarningsCard";
