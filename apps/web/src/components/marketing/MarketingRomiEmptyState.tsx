/**
 * DENTE Dental CRM — Marketing ROMI Empty State.
 */

import React from "react";
import { BarChart3, Plus, RotateCcw, Sparkles } from "lucide-react";

export interface MarketingRomiEmptyStateProps {
	readonly onAddChannel: () => void;
	readonly onSyncWithCrm: () => void;
	readonly onResetDefaults: () => void;
}

export function MarketingRomiEmptyState({
	onAddChannel,
	onSyncWithCrm,
	onResetDefaults,
}: MarketingRomiEmptyStateProps) {
	return (
		<div className="romi-empty-container" data-testid="romi-empty-state">
			<div className="romi-empty-icon-wrap">
				<BarChart3 className="w-6 h-6 text-[var(--teal)]" aria-hidden="true" />
			</div>
			<h4 className="romi-empty-title">Нет данных о расходах по рекламным каналам</h4>
			<p className="romi-empty-desc">
				Добавьте используемые каналы привлечения пациентов клиники вручную, синхронизируйте показатели с визитами CRM или загрузите типовой справочник каналов StomX с нулевым балансом.
			</p>
			<div className="romi-empty-actions">
				<button
					type="button"
					className="romi-action-btn primary"
					onClick={onAddChannel}
				>
					<Plus className="w-3.5 h-3.5" aria-hidden="true" />
					Добавить первый канал
				</button>
				<button
					type="button"
					className="romi-action-btn secondary"
					onClick={onSyncWithCrm}
				>
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal)]" aria-hidden="true" />
					Загрузить из CRM
				</button>
				<button
					type="button"
					className="romi-action-btn secondary"
					onClick={onResetDefaults}
					title="Загрузить стандартный справочник каналов StomX с нулевым балансом"
				>
					<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
					Загрузить шаблон StomX
				</button>
			</div>
		</div>
	);
}
