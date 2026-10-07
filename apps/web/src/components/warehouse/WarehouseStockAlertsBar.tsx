import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	FileText,
	Layers,
	Package,
	Plus,
	ShieldAlert,
	Truck,
} from "lucide-react";
import React, { useMemo } from "react";
import type { InventoryItem } from "../inventory/useInventoryLogic.js";
import { getFefoTrafficLight } from "../inventory/fefoTrafficLight.js";

export interface WarehouseStockAlertsBarProps {
	readonly items: readonly InventoryItem[];
	readonly onOpenWaybills?: (() => void) | undefined;
	readonly onOpenBatchTracking?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly className?: string | undefined;
}

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
}) => {
	const metrics = useMemo(() => {
		let lowStockCount = 0;
		let overdraftCount = 0;
		let expiredCount = 0;
		let expiringSoonCount = 0;

		for (const item of items) {
			const qty = Number(item.stockQuantity) || 0;
			const threshold = Number(item.criticalThreshold) || 5;

			if (qty < 0) {
				overdraftCount++;
			} else if (qty <= threshold) {
				lowStockCount++;
			}

			if (item.expirationDate) {
				const fefo = getFefoTrafficLight(item.expirationDate);
				if (fefo.status === "red") {
					expiredCount++;
				} else if (fefo.status === "yellow") {
					expiringSoonCount++;
				}
			}
		}

		return {
			lowStockCount,
			overdraftCount,
			expiredCount,
			expiringSoonCount,
			hasAlerts:
				lowStockCount > 0 ||
				overdraftCount > 0 ||
				expiredCount > 0 ||
				expiringSoonCount > 0,
		};
	}, [items]);

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
			className={`warehouse-stock-alerts-bar p-2.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] ${className}`}
			data-testid="warehouse-stock-alerts-bar"
			role="region"
			aria-label="Оперативные складские предупреждения"
		>
			{/* Левая часть: Информационные индикаторы */}
			<div className="flex items-center gap-2 flex-wrap min-w-0">
				{metrics.overdraftCount > 0 && (
					<div
						className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 shrink-0"
						title="Мягкий овердрафт: расход зафиксирован с дефицитом, работа врача не блокируется. Требуется оприходование накладной."
						data-testid="alert-overdraft-badge"
					>
						<ShieldAlert size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
						<span>Расход сверх остатка: {metrics.overdraftCount} поз.</span>
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
						title="Контроль сроков годности по регламенту СанПиН 3.3686-21 и FEFO"
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

			{/* Правая часть: Быстрые неблокирующие переходы */}
			<div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
				{onOpenWaybills && (
					<button
						type="button"
						onClick={onOpenWaybills}
						className="h-8 min-h-[32px] sm:h-8 px-2.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 active:scale-98 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
						data-testid="alert-action-open-waybills"
						title="Оприходовать приходную накладную от поставщика (ТОРГ-12) и закрыть овердрафт"
					>
						<Truck size={14} className="shrink-0" />
						<span className="whitespace-nowrap">Приход накладной</span>
					</button>
				)}

				{onOpenBatchTracking && (
					<button
						type="button"
						onClick={onOpenBatchTracking}
						className="h-8 min-h-[32px] sm:h-8 px-2.5 rounded-lg text-xs font-semibold border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer"
						data-testid="alert-action-open-batches"
						title="Партионный учёт и контроль сроков годности FEFO"
					>
						<Layers size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="whitespace-nowrap">Партии FEFO</span>
					</button>
				)}

				{onOpenInventoryAudit && (
					<button
						type="button"
						onClick={onOpenInventoryAudit}
						className="h-8 min-h-[32px] sm:h-8 px-2.5 rounded-lg text-xs font-semibold border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer"
						data-testid="alert-action-open-audit"
						title="Провести инвентаризацию и сличительную ведомость остатков (ИНВ-3/19)"
					>
						<FileText size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="whitespace-nowrap">Инвентаризация</span>
					</button>
				)}
			</div>
		</div>
	);
};

export default WarehouseStockAlertsBar;
