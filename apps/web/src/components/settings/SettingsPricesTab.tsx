import { FileSpreadsheet, FolderTree } from "lucide-react";
import "./SettingsPricesTab.css";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { SettingsPricesAiImportSection } from "./SettingsPricesAiImportSection";
import {
	PriceItemEditModal,
	PricesCatalogSection,
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
				<PricesCatalogSection
					prices={prices}
					serviceCategoryLabels={serviceCategoryLabels}
					specialtyLabels={specialtyLabels}
				/>
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
		</div>
	);
}
