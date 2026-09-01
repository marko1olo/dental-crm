import React, { useState, useRef, useEffect } from "react";
import { AlertTriangle, Check, Edit3, X, Coins } from "lucide-react";
import type { TreatmentPlanItem } from "./types";

export interface MissingPriceAlertProps {
	readonly item: TreatmentPlanItem;
	readonly onUpdatePrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: TreatmentPlanItem) => void) | undefined;
	readonly variant?: "full" | "inline" | "compact" | undefined;
	readonly className?: string | undefined;
}

/**
 * MissingPriceAlert — Предупреждение о ненайденной услуге в прайс-листе клиники
 * с возможностью мгновенного инлайн-ввода и сохранения цены врачом/куратором.
 */
export const MissingPriceAlert: React.FC<MissingPriceAlertProps> = ({
	item,
	onUpdatePrice,
	onUpdateItem,
	variant = "full",
	className = "",
}) => {
	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [inputPrice, setInputPrice] = useState<string>(
		item.priceRub > 0 ? String(item.priceRub) : "",
	);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	const isMissingPrice = Boolean(item.requiresManualPricing || item.priceRub === 0);

	// If price is valid and not editing, we don't render the alert
	if (!isMissingPrice && !isEditing) {
		return null;
	}

	const handleSavePrice = () => {
		const cleanVal = inputPrice.trim().replace(/\s+/g, "").replace(",", ".");
		const parsedNum = Number(cleanVal);

		if (cleanVal === "" || Number.isNaN(parsedNum) || parsedNum < 0) {
			setError("Введите корректную сумму в рублях");
			return;
		}

		setError(null);
		setIsEditing(false);

		const updatedPrice = Math.round(parsedNum);
		if (onUpdatePrice) {
			onUpdatePrice(item.id, updatedPrice);
		}
		if (onUpdateItem) {
			const updated: TreatmentPlanItem = {
				...item,
				priceRub: updatedPrice,
				unitPriceRub: updatedPrice,
				requiresManualPricing: false,
			};
			onUpdateItem(updated);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleSavePrice();
		} else if (e.key === "Escape") {
			e.preventDefault();
			setInputPrice(item.priceRub > 0 ? String(item.priceRub) : "");
			setError(null);
			setIsEditing(false);
		}
	};

	if (variant === "compact" || variant === "inline") {
		return (
			<div
				className={`missing-price-alert-inline inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-colors ${
					isMissingPrice
						? "bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/30"
						: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
				} ${className}`.trim()}
				data-testid={`missing-price-alert-${item.id}`}
			>
				<AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />

				{isEditing ? (
					<div className="inline-flex items-center gap-1">
						<input
							ref={inputRef}
							type="number"
							min="0"
							step="100"
							value={inputPrice}
							onChange={(e) => {
								setInputPrice(e.target.value);
								if (error) setError(null);
							}}
							onKeyDown={handleKeyDown}
							placeholder="Цена ₽"
							className="w-20 px-1.5 py-0.5 text-xs font-mono font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border border-amber-500 rounded outline-none shadow-xs"
							data-testid={`inline-price-input-${item.id}`}
						/>
						<button
							type="button"
							onClick={handleSavePrice}
							className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
							title="Сохранить цену (Enter)"
							data-testid={`inline-price-save-btn-${item.id}`}
						>
							<Check size={12} />
						</button>
						<button
							type="button"
							onClick={() => {
								setIsEditing(false);
								setError(null);
							}}
							className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
							title="Отмена (Esc)"
							data-testid={`inline-price-cancel-btn-${item.id}`}
						>
							<X size={12} />
						</button>
					</div>
				) : (
					<div className="inline-flex items-center gap-1.5 flex-wrap">
						<span className="font-semibold text-amber-800 dark:text-amber-300">
							Требуется ручная оценка
						</span>
						<button
							type="button"
							onClick={() => setIsEditing(true)}
							className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white hover:bg-amber-700 cursor-pointer transition-colors shadow-xs"
							data-testid={`inline-price-edit-btn-${item.id}`}
						>
							<Edit3 size={10} />
							<span>Указать цену</span>
						</button>
					</div>
				)}

				{error && (
					<span className="text-[10px] text-rose-600 font-bold ml-1">{error}</span>
				)}
			</div>
		);
	}

	// Full Banner Variant
	return (
		<div
			className={`missing-price-alert-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100 text-xs transition-all ${className}`.trim()}
			data-testid={`missing-price-alert-${item.id}`}
		>
			<div className="flex items-start sm:items-center gap-2.5 min-w-0">
				<div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0">
					<AlertTriangle size={16} />
				</div>
				<div className="flex flex-col min-w-0">
					<div className="font-bold text-amber-900 dark:text-amber-200 leading-snug">
						Требуется ручная оценка: услуга не найдена в прайс-листе клиники (укажите цену)
					</div>
					<div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 truncate">
						{item.code804n ? `${item.code804n} · ` : ""}{item.name}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
				{isEditing ? (
					<div className="flex items-center gap-1.5">
						<div className="relative">
							<input
								ref={inputRef}
								type="number"
								min="0"
								step="100"
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
							<span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
								₽
							</span>
						</div>

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
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer transition-colors shadow-xs"
						data-testid={`full-price-edit-btn-${item.id}`}
					>
						<Coins size={13} />
						<span>Указать цену</span>
					</button>
				)}
			</div>

			{error && (
				<div className="w-full text-[11px] text-rose-600 font-bold sm:hidden">{error}</div>
			)}
		</div>
	);
};
