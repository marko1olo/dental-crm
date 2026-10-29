import { CheckCircle2 } from "lucide-react";
import React from "react";
import { useMemo } from "react";
import { WarehouseStockAlertBadges } from "./WarehouseStockAlertBadges.js";
import { WarehouseStockAlertsActions } from "./WarehouseStockAlertsActions.js";
import {
	calculateWarehouseStockAlertMetrics,
	type WarehouseStockAlertsBarProps,
} from "./warehouseStockAlertsEngine.js";

export type { WarehouseStockAlertsBarProps } from "./warehouseStockAlertsEngine.js";

/**
 * Панель оперативных складских уведомлений (Мандаты 8e, 8n, 8z).
 * Декомпозирована строго <= 120 строк по Мандату 8b.
 */
export const WarehouseStockAlertsBar: React.FC<
	WarehouseStockAlertsBarProps
> = ({
	items,
	onOpenWaybills,
	onOpenBatchTracking,
	onOpenInventoryAudit,
	className = "",
	referenceDate,
}) => {
	const metrics = useMemo(
		() => calculateWarehouseStockAlertMetrics(items, referenceDate),
		[items, referenceDate],
	);

	if (!metrics.hasAlerts) {
		return (
			<div
				className={`warehouse-stock-alerts-bar px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-900 dark:text-teal-200 flex items-center justify-between text-xs gap-2 ${className}`}
				data-testid="warehouse-alerts-bar-clean"
			>
				<div className="flex items-center gap-2 min-w-0">
					<CheckCircle2
						size={16}
						className="text-teal-600 dark:text-teal-400 shrink-0"
					/>
					<span className="font-semibold truncate">
						Складской баланс в норме: нет дефицита и просроченных серий (FEFO
						контроль активен).
					</span>
				</div>
				<span className="text-[11px] text-teal-700 dark:text-teal-300 shrink-0">
					Всего позиций: {items.length}
				</span>
			</div>
		);
	}

	return (
		<section
			className={`warehouse-stock-alerts-bar p-2.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] ${className}`}
			data-testid="warehouse-stock-alerts-bar"
			aria-label="Оперативные складские предупреждения"
		>
			<WarehouseStockAlertBadges metrics={metrics} />
			<WarehouseStockAlertsActions
				onOpenWaybills={onOpenWaybills}
				onOpenBatchTracking={onOpenBatchTracking}
				onOpenInventoryAudit={onOpenInventoryAudit}
			/>
		</section>
	);
};

export default WarehouseStockAlertsBar;
