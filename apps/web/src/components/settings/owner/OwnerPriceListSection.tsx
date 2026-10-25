/**
 * apps/web/src/components/settings/owner/OwnerPriceListSection.tsx
 *
 * Секция управления прейскурантом услуг для владельца клиники.
 * Фасад декомпозирован согласно Мандату 8b (строго <= 80 строк).
 *
 * Инварианты:
 * - Все финансовые расчеты строго в целочисленных копейках (integer kopecks).
 * - Ноль мультяшных эмодзи (строго Lucide иконки).
 * - Синхронизация изменений с БД через syncPricelistItemsToCatalog.
 */

import React from "react";
import { type CustomServicePriceOverride } from "./priceListModules/priceListTypes";
import { useOwnerPriceList } from "./priceListModules/useOwnerPriceList";
import { OwnerPriceListHeader } from "./priceListModules/OwnerPriceListHeader";
import { PriceListSummaryStats } from "./priceListModules/PriceListSummaryStats";
import { PriceListCategoryFilter } from "./priceListModules/PriceListCategoryFilter";
import { OwnerPriceListTable } from "./priceListModules/OwnerPriceListTable";

export type { CustomServicePriceOverride };

export function OwnerPriceListSection() {
	const state = useOwnerPriceList();

	return (
		<section className="settings-section" data-testid="owner-pricelist-section">
			{/* Шапка раздела */}
			<OwnerPriceListHeader
				overridesCount={Object.keys(state.priceOverrides).length}
				onResetOverrides={state.handleResetOverrides}
			/>

			{/* Сводная финансовая панель */}
			<PriceListSummaryStats stats={state.stats} />

			{/* Фильтры и поиск */}
			<PriceListCategoryFilter
				searchQuery={state.searchQuery}
				onSearchChange={state.setSearchQuery}
				marginFilter={state.marginFilter}
				onMarginFilterChange={state.setMarginFilter}
				selectedCategory={state.selectedCategory}
				onCategoryChange={state.setSelectedCategory}
			/>

			{/* Таблица услуг с прозрачной маржинальностью */}
			<OwnerPriceListTable
				items={state.filteredCatalog}
				editingServiceId={state.editingServiceId}
				tempPriceInput={state.tempPriceInput}
				priceOverrides={state.priceOverrides}
				onStartEdit={state.handleStartEdit}
				onSavePrice={state.handleSavePrice}
				onTempPriceChange={state.setTempPriceInput}
				onCopyCode={state.handleCopyCode}
			/>
		</section>
	);
}

// Семантический алиас для обратной совместимости
export const OwnerPriceList804nSection = OwnerPriceListSection;
