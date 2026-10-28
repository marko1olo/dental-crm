import React from "react";
import { Check, Coins, PackageCheck, ShieldCheck } from "lucide-react";
import type { TreatmentPlanItem } from "../types";
import type { useMissingPriceAlert } from "../useMissingPriceAlert";

export interface MissingPriceBannerActionButtonsProps {
	readonly item: TreatmentPlanItem;
	readonly state: ReturnType<typeof useMissingPriceAlert>;
	readonly basePrice?: number | undefined;
	readonly onApplyBasePrice?: (() => void) | undefined;
}

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

export default MissingPriceBannerActionButtons;
