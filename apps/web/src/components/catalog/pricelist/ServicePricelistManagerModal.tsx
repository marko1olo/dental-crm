import type React from "react";
import { createPortal } from "react-dom";
import { PricelistFiltersAndBatchBar } from "./PricelistFiltersAndBatchBar";
import { downloadPricelistCsv } from "./PricelistImportExportModal";
import { PricelistManagerContent } from "./PricelistManagerContent";
import { PricelistManagerFooter } from "./PricelistManagerFooter";
import { PricelistManagerHeader } from "./PricelistManagerHeader";
import { PricelistManagerSubModals } from "./PricelistManagerSubModals";
import { PricelistToast } from "./PricelistToast";
import { openPrintPricelistWindow } from "./pricelistPrintHelpers";
import type { ServicePricelistManagerModalProps } from "./ServicePricelistManagerModalProps";
import { STATUTORY_ORDER_804N_PRESETS } from "./servicePricelistPresets";
import { useServicePricelistManager } from "./useServicePricelistManager";

export type { ServicePricelistManagerModalProps };

export const ServicePricelistManagerModal: React.FC<
	ServicePricelistManagerModalProps
> = (props) => {
	const {
		isOpen,
		onClose,
		initialItems = STATUTORY_ORDER_804N_PRESETS,
		onSaveCatalog,
		clinicName = "Стоматологическая клиника «DENTE»",
		clinicAddress = "г. Москва, ул. Медицинская, д. 12",
		clinicPhone = "",
		clinicLicense = "ЛО-77-01-012345 от 12.04.2021",
		chiefDoctorName = "Петров А. В.",
		adminSecret,
	} = props;
	const mgr = useServicePricelistManager(initialItems, onSaveCatalog, isOpen);

	if (!isOpen) return null;
	const clinicMeta = {
		clinicName,
		clinicAddress,
		clinicPhone,
		clinicLicense,
		chiefDoctorName,
	};

	const modalContent = (
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
				<PricelistManagerContent mgr={mgr} />
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
					mgr.updateAndPersist(
						mgr.editingItem
							? mgr.items.map((i) => (i.id === saved.id ? saved : i))
							: [saved, ...mgr.items],
					);
					mgr.setIsEditModalOpen(false);
				}}
			/>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};
