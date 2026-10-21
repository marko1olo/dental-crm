import React from "react";
import { Check, X } from "lucide-react";
import type { useMissingPriceAlert } from "../useMissingPriceAlert";

export interface MissingPriceBannerEditingActionsProps {
	readonly itemId: string;
	readonly state: ReturnType<typeof useMissingPriceAlert>;
}

export const MissingPriceBannerEditingActions: React.FC<MissingPriceBannerEditingActionsProps> = ({
	itemId,
	state,
}) => {
	const {
		inputPrice,
		setInputPrice,
		error,
		setError,
		inputRef,
		handleSavePrice,
		handleKeyDown,
		setIsEditing,
	} = state;

	return (
		<div className="flex items-center gap-1.5 flex-wrap">
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
					data-testid={`full-price-input-${itemId}`}
				/>
				<span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
					₽
				</span>
			</div>

			<button
				type="button"
				onClick={() => setInputPrice("0")}
				className="min-h-[34px] px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 cursor-pointer transition-colors"
				title="Установить 0 ₽"
			>
				0 ₽
			</button>

			<button
				type="button"
				onClick={handleSavePrice}
				className="min-h-[34px] flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors shadow-xs active:scale-98"
				data-testid={`full-price-save-btn-${itemId}`}
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
				className="min-h-[34px] p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer flex items-center justify-center transition-colors"
				data-testid={`full-price-cancel-btn-${itemId}`}
				title="Отмена"
			>
				<X size={14} />
			</button>
		</div>
	);
};
