/**
 * MarketingRomiTableHeader.tsx — Header & Action Bar for Owner ROMI Table.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8am (Single Primary CTA), Mandate 8e (Never Disabled).
 */

import React from "react";
import { BarChart3, Sparkles, TrendingUp, RotateCcw, Plus } from "lucide-react";

export interface MarketingRomiTableHeaderProps {
	readonly onSyncWithCrm: () => void;
	readonly onOpenRoiModal: () => void;
	readonly onResetDefaults: () => void;
	readonly isAddingChannel: boolean;
	readonly onToggleAddChannel: () => void;
}

export function MarketingRomiTableHeader({
	onSyncWithCrm,
	onOpenRoiModal,
	onResetDefaults,
	isAddingChannel,
	onToggleAddChannel,
}: MarketingRomiTableHeaderProps) {
	return (
		<div className="marketing-romi-header">
			<div>
				<div className="marketing-romi-title-row">
					<BarChart3 className="text-[var(--teal)]" aria-hidden="true" />
					<h3 className="marketing-romi-title">
						Эффективность рекламы и окупаемость каналов (ROMI)
					</h3>
				</div>
				<p className="marketing-romi-subtitle">
					Сводная таблица для владельца: реальные затраты, первичные и повторные пациенты, LTV выручка и чистый возврат инвестиций (ROMI).
				</p>
			</div>

			<div className="marketing-romi-header-actions">
				<button
					type="button"
					className="romi-action-btn secondary min-h-[36px]"
					onClick={onSyncWithCrm}
					title="Синхронизировать показатели с живой базой CRM"
					data-testid="romi-sync-crm-btn"
				>
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal)]" aria-hidden="true" />
					<span>Синхронизировать с CRM</span>
				</button>
				<button
					type="button"
					className="romi-action-btn secondary min-h-[36px]"
					onClick={onOpenRoiModal}
					title="Открыть подробный сквозной аудит ROI и воронки"
					data-testid="romi-open-roi-modal-btn"
				>
					<TrendingUp className="w-3.5 h-3.5 text-[var(--teal)]" aria-hidden="true" />
					<span>Сквозной аудит</span>
				</button>
				<button
					type="button"
					className="romi-action-btn secondary min-h-[36px]"
					onClick={onResetDefaults}
					title="Восстановить типовые каналы"
				>
					<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
					<span>Сброс</span>
				</button>
				<button
					type="button"
					className="romi-action-btn primary min-h-[36px]"
					onClick={onToggleAddChannel}
				>
					<Plus className="w-3.5 h-3.5" aria-hidden="true" />
					<span>{isAddingChannel ? "Скрыть форму" : "Добавить канал"}</span>
				</button>
			</div>
		</div>
	);
}
