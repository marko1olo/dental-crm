/**
 * PriceListItemRow.tsx
 *
 * Строка услуги прейскуранта с калькуляцией себестоимости и маржи:
 * - Код услуги с копированием, наименование, инлайн-цена, себестоимость и маржа.
 * Декомпозирован на PriceListItemRowPriceCell (Мандат 8b, строго <= 120 строк).
 */

import React from "react";
import { Copy } from "lucide-react";
import { formatKopecksToRublesDisplay } from "@dental/shared";
import type { ServiceWithMargin } from "./priceListTypes";
import { PriceListItemRowPriceCell } from "./PriceListItemRowPriceCell";

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
	service, isEditing, tempPriceInput, hasCustomPrice,
	onStartEdit, onSavePrice, onTempPriceChange, onCopyCode,
}) => {
	const code = service.statutoryCode || service.code804n;
	const statTitle = service.statutoryTitle || service.statutoryTitle804n;
	const marginBadgeCls = service.marginPct >= 70
		? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
		: service.marginPct >= 50
			? "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30"
			: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";

	return (
		<div
			className="p-3 sm:p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center hover:bg-[var(--paper-soft)] transition-colors"
			data-testid={`pricelist-row-${service.id}`}
		>
			<div className="sm:col-span-2 flex items-center gap-1.5">
				<button
					type="button"
					onClick={() => onCopyCode(code)}
					className="font-mono text-[11px] font-bold text-[var(--teal-dark)] bg-[var(--teal-soft)] px-2 py-0.5 rounded border border-[var(--teal-soft)] flex items-center gap-1 cursor-pointer hover:opacity-80"
					title="Скопировать код услуги"
				>
					<span>{code}</span>
					<Copy size={10} />
				</button>
			</div>

			<div className="sm:col-span-4 min-w-0">
				<span className="text-xs font-bold text-[var(--ink)] block leading-snug break-words">
					{service.commercialTitle}
				</span>
				{statTitle && statTitle !== service.commercialTitle && (
					<span className="text-[10px] text-[var(--muted)] block leading-snug break-words mt-0.5">
						{statTitle}
					</span>
				)}
			</div>

			<div className="sm:col-span-2 sm:text-right flex items-center justify-between sm:justify-end gap-1.5">
				<PriceListItemRowPriceCell
					serviceId={service.id}
					effectivePriceKopecks={service.effectivePriceKopecks}
					isEditing={isEditing}
					tempPriceInput={tempPriceInput}
					hasCustomPrice={hasCustomPrice}
					onStartEdit={onStartEdit}
					onSavePrice={onSavePrice}
					onTempPriceChange={onTempPriceChange}
				/>
			</div>

			<div className="sm:col-span-2 sm:text-right text-[11px] text-[var(--muted)] flex items-center justify-between sm:justify-end gap-1">
				<span>
					{service.totalDirectCostsKopecks > 0 ? formatKopecksToRublesDisplay(service.totalDirectCostsKopecks) : "—"}
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

			<div className="sm:col-span-2 sm:text-right flex items-center justify-between sm:justify-end gap-1.5">
				<span className="text-xs font-bold text-[var(--ink)]">
					{formatKopecksToRublesDisplay(service.netMarginKopecks)}
				</span>
				<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${marginBadgeCls}`}>
					{service.marginPct}%
				</span>
			</div>
		</div>
	);
};
