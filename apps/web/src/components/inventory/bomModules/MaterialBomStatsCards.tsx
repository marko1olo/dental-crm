import React from "react";
import type { MaterialBomStats } from "./materialBomTypes.js";

export interface MaterialBomStatsCardsProps {
	readonly stats: MaterialBomStats;
}

export function MaterialBomStatsCards({ stats }: MaterialBomStatsCardsProps) {
	return (
		<div className="material-boms-stats-row">
			<div className="material-boms-stat-card">
				<span className="material-boms-stat-label">Охвачено услуг</span>
				<span className="material-boms-stat-value">{stats.totalServices}</span>
				<span className="material-boms-stat-desc">с настроенными техкартами</span>
			</div>

			<div className="material-boms-stat-card">
				<span className="material-boms-stat-label">Всего активных норм</span>
				<span className="material-boms-stat-value">{stats.totalRules}</span>
				<span className="material-boms-stat-desc">привязок материалов</span>
			</div>

			<div className="material-boms-stat-card">
				<span className="material-boms-stat-label">Средняя себестоимость</span>
				<span className="material-boms-stat-value">{stats.avgCostFormatted}</span>
				<span className="material-boms-stat-desc">расходников на процедуру</span>
			</div>

			<div className="material-boms-stat-card">
				<span className="material-boms-stat-label">Дефицит на складе</span>
				<span
					className="material-boms-stat-value"
					style={{
						color:
							stats.totalDeficitServices > 0
								? "var(--bad-fg, #dc2626)"
								: "var(--ok-fg, #059669)",
					}}
				>
					{stats.totalDeficitServices === 0
						? "В норме"
						: `${stats.totalDeficitServices} услуг`}
				</span>
				<span className="material-boms-stat-desc">
					{stats.totalDeficitServices === 0
						? "Все материалы в наличии"
						: "Требуется пополнение запасов"}
				</span>
			</div>
		</div>
	);
}
