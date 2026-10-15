import React from "react";
import { Check, X, Coins, ShieldCheck } from "lucide-react";
import type { TreatmentPlanItem } from "./types";
import type { useMissingPriceAlert } from "./useMissingPriceAlert";

export interface MissingPriceBannerActionsProps {
	readonly item: TreatmentPlanItem;
	readonly state: ReturnType<typeof useMissingPriceAlert>;
}

export const MissingPriceBannerActions: React.FC<MissingPriceBannerActionsProps> = ({
	item,
	state,
}) => {
	const {
		isEditing,
		setIsEditing,
		inputPrice,
		setInputPrice,
		error,
		setError,
		inputRef,
		handleSetWarrantyZeroPrice,
		handleKeepAgreedPrice,
		handleSavePrice,
		handleKeyDown,
	} = state;

	return (
		<div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
			{isEditing ? (
				<div className="flex items-center gap-1.5">
					<div className="relative">
						<input
							ref={inputRef}
							type="text"
							inputMode="decimal"
							value={inputPrice}
							onChange={(e) => {
								setInputPrice(e.target.value);
								if (error) setError(null);
							}}
							onKeyDown={handleKeyDown}
							placeholder="0"
							className="w-28 px-2.5 py-1.5 text-xs font-mono font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border border-amber-500 rounded-lg outline-none shadow-xs"
							data-testid={`full-price-input-${item.id}`}
						/>
						<span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
							₽
						</span>
					</div>

					<button
						type="button"
						onClick={() => setInputPrice("0")}
						className="px-2 py-1.5 rounded-lg text-xs font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
						title="Установить 0 ₽"
					>
						0 ₽
					</button>

					<button
						type="button"
						onClick={handleSavePrice}
						className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors shadow-xs"
						data-testid={`full-price-save-btn-${item.id}`}
					>
						<Check size={14} />
						<span>Сохранить</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setIsEditing(false);
							setError(null);
						}}
						className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
						data-testid={`full-price-cancel-btn-${item.id}`}
					>
						<X size={14} />
					</button>
				</div>
			) : (
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer transition-colors shadow-xs"
						data-testid={`full-price-edit-btn-${item.id}`}
						title="Указать договорную стоимость услуги"
					>
						<Coins size={13} />
						<span>Указать цену</span>
					</button>

					<button
						type="button"
						onClick={handleSetWarrantyZeroPrice}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors shadow-xs"
						data-testid={`full-warranty-btn-${item.id}`}
						title="Гарантийная переделка (0 ₽)"
					>
						<ShieldCheck size={13} />
						<span>Гарантия 0 ₽</span>
					</button>

					{Boolean(item.isArchivedInCatalog || item.priceRub > 0) && (
						<button
							type="button"
							onClick={handleKeepAgreedPrice}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-colors shadow-xs"
							data-testid={`full-keep-agreed-btn-${item.id}`}
							title="Выполнить по согласованной цене плана"
						>
							<Check size={13} />
							<span>По согласованной цене</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
};
