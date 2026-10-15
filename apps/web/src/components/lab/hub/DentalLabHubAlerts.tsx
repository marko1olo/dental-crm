import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export interface DentalLabHubAlertsProps {
	readonly delayedCount: number;
	readonly onlyDelayedFilter: boolean;
	readonly onToggleDelayedFilter: () => void;
	readonly treatmentPlanAgeDays?: number | undefined;
	readonly isPlanExpired?: boolean | undefined;
}

export const DentalLabHubAlerts: React.FC<DentalLabHubAlertsProps> = ({
	delayedCount,
	onlyDelayedFilter,
	onToggleDelayedFilter,
	treatmentPlanAgeDays,
	isPlanExpired,
}) => {
	const showPlanNotice = (treatmentPlanAgeDays !== undefined && treatmentPlanAgeDays > 30) || isPlanExpired;

	return (
		<>
			{showPlanNotice && (
				<div
					style={{
						background: "rgba(16, 185, 129, 0.08)",
						border: "1px solid rgba(16, 185, 129, 0.3)",
						color: "var(--ok-fg, #059669)",
						padding: "6px 14px",
						borderRadius: "8px",
						fontSize: "12px",
						display: "flex",
						alignItems: "center",
						gap: "8px",
						margin: "0 1.25rem 0.5rem 1.25rem",
					}}
					role="note"
				>
					<CheckCircle2 size={15} style={{ color: "var(--ok-fg, #10b981)", flexShrink: 0 }} />
					<span>
						<strong>Клинический регламент:</strong> План составлен более 30 дней назад{treatmentPlanAgeDays !== undefined ? ` (${treatmentPlanAgeDays} дн.)` : ""}, цены могут быть скорректированы, но это <strong>не блокирует</strong> оформление нарядов ЗТЛ или оказание услуг.
					</span>
				</div>
			)}

			{delayedCount > 0 && (
				<div className="ztl-delay-banner" role="alert">
					<div className="ztl-delay-banner-left">
						<AlertTriangle size={16} />
						<span>
							Обнаружено <strong>{delayedCount}</strong> заказов с задержкой ЗТЛ или конфликтом даты примерки!
						</span>
						<span className="ztl-delay-badge-count">Задержка ({delayedCount})</span>
					</div>
					<button
						type="button"
						className="border border-[var(--line)] bg-[var(--paper)] text-[var(--bad-fg,#e11d48)] hover:border-[var(--bad-fg,#fca5a5)] font-bold rounded-lg px-3 py-1.5 shadow-2xs text-xs cursor-pointer transition min-h-[36px] sm:min-h-[32px]"
						onClick={onToggleDelayedFilter}
					>
						{onlyDelayedFilter ? "Показать все заказы" : "Показать проблемные наряды"}
					</button>
				</div>
			)}
		</>
	);
};
