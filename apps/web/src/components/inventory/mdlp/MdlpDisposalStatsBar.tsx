import type React from "react";

export interface MdlpDisposalStatsBarProps {
	readonly totalCount: number;
	readonly totalCostRub: number;
	readonly uniqueDrugsCount: number;
	readonly uniqueSeriesCount: number;
}

export const MdlpDisposalStatsBar: React.FC<MdlpDisposalStatsBarProps> = ({
	totalCount,
	totalCostRub,
	uniqueDrugsCount,
	uniqueSeriesCount,
}) => {
	return (
		<div className="mdlp-summary-bar">
			<div>
				<span className="text-xs font-semibold text-muted uppercase block mb-0.5">
					Карпул в очереди
				</span>
				<span className="text-lg font-black text-ink">{totalCount} шт.</span>
			</div>
			<div>
				<span className="text-xs font-semibold text-muted uppercase block mb-0.5">
					Общая сумма
				</span>
				<span className="text-lg font-black text-[var(--teal,#0d9488)]">
					{totalCostRub.toFixed(2)} ₽
				</span>
			</div>
			<div>
				<span className="text-xs font-semibold text-muted uppercase block mb-0.5">
					Наименований
				</span>
				<span className="text-lg font-black text-ink">{uniqueDrugsCount} преп.</span>
			</div>
			<div>
				<span className="text-xs font-semibold text-muted uppercase block mb-0.5">
					Серий / Партий
				</span>
				<span className="text-lg font-black text-ink">{uniqueSeriesCount}</span>
			</div>
		</div>
	);
};
