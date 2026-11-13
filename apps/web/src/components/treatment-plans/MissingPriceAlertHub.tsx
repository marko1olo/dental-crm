/**
 * MissingPriceAlertHub.tsx — Единый канонический SSOT модуль инлайн-оценки стоимости услуг.
 * Ликвидирован циклический микро-шредер и круговые зависимости (Мандат 8b, Мандат 8am).
 * Спокойный вид без кричащих красных баннеров (Мандат 8e).
 * Валидация целочисленных копеек (amountKopecks) без float-погрешностей.
 */

import React, { useMemo } from "react";
import { Coins, Check, X, Edit3, PackageCheck, ShieldCheck } from "lucide-react";
import type { TreatmentPlanItem } from "./types";
import { useMissingPriceAlert } from "./useMissingPriceAlert";
import { DENTAL_SERVICES_CATALOG } from "./treatmentPlanServicesCatalog";
import { createPriceUpdatedPlanItem } from "./missingPriceItemUtils";
import { MissingPriceInlineEditor, type MissingPriceInlineEditorProps } from "./MissingPriceInlineEditor";

export type { MissingPriceInlineEditorProps };

export interface MissingPriceAlertProps {
	readonly item: TreatmentPlanItem;
	readonly onUpdatePrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: TreatmentPlanItem) => void) | undefined;
	readonly onKeepAgreedPrice?: ((itemId: string) => void) | undefined;
	readonly onApplyBundleBasePrice?: ((itemId: string, basePriceRub: number) => void) | undefined;
	readonly bundleBasePriceRub?: number | undefined;
	readonly variant?: "full" | "banner" | "inline" | "compact" | undefined;
	readonly className?: string | undefined;
}

export interface MissingPriceBannerAlertProps {
	readonly item: TreatmentPlanItem;
	readonly state: ReturnType<typeof useMissingPriceAlert>;
	readonly basePrice?: number | undefined;
	readonly onApplyBasePrice?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export interface MissingPriceBannerActionsProps {
	readonly item: TreatmentPlanItem;
	readonly state: ReturnType<typeof useMissingPriceAlert>;
	readonly basePrice?: number | undefined;
	readonly onApplyBasePrice?: (() => void) | undefined;
}

export interface MissingPriceBannerActionButtonsProps {
	readonly item: TreatmentPlanItem;
	readonly state: ReturnType<typeof useMissingPriceAlert>;
	readonly basePrice?: number | undefined;
	readonly onApplyBasePrice?: (() => void) | undefined;
}

export interface MissingPriceBannerEditingActionsProps {
	readonly itemId: string;
	readonly state: ReturnType<typeof useMissingPriceAlert>;
}

export interface MissingPriceInlineAlertProps {
	readonly item: TreatmentPlanItem;
	readonly state: ReturnType<typeof useMissingPriceAlert>;
	readonly basePrice?: number | undefined;
	readonly onApplyBasePrice?: (() => void) | undefined;
	readonly className?: string | undefined;
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

export const MissingPriceBannerActionButtons: React.FC<MissingPriceBannerActionButtonsProps> = ({
	item,
	state,
	basePrice,
	onApplyBasePrice,
}) => {
	const { setIsEditing, handleSetWarrantyZeroPrice, handleKeepAgreedPrice } = state;

	return (
		<div className="flex items-center gap-1.5 flex-wrap">
			<button
				type="button"
				onClick={() => setIsEditing(true)}
				className="secondary-button dente-btn dente-btn-secondary h-8 px-2.5 rounded-xl text-xs font-semibold text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] border border-[var(--line)] cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
				data-testid={`full-price-edit-btn-${item.id}`}
				title="Указать договорную стоимость услуги"
			>
				<Coins size={13} className="text-[var(--teal,#0d9488)]" />
				<span>Указать цену</span>
			</button>

			{Boolean(basePrice && basePrice > 0 && onApplyBasePrice) && (
				<button
					type="button"
					onClick={onApplyBasePrice}
					className="secondary-button dente-btn dente-btn-secondary h-8 px-2.5 rounded-xl text-xs font-semibold text-[var(--teal-dark,var(--teal))] bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 border border-[var(--teal)]/30 cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
					data-testid={`full-base-price-btn-${item.id}`}
					title={`Применить базовую цену из каталога (${(basePrice ?? 0).toLocaleString("ru-RU")} ₽)`}
				>
					<PackageCheck size={13} />
					<span>Базовая {(basePrice ?? 0).toLocaleString("ru-RU")} ₽</span>
				</button>
			)}

			<button
				type="button"
				onClick={handleSetWarrantyZeroPrice}
				className="secondary-button dente-btn dente-btn-secondary h-8 px-2.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
				data-testid={`full-warranty-btn-${item.id}`}
				title="Гарантийная процедура (0 ₽)"
			>
				<ShieldCheck size={13} />
				<span>Гарантия 0 ₽</span>
			</button>

			{Boolean(item.isArchivedInCatalog || item.priceRub > 0) && (
				<button
					type="button"
					onClick={handleKeepAgreedPrice}
					className="secondary-button dente-btn dente-btn-secondary h-8 px-2.5 rounded-xl text-xs font-semibold text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] border border-[var(--line)] cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
					data-testid={`full-keep-agreed-btn-${item.id}`}
					title="Сохранить согласованную цену"
				>
					<Check size={13} />
					<span>По плану</span>
				</button>
			)}
		</div>
	);
};

export const MissingPriceBannerActions: React.FC<MissingPriceBannerActionsProps> = ({
	item,
	state,
	basePrice,
	onApplyBasePrice,
}) => {
	return (
		<div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
			{state.isEditing ? (
				<MissingPriceBannerEditingActions itemId={item.id} state={state} />
			) : (
				<MissingPriceBannerActionButtons
					item={item}
					state={state}
					basePrice={basePrice}
					onApplyBasePrice={onApplyBasePrice}
				/>
			)}
		</div>
	);
};

export const MissingPriceBannerAlert: React.FC<MissingPriceBannerAlertProps> = ({
	item,
	state,
	basePrice,
	onApplyBasePrice,
	className = "",
}) => {
	const { error } = state;
	const displayCode = item.serviceCode || item.code804n;

	return (
		<div
			className={`missing-price-alert-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl border bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] text-xs transition-all shadow-2xs ${className}`.trim()}
			data-testid={`missing-price-alert-${item.id}`}
		>
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="p-1.5 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] shrink-0">
					<Coins size={15} />
				</div>
				<div className="flex flex-col min-w-0">
					<div className="font-semibold text-[var(--ink)] leading-snug">
						Индивидуальная цена услуги
					</div>
					<div className="text-[11px] text-[var(--muted,#64748b)] truncate">
						{displayCode ? `${displayCode} · ` : ""}{item.name}
					</div>
				</div>
			</div>

			<MissingPriceBannerActions
				item={item}
				state={state}
				basePrice={basePrice}
				onApplyBasePrice={onApplyBasePrice}
			/>

			{error && (
				<div className="w-full text-[11px] text-rose-600 font-bold sm:hidden">{error}</div>
			)}
		</div>
	);
};

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
						title="Ввести цену вручную"
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

export const MissingPriceAlert: React.FC<MissingPriceAlertProps> = ({
	item,
	onUpdatePrice,
	onUpdateItem,
	onKeepAgreedPrice,
	onApplyBundleBasePrice,
	bundleBasePriceRub,
	variant = "inline",
	className = "",
}) => {
	const state = useMissingPriceAlert({
		item,
		onUpdatePrice,
		onUpdateItem,
		onKeepAgreedPrice,
	});

	const resolvedBasePrice = useMemo(() => {
		if (bundleBasePriceRub && bundleBasePriceRub > 0) return bundleBasePriceRub;
		if (item.unitPriceRub && item.unitPriceRub > 0) return item.unitPriceRub;
		if (item.currentCatalogPriceRub && item.currentCatalogPriceRub > 0) return item.currentCatalogPriceRub;
		const catalogCode = item.serviceCode || item.code804n;
		if (catalogCode && DENTAL_SERVICES_CATALOG[catalogCode]) {
			return DENTAL_SERVICES_CATALOG[catalogCode]!.defaultPriceRub;
		}
		return undefined;
	}, [bundleBasePriceRub, item.unitPriceRub, item.currentCatalogPriceRub, item.serviceCode, item.code804n]);

	const handleApplyBasePrice = () => {
		if (!resolvedBasePrice || resolvedBasePrice <= 0) return;
		state.setError(null);
		state.setIsEditing(false);
		if (onApplyBundleBasePrice) {
			onApplyBundleBasePrice(item.id, resolvedBasePrice);
		} else if (onUpdatePrice) {
			onUpdatePrice(item.id, resolvedBasePrice);
		}
		if (onUpdateItem) {
			onUpdateItem(createPriceUpdatedPlanItem(item, resolvedBasePrice));
		}
	};

	if (!state.isMissingPrice && !state.isEditing) {
		return null;
	}

	if (variant === "compact" || variant === "inline") {
		return (
			<MissingPriceInlineAlert
				item={item}
				state={state}
				basePrice={resolvedBasePrice}
				onApplyBasePrice={resolvedBasePrice ? handleApplyBasePrice : undefined}
				className={className}
			/>
		);
	}

	return (
		<MissingPriceBannerAlert
			item={item}
			state={state}
			basePrice={resolvedBasePrice}
			onApplyBasePrice={resolvedBasePrice ? handleApplyBasePrice : undefined}
			className={className}
		/>
	);
};

export const MissingPriceAlertHub: React.FC<MissingPriceAlertProps> = (props) => {
	return <MissingPriceAlert {...props} />;
};

export default MissingPriceAlertHub;
