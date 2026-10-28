/**
 * MissingPriceInlineAlert.tsx — Спокойный инлайн-редактор договорной цены услуги.
 * Никаких панических красных баннеров (Мандат 8e, Мандат 8am).
 */

import React from "react";
import { Coins, Edit3, PackageCheck, ShieldCheck, Check } from "lucide-react";
import { MissingPriceInlineEditor } from "./MissingPriceInlineEditor";
import type { MissingPriceInlineAlertProps } from "./missingPriceHub/types";

export const MissingPriceInlineAlert: React.FC<MissingPriceInlineAlertProps> = ({
	item,
	state,
	basePrice,
	onApplyBasePrice,
	className = "",
}) => {
	const {
		isEditing,
		setIsEditing,
		inputPrice,
		setInputPrice,
		error,
		setError,
		inputRef,
		isMissingPrice,
		handleSetWarrantyZeroPrice,
		handleKeepAgreedPrice,
		handleSavePrice,
		handleKeyDown,
	} = state;

	return (
		<div
			className={`missing-price-alert-inline inline-flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] shadow-2xs ${className}`.trim()}
			data-testid={`missing-price-alert-${item.id}`}
		>
			<Coins size={14} className="text-[var(--teal,#0d9488)] shrink-0" />

			{isEditing ? (
				<MissingPriceInlineEditor
					itemId={item.id}
					inputRef={inputRef}
					inputPrice={inputPrice}
					setInputPrice={setInputPrice}
					error={error}
					setError={setError}
					handleKeyDown={handleKeyDown}
					handleSavePrice={handleSavePrice}
					setIsEditing={setIsEditing}
				/>
			) : (
				<div className="inline-flex items-center gap-1.5 flex-wrap">
					<span className="text-[11px] font-semibold text-[var(--muted,#64748b)]">
						Индивидуальная цена:
					</span>

					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="secondary-button dente-btn dente-btn-secondary h-7 px-2.5 rounded-lg text-[11px] font-semibold text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] border border-[var(--line)] cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
						data-testid={`inline-price-edit-btn-${item.id}`}
						title="Ввести цену вручную в 1 клик"
					>
						<Edit3 size={11} className="text-[var(--teal,#0d9488)]" />
						<span>Указать цену</span>
					</button>

					{Boolean(basePrice && basePrice > 0 && onApplyBasePrice) && (
						<button
							type="button"
							onClick={onApplyBasePrice}
							className="secondary-button dente-btn dente-btn-secondary h-7 px-2 rounded-lg text-[11px] font-semibold text-[var(--teal-dark,var(--teal))] bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 border border-[var(--teal)]/30 cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
							data-testid={`inline-base-price-btn-${item.id}`}
							title={`Применить базовую цену каталога (${(basePrice ?? 0).toLocaleString("ru-RU")} ₽)`}
						>
							<PackageCheck size={11} />
							<span>Базовая {(basePrice ?? 0).toLocaleString("ru-RU")} ₽</span>
						</button>
					)}

					<button
						type="button"
						onClick={handleSetWarrantyZeroPrice}
						className="secondary-button dente-btn dente-btn-secondary h-7 px-2 rounded-lg text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
						data-testid={`inline-warranty-btn-${item.id}`}
						title="Гарантийный случай: бесплатная процедура (0 ₽)"
					>
						<ShieldCheck size={11} />
						<span>Гарантия 0 ₽</span>
					</button>

					{Boolean(item.isArchivedInCatalog || item.priceRub > 0) && (
						<button
							type="button"
							onClick={handleKeepAgreedPrice}
							className="secondary-button dente-btn dente-btn-secondary h-7 px-2 rounded-lg text-[11px] font-semibold text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] border border-[var(--line)] cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
							data-testid={`inline-keep-agreed-btn-${item.id}`}
							title="Зафиксировать согласованную цену"
						>
							<Check size={11} />
							<span>По плану</span>
						</button>
					)}
				</div>
			)}

			{error && (
				<span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold ml-1">{error}</span>
			)}
		</div>
	);
};

export default MissingPriceInlineAlert;
