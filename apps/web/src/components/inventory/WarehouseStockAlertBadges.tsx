import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import type React from "react";
import type { WarehouseStockAlertMetrics } from "./warehouseStockAlertsEngine.js";

export interface WarehouseStockAlertBadgesProps {
	readonly metrics: WarehouseStockAlertMetrics;
}

export const WarehouseStockAlertBadges: React.FC<
	WarehouseStockAlertBadgesProps
> = ({ metrics }) => (
	<div className="flex items-center gap-2 flex-wrap min-w-0">
		{metrics.overdraftCount > 0 && (
			<div
				className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 shrink-0"
				title="Мягкий овердрафт: расход зафиксирован с дефицитом, работа врача не блокируется. Требуется оприходование накладной."
				data-testid="alert-overdraft-badge"
			>
				<ShieldAlert
					size={15}
					className="text-amber-600 dark:text-amber-400 shrink-0"
				/>
				<span>
					Ожидается поставка (мягкий овердрафт: {metrics.overdraftCount} поз.)
				</span>
			</div>
		)}
		{metrics.lowStockCount > 0 && (
			<div
				className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-500/15 border border-orange-500/30 text-orange-900 dark:text-orange-200 shrink-0"
				title="Остаток на складе ниже критического порога. Рекомендуется сформировать заказ поставщику."
				data-testid="alert-low-stock-badge"
			>
				<AlertTriangle
					size={15}
					className="text-orange-600 dark:text-orange-400 shrink-0"
				/>
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
				<Clock
					size={15}
					className={
						metrics.expiredCount > 0
							? "text-rose-600 dark:text-rose-400 shrink-0"
							: "text-amber-600 dark:text-amber-400 shrink-0"
					}
				/>
				<span>
					{metrics.expiredCount > 0
						? `Просрочено: ${metrics.expiredCount} поз.`
						: `Истекает срок: ${metrics.expiringSoonCount} поз.`}
				</span>
			</div>
		)}
	</div>
);
