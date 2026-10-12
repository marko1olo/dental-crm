/**
 * PriceListItemRow.tsx
 *
 * Строка услуги прейскуранта 804н с прозрачной калькуляцией себестоимости и маржи:
 * - Код номенклатуры 804н с кнопкой копирования
 * - Наименование (без клиппинга и без срезания букв)
 * - Розничная цена с инлайн-редактированием
 * - Себестоимость расходных материалов и ЗТЛ
 * - Чистая маржа и цветовой бейдж рентабельности
 */

import React from "react";
import { Check, Copy } from "lucide-react";
import { formatKopecksToRublesDisplay } from "@dental/shared";
import type { ServiceWithMargin } from "./priceListTypes";

export interface PriceListItemRowProps {
	readonly service: ServiceWithMargin;
	readonly isEditing: boolean;
	readonly tempPriceInput: string;
	readonly hasCustomPrice: boolean;
	readonly onStartEdit: (id: string, currentKopecks: number) => void;
	readonly onSavePrice: (id: string) => void;
	readonly onTempPriceChange: (val: string) => void;
	readonly onCopyCode: (code: string) => void;
}

export const PriceListItemRow: React.FC<PriceListItemRowProps> = ({
	service,
	isEditing,
	tempPriceInput,
	hasCustomPrice,
	onStartEdit,
	onSavePrice,
	onTempPriceChange,
	onCopyCode,
}) => {
	return (
		<div
			className="p-3 sm:p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center hover:bg-[var(--paper-soft)] transition-colors"
			data-testid={`pricelist-row-${service.id}`}
		>
			{/* Код услуги */}
			<div className="sm:col-span-2 flex items-center gap-1.5">
				<button
					type="button"
					onClick={() => onCopyCode(service.code804n)}
					className="font-mono text-[11px] font-bold text-[var(--teal-dark)] bg-[var(--teal-soft)] px-2 py-0.5 rounded border border-[var(--teal-soft)] flex items-center gap-1 cursor-pointer hover:opacity-80"
					title="Скопировать код услуги"
				>
					<span>{service.code804n}</span>
					<Copy size={10} />
				</button>
			</div>

			{/* Наименование (без обрезания многоточиями) */}
			<div className="sm:col-span-4 min-w-0">
				<span className="text-xs font-bold text-[var(--ink)] block leading-snug break-words">
					{service.commercialTitle}
				</span>
				{service.statutoryTitle804n &&
					service.statutoryTitle804n !== service.commercialTitle && (
						<span className="text-[10px] text-[var(--muted)] block leading-snug break-words mt-0.5">
							{service.statutoryTitle804n}
						</span>
					)}
			</div>

			{/* Розничная цена */}
			<div className="sm:col-span-2 sm:text-right flex items-center justify-between sm:justify-end gap-1.5">
				{isEditing ? (
					<div className="flex items-center gap-1">
						<input
							type="number"
							value={tempPriceInput}
							onChange={(e) => onTempPriceChange(e.target.value)}
							className="w-20 text-xs px-1.5 py-0.5 rounded border border-[var(--teal)] bg-[var(--paper)] text-[var(--ink)]"
							autoFocus
						/>
						<button
							type="button"
							onClick={() => onSavePrice(service.id)}
							className="p-1 rounded bg-[var(--teal)] text-white cursor-pointer"
							title="Сохранить"
						>
							<Check size={12} />
						</button>
					</div>
				) : (
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => onStartEdit(service.id, service.effectivePriceKopecks)}
							className="text-xs font-bold text-[var(--ink)] hover:text-[var(--teal)] cursor-pointer"
							title="Нажмите для изменения цены"
						>
							{formatKopecksToRublesDisplay(service.effectivePriceKopecks)}
						</button>
						{hasCustomPrice && (
							<span className="text-[9px] font-bold px-1 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300">
								изм
							</span>
						)}
					</div>
				)}
			</div>

			{/* Себестоимость (Материалы + ЗТЛ) */}
			<div className="sm:col-span-2 sm:text-right text-[11px] text-[var(--muted)] flex items-center justify-between sm:justify-end gap-1">
				<span>
					{service.totalDirectCostsKopecks > 0
						? formatKopecksToRublesDisplay(service.totalDirectCostsKopecks)
						: "—"}
				</span>
				{service.labCostKopecks > 0 && (
					<span
						className="text-[9px] px-1 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
						title={`ЗТЛ: ${formatKopecksToRublesDisplay(service.labCostKopecks)}`}
					>
						ЗТЛ
					</span>
				)}
			</div>

			{/* Чистая маржа и процент */}
			<div className="sm:col-span-2 sm:text-right flex items-center justify-between sm:justify-end gap-1.5">
				<span className="text-xs font-bold text-[var(--ink)]">
					{formatKopecksToRublesDisplay(service.netMarginKopecks)}
				</span>
				<span
					className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
						service.marginPct >= 70
							? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
							: service.marginPct >= 50
								? "bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30"
								: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
					}`}
				>
					{service.marginPct}%
				</span>
			</div>
		</div>
	);
};
