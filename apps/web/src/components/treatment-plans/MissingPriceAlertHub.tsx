/**
 * MissingPriceAlertHub.tsx — Единый консолидированный хаб предупреждений и ручной оценки услуг
 * с отсутствующей ценой в прайс-листе клиники (Мандат 8e: Автономия врача, Мандат 8n: Соло-практика).
 *
 * Консолидирует функционал 5 ранее разрозненных компонентов:
 * 1. MissingPriceAlert (фасад и роутер режимов banner / inline / compact)
 * 2. MissingPriceBannerAlert (полноразмерный информативный баннер)
 * 3. MissingPriceBannerActions (кнопки быстрых действий: ввод цены, гарантия 0 ₽, согласованная цена, базовая цена пакета)
 * 4. MissingPriceInlineAlert (компактная инлайн-плашка в строке процедуры)
 * 5. MissingPriceInlineEditor (быстрый инлайн-редактор цены прямо по месту)
 *
 * Врач у кресла в 1 клик может:
 * - Указать договорную стоимость по месту без открытия модальных тупиков;
 * - Оформить 100% гарантийную переделку (0 ₽);
 * - Применить базовую стоимость из пакета «под ключ» или каталога;
 * - Сохранить ранее согласованную цену плана при изменении каталога.
 */

import React, { useMemo } from "react";
import {
	AlertTriangle,
	Check,
	Coins,
	Edit3,
	PackageCheck,
	ShieldCheck,
	X,
} from "lucide-react";
import type { TreatmentPlanItem } from "./types";
import { useMissingPriceAlert } from "./useMissingPriceAlert";
import { createPriceUpdatedPlanItem } from "./missingPriceItemUtils";
import { DENTAL_SERVICES_CATALOG } from "./treatmentPlanServicesCatalog";

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

export interface MissingPriceInlineAlertProps {
	readonly item: TreatmentPlanItem;
	readonly state: ReturnType<typeof useMissingPriceAlert>;
	readonly basePrice?: number | undefined;
	readonly onApplyBasePrice?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export interface MissingPriceInlineEditorProps {
	readonly itemId: string;
	readonly inputRef: React.RefObject<HTMLInputElement | null>;
	readonly inputPrice: string;
	readonly setInputPrice: (val: string) => void;
	readonly error: string | null;
	readonly setError: (err: string | null) => void;
	readonly handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	readonly handleSavePrice: () => void;
	readonly setIsEditing: (isEditing: boolean) => void;
}

/**
 * 1. MissingPriceInlineEditor — компактный редактор ввода цены по месту
 */
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

/**
 * 2. MissingPriceBannerActions — панель действий для баннерного режима
 */
export const MissingPriceBannerActions: React.FC<MissingPriceBannerActionsProps> = ({
	item,
	state,
	basePrice,
	onApplyBasePrice,
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
		<div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
			{isEditing ? (
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
							data-testid={`full-price-input-${item.id}`}
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
						className="min-h-[34px] p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer flex items-center justify-center transition-colors"
						data-testid={`full-price-cancel-btn-${item.id}`}
						title="Отмена"
					>
						<X size={14} />
					</button>
				</div>
			) : (
				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="min-h-[34px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer transition-colors shadow-xs active:scale-98"
						data-testid={`full-price-edit-btn-${item.id}`}
						title="Указать договорную стоимость услуги"
					>
						<Coins size={13} />
						<span>Указать цену</span>
					</button>

					{Boolean(basePrice && basePrice > 0 && onApplyBasePrice) && (
						<button
							type="button"
							onClick={onApplyBasePrice}
							className="min-h-[34px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer transition-colors shadow-xs active:scale-98"
							data-testid={`full-base-price-btn-${item.id}`}
							title={`Применить базовую цену из пакета/каталога (${(basePrice ?? 0).toLocaleString("ru-RU")} ₽)`}
						>
							<PackageCheck size={13} />
							<span>Базовая {(basePrice ?? 0).toLocaleString("ru-RU")} ₽</span>
						</button>
					)}

					<button
						type="button"
						onClick={handleSetWarrantyZeroPrice}
						className="min-h-[34px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors shadow-xs active:scale-98"
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
							className="min-h-[34px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-colors shadow-xs active:scale-98"
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

/**
 * 3. MissingPriceBannerAlert — полноразмерный баннер для карточки плана
 */
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

/**
 * 4. MissingPriceInlineAlert — компактная плашка для отображения в строках услуг
 */
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
			className={`missing-price-alert-inline inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-colors ${
				isMissingPrice
					? "bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/30"
					: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
			} ${className}`.trim()}
			data-testid={`missing-price-alert-${item.id}`}
		>
			<AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />

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
					<span className="font-semibold text-amber-800 dark:text-amber-300">
						Требуется ручная оценка
					</span>
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="min-h-[26px] inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white hover:bg-amber-700 cursor-pointer transition-colors shadow-xs active:scale-98"
						data-testid={`inline-price-edit-btn-${item.id}`}
						title="Ввести договорную стоимость услуги"
					>
						<Edit3 size={10} />
						<span>Указать цену</span>
					</button>

					{Boolean(basePrice && basePrice > 0 && onApplyBasePrice) && (
						<button
							type="button"
							onClick={onApplyBasePrice}
							className="min-h-[26px] inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-600 text-white hover:bg-sky-700 cursor-pointer transition-colors shadow-xs active:scale-98"
							data-testid={`inline-base-price-btn-${item.id}`}
							title={`Применить базовую цену из пакета/каталога (${(basePrice ?? 0).toLocaleString("ru-RU")} ₽)`}
						>
							<PackageCheck size={10} />
							<span>Базовая {(basePrice ?? 0).toLocaleString("ru-RU")} ₽</span>
						</button>
					)}

					<button
						type="button"
						onClick={handleSetWarrantyZeroPrice}
						className="min-h-[26px] inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-colors shadow-xs active:scale-98"
						data-testid={`inline-warranty-btn-${item.id}`}
						title="Гарантийная переделка (0 ₽)"
					>
						<ShieldCheck size={10} />
						<span>Гарантия 0 ₽</span>
					</button>

					{Boolean(item.isArchivedInCatalog || item.priceRub > 0) && (
						<button
							type="button"
							onClick={handleKeepAgreedPrice}
							className="min-h-[26px] inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-600 text-white hover:bg-teal-700 cursor-pointer transition-colors shadow-xs active:scale-98"
							data-testid={`inline-keep-agreed-btn-${item.id}`}
							title="Выполнить по согласованной цене плана"
						>
							<Check size={10} />
							<span>По плану</span>
						</button>
					)}
				</div>
			)}

			{error && (
				<span className="text-[10px] text-rose-600 font-bold ml-1">{error}</span>
			)}
		</div>
	);
};

/**
 * 5. MissingPriceAlertHub — Главный объединенный компонент (Мандаты 8e, 8n)
 */
export const MissingPriceAlertHub: React.FC<MissingPriceAlertProps> = ({
	item,
	onUpdatePrice,
	onUpdateItem,
	onKeepAgreedPrice,
	onApplyBundleBasePrice,
	bundleBasePriceRub,
	variant = "full",
	className = "",
}) => {
	const state = useMissingPriceAlert({
		item,
		onUpdatePrice,
		onUpdateItem,
		onKeepAgreedPrice,
	});

	// Вычисляем базовую стоимость услуги из каталога или переданного пакета
	const resolvedBasePrice = useMemo(() => {
		if (bundleBasePriceRub && bundleBasePriceRub > 0) {
			return bundleBasePriceRub;
		}
		if (item.unitPriceRub && item.unitPriceRub > 0) {
			return item.unitPriceRub;
		}
		if (item.currentCatalogPriceRub && item.currentCatalogPriceRub > 0) {
			return item.currentCatalogPriceRub;
		}
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

export default MissingPriceAlertHub;
