import React from "react";
import { RefreshCw, TrendingUp, X } from "lucide-react";
import type { MarketingPeriodType } from "./marketingTypes";

export interface MarketingRoiHeaderProps {
	readonly clinicName: string;
	readonly selectedPeriod: MarketingPeriodType;
	readonly onSelectPeriod: (p: MarketingPeriodType) => void;
	readonly isLoading: boolean;
	readonly onClose: () => void;
}

const PERIOD_OPTIONS: { id: MarketingPeriodType; label: string }[] = [
	{ id: "current_month", label: "Текущий месяц" },
	{ id: "prev_month", label: "Прошлый месяц" },
	{ id: "quarter_3", label: "3 квартал 2026" },
	{ id: "year_2026", label: "2026 год" },
];

export const MarketingRoiHeader: React.FC<MarketingRoiHeaderProps> = ({
	clinicName,
	selectedPeriod,
	onSelectPeriod,
	isLoading,
	onClose,
}) => {
	return (
		<header className="marketing-roi-header">
			<div className="marketing-roi-header-left">
				<div className="marketing-roi-icon-box">
					<TrendingUp className="w-5 h-5 text-teal-400" />
				</div>
				<div>
					<h2 id="marketing-roi-title" className="marketing-roi-title">
						Сквозная аналитика маркетинга и ROMI
					</h2>
					<p className="marketing-roi-subtitle">
						{clinicName} · Коллтрекинг, сквозная воронка и окупаемость каналов
					</p>
				</div>
			</div>

			<div className="marketing-roi-header-right">
				<div className="marketing-roi-period-selector dente-segmented-bar" role="group" aria-label="Период отчета">
					{PERIOD_OPTIONS.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => onSelectPeriod(p.id)}
							className={`marketing-roi-period-btn dente-segmented-item ${selectedPeriod === p.id ? "active" : ""}`}
							data-active={selectedPeriod === p.id}
						>
							{p.label}
						</button>
					))}
				</div>

				{isLoading && <RefreshCw className="w-4 h-4 animate-spin text-[var(--teal,#0d9488)]" />}

				<button
					type="button"
					onClick={onClose}
					className="marketing-roi-close-btn"
					aria-label="Закрыть аналитику"
					data-testid="close-roi-modal-btn"
				>
					<X size={18} />
				</button>
			</div>
		</header>
	);
};
