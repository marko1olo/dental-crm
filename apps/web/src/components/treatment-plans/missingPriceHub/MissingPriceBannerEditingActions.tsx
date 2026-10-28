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
			<div className="relative inline-flex items-center">
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
					className="w-28 px-2.5 py-1 text-xs font-mono font-bold bg-[var(--paper-strong,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--teal,#0d9488)] rounded-lg outline-none shadow-2xs focus:ring-1 focus:ring-[var(--teal)] transition-all"
					data-testid={`full-price-input-${itemId}`}
					aria-label="Цена процедуры в рублях"
				/>
				<span className="ml-1 text-xs font-bold text-[var(--muted,#64748b)]">₽</span>
			</div>

			<button
				type="button"
				onClick={() => setInputPrice("0")}
				className="secondary-button dente-btn dente-btn-secondary h-8 px-2 rounded-lg text-xs font-mono font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] bg-[var(--paper)] border border-[var(--line)] cursor-pointer transition-colors shadow-2xs"
				title="Установить 0 ₽ (Гарантия)"
			>
				0 ₽
			</button>

			<button
				type="button"
				onClick={handleSavePrice}
				className="primary-button dente-btn dente-btn-primary h-8 px-3 rounded-xl text-xs font-bold bg-[var(--teal,#0d9488)] text-white hover:brightness-105 cursor-pointer transition-all shadow-2xs inline-flex items-center gap-1"
				data-testid={`full-price-save-btn-${itemId}`}
				title="Сохранить цену (Enter)"
			>
				<Check size={13} />
				<span>Готово</span>
			</button>

			<button
				type="button"
				onClick={() => {
					setIsEditing(false);
					setError(null);
				}}
				className="secondary-button dente-btn dente-btn-secondary h-8 p-1.5 rounded-xl bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line)] cursor-pointer transition-colors shadow-2xs"
				title="Отмена (Esc)"
				data-testid={`full-price-cancel-btn-${itemId}`}
			>
				<X size={13} />
			</button>

			{error && (
				<span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold ml-1">{error}</span>
			)}
		</div>
	);
};

export default MissingPriceBannerEditingActions;
