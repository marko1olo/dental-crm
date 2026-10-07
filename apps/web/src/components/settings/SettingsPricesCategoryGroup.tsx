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

const CATEGORY_FALLBACK_LABELS: Record<string, string> = {
	anesthesia: "Анестезия",
	orthopedics: "Ортопедия",
	prosthetics: "Ортопедия",
	therapy: "Терапия",
	surgery: "Хирургия",
	consultation: "Консультация",
	orthodontics: "Ортодонтия",
	periodontology: "Пародонтология",
	hygiene: "Гигиена",
	imaging: "Снимки / Диагностика",
	diagnostics: "Диагностика",
	pediatric: "Детская стоматология",
	prevention: "Профилактика",
	documents: "Документы",
	materials: "Материалы",
	lab: "Зуботехническая лаборатория",
	other: "Прочее",
	all: "Все категории",
};

const SPECIALTY_FALLBACK_LABELS: Record<string, string> = {
	therapist: "Терапия",
	orthopedist: "Ортопедия",
	surgeon: "Хирургия",
	orthodontist: "Ортодонтия",
	periodontist: "Пародонтология",
	hygienist: "Гигиена",
	pediatric: "Детская",
	implantologist: "Имплантация",
	radiologist: "Рентген",
	universal: "Универсально",
	all: "Все специальности",
};

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

	const categoryKey = (category || "").toLowerCase();
	const categoryTitle =
		serviceCategoryLabels[category] ||
		serviceCategoryLabels[categoryKey] ||
		CATEGORY_FALLBACK_LABELS[categoryKey] ||
		category;

	return (
		<div className="catalog-group">
			<h4 className="catalog-group-title">
				{categoryTitle}
				<span className="catalog-group-count">{items.length}</span>
			</h4>
			<div className="catalog-items-grid">
				{visibleItems.map((item) => (
					<div
						className="catalog-item-card flex flex-col justify-between gap-2.5"
						key={item.id}
						style={{
							contentVisibility: "auto",
							containIntrinsicSize: "1px 110px",
							contain: "content",
						}}
					>
						{/* Top: Code on Left, Price on Right */}
						<div className="flex items-center justify-between gap-2">
							<div className="catalog-item-code">
								{item.code || "Без кода"}
							</div>
							<div className="text-right flex items-baseline gap-1.5 shrink-0">
								<span className="font-bold font-mono text-[var(--ink)] text-sm">
									{money(item.basePriceRub ?? item.priceRub ?? 0)}
								</span>
								{item.durationMinutes ? (
									<span className="text-xs font-medium text-[var(--muted)]">
										{item.durationMinutes} мин.
									</span>
								) : null}
							</div>
						</div>

						{/* Middle: Title & Badges */}
						<div className="space-y-1.5 flex-1 min-w-0">
							<div className="catalog-item-title leading-snug">{item.title}</div>
							<div className="catalog-item-badges">
								<span>
									{specialtyLabels[item.specialty] ||
										(item.specialty
											? specialtyLabels[item.specialty.toLowerCase()] ||
												SPECIALTY_FALLBACK_LABELS[item.specialty.toLowerCase()] ||
												item.specialty
											: "")}
								</span>
								{item.taxDeductible && (
									<span className="badge-tax">Вычет</span>
								)}
								{item.vatRate === "vat_20" ? (
									<span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
										НДС 20%
									</span>
								) : (
									<span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
										Без НДС (ст.149)
									</span>
								)}
								{!item.isActive && (
									<span className="badge-inactive">Архив</span>
								)}
							</div>
						</div>

						{/* Bottom: Economics & Actions */}
						<div className="pt-2 border-t border-[var(--line)] flex items-center justify-between gap-2">
							<div className="text-xs text-[var(--muted)] font-mono leading-tight">
								ЗП (25%): {money((item.basePriceRub ?? item.priceRub ?? 0) * 0.25)} · Маржа: {money((item.basePriceRub ?? item.priceRub ?? 0) * 0.75)}
							</div>
							<div className="flex items-center gap-1 shrink-0">
								<button
									type="button"
									className="icon-button"
									onClick={() => onEditService(item)}
									aria-label={`Редактировать услугу ${item.title}`}
								>
									<Edit3 size={15} />
								</button>
								<button
									type="button"
									className="icon-button danger"
									disabled={deletingServiceId === item.id}
									aria-busy={deletingServiceId === item.id}
									onClick={() => onDeleteService(item.id)}
									aria-label={`Удалить услугу ${item.title}`}
								>
									<Trash2 size={15} />
								</button>
							</div>
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
							className="secondary-button h-8 min-h-[32px] px-2.5 text-xs font-semibold rounded-lg cursor-pointer"
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
							className="secondary-button h-8 min-h-[32px] px-2.5 text-xs font-semibold rounded-lg text-[var(--teal)] cursor-pointer"
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
