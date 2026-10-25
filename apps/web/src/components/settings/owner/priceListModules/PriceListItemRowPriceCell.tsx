/**
 * PriceListItemRowPriceCell.tsx
 *
 * Ячейка розничной цены услуги с инлайн-редактированием и бейджем кастомной цены.
 * Модуль декомпозирован согласно Мандату 8b (строго <= 120 строк).
 */

import React from "react";
import { Check } from "lucide-react";
import { formatKopecksToRublesDisplay } from "@dental/shared";

export interface PriceListItemRowPriceCellProps {
	readonly serviceId: string;
	readonly effectivePriceKopecks: number;
	readonly isEditing: boolean;
	readonly tempPriceInput: string;
	readonly hasCustomPrice: boolean;
	readonly onStartEdit: (id: string, currentKopecks: number) => void;
	readonly onSavePrice: (id: string) => void;
	readonly onTempPriceChange: (val: string) => void;
}

export const PriceListItemRowPriceCell: React.FC<PriceListItemRowPriceCellProps> = ({
	serviceId,
	effectivePriceKopecks,
	isEditing,
	tempPriceInput,
	hasCustomPrice,
	onStartEdit,
	onSavePrice,
	onTempPriceChange,
}) => {
	if (isEditing) {
		return (
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
					onClick={() => onSavePrice(serviceId)}
					className="p-1 rounded bg-[var(--teal)] text-white cursor-pointer hover:opacity-90"
					title="Сохранить"
				>
					<Check size={12} />
				</button>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-1.5">
			<button
				type="button"
				onClick={() => onStartEdit(serviceId, effectivePriceKopecks)}
				className="text-xs font-bold text-[var(--ink)] hover:text-[var(--teal)] cursor-pointer"
				title="Нажмите для изменения цены"
			>
				{formatKopecksToRublesDisplay(effectivePriceKopecks)}
			</button>
			{hasCustomPrice && (
				<span className="text-[9px] font-bold px-1 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300">
					изм
				</span>
			)}
		</div>
	);
};
