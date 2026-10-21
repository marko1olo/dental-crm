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
	);
};
