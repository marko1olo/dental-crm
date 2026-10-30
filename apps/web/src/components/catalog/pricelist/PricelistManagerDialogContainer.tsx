import React from "react";
import { syncServiceItemToBackend } from "./pricelistDbSync";
import { PricelistFiltersAndBatchBar } from "./PricelistFiltersAndBatchBar";
import { downloadPricelistCsv } from "./PricelistImportExportModal";
import { PricelistManagerContent } from "./PricelistManagerContent";
import { PricelistManagerFooter } from "./PricelistManagerFooter";
import { PricelistManagerHeader } from "./PricelistManagerHeader";
import { PricelistManagerSubModals } from "./PricelistManagerSubModals";
import { PricelistToast } from "./PricelistToast";
import {
	type PricelistPrintClinicMeta,
	openPrintPricelistWindow,
} from "./pricelistPrintHelpers";
import type { ServicePricelistItem } from "./servicePricelistPresets";
import type { useServicePricelistManager } from "./useServicePricelistManager";

export interface PricelistManagerDialogContainerProps {
	readonly mgr: ReturnType<typeof useServicePricelistManager>;
	readonly clinicMeta: PricelistPrintClinicMeta;
	readonly adminSecret?: string | undefined;
	readonly onSaveCatalog?: ((items: readonly ServicePricelistItem[]) => void) | undefined;
	readonly onClose: () => void;
}

export const PricelistManagerDialogContainer: React.FC<
	PricelistManagerDialogContainerProps
> = ({ mgr, clinicMeta, adminSecret, onSaveCatalog, onClose }) => {
	return (
		<div className="pricelist-modal-overlay" role="dialog" aria-modal="true">
			<div className="pricelist-modal-container service-pricelist-modal">
				<PricelistManagerHeader
					totalCount={mgr.items.length}
					onOpenAdd={() => {
						mgr.setEditingItem(null);
						mgr.setIsEditModalOpen(true);
					}}
					onPrintA4={() =>
						openPrintPricelistWindow(
							clinicMeta,
							mgr.items,
							mgr.activeTier,
							false,
						)
					}
					onPrintConsumerStand={() =>
						openPrintPricelistWindow(clinicMeta, mgr.items, "standard", true)
					}
					onExportCsv={() => {
						downloadPricelistCsv(mgr.items);
						mgr.showToast("Экспортировано в CSV");
					}}
					onOpenImport={() => mgr.setIsImportModalOpen(true)}
					onSaveAndClose={() => {
						if (onSaveCatalog) onSaveCatalog(mgr.items);
						onClose();
					}}
					onClose={onClose}
				/>

				<PricelistFiltersAndBatchBar
					searchTerm={mgr.searchTerm}
					onSearchChange={mgr.setSearchTerm}
					selectedCategory={mgr.selectedCategory}
					onCategoryChange={mgr.setSelectedCategory}
					selectedSpecialty={mgr.selectedSpecialty}
					onSpecialtyChange={mgr.setSelectedSpecialty}
					activeTier={mgr.activeTier}
					onTierChange={mgr.setActiveTier}
					isBatchBarOpen={mgr.isBatchBarOpen}
					onToggleBatchBar={() => mgr.setIsBatchBarOpen((p) => !p)}
					batchRounding="round_100"
					onApplyBatchMarkup={mgr.handleApplyBatchMarkup}
					onApplyBatchRounding={(r) => mgr.handleApplyBatchMarkup(0, r)}
				/>

				<PricelistToast message={mgr.toastMessage} />
				<PricelistManagerContent mgr={mgr} adminSecret={adminSecret} />
				<PricelistManagerFooter
					visibleCount={mgr.filterSlice.pricelistSlice.visibleItems.length}
					filteredTotalCount={mgr.filterSlice.filteredItems.length}
					totalCatalogCount={mgr.items.length}
					selectedCount={mgr.selectedItemIds.size}
				/>
			</div>

			<PricelistManagerSubModals
				isImportOpen={mgr.isImportModalOpen}
				isEditOpen={mgr.isEditModalOpen}
				editingItem={mgr.editingItem}
				items={mgr.items}
				adminSecret={adminSecret}
				onCloseImport={() => mgr.setIsImportModalOpen(false)}
				onCloseEdit={() => mgr.setIsEditModalOpen(false)}
				onApplyImported={(upd, msg) => {
					mgr.updateAndPersist(upd);
					mgr.showToast(msg);
				}}
				onSaveItem={(saved) => {
					const isNew = !mgr.editingItem;
					mgr.updateAndPersist(
						mgr.editingItem
							? mgr.items.map((i) => (i.id === saved.id ? saved : i))
							: [saved, ...mgr.items],
					);
					mgr.setIsEditModalOpen(false);
					void syncServiceItemToBackend(saved, isNew, adminSecret);
				}}
			/>
		</div>
	);
};
