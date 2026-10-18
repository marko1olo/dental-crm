import React from "react";
import { Archive, Check, RefreshCw } from "lucide-react";
import type { TreatmentPlanItem } from "../types";

export interface StageItemArchivedAlertProps {
	readonly item: TreatmentPlanItem;
	readonly catalogPrice?: number | undefined;
	readonly onKeepAgreedPrice?: ((itemId: string) => void) | undefined;
	readonly onReplaceWithCatalogItem?: ((itemId: string, newCatalogPriceRub?: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: TreatmentPlanItem) => void) | undefined;
}

export const StageItemArchivedAlert: React.FC<StageItemArchivedAlertProps> = ({
	item,
	catalogPrice,
	onKeepAgreedPrice,
	onReplaceWithCatalogItem,
	onUpdateItem,
}) => {
	const handleKeepAgreedPrice = () => {
		onKeepAgreedPrice?.(item.id);
		if (onUpdateItem) {
			onUpdateItem({
				...item,
				isPriceLocked: true,
				isArchivedInCatalog: true,
				archivedResolution: "keep_agreed_price",
				requiresManualPricing: false,
			});
		}
	};

	const handleReplaceWithCatalog = () => {
		onReplaceWithCatalogItem?.(item.id, catalogPrice);
		if (onUpdateItem && catalogPrice !== undefined) {
			onUpdateItem({
				...item,
				priceRub: catalogPrice,
				unitPriceRub: catalogPrice,
				isArchivedInCatalog: false,
				archivedResolution: "replace_from_catalog",
				requiresManualPricing: false,
			});
		}
	};

	return (
		<div
			className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100 text-xs mt-1"
			data-testid={`archived-service-alert-${item.id}`}
		>
			<div className="flex items-center gap-2 min-w-0">
				<Archive size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
				<div className="min-w-0">
					<span className="font-bold text-amber-900 dark:text-amber-200 block">
						Услуга архивирована в каталоге
					</span>
					<span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 truncate block">
						Позиция выведена из действующего прайса клиники. План лечения доступен.
					</span>
				</div>
			</div>

			<div className="flex items-center gap-1.5 shrink-0 flex-wrap">
				<button
					type="button"
					onClick={handleKeepAgreedPrice}
					className="h-7 min-h-[28px] max-h-[28px] px-2.5 py-1 rounded-md text-[11px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 cursor-pointer transition-colors shrink-0 flex items-center gap-1"
					title="Выполнить процедуру по согласованной цене плана без изменения сметы"
					data-testid={`keep-agreed-price-btn-${item.id}`}
				>
					<Check size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Выполнить по согласованной цене</span>
				</button>

				<button
					type="button"
					onClick={handleReplaceWithCatalog}
					className="h-7 min-h-[28px] max-h-[28px] px-2.5 py-1 rounded-md text-[11px] font-bold text-teal-800 dark:text-teal-200 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 cursor-pointer transition-colors shrink-0 flex items-center gap-1"
					title="Заменить процедуру на актуальную услугу из прайс-листа клиники"
					data-testid={`replace-from-catalog-btn-${item.id}`}
				>
					<RefreshCw size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Заменить на актуальную из прайса</span>
				</button>
			</div>
		</div>
	);
};
