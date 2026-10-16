import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	ShieldAlert,
} from "lucide-react";
import React, { useMemo } from "react";
import {
	calculateWarehouseStockAlertMetrics,
	type WarehouseStockAlertsBarProps,
} from "./warehouseStockAlertsEngine.js";
import { WarehouseStockAlertsActions } from "./WarehouseStockAlertsActions.js";

export { type WarehouseStockAlertsBarProps } from "./warehouseStockAlertsEngine.js";

/**
 * Панель оперативных складских уведомлений (Мандаты 8e, 8n, 8z).
 * Отображает три критических состояния без блокировки работы клиники:
 * 1. Критический остаток запасов (ниже минимального порога).
 * 2. Контроль сроков годности FEFO (просрочено или истекает <= 30 дней).
 * 3. Мягкий овердрафт: дефицит расходников, требующий закрытия накладной.
 */
export const WarehouseStockAlertsBar: React.FC<WarehouseStockAlertsBarProps> = ({
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
					<CheckCircle2 size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="font-semibold truncate">
						Складской баланс в норме: нет дефицита и просроченных серий (FEFO контроль активен).
					</span>
				</div>
				<span className="text-[11px] text-teal-700 dark:text-teal-300 shrink-0">
					Всего позиций: {items.length}
				</span>
			</div>
		);
	}

	return (
		<div
			className={`warehouse-stock-alerts-bar p-2.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] ${className}`}
			data-testid="warehouse-stock-alerts-bar"
			role="region"
			aria-label="Оперативные складские предупреждения"
		>
			<div className="flex items-center gap-2 flex-wrap min-w-0">
				{metrics.overdraftCount > 0 && (
					<div
						className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 shrink-0"
						title="Мягкий овердрафт: расход зафиксирован с дефицитом, работа врача не блокируется. Требуется оприходование накладной."
						data-testid="alert-overdraft-badge"
					>
						<ShieldAlert size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
						<span>Ожидается поставка (мягкий овердрафт: {metrics.overdraftCount} поз.)</span>
					</div>
				)}
				{metrics.lowStockCount > 0 && (
					<div
						className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-500/15 border border-orange-500/30 text-orange-900 dark:text-orange-200 shrink-0"
						title="Остаток на складе ниже критического порога. Рекомендуется сформировать заказ поставщику."
						data-testid="alert-low-stock-badge"
					>
						<AlertTriangle size={15} className="text-orange-600 dark:text-orange-400 shrink-0" />
						<span>Заканчивается: {metrics.lowStockCount} поз.</span>
					</div>
				)}
				{(metrics.expiredCount > 0 || metrics.expiringSoonCount > 0) && (
					<div
						className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 ${
							metrics.expiredCount > 0
								? "bg-rose-500/15 border-rose-500/30 text-rose-900 dark:text-rose-200"
								: "bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200"
						}`}
						title="Контроль сроков годности FEFO"
						data-testid="alert-fefo-expiry-badge"
					>
						<Clock size={15} className={metrics.expiredCount > 0 ? "text-rose-600 dark:text-rose-400 shrink-0" : "text-amber-600 dark:text-amber-400 shrink-0"} />
						<span>
							{metrics.expiredCount > 0
								? `Просрочено: ${metrics.expiredCount} поз.`
								: `Истекает срок: ${metrics.expiringSoonCount} поз.`}
						</span>
					</div>
				)}
			</div>
			<WarehouseStockAlertsActions
				onOpenWaybills={onOpenWaybills}
				onOpenBatchTracking={onOpenBatchTracking}
				onOpenInventoryAudit={onOpenInventoryAudit}
			/>
		</div>
	);
};

export default WarehouseStockAlertsBar;
