/**
 * apps/web/src/components/settings/mobile/MobileSettingsPricesView.tsx
 *
 * Dedicated Mobile Pricelist View compliant with Apple HIG.
 * Layer 5: Canonical Facade <= 100 lines.
 */

import React, { useState, useMemo } from "react";
import type { ServiceCatalogItem } from "@dental/shared";
import { MobilePriceDrawer } from "./MobilePriceDrawer";
import { ServicePricelistManagerModal } from "../../catalog/pricelist/ServicePricelistManagerModal";
import { MobilePricesTopBar } from "./MobilePricesTopBar";
import { MobilePricesSearchFilterBar } from "./MobilePricesSearchFilterBar";
import { MobilePricesList } from "./MobilePricesList";
import { MobilePricesEmptyState } from "./MobilePricesEmptyState";
import { MobilePricesFloatingBottomBar } from "./MobilePricesFloatingBottomBar";
import { useMobilePricesActions } from "./useMobilePricesActions";

export interface MobileSettingsPricesViewProps {
	// biome-ignore lint/suspicious/noExplicitAny: app logic props bag
	readonly appLogic: Record<string, any>;
	readonly onBackToSettings: () => void;
}

export const MobileSettingsPricesView: React.FC<MobileSettingsPricesViewProps> = ({
	appLogic, onBackToSettings,
}) => {
	const { dashboard, serviceCategoryLabels = {}, specialtyLabels = {} } = appLogic;
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [isServicePricelistModalOpen, setIsServicePricelistModalOpen] = useState(false);
	const [editingService, setEditingService] = useState<any | null>(null);

	const rawCatalog = (dashboard?.serviceCatalog ?? []) as ServiceCatalogItem[];
	const { isSeeding, handleSaveService, handleDeleteService, handleSeedBaseline } =
		useMobilePricesActions({ appLogic, rawCatalog });

	const filteredServices = useMemo(() => {
		let items = [...rawCatalog];
		if (selectedCategory !== "all") items = items.filter((s) => (s.category || "other") === selectedCategory);
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			const cleanQ = q.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, "");
			items = items.filter((s) => {
				const titleMatch = s.title.toLowerCase().includes(q);
				const codeMatch = s.code?.toLowerCase().includes(q);
				const cleanCodeMatch = cleanQ.length >= 2 && (s.code || "").replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, "").toLowerCase().includes(cleanQ);
				return titleMatch || codeMatch || cleanCodeMatch;
			});
		}
		return items.sort((a, b) => a.title.localeCompare(b.title));
	}, [rawCatalog, searchQuery, selectedCategory]);

	return (
		<div className="mobile-prices-view flex flex-col w-full max-w-[100vw] overflow-x-clip pb-28" data-testid="mobile-settings-prices-view">
			<MobilePricesTopBar
				onBackToSettings={onBackToSettings}
				servicesCount={rawCatalog.length}
				onOpenPricelistManager={() => setIsServicePricelistModalOpen(true)}
				onAddService={() => { setEditingService(null); setIsDrawerOpen(true); }}
			/>

			<MobilePricesSearchFilterBar
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				selectedCategory={selectedCategory}
				setSelectedCategory={setSelectedCategory}
				rawCatalogCount={rawCatalog.length}
				rawCatalog={rawCatalog}
			/>

			<div className="px-4 mt-2">
				{filteredServices.length > 0 ? (
					<MobilePricesList
						services={filteredServices}
						serviceCategoryLabels={serviceCategoryLabels}
						onSelectService={(s) => { setEditingService(s); setIsDrawerOpen(true); }}
					/>
				) : (
					<MobilePricesEmptyState
						searchQuery={searchQuery}
						onResetFilters={() => { setSearchQuery(""); setSelectedCategory("all"); }}
						isSeeding={isSeeding}
						onSeedBaseline={handleSeedBaseline}
					/>
				)}
			</div>

			<MobilePricesFloatingBottomBar
				onAddService={() => { setEditingService(null); setIsDrawerOpen(true); }}
			/>

			<MobilePriceDrawer
				isOpen={isDrawerOpen}
				onClose={() => setIsDrawerOpen(false)}
				service={editingService}
				onSave={handleSaveService}
				onDelete={handleDeleteService}
				serviceCategoryLabels={serviceCategoryLabels}
				specialtyLabels={specialtyLabels}
			/>

			<ServicePricelistManagerModal
				isOpen={isServicePricelistModalOpen}
				onClose={() => setIsServicePricelistModalOpen(false)}
				clinicName={dashboard?.clinic?.name}
				clinicAddress={dashboard?.clinic?.address}
				clinicPhone={dashboard?.clinic?.phone}
			/>
		</div>
	);
};

export default MobileSettingsPricesView;
