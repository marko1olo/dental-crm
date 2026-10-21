import React from "react";
import { Check, X } from "lucide-react";
import type { MissingPriceInlineEditorProps } from "./types";

export const MissingPriceInlineEditor: React.FC<MissingPriceInlineEditorProps> = ({
	itemId,
	inputRef,
	inputPrice,
	setInputPrice,
	error,
	setError,
	handleKeyDown,
	handleSavePrice,
	setIsEditing,
}) => {
	return (
		<div className="inline-flex items-center gap-1">
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
				placeholder="Цена ₽"
				className="w-20 px-1.5 py-0.5 text-xs font-mono font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border border-amber-500 rounded outline-none shadow-xs"
				data-testid={`inline-price-input-${itemId}`}
			/>
			<button
				type="button"
				onClick={() => setInputPrice("0")}
				className="min-h-[28px] px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 cursor-pointer transition-colors"
				title="Установить 0 ₽"
			>
				0 ₽
			</button>
			<button
				type="button"
				onClick={handleSavePrice}
				className="min-h-[28px] min-w-[28px] p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer flex items-center justify-center transition-colors"
				title="Сохранить цену (Enter)"
				data-testid={`inline-price-save-btn-${itemId}`}
			>
				<Check size={12} />
			</button>
			<button
				type="button"
				onClick={() => {
					setIsEditing(false);
					setError(null);
				}}
				className="min-h-[28px] min-w-[28px] p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer flex items-center justify-center transition-colors"
				title="Отмена (Esc)"
				data-testid={`inline-price-cancel-btn-${itemId}`}
			>
				<X size={12} />
			</button>
		</div>
	);
};
