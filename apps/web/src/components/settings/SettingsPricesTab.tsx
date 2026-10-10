import { FileSpreadsheet, FolderTree } from "lucide-react";
import "./SettingsPricesTab.css";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { ServicePricelistManagerModal } from "../catalog/pricelist/ServicePricelistManagerModal";
import { SettingsPricesAiImportSection } from "./SettingsPricesAiImportSection";
import {
	PriceImportModal,
	PriceItemEditModal,
	PricesCatalogTable,
	PricesFilterToolbar,
	useSettingsPricesLogic,
} from "./pricesTab";

export function SettingsPricesTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const {
		dashboard,
		pricelistSourceKindLabels,
		pricelistSourceKind,
		setPricelistSourceKind,
		clearPricelistImage,
		setPricelistAnalysis,
		pricelistRecognitionServiceGroups,
		pricelistRecognitionBrandGroups,
		pricelistText,
		setPricelistText,
		pricelistImageName,
		attachPricelistImage,
		usePricelistAi,
		setUsePricelistAi,
		analyzePricelist,
		isPricelistAnalyzing,
		pricelistImageBase64,
		pricelistAnalysis,
		pricelistParserModeLabels,
		serviceCategoryLabels,
		specialtyLabels,
		createServiceCatalogItem,
		updateServiceCatalogItem,
		deleteServiceCatalogItem,
	} = mergedProps;

	const prices = useSettingsPricesLogic({
		dashboard, serviceCategoryLabels, specialtyLabels,
		createServiceCatalogItem, updateServiceCatalogItem, deleteServiceCatalogItem,
	});

	return (
		<div className="pricelist-studio-container animate-fade-in">
			<div className="pricelist-tabs-header">
				<button type="button" className={`pricelist-tab-btn ${prices.activeTab === "catalog" ? "active" : ""}`} onClick={() => prices.setActiveTab("catalog")}>
					<FolderTree size={18} /><span>Каталог клиники</span>
				</button>
				<button type="button" className={`pricelist-tab-btn ${prices.activeTab === "ai_import" ? "active" : ""}`} onClick={() => prices.setActiveTab("ai_import")}>
					<FileSpreadsheet size={18} /><span>Импорт прайса (Excel / CSV / ИИ)</span>
				</button>
			</div>

			{prices.activeTab === "catalog" && (
				<section className="pricelist-section-card">
					<PricesFilterToolbar
						selectedCategoryFilter={prices.selectedCategoryFilter} onSelectCategoryFilter={prices.setSelectedCategoryFilter}
						searchQuery={prices.searchQuery} onSearchChange={prices.setSearchQuery}
						is804nCodesMenuOpen={prices.is804nCodesMenuOpen} setIs804nCodesMenuOpen={prices.setIs804nCodesMenuOpen}
						codes804nMenuRef={prices.codes804nMenuRef} isSeedingBaseline={prices.isSeedingBaseline}
						onSeedBaseline804n={prices.handleSeedBaseline804n} onExportCsv={prices.handleExportCsv}
						isNativeScannerDropzoneOpen={prices.isNativeScannerDropzoneOpen} onToggleNativeScannerDropzone={() => prices.setIsNativeScannerDropzoneOpen((p) => !p)}
						onOpenServicePricelistModal={() => prices.setIsServicePricelistModalOpen(true)} onOpenNewServiceModal={prices.openNewServiceModal}
					/>

					<PriceImportModal
						isDropzoneOpen={prices.isNativeScannerDropzoneOpen} onCloseDropzone={() => prices.setIsNativeScannerDropzoneOpen(false)}
						scannerMode={prices.scannerMode} setScannerMode={prices.setScannerMode} scannerDragOver={prices.scannerDragOver} setScannerDragOver={prices.setScannerDragOver}
						scannerFile={prices.scannerFile} scannerText={prices.scannerText} setScannerText={prices.setScannerText}
						scannerCollisionStrategy={prices.scannerCollisionStrategy} setScannerCollisionStrategy={prices.setScannerCollisionStrategy}
						isScanningPricelist={prices.isScanningPricelist} scannerError={prices.scannerError} nativeFileInputRef={prices.nativeFileInputRef}
						onProcessScannerFile={prices.handleProcessScannerFile} onRunScannerRequest={prices.runScannerRequest}
						isMappingDiffOpen={prices.isMappingDiffOpen} onCloseMappingDiff={() => prices.setIsMappingDiffOpen(false)}
						mappingDiffItems={prices.mappingDiffItems} setMappingDiffItems={prices.setMappingDiffItems}
						handleCommitPricelistDiff={prices.handleCommitPricelistDiff} isCommittingImport={prices.isCommittingImport}
						existingCatalogReferences={prices.existingCatalogReferences}
					/>

					<PricesCatalogTable
						groupedCatalog={prices.groupedCatalog} categoryLimits={prices.categoryLimits} setCategoryLimits={prices.setCategoryLimits}
						serviceCategoryLabels={serviceCategoryLabels} specialtyLabels={specialtyLabels} deletingServiceId={prices.deletingServiceId}
						onEditService={prices.openEditServiceModal} onDeleteService={prices.handleDeleteService}
						searchQuery={prices.searchQuery} selectedCategoryFilter={prices.selectedCategoryFilter} onResetFilters={prices.resetFilters}
						isSeedingBaseline={prices.isSeedingBaseline} onSeedBaseline={() => prices.handleSeedBaseline804n(false)}
						onAddNewService={prices.openNewServiceModal} onOpenScannerDropzone={() => prices.setIsNativeScannerDropzoneOpen(true)}
					/>
				</section>
			)}

			{prices.activeTab === "ai_import" && (
				<SettingsPricesAiImportSection
					pricelistSourceKindLabels={pricelistSourceKindLabels} pricelistSourceKind={pricelistSourceKind} setPricelistSourceKind={setPricelistSourceKind}
					clearPricelistImage={clearPricelistImage} setPricelistAnalysis={setPricelistAnalysis}
					pricelistRecognitionServiceGroups={pricelistRecognitionServiceGroups} pricelistRecognitionBrandGroups={pricelistRecognitionBrandGroups}
					pricelistText={pricelistText} setPricelistText={setPricelistText} pricelistImageName={pricelistImageName} attachPricelistImage={attachPricelistImage}
					usePricelistAi={usePricelistAi} setUsePricelistAi={setUsePricelistAi} analyzePricelist={analyzePricelist} isPricelistAnalyzing={isPricelistAnalyzing}
					pricelistImageBase64={pricelistImageBase64} pricelistAnalysis={pricelistAnalysis} pricelistParserModeLabels={pricelistParserModeLabels}
					serviceCategoryLabels={serviceCategoryLabels} specialtyLabels={specialtyLabels}
					accessHeaders={prices.accessHeaders} onImportSuccess={prices.handleImportSuccess}
				/>
			)}

			<PriceItemEditModal
				isOpen={Boolean(prices.editServiceId)} isNew={prices.editServiceId === "new"}
				editServiceForm={prices.editServiceForm} setEditServiceForm={prices.setEditServiceForm}
				priceRubInput={prices.priceRubInput} setPriceRubInput={prices.setPriceRubInput}
				priceProblem={prices.priceProblem} setPriceProblem={prices.setPriceProblem} isSaving={prices.isSaving}
				serviceCategoryLabels={serviceCategoryLabels} specialtyLabels={specialtyLabels}
				onClose={() => prices.setEditServiceId(null)} onSave={prices.handleSaveService}
			/>

			<ServicePricelistManagerModal
				isOpen={prices.isServicePricelistModalOpen} onClose={() => prices.setIsServicePricelistModalOpen(false)}
				initialItems={prices.modalInitialItems} onSaveCatalog={prices.handleSaveCatalog}
				clinicName={dashboard?.clinicSettings?.name} clinicAddress={dashboard?.clinicSettings?.address}
				clinicPhone={dashboard?.clinicSettings?.phone} clinicLicense={dashboard?.clinicSettings?.license} chiefDoctorName={dashboard?.clinicSettings?.chiefDoctor}
			/>
		</div>
	);
}
