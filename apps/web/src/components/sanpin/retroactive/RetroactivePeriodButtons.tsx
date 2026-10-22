import React from "react";
import { Calendar } from "lucide-react";
import type { PeriodPreset } from "../retroactiveSanpinEngine";

export interface RetroactivePeriodButtonsProps {
	readonly periodPreset: PeriodPreset;
	readonly setPeriodPreset: (preset: PeriodPreset) => void;
	readonly customStartDate: string;
	readonly setCustomStartDate: (d: string) => void;
	readonly customEndDate: string;
	readonly setCustomEndDate: (d: string) => void;
}

export function RetroactivePeriodButtons({
	periodPreset,
	setPeriodPreset,
	customStartDate,
	setCustomStartDate,
	customEndDate,
	setCustomEndDate,
}: RetroactivePeriodButtonsProps) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
			<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--muted, #475569)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
				1. Выберите период отчета:
			</span>
			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
				<button
					type="button"
					onClick={() => setPeriodPreset("last_week")}
					className={`sanpin-btn ${periodPreset === "last_week" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
					style={{ minHeight: "46px", padding: "0.6rem 1.1rem", fontSize: "0.9rem", fontWeight: 700 }}
					data-testid="period-last-week-btn"
				>
					<Calendar size={18} /> За последнюю неделю
				</button>

				<button
					type="button"
					onClick={() => setPeriodPreset("current_month")}
					className={`sanpin-btn ${periodPreset === "current_month" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
					style={{ minHeight: "46px", padding: "0.6rem 1.1rem", fontSize: "0.9rem", fontWeight: 700 }}
					data-testid="period-current-month-btn"
				>
					<Calendar size={18} /> За текущий месяц
				</button>

				<button
					type="button"
					onClick={() => setPeriodPreset("previous_month")}
					className={`sanpin-btn ${periodPreset === "previous_month" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
					style={{ minHeight: "46px", padding: "0.6rem 1.1rem", fontSize: "0.9rem", fontWeight: 700 }}
					data-testid="period-previous-month-btn"
				>
					<Calendar size={18} /> За прошлый месяц
				</button>

				<button
					type="button"
					onClick={() => setPeriodPreset("current_quarter")}
					className={`sanpin-btn ${periodPreset === "current_quarter" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
					style={{ minHeight: "46px", padding: "0.6rem 1.1rem", fontSize: "0.9rem", fontWeight: 700 }}
					data-testid="period-current-quarter-btn"
				>
					<Calendar size={18} /> За квартал
				</button>

				<button
					type="button"
					onClick={() => setPeriodPreset("custom")}
					className={`sanpin-btn ${periodPreset === "custom" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
					style={{ minHeight: "46px", padding: "0.6rem 1.1rem", fontSize: "0.9rem", fontWeight: 700 }}
					data-testid="period-custom-dates-btn"
				>
					<Calendar size={18} /> Выбрать даты
				</button>
			</div>

			{periodPreset === "custom" && (
				<div
					style={{
						display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem",
						marginTop: "0.5rem", padding: "0.75rem 1rem", background: "var(--paper, #ffffff)",
						borderRadius: "0.5rem", border: "1px solid var(--line, #cbd5e1)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
						<span style={{ fontSize: "0.85rem", fontWeight: 600 }}>C:</span>
						<input
							type="date"
							value={customStartDate}
							onChange={(e) => setCustomStartDate(e.target.value)}
							className="sanpin-input"
							style={{ minHeight: "40px", padding: "0.35rem 0.65rem" }}
						/>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
						<span style={{ fontSize: "0.85rem", fontWeight: 600 }}>По:</span>
						<input
							type="date"
							value={customEndDate}
							onChange={(e) => setCustomEndDate(e.target.value)}
							className="sanpin-input"
							style={{ minHeight: "40px", padding: "0.35rem 0.65rem" }}
						/>
					</div>
					<span style={{ fontSize: "0.82rem", color: "var(--muted, #64748b)" }}>
						Активный диапазон: <strong>{customStartDate}</strong> — <strong>{customEndDate}</strong>
					</span>
				</div>
			)}
		</div>
	);
}
