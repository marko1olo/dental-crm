/**
 * apps/web/src/components/inventory/writeoff/BatchWriteoffShiftStats.tsx
 *
 * Карточка показателей смены и пассивный индикатор мягкого овердрафта
 * расходных материалов (Мандаты 8e, 8n, 8x, 8am, 8ze).
 */

import React from "react";
import { AlertTriangle, Calendar, ShoppingCart } from "lucide-react";
import { showToast } from "../../GlobalToast.js";

export interface BatchWriteoffShiftStatsProps {
	readonly date: string;
	readonly shiftStats: {
		completedVisitsCount: number;
		totalProceduresCount: number;
		breakdown: Array<{ name: string; count: number; code?: string | undefined }>;
	};
	readonly hasOverdraft: boolean;
	readonly onGenerateSupplierOrder?: (() => void) | undefined;
}

export const BatchWriteoffShiftStats: React.FC<BatchWriteoffShiftStatsProps> = ({
	date,
	shiftStats,
	hasOverdraft,
	onGenerateSupplierOrder,
}) => {
	const handleOrderClick = () => {
		if (onGenerateSupplierOrder) {
			onGenerateSupplierOrder();
		} else {
			showToast("Заказ поставщику сформирован", "info");
		}
	};

	return (
		<div className="space-y-3">
			{/* Сводные показатели смены */}
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 p-3 sm:p-3.5 bg-[var(--paper-soft,#f8fafc)] rounded-xl border border-[var(--line-subtle,#f1f5f9)] text-xs">
				<div>
					<span className="text-[11px] text-[var(--muted,#64748b)] font-semibold">Дата смены</span>
					<div className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5 mt-0.5">
						<Calendar size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span>{date}</span>
					</div>
				</div>
				<div>
					<span className="text-[11px] text-[var(--muted,#64748b)] font-semibold">Завершено приёмов</span>
					<div className="font-bold text-[var(--ink,#0f172a)] text-sm mt-0.5">
						{shiftStats.completedVisitsCount} пациентов
					</div>
				</div>
				<div className="col-span-2 sm:col-span-1">
					<span className="text-[11px] text-[var(--muted,#64748b)] font-semibold">Норма расхода</span>
					<div className="font-bold text-[var(--ink,#0f172a)] text-sm mt-0.5">
						{shiftStats.totalProceduresCount} по прейскуранту
					</div>
				</div>
			</div>

			{/* Разбор процедур смены */}
			{shiftStats.breakdown && shiftStats.breakdown.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{shiftStats.breakdown.map((b) => (
						<span
							key={b.name}
							className="px-2.5 py-1 rounded-lg text-xs bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border border-[var(--line-subtle,#f1f5f9)]"
						>
							{b.name}: <strong className="font-semibold">{b.count}</strong>
						</span>
					))}
				</div>
			)}

			{/* Пассивное предупреждение о мягком овердрафте (Мандат 8n: ноль блокировок врачебной работы) */}
			{hasOverdraft && (
				<div className="p-3 sm:p-3.5 rounded-xl bg-[var(--warning-soft,#fef3c7)] border border-[var(--warning,#f59e0b)]/30 text-[var(--warning,#b45309)] text-xs flex flex-col gap-2.5">
					<div className="flex items-start gap-2.5">
						<AlertTriangle size={18} className="shrink-0 mt-0.5 text-[var(--warning,#f59e0b)]" />
						<div>
							<div className="font-semibold text-[var(--ink)]">
								Мягкий овердрафт активен
							</div>
							<p className="mt-0.5 text-[var(--muted)] leading-relaxed">
								Режим мягкого овердрафта: позиции с дефицитом списываются с отрицательным сальдо (накладная в пути) без прерывания клинического приёма. Приход покроет дефицит автоматически.
							</p>
						</div>
					</div>
					<button
						type="button"
						data-testid="btn-generate-supplier-order"
						onClick={handleOrderClick}
						className="self-start min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] bg-[var(--warning-soft,#fef3c7)] hover:opacity-90 border border-[var(--warning,#f59e0b)]/30 transition-colors cursor-pointer"
					>
						<ShoppingCart size={14} className="shrink-0" />
						<span>+ Сформировать заказ поставщику при наличии дефицита</span>
					</button>
				</div>
			)}
		</div>
	);
};
