import React from "react";
import {
	Calculator,
	ChevronRight,
	Moon,
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
	readonly className?: string;
}

/**
 * DoctorShiftControlBar — Tier 1 Hot Path cockpit for doctor shifts.
 * Provides 1-click shift admission without 10-checkbox bureaucratic barriers,
 * night overtime indicator (after 21:00) with zero visit blocks, and instant
 * transparent daily piece-rate earnings summary without needing accounting Form T-51.
 */
export const DoctorShiftControlBar: React.FC<DoctorShiftControlBarProps> = ({
	isShiftOpen,
	onToggleShift,
	onOpenPayrollModal,
	shiftStats,
	className = "",
}) => {
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
		>
			{/* Top Row: Shift Status + 1-Click Toggle + Night Overtime Badge */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "10px",
					flexWrap: "wrap",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
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
					>
						<Zap size={16} aria-hidden="true" />
					</div>
					<div style={{ minWidth: 0 }}>
						<div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
							<h3
								style={{
									margin: 0,
									fontSize: "13.5px",
									fontWeight: 700,
									color: "var(--ink)",
									lineHeight: 1.25,
								}}
							>
								{isShiftOpen ? "Рабочая смена врача открыта" : "Смена не открыта"}
							</h3>
							<span
								className={`status-pill ${isShiftOpen ? "status-in_treatment" : "status-pending"}`}
								style={{ fontSize: "10.5px", fontWeight: 700, padding: "2px 7px" }}
							>
								{isShiftOpen ? (
									<>
										<span className="pulse-dot" aria-hidden="true" />
										Приём активен (1-клик допуск)
									</>
								) : (
									"Ожидает открытия"
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
									<Moon size={11} /> Ночной овертайм (после 21:00) · Блокировки сняты
								</span>
							)}
						</div>
						<p
							style={{
								margin: "1px 0 0",
								fontSize: "11.5px",
								color: "var(--muted)",
								lineHeight: 1.3,
							}}
							className="truncate max-w-xl hidden sm:block"
						>
							{isShiftOpen
								? "Доступ ко всем приёмам, ЭМК и картам открыт без 10 обязательных чекбоксов. Ночные приёмы сохраняются без выкидываний."
								: "Нажмите кнопку, чтобы открыть смену врача в 1 клик без бюрократических задержек."}
						</p>
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
					<button
						type="button"
						onClick={onToggleShift}
						className={`min-h-[36px] sm:min-h-[32px] sm:h-8 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
							isShiftOpen
								? "bg-[var(--paper-soft)] border border-[var(--border,#cbd5e1)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
								: "bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
						}`}
						title={isShiftOpen ? "Завершить рабочую смену" : "Открыть смену врача в 1 клик"}
					>
						<Zap size={14} />
						<span>{isShiftOpen ? "Завершить смену" : "Открыть смену в 1 клик"}</span>
					</button>
					<button
						type="button"
						onClick={onOpenPayrollModal}
						className="min-h-[36px] sm:min-h-[32px] sm:h-8 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-950/50 border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
						title="Открыть детальный расчет зарплаты и форму Т-51 за смену без запроса в бухгалтерию"
					>
						<Calculator size={14} />
						<span>Расчетный лист Т-51</span>
					</button>
				</div>
			</div>

			{/* Bottom Row: 4 Transparent KPI Metric Cards */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
					gap: "8px",
				}}
			>
				{/* Card 1: Patients Seen */}
				<div
					style={{
						padding: "8px 12px",
						borderRadius: "8px",
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						display: "flex",
						flexDirection: "column",
						gap: "2px",
						minWidth: 0,
					}}
				>
					<span
						style={{
							fontSize: "10.5px",
							fontWeight: 600,
							color: "var(--muted)",
							textTransform: "uppercase",
							letterSpacing: "0.04em",
						}}
					>
						Пациенты за смену
					</span>
					<div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
						<strong style={{ fontSize: "17px", fontWeight: 800, color: "var(--ink)" }}>
							{shiftStats.completedCount}
						</strong>
						<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
							из {shiftStats.totalAppointments} по плану
						</span>
					</div>
					<span style={{ fontSize: "10.5px", color: "var(--ink-2)" }} className="truncate">
						{shiftStats.inProgressCount > 0
							? `В кресле прямо сейчас: ${shiftStats.inProgressCount}`
							: "Все запланированные осмотрены"}
					</span>
				</div>

				{/* Card 2: Billed Services Revenue */}
				<div
					style={{
						padding: "8px 12px",
						borderRadius: "8px",
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						display: "flex",
						flexDirection: "column",
						gap: "2px",
						minWidth: 0,
					}}
				>
					<span
						style={{
							fontSize: "10.5px",
							fontWeight: 600,
							color: "var(--muted)",
							textTransform: "uppercase",
							letterSpacing: "0.04em",
						}}
					>
						Оказано услуг (касса)
					</span>
					<div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
						<strong style={{ fontSize: "17px", fontWeight: 800, color: "var(--ink)" }}>
							{money(shiftStats.totalRevenueRub)}
						</strong>
					</div>
					<span style={{ fontSize: "10.5px", color: "var(--ink-2)" }} className="truncate">
						По чекам и актам за сегодня
					</span>
				</div>

				{/* Card 3: Doctor's Calculated Shift Commission */}
				<div
					style={{
						padding: "8px 12px",
						borderRadius: "8px",
						background: "var(--teal-surface, rgba(13, 148, 136, 0.08))",
						border: "1px solid var(--teal-ring, rgba(13, 148, 136, 0.25))",
						display: "flex",
						flexDirection: "column",
						gap: "2px",
						minWidth: 0,
					}}
				>
					<span
						style={{
							fontSize: "10.5px",
							fontWeight: 700,
							color: "var(--teal-dark, #0f766e)",
							textTransform: "uppercase",
							letterSpacing: "0.04em",
						}}
					>
						Гонорар врача ({shiftStats.doctorCommissionPct}%)
					</span>
					<div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
						<strong
							style={{
								fontSize: "17px",
								fontWeight: 800,
								color: "var(--teal-dark, #0f766e)",
							}}
						>
							{money(shiftStats.estimatedDoctorPayoutRub)}
						</strong>
						<span
							style={{
								fontSize: "11px",
								color: "var(--teal-dark, #0f766e)",
								opacity: 0.8,
							}}
						>
							на руки
						</span>
					</div>
					<span style={{ fontSize: "10.5px", color: "var(--teal-dark, #0f766e)" }} className="truncate">
						Прозрачный расчёт без ожидания
					</span>
				</div>

				{/* Card 4: Action / Details */}
				<div
					style={{
						padding: "8px 12px",
						borderRadius: "8px",
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						display: "flex",
						flexDirection: "column",
						justifyContent: "space-between",
						gap: "4px",
						minWidth: 0,
					}}
				>
					<span
						style={{
							fontSize: "10.5px",
							fontWeight: 600,
							color: "var(--muted)",
							textTransform: "uppercase",
							letterSpacing: "0.04em",
						}}
					>
						Детализация и Т-51
					</span>
					<p
						style={{
							margin: 0,
							fontSize: "11px",
							color: "var(--muted)",
							lineHeight: 1.25,
						}}
						className="truncate"
					>
						Спецификация услуг, вычет и экспорт 1С.
					</p>
					<button
						type="button"
						onClick={onOpenPayrollModal}
						className="text-xs font-bold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer"
					>
						<span>Открыть расчетный лист</span>
						<ChevronRight size={12} />
					</button>
				</div>
			</div>
		</section>
	);
};
