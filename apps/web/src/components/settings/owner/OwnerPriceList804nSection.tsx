/**
 * apps/web/src/components/settings/owner/OwnerPriceList804nSection.tsx
 *
 * Секция управления прейскурантом по Приказу Минздрава РФ № 804н для владельца клиники.
 * Фасад декомпозирован согласно Мандату 8b (строго <= 250 строк).
 *
 * Инварианты:
 * - Все финансовые расчеты строго в целочисленных копейках (integer kopecks).
 * - Ноль мультяшных эмодзи (строго Lucide иконки).
 * - Синхронизация изменений с БД через syncPricelistItemsToCatalog.
 */

import React, { useMemo, useState } from "react";
import { Coins, ShieldCheck } from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	formatKopecksToRublesDisplay,
	parseRublesToKopecks,
} from "@dental/shared";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { syncPricelistItemsToCatalog } from "../catalogSyncHelper";
import {
	type CustomServicePriceOverride,
	type ServiceWithMargin,
	type PriceListStats,
} from "./priceListModules/priceListTypes";
import { mergeAndCalculatePriceList } from "./priceListModules/priceListCatalogMerger";
import { PriceListSummaryStats } from "./priceListModules/PriceListSummaryStats";
import { PriceListCategoryFilter } from "./priceListModules/PriceListCategoryFilter";
import { PriceListItemRow } from "./priceListModules/PriceListItemRow";

export type { CustomServicePriceOverride };

export function OwnerPriceList804nSection() {
	// biome-ignore lint/suspicious/noExplicitAny: dynamic context access
	const appLogic = useOptionalAppLogicContext() as any;
	const liveCatalog = useMemo(
		() =>
			Array.isArray(appLogic?.dashboard?.serviceCatalog)
				? appLogic.dashboard.serviceCatalog
				: [],
		[appLogic?.dashboard?.serviceCatalog],
	);

	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [marginFilter, setMarginFilter] = useState<"all" | "high" | "low">("all");
	const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
	const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
	const [tempPriceInput, setTempPriceInput] = useState<string>("");

	// Вычисление эффективных цен и маржинальности с учетом живого каталога БД (service_catalog_items)
	const catalogItems: ServiceWithMargin[] = useMemo(
		() => mergeAndCalculatePriceList(liveCatalog, priceOverrides),
		[liveCatalog, priceOverrides],
	);

	// Фильтрация каталога
	const filteredCatalog = useMemo(() => {
		return catalogItems.filter((item) => {
			if (selectedCategory !== "all" && item.category !== selectedCategory) {
				return false;
			}
			if (marginFilter === "high" && item.marginPct < 70) {
				return false;
			}
			if (marginFilter === "low" && item.marginPct >= 50) {
				return false;
			}

			const q = searchQuery.trim().toLowerCase();
			if (!q) return true;

			return (
				item.code804n.toLowerCase().includes(q) ||
				item.commercialTitle.toLowerCase().includes(q) ||
				item.statutoryTitle804n.toLowerCase().includes(q) ||
				(item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
			);
		});
	}, [catalogItems, selectedCategory, marginFilter, searchQuery]);

	// Сводная статистика каталога
	const stats: PriceListStats = useMemo(() => {
		const totalServices = catalogItems.length;
		const totalValueKopecks = catalogItems.reduce((acc, i) => acc + i.effectivePriceKopecks, 0);
		const avgMarginPct =
			totalServices > 0
				? Math.round(
						(catalogItems.reduce((acc, i) => acc + i.marginPct, 0) / totalServices) * 10,
					) / 10
				: 0;
		const highMarginCount = catalogItems.filter((i) => i.marginPct >= 70).length;
		const lowMarginCount = catalogItems.filter((i) => i.marginPct < 50).length;

		return {
			totalServices,
			totalValueKopecks,
			avgMarginPct,
			highMarginCount,
			lowMarginCount,
		};
	}, [catalogItems]);

	const persistServicePriceToDatabase = (serviceId: string, nextKopecks: number) => {
		const target = catalogItems.find((item) => item.id === serviceId);
		if (!target) return;
		if (!appLogic?.createServiceCatalogItem && !appLogic?.updateServiceCatalogItem) return;
		const nextRub = Math.round(nextKopecks) / 100;
		void syncPricelistItemsToCatalog({
			items: [
				{
					...target,
					basePriceRub: nextRub,
					basePriceKopecks: nextKopecks,
				},
			],
			existingServices: liveCatalog,
			createServiceCatalogItem: appLogic.createServiceCatalogItem,
			updateServiceCatalogItem: appLogic.updateServiceCatalogItem,
		});
	};

	const handleStartEdit = (serviceId: string, currentKopecks: number) => {
		setEditingServiceId(serviceId);
		setTempPriceInput((currentKopecks / 100).toFixed(0));
	};

	const handleSavePrice = (serviceId: string) => {
		const kopecks = parseRublesToKopecks(tempPriceInput);
		if (kopecks <= 0) {
			showToast("Цена услуги должна быть больше 0 руб", "error");
			return;
		}
		setPriceOverrides((prev) => ({ ...prev, [serviceId]: kopecks }));
		setEditingServiceId(null);
		persistServicePriceToDatabase(serviceId, kopecks);
		showToast(`Цена обновлена: ${formatKopecksToRublesDisplay(kopecks)}`, "success");
	};

	const handleResetOverrides = () => {
		setPriceOverrides({});
		showToast("Цены сброшены к базовому прейскуранту услуг", "info");
	};

	const handleCopyCode = (code: string) => {
		navigator.clipboard.writeText(code);
		showToast(`Код услуги «${code}» скопирован`, "success");
	};

	return (
		<section className="settings-section" data-testid="owner-pricelist-804n-section">
			{/* Шапка раздела */}
			<div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)]">
						<Coins size={18} />
					</div>
					<div>
						<h3 className="m-0 text-base font-bold text-[var(--ink)]">
							Прейскурант услуг и калькуляция маржинальности
						</h3>
						<p className="m-0 text-xs text-[var(--muted)]">
							Номенклатура медицинских услуг. Прозрачный учет себестоимости материалов и лаборатории ЗТЛ.
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{Object.keys(priceOverrides).length > 0 && (
						<button
							type="button"
							onClick={handleResetOverrides}
							className="secondary-button text-xs py-1 px-2.5 min-h-[32px] cursor-pointer"
						>
							Сбросить правки ({Object.keys(priceOverrides).length})
						</button>
					)}
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
						<ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
						Без НДС (Медицинские услуги)
					</span>
				</div>
			</div>

			{/* Сводная финансовая панель */}
			<PriceListSummaryStats stats={stats} />

			{/* Фильтры и поиск */}
			<PriceListCategoryFilter
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				marginFilter={marginFilter}
				onMarginFilterChange={setMarginFilter}
				selectedCategory={selectedCategory}
				onCategoryChange={setSelectedCategory}
			/>

			{/* Таблица / список услуг с прозрачной маржинальностью */}
			<div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)]">
				<div className="hidden sm:grid grid-cols-12 gap-2 p-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] text-[11px] font-bold text-[var(--muted)]">
					<div className="col-span-2">Код услуги</div>
					<div className="col-span-4">Услуга / Номенклатура</div>
					<div className="col-span-2 text-right">Розница (пациент)</div>
					<div className="col-span-2 text-right">Материалы + ЗТЛ</div>
					<div className="col-span-2 text-right">Маржа клиники</div>
				</div>

				<div className="divide-y divide-[var(--line)] max-h-[500px] overflow-y-auto">
					{filteredCatalog.length === 0 ? (
						<div className="p-8 text-center text-xs text-[var(--muted)]">
							Позиций по заданным критериям не найдено.
						</div>
					) : (
						filteredCatalog.map((service) => (
							<PriceListItemRow
								key={service.id}
								service={service}
								isEditing={editingServiceId === service.id}
								tempPriceInput={tempPriceInput}
								hasCustomPrice={priceOverrides[service.id] !== undefined}
								onStartEdit={handleStartEdit}
								onSavePrice={handleSavePrice}
								onTempPriceChange={setTempPriceInput}
								onCopyCode={handleCopyCode}
							/>
						))
					)}
				</div>
			</div>
		</section>
	);
}
