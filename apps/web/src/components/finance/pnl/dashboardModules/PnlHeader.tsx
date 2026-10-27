import type React from "react";
import { BarChart3, RefreshCw, X } from "lucide-react";
import type { ManagerialPnlPeriodPreset } from "../useManagerialPnl";

export interface PnlHeaderProps {
	readonly periodPreset: ManagerialPnlPeriodPreset;
	readonly onSetPeriodPreset: (preset: ManagerialPnlPeriodPreset) => void;
	readonly onRefresh: () => void;
	readonly onClose: () => void;
	readonly loading: boolean;
	readonly cashBoxCount?: number | undefined;
	readonly expenseCount?: number | undefined;
}

const PERIOD_BUTTONS: Array<{ preset: ManagerialPnlPeriodPreset; label: string }> = [
	{ preset: "current_month", label: "Текущий месяц" },
	{ preset: "prev_month", label: "Прошлый месяц" },
	{ preset: "quarter", label: "Квартал" },
	{ preset: "year", label: "Год" },
];

export const PnlHeader: React.FC<PnlHeaderProps> = ({
	periodPreset,
	onSetPeriodPreset,
	onRefresh,
	onClose,
	loading,
	cashBoxCount,
	expenseCount,
}) => {
	const badgeText =
		cashBoxCount !== undefined
			? `${cashBoxCount} касс · ${expenseCount ?? 0} статей расходов`
			: "Управленческий учет";

	return (
		<div className="pnl-header">
			<div className="pnl-header-title-box">
				<h2 className="pnl-title">
					<BarChart3 size={18} className="pnl-title-icon" />
					<span>Управленческий отчет P&L (Прибыли и убытки)</span>
				</h2>
				<span className="pnl-badge hidden xl:inline-flex">{badgeText}</span>
			</div>

			<div className="pnl-header-actions">
				<div className="pnl-period-switcher" role="group" aria-label="Период отчета">
					{PERIOD_BUTTONS.map(({ preset, label }) => (
						<button
							key={preset}
							type="button"
							className={`pnl-date-btn ${periodPreset === preset ? "active" : ""}`}
							onClick={() => onSetPeriodPreset(preset)}
						>
							{label}
						</button>
					))}
				</div>

				<button
					type="button"
					className="pnl-date-btn pnl-icon-btn"
					onClick={onRefresh}
					disabled={loading}
					title="Обновить расчет"
					aria-label="Обновить расчет"
				>
					<RefreshCw size={13} className={loading ? "animate-spin" : ""} />
				</button>

				<button
					type="button"
					className="pnl-btn-close"
					onClick={onClose}
					title="Закрыть"
					aria-label="Закрыть"
				>
					<X size={16} />
				</button>
			</div>
		</div>
	);
};
