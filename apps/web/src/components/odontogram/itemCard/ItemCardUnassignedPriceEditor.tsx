import type React from "react";
import type { PlanItem } from "../treatmentEstimatorPricing";

export interface ItemCardUnassignedPriceEditorProps {
	readonly item: PlanItem;
	readonly globalIdx: number;
	readonly isEditingPrice: boolean;
	readonly customPriceInput: string;
	readonly setCustomPriceInput: (v: string) => void;
	readonly setIsEditingPrice: (v: boolean) => void;
	readonly handleSaveCustomPrice: () => void;
	readonly onPriceChange?: ((idx: number, newPrice: number | null) => void) | undefined;
}

export const ItemCardUnassignedPriceEditor: React.FC<ItemCardUnassignedPriceEditorProps> = ({
	item,
	globalIdx,
	isEditingPrice,
	customPriceInput,
	setCustomPriceInput,
	setIsEditingPrice,
	handleSaveCustomPrice,
	onPriceChange,
}) => {
	return (
		<div className="flex items-center gap-2 flex-wrap">
			<span className="text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5 flex-wrap">
				<span>Цена не назначена</span>
				<span className="text-xs font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
					{item.issue ? "нет в вашем прайсе" : "сумма в плане не читается"}
				</span>
			</span>
			{onPriceChange && (
				<div className="flex items-center gap-1.5" style={{ gap: "6px" }}>
					<button
						type="button"
						onClick={() => onPriceChange(globalIdx, 0)}
						style={{ padding: "4px 10px" }}
						className="dente-filter-chip px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer min-h-[30px]"
						title="Установить цену 0 ₽ (Гарантийный случай / контрольный осмотр)"
						data-testid={`btn-set-warranty-zero-${item.toothNumber || globalIdx}`}
					>
						0 ₽ (Гарантия)
					</button>
					{isEditingPrice ? (
						<div className="flex items-center gap-1" style={{ gap: "6px" }}>
							<input
								type="number"
								min="0"
								step="100"
								value={customPriceInput}
								onChange={(e) => setCustomPriceInput(e.target.value)}
								style={{ padding: "4px 8px" }}
								className="w-20 px-2 py-1 text-xs rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono min-h-[30px]"
								placeholder="Цена ₽"
								autoFocus
							/>
							<button
								type="button"
								onClick={handleSaveCustomPrice}
								style={{ padding: "4px 10px", backgroundColor: "#0d9488", color: "#ffffff" }}
								className="px-2.5 py-1 text-xs font-bold rounded-md bg-teal-600 text-white hover:bg-teal-700 cursor-pointer min-h-[30px]"
							>
								✓
							</button>
							<button
								type="button"
								onClick={() => setIsEditingPrice(false)}
								style={{ padding: "4px 8px" }}
								className="px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer min-h-[30px]"
							>
								Отмена
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={() => {
								setCustomPriceInput(item.price !== null ? String(item.price) : "");
								setIsEditingPrice(true);
							}}
							style={{ padding: "4px 10px" }}
							className="dente-filter-chip px-2.5 py-1 text-xs font-semibold rounded-md border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] transition-all cursor-pointer min-h-[30px]"
							title="Ввести цену вручную"
							data-testid={`btn-custom-price-${item.toothNumber || globalIdx}`}
						>
							Ввести цену
						</button>
					)}
				</div>
			)}
		</div>
	);
};
