import React from "react";
import { PriceImportModal } from "./PriceImportModal";
import { PricesCatalogTable } from "./PricesCatalogTable";
import { PricesFilterToolbar } from "./PricesFilterToolbar";
import type { useSettingsPricesLogic } from "./useSettingsPricesLogic";

interface Props {
	prices: ReturnType<typeof useSettingsPricesLogic>;
	serviceCategoryLabels: Record<string, string>;
	specialtyLabels: Record<string, string>;
}

export const PricesCatalogSection: React.FC<Props> = ({ prices, serviceCategoryLabels, specialtyLabels }) => {
	return (
		<section className="pricelist-section-card">
			<PricesFilterToolbar
				selectedCategoryFilter={prices.selectedCategoryFilter}
				onSelectCategoryFilter={prices.setSelectedCategoryFilter}
				searchQuery={prices.searchQuery}
				onSearchChange={prices.setSearchQuery}
				isCodesMenuOpen={prices.isCodesMenuOpen}
				setIsCodesMenuOpen={prices.setIsCodesMenuOpen}
				codesMenuRef={prices.codesMenuRef}
				is804nCodesMenuOpen={prices.is804nCodesMenuOpen}
				setIs804nCodesMenuOpen={prices.setIs804nCodesMenuOpen}
				codes804nMenuRef={prices.codes804nMenuRef}
				isSeedingBaseline={prices.isSeedingBaseline}
				onSeedStandardCatalog={prices.handleSeedStandardCatalog}
				onSeedBaseline804n={prices.handleSeedBaseline804n}
				onExportCsv={prices.handleExportCsv}
				isNativeScannerDropzoneOpen={prices.isNativeScannerDropzoneOpen}
				onToggleNativeScannerDropzone={() => prices.setIsNativeScannerDropzoneOpen((p) => !p)}
				onOpenServicePricelistModal={prices.handlePrintPricelist}
				onOpenNewServiceModal={prices.openNewServiceModal}
			/>

			<PriceImportModal
				isDropzoneOpen={prices.isNativeScannerDropzoneOpen}
				onCloseDropzone={() => prices.setIsNativeScannerDropzoneOpen(false)}
				scannerMode={prices.scannerMode}
				setScannerMode={prices.setScannerMode}
				scannerDragOver={prices.scannerDragOver}
				setScannerDragOver={prices.setScannerDragOver}
				scannerFile={prices.scannerFile}
				scannerText={prices.scannerText}
				setScannerText={prices.setScannerText}
				scannerCollisionStrategy={prices.scannerCollisionStrategy}
				setScannerCollisionStrategy={prices.setScannerCollisionStrategy}
				isScanningPricelist={prices.isScanningPricelist}
				scannerError={prices.scannerError}
				nativeFileInputRef={prices.nativeFileInputRef}
				onProcessScannerFile={prices.handleProcessScannerFile}
				onRunScannerRequest={prices.runScannerRequest}
				isMappingDiffOpen={prices.isMappingDiffOpen}
				onCloseMappingDiff={() => prices.setIsMappingDiffOpen(false)}
				mappingDiffItems={prices.mappingDiffItems}
				setMappingDiffItems={prices.setMappingDiffItems}
				handleCommitPricelistDiff={prices.handleCommitPricelistDiff}
				isCommittingImport={prices.isCommittingImport}
				existingCatalogReferences={prices.existingCatalogReferences}
				onDirectFlatImport={prices.handleDirectFlatImport}
			/>

			<PricesCatalogTable
				groupedCatalog={prices.groupedCatalog}
				categoryLimits={prices.categoryLimits}
				setCategoryLimits={prices.setCategoryLimits}
				serviceCategoryLabels={serviceCategoryLabels}
				specialtyLabels={specialtyLabels}
				deletingServiceId={prices.deletingServiceId}
				onEditService={prices.openEditServiceModal}
				onDeleteService={prices.handleDeleteService}
				searchQuery={prices.searchQuery}
				selectedCategoryFilter={prices.selectedCategoryFilter}
				onResetFilters={prices.resetFilters}
				isSeedingBaseline={prices.isSeedingBaseline}
				onSeedBaseline={() => prices.handleSeedBaseline804n(false)}
				onAddNewService={prices.openNewServiceModal}
				onOpenScannerDropzone={() => prices.setIsNativeScannerDropzoneOpen(true)}
			/>
		</section>
	);
};
