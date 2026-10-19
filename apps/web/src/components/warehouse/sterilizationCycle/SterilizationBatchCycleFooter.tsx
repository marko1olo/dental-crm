/**
 * SterilizationBatchCycleFooter.tsx — Нижняя панель действий 1-кликового запуска цикла.
 * Apple HIG: высота кнопок >= 36px, Soft Overdraft Banner. Строго <= 120 строк.
 */

import { AlertTriangle, Check, Loader2 } from "lucide-react";
import type { StockDeductionSummaryItem } from "./types.js";

export interface SterilizationBatchCycleFooterProps {
	readonly submitting: boolean;
	readonly overdraftItems: readonly StockDeductionSummaryItem[];
	readonly totalPackages: number;
	readonly onClose: () => void;
	readonly onConfirm: () => void;
}

export function SterilizationBatchCycleFooter({
	submitting,
	overdraftItems,
	totalPackages,
	onClose,
	onConfirm,
}: SterilizationBatchCycleFooterProps) {
	const hasOverdraft = overdraftItems.length > 0;

	return (
		<div className="flex flex-col gap-2.5 pt-3 border-t border-[var(--line)]">
			{/* Неблокирующая плашка овердрафта для медсестры (Мандат 8n) */}
			{hasOverdraft && (
				<div
					data-testid="sterilization-soft-overdraft-banner"
					className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[var(--warning-border,#fde68a)] bg-[var(--warning-bg,#fefce8)] text-[var(--warning-text,#854d0e)] text-[12px]"
				>
					<AlertTriangle
						size={16}
						className="shrink-0 text-[var(--warning-icon,#d97706)] mt-0.5"
					/>
					<div className="flex flex-col">
						<span className="font-semibold">
							⚠️ Требуется закупка расходных материалов
						</span>
						<span className="text-[11px] opacity-90">
							На складе не хватает позиций:{" "}
							{overdraftItems
								.map(
									(o) =>
										`${o.name} (остаток: ${o.currentStock} шт., списание: ${o.quantity} шт.)`,
								)
								.join(", ")}
							. Списание выполнится с мягким овердрафтом без блокировки работы.
						</span>
					</div>
				</div>
			)}

			<div className="flex items-center justify-between gap-3">
				<span className="text-[12px] text-[var(--muted)] font-medium">
					К списанию: <strong>{totalPackages}</strong> крафт-пакетов + 1
					индикатор
				</span>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onClose}
						disabled={submitting}
						className="secondary-button h-9 min-h-[36px] px-3.5 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] transition-colors cursor-pointer touch-manipulation disabled:opacity-50"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={onConfirm}
						disabled={submitting || totalPackages <= 0}
						aria-busy={submitting}
						data-testid="confirm-sterilization-batch-cycle-btn"
						className="primary-button h-9 min-h-[36px] px-4 text-[13px] font-semibold rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-xs inline-flex items-center gap-2 transition-all cursor-pointer touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{submitting ? (
							<>
								<Loader2 size={16} className="animate-spin text-white" />
								<span>Списание со склада...</span>
							</>
						) : (
							<>
								<Check size={16} className="text-white" />
								<span>Зафиксировать цикл</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
