/**
 * MarketingDashboardHeader.tsx
 *
 * Layer 4: Компактный однострочный хедер дашборда маркетинга (Закон Хика):
 * - Заголовок и тихий индикатор телеметрии
 * - Сегментированный переключатель периода (7 дн, 30 дн, 90 дн, Все)
 * - Кнопка экспорта в CSV
 * - Кнопка создания новой промо-акции
 */

import React from "react";
import { Download, Megaphone, Plus } from "lucide-react";
import {
	FUNNEL_PERIOD_OPTIONS,
	type FunnelTimePeriod,
} from "../../components/leads/leadsFunnelEngine";

export interface MarketingDashboardHeaderProps {
	readonly embedded?: boolean;
	readonly period: FunnelTimePeriod;
	readonly onPeriodChange: (period: FunnelTimePeriod) => void;
	readonly onExportCsv: () => void;
	readonly onOpenNewPromoModal: () => void;
}

export function MarketingDashboardHeader({
	embedded = false,
	period,
	onPeriodChange,
	onExportCsv,
	onOpenNewPromoModal,
}: MarketingDashboardHeaderProps) {
	return (
		<header className="marketing-dashboard-header">
			<div className="marketing-dashboard-title-wrap">
				{!embedded && (
					<>
						<Megaphone size={20} className="text-[var(--teal)]" aria-hidden="true" />
						<h1 className="marketing-dashboard-title">
							Маркетинговая аналитика и воронка
						</h1>
					</>
				)}
				<div
					className="marketing-quiet-telemetry"
					title="Сквозной учет конверсий и расходов — Телеметрия активна"
				>
					<span className="marketing-telemetry-dot" />
					<span>Сквозной учёт конверсий и расходов</span>
				</div>
			</div>

			<div className="marketing-dashboard-controls">
				{/* Period Selector (Segmented Control) */}
				<div
					className="marketing-period-segmented dente-segmented-bar"
					role="tablist"
					aria-label="Выбор периода аналитики"
				>
					{FUNNEL_PERIOD_OPTIONS.map((opt) => {
						const shortLabel =
							opt.id === "month"
								? "30 дн."
								: opt.id === "quarter"
									? "90 дн."
									: opt.id === "all"
										? "Все"
										: opt.id === "week"
											? "7 дн."
											: opt.label;
						return (
							<button
								key={opt.id}
								type="button"
								role="tab"
								aria-selected={period === opt.id}
								className={`marketing-period-btn dente-segmented-item ${period === opt.id ? "is-active active" : ""}`}
								onClick={() => onPeriodChange(opt.id)}
								data-testid={`period-filter-${opt.id}`}
								title={opt.label}
							>
								<span className="marketing-period-label-full">{opt.label}</span>
								<span className="marketing-period-label-short" aria-hidden="true">
									{shortLabel}
								</span>
							</button>
						);
					})}
				</div>

				<button
					type="button"
					className="secondary-button marketing-header-csv-btn h-9 min-h-[36px] px-3.5 rounded-xl text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
					onClick={onExportCsv}
					data-testid="marketing-export-csv-btn"
					title="Экспортировать сводку в Excel (CSV)"
				>
					<Download size={15} />
					<span>CSV</span>
				</button>

				<button
					type="button"
					className="primary-button marketing-header-promo-btn h-9 min-h-[36px] px-3.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
					onClick={onOpenNewPromoModal}
					data-testid="marketing-create-promo-btn"
				>
					<Plus size={16} />
					<span>Новая акция</span>
				</button>
			</div>
		</header>
	);
}
