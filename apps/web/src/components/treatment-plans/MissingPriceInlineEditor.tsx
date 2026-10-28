/**
 * MissingPriceInlineEditor.tsx — Компактный инлайн-редактор цены услуги этапа лечения.
 * Спокойный вид без кричащих красных баннеров (Мандат 8e, Мандат 8am).
 */

import React from "react";
import { Check, X } from "lucide-react";
import type { MissingPriceInlineEditorProps } from "./missingPriceHub/types";

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
		<div className="inline-flex items-center gap-1.5 flex-wrap">
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
					className="w-24 px-2 py-1 text-xs font-mono font-bold bg-[var(--paper-strong,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--teal,#0d9488)] rounded-lg outline-none shadow-2xs focus:ring-1 focus:ring-[var(--teal)] transition-all"
					data-testid={`inline-price-input-${itemId}`}
					aria-label="Цена услуги в рублях"
				/>
				<span className="ml-1 text-xs font-bold text-[var(--muted,#64748b)]">₽</span>
			</div>

			<button
				type="button"
				onClick={() => setInputPrice("0")}
				className="secondary-button dente-btn dente-btn-secondary h-7 px-2 rounded-lg text-[11px] font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer transition-colors"
				title="Установить 0 ₽ (Гарантийный случай)"
			>
				0 ₽
			</button>

			<button
				type="button"
				onClick={handleSavePrice}
				className="primary-button dente-btn dente-btn-primary h-7 min-w-[28px] px-2 rounded-lg bg-[var(--teal,#0d9488)] text-white hover:brightness-105 cursor-pointer flex items-center justify-center transition-all shadow-2xs text-[11px] font-bold gap-1"
				title="Сохранить цену (Enter)"
				data-testid={`inline-price-save-btn-${itemId}`}
			>
				<Check size={12} />
				<span className="hidden sm:inline">Готово</span>
			</button>

			<button
				type="button"
				onClick={() => {
					setIsEditing(false);
					setError(null);
				}}
				className="secondary-button dente-btn dente-btn-secondary h-7 min-w-[28px] p-1.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line)] cursor-pointer flex items-center justify-center transition-colors"
				title="Отмена (Esc)"
				data-testid={`inline-price-cancel-btn-${itemId}`}
			>
				<X size={12} />
			</button>

			{error && (
				<span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">{error}</span>
			)}
		</div>
	);
};

export default MissingPriceInlineEditor;
