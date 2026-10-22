import type React from "react";
import type { EstimatorRowMoney } from "../treatmentEstimatorMoney";
import type { PlanItem } from "../treatmentEstimatorPricing";
import { ItemCardUnassignedPriceEditor } from "./ItemCardUnassignedPriceEditor";

export interface ItemCardPriceQuantityProps {
	readonly item: PlanItem;
	readonly globalIdx: number;
	readonly rowMoney: EstimatorRowMoney;
	readonly formatRub: (kopecks: number) => string;
	readonly isEditingPrice: boolean;
	readonly customPriceInput: string;
	readonly setCustomPriceInput: (v: string) => void;
	readonly setIsEditingPrice: (v: boolean) => void;
	readonly handleSaveCustomPrice: () => void;
	readonly onPriceChange?: ((idx: number, newPrice: number | null) => void) | undefined;
}

export const ItemCardPriceQuantity: React.FC<ItemCardPriceQuantityProps> = ({
	item,
	globalIdx,
	rowMoney,
	formatRub,
	isEditingPrice,
	customPriceInput,
	setCustomPriceInput,
	setIsEditingPrice,
	handleSaveCustomPrice,
	onPriceChange,
}) => {
	if (!rowMoney.known) {
		return (
			<ItemCardUnassignedPriceEditor
				item={item}
				globalIdx={globalIdx}
				isEditingPrice={isEditingPrice}
				customPriceInput={customPriceInput}
				setCustomPriceInput={setCustomPriceInput}
				setIsEditingPrice={setIsEditingPrice}
				handleSaveCustomPrice={handleSaveCustomPrice}
				onPriceChange={onPriceChange}
			/>
		);
	}

	if (item.price === 0) {
		return (
			<div className="flex items-center gap-2 flex-wrap" style={{ gap: "8px" }}>
				<span style={{ padding: "3px 10px" }} className="text-emerald-700 dark:text-emerald-300 font-bold text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30">
					0 ₽ (Гарантия / Без оплаты)
				</span>
				{onPriceChange && (
					<button
						type="button"
						onClick={() => {
							setCustomPriceInput("0");
							setIsEditingPrice(true);
						}}
						style={{ padding: "2px 8px" }}
						className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] underline cursor-pointer"
						title="Изменить цену"
					>
						Изменить
					</button>
				)}
			</div>
		);
	}

	if (rowMoney.hasContract && rowMoney.coveragePct === 0) {
		return (
			<span className="text-rose-500 font-semibold flex items-center gap-1.5 flex-wrap">
				<span>{formatRub(rowMoney.unitKopecks)}</span>
				<span className="text-xs font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/25">
					Вне покрытия ДМС
				</span>
			</span>
		);
	}

	if (rowMoney.hasContract) {
		return (
			<span className="flex items-center gap-1.5 flex-wrap">
				<span className="line-through text-slate-400 dark:text-zinc-500">
					{formatRub(rowMoney.unitKopecks)}
				</span>
				<span className="text-teal-500 dark:text-teal-400 font-bold">
					{formatRub(rowMoney.unitPayableKopecks)}
				</span>
				<span className="text-xs font-bold bg-teal-500/10 text-teal-500 dark:text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/20">
					{rowMoney.coveragePct < 100 ? `Со-оплата ${rowMoney.copayPct}%` : "ДМС 100%"}
				</span>
			</span>
		);
	}

	return (
		<div className="flex items-center gap-2 flex-wrap" style={{ gap: "8px" }}>
			<span>{formatRub(rowMoney.unitKopecks)} x {item.quantity}</span>
			{onPriceChange && (
				<button
					type="button"
					onClick={() => onPriceChange(globalIdx, 0)}
					style={{ padding: "2px 8px" }}
					className="dente-filter-chip text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-md hover:bg-emerald-500/20 cursor-pointer"
					title="Сделать услугу гарантийной (0 ₽)"
				>
					Сделать 0 ₽
				</button>
			)}
		</div>
	);
};
