import type React from "react";
import { Edit3, Trash2 } from "lucide-react";
import { money } from "../../AppHelpers";
import { sliceDomList } from "../../utils/domVirtualizationHelper";

export interface SettingsPricesCategoryGroupProps {
	readonly category: string;
	readonly items: any[];
	readonly categoryLimits: Record<string, number>;
	readonly setCategoryLimits: React.Dispatch<
		React.SetStateAction<Record<string, number>>
	>;
	readonly serviceCategoryLabels: Record<string, string>;
	readonly specialtyLabels: Record<string, string>;
	readonly deletingServiceId: string | null;
	readonly onEditService: (item: any) => void;
	readonly onDeleteService: (id: string) => void;
}

export const SettingsPricesCategoryGroup: React.FC<
	SettingsPricesCategoryGroupProps
> = ({
	category,
	items,
	categoryLimits,
	setCategoryLimits,
	serviceCategoryLabels,
	specialtyLabels,
	deletingServiceId,
	onEditService,
	onDeleteService,
}) => {
	const currentLimit = categoryLimits[category] ?? 40;
	const listSlice = sliceDomList(items, currentLimit, 0);
	const visibleItems = listSlice.visibleItems;
	const hasMore = listSlice.hasMore;

	return (
		<div className="catalog-group">
			<h4 className="catalog-group-title">
				{serviceCategoryLabels[category] || category}
				<span className="catalog-group-count">{items.length}</span>
			</h4>
			<div className="catalog-items-grid">
				{visibleItems.map((item) => (
					<div
						className="catalog-item-card"
						key={item.id}
						style={{
							contentVisibility: "auto",
							containIntrinsicSize: "1px 64px",
							contain: "content",
						}}
					>
						<div className="catalog-item-info">
							<div className="catalog-item-code">
								{item.code || "Без кода"}
							</div>
							<div className="catalog-item-title">{item.title}</div>
							<div className="catalog-item-badges">
								<span>{specialtyLabels[item.specialty] || item.specialty}</span>
								{item.taxDeductible && (
									<span className="badge-tax">Вычет</span>
								)}
								{item.vatRate === "vat_20" ? (
									<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
										НДС 20%
									</span>
								) : (
									<span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
										Без НДС (ст.149)
									</span>
								)}
								{!item.isActive && (
									<span className="badge-inactive">Архив</span>
								)}
							</div>
						</div>
						<div className="catalog-item-actions">
							<div className="catalog-item-price">
								{money(item.basePriceRub ?? item.priceRub ?? 0)}
								<small>{item.durationMinutes} мин.</small>
							</div>
							<div
								style={{
									fontSize: "11px",
									color: "var(--muted)",
									textAlign: "right",
									marginTop: "4px",
									lineHeight: 1.2,
								}}
							>
								ЗП (25%):{" "}
								{money(
									(item.basePriceRub ?? item.priceRub ?? 0) * 0.25,
								)}
								<br />
								Маржа:{" "}
								{money(
									(item.basePriceRub ?? item.priceRub ?? 0) * 0.75,
								)}
							</div>
							<button
								type="button"
								className="icon-button"
								onClick={() => onEditService(item)}
								aria-label={`Редактировать услугу ${item.title}`}
							>
								<Edit3 size={16} />
							</button>
							<button
								type="button"
								className="icon-button danger"
								disabled={deletingServiceId === item.id}
								aria-busy={deletingServiceId === item.id}
								onClick={() => onDeleteService(item.id)}
								aria-label={`Удалить услугу ${item.title}`}
							>
								<Trash2 size={16} />
							</button>
						</div>
					</div>
				))}
			</div>
			{hasMore && (
				<div className="flex items-center justify-between p-2.5 my-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)]">
					<span>
						Показано {visibleItems.length} из {items.length} услуг
					</span>
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="secondary-button min-h-[32px] px-2.5 text-xs font-semibold rounded-lg cursor-pointer"
							onClick={() =>
								setCategoryLimits((prev) => ({
									...prev,
									[category]: (prev[category] ?? 40) + 40,
								}))
							}
						>
							Загрузить ещё 40
						</button>
						<button
							type="button"
							className="text-button min-h-[32px] px-2 text-xs text-[var(--teal)] font-medium hover:underline cursor-pointer"
							onClick={() =>
								setCategoryLimits((prev) => ({
									...prev,
									[category]: items.length,
								}))
							}
						>
							Все ({items.length})
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
