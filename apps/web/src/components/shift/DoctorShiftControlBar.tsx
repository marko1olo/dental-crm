import React from "react";
import {
	Calculator,
	ChevronRight,
	Moon,
	Radio,
	Stethoscope,
	Zap,
} from "lucide-react";
import { money } from "../../AppHelpers";

export interface DoctorShiftStats {
	readonly totalAppointments: number;
	readonly completedCount: number;
	readonly inProgressCount: number;
	readonly totalRevenueRub: number;
	readonly doctorCommissionPct: number;
	readonly estimatedDoctorPayoutRub: number;
	readonly hasActiveOvertime: boolean;
}

export interface DoctorShiftControlBarProps {
	readonly isShiftOpen: boolean;
	readonly onToggleShift: () => void;
	readonly onOpenPayrollModal: () => void;
	readonly shiftStats: DoctorShiftStats;
	readonly doctorName?: string | null | undefined;
	readonly cabinetName?: string | undefined;
	readonly isOffline?: boolean | undefined;
	readonly className?: string;
}

function getGreetingTime(): string {
	const hour = new Date().getHours();
	if (hour >= 5 && hour < 12) return "Доброе утро";
	if (hour >= 12 && hour < 18) return "Добрый день";
	if (hour >= 18 && hour < 23) return "Добрый вечер";
	return "Доброй ночи";
}

/**
 * DoctorShiftHeaderBar (DoctorShiftControlBar) — Unified compact shift cockpit header.
 * Consolidates greeting, network telemetry, shift admission, key KPIs, and payroll calculation
 * into a single cohesive, high-density toolbar without dev-jargon or visual clutter.
 */
export const DoctorShiftControlBar: React.FC<DoctorShiftControlBarProps> = ({
	isShiftOpen,
	onToggleShift,
	onOpenPayrollModal,
	shiftStats,
	doctorName,
	cabinetName = "Кабинет №1",
	isOffline = false,
	className = "",
}) => {
	const greeting = getGreetingTime();
	const cleanDocName = (doctorName || "Барабаш С.В.")
		.replace(/^(доктор|д-р|врач)\s+/i, "")
		.trim();

	return (
		<section
			className={`doctor-shift-control-bar ${className}`.trim()}
			aria-label="Управление сменой врача и сводка заработка"
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "12px",
				padding: "10px 14px",
				marginBottom: "12px",
				boxShadow: "var(--shadow-1)",
				display: "flex",
				flexDirection: "column",
				gap: "10px",
			}}
			data-testid="doctor-shift-control-bar"
		>
			{/* Top Line: Greeting, Doctor & Cabinet, Telemetry, and Shift Status Actions */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "10px",
					flexWrap: "wrap",
				}}
			>
				{/* Left: Doctor Identification & Status Badge */}
				<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
					<div
						style={{
							width: "32px",
							height: "32px",
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
						<Stethoscope size={16} />
					</div>

					<div style={{ minWidth: 0 }}>
						<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
							<h3
								style={{
									margin: 0,
									fontSize: "13.5px",
									fontWeight: 700,
									color: "var(--ink)",
									lineHeight: 1.25,
								}}
							>
								{greeting}, доктор {cleanDocName} · {cabinetName}
							</h3>

							<span
								className={`status-pill ${isShiftOpen ? "status-in_treatment" : "status-pending"}`}
								style={{ fontSize: "10.5px", fontWeight: 700, padding: "2px 7px" }}
							>
								{isShiftOpen ? "Рабочая смена врача открыта" : "Смена не открыта"}
							</span>

							{/* Quiet Telemetry */}
							<span
								style={{
									fontSize: "10.5px",
									fontWeight: 600,
									color: "var(--muted)",
									display: "inline-flex",
									alignItems: "center",
									gap: "4px",
									background: "var(--paper-soft)",
									padding: "2px 7px",
									borderRadius: "6px",
									border: "1px solid var(--line)",
								}}
							>
								{isOffline ? (
									<>
										<Radio size={11} aria-hidden="true" />
										<span>Локальная сеть</span>
									</>
								) : (
									<>
										<span
											style={{
												width: "6px",
												height: "6px",
												borderRadius: "50%",
												background: "var(--ok-fg, #16a34a)",
												display: "inline-block",
											}}
											aria-hidden="true"
										/>
										<span>В сети</span>
									</>
								)}
							</span>

							{shiftStats.hasActiveOvertime && (
								<span
									className="status-pill"
									style={{
										background: "rgba(99, 102, 241, 0.12)",
										color: "#6366f1",
										border: "1px solid rgba(99, 102, 241, 0.3)",
										fontSize: "10.5px",
										fontWeight: 700,
										display: "inline-flex",
										alignItems: "center",
										gap: "3px",
									}}
								>
									<Moon size={11} /> Ночной приём
								</span>
							)}
						</div>
					</div>
				</div>

				{/* Right: Actions */}
				<div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
					<button
						type="button"
						onClick={onToggleShift}
						className={`min-h-[32px] h-8 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
							isShiftOpen
								? "bg-[var(--paper-soft)] border border-[var(--border,#cbd5e1)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
								: "bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
						}`}
						title={isShiftOpen ? "Завершить рабочую смену" : "Открыть смену врача"}
					>
						<Zap size={14} />
						<span>{isShiftOpen ? "Завершить смену" : "Открыть смену"}</span>
					</button>

					<button
						type="button"
						onClick={onOpenPayrollModal}
						className="min-h-[32px] h-8 px-3 py-1 rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-950/50 border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
						title="Расчет зарплаты врачей (Зарплатная ведомость): детализированный расчет за смену"
					>
						<Calculator size={14} />
						<span>Расчет зарплаты</span>
					</button>
				</div>
			</div>

			{/* Metric Strip: Compact 1-line KPI tiles */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
					gap: "8px",
				}}
			>
				{/* KPI 1: Patients Seen */}
				<div
					style={{
						padding: "6px 10px",
						borderRadius: "8px",
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "8px",
						minWidth: 0,
					}}
				>
					<span
						style={{
							fontSize: "11px",
							fontWeight: 600,
							color: "var(--muted)",
							whiteSpace: "nowrap",
						}}
					>
						Пациенты за смену
					</span>
					<div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
						<strong style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)" }}>
							{shiftStats.completedCount}
						</strong>
						<span style={{ fontSize: "11px", color: "var(--muted)" }}>
							из {shiftStats.totalAppointments}
						</span>
					</div>
				</div>

				{/* KPI 2: Billed Services Revenue */}
				<div
					style={{
						padding: "6px 10px",
						borderRadius: "8px",
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "8px",
						minWidth: 0,
					}}
				>
					<span
						style={{
							fontSize: "11px",
							fontWeight: 600,
							color: "var(--muted)",
							whiteSpace: "nowrap",
						}}
					>
						Оказано услуг (касса)
					</span>
					<strong style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)" }}>
						{money(shiftStats.totalRevenueRub)}
					</strong>
				</div>

				{/* KPI 3: Doctor Calculated Payout */}
				<div
					style={{
						padding: "6px 10px",
						borderRadius: "8px",
						background: "var(--teal-surface, rgba(13, 148, 136, 0.08))",
						border: "1px solid var(--teal-ring, rgba(13, 148, 136, 0.25))",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "8px",
						minWidth: 0,
					}}
				>
					<span
						style={{
							fontSize: "11px",
							fontWeight: 700,
							color: "var(--teal-dark, #0f766e)",
							whiteSpace: "nowrap",
						}}
					>
						Гонорар врача ({shiftStats.doctorCommissionPct}%)
					</span>
					<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						<strong
							style={{
								fontSize: "14px",
								fontWeight: 800,
								color: "var(--teal-dark, #0f766e)",
							}}
						>
							{money(shiftStats.estimatedDoctorPayoutRub)}
						</strong>
						<button
							type="button"
							onClick={onOpenPayrollModal}
							style={{
								border: "none",
								background: "transparent",
								color: "var(--teal-dark, #0f766e)",
								padding: "0 2px",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
							}}
							title="Открыть зарплатную ведомость"
						>
							<ChevronRight size={13} />
						</button>
					</div>
				</div>
			</div>
		</section>
	);
};

export const DoctorShiftHeaderBar = DoctorShiftControlBar;
