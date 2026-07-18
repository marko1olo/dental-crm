import type { DentalSpecialty, ServiceCategory } from "@dental/shared";
import { Bot, FolderTree } from "lucide-react";
import "./SettingsPricesTab.css";
import { useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { usePricesSettingsLogic } from "./prices/usePricesSettingsLogic";
import { PricesCatalogSection } from "./prices/PricesCatalogSection";
import { PricesImportSection } from "./prices/PricesImportSection";
import { PriceEditModal } from "./prices/PriceEditModal";

const NEW_SERVICE_TEMPLATE = {
	title: "",
	code: "",
	category: "therapy" as ServiceCategory,
	specialty: "therapist" as DentalSpecialty,
	basePriceRub: 0,
	durationMinutes: 30,
	taxDeductible: true,
	active: true,
};

export function SettingsPricesTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
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

	const {
		isSaving,
		isImporting,
		importResult,
		handleImportCatalog,
		handleSaveService,
		handleDeleteService,
	} = usePricesSettingsLogic({
		pricelistAnalysis,
		createServiceCatalogItem,
		updateServiceCatalogItem,
		deleteServiceCatalogItem,
		setError: appLogic.setError,
	});

	const [activeTab, setActiveTab] = useState<"catalog" | "ai_import">("catalog");
	const [searchQuery, setSearchQuery] = useState("");
	const [editServiceId, setEditServiceId] = useState<string | null>(null);
	const [editServiceForm, setEditServiceForm] = useState(NEW_SERVICE_TEMPLATE);

	const typedServiceCatalog = dashboard?.serviceCatalog || [];

	const filteredCatalog = useMemo(() => {
		let items = [...typedServiceCatalog];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			items = items.filter(
				(s) =>
					s.title.toLowerCase().includes(q) ||
					s.code?.toLowerCase().includes(q),
			);
		}
		return items.sort((a, b) => a.title.localeCompare(b.title));
	}, [typedServiceCatalog, searchQuery]);

	const groupedCatalog = useMemo(() => {
		const groups: Record<string, any[]> = {};
		filteredCatalog.forEach((item) => {
			const cat = item.category || "other";
			if (!groups[cat]) groups[cat] = [];
			groups[cat].push(item);
		});
		return groups;
	}, [filteredCatalog]);

	return (
		<div className="pricelist-studio-container animate-fade-in">
			<div className="pricelist-tabs-header">
				<button
					className={`pricelist-tab-btn ${activeTab === "catalog" ? "active" : ""}`}
					onClick={() => setActiveTab("catalog")}
				>
					<FolderTree size={18} />
					<span>Каталог клиники</span>
				</button>
				<button
					className={`pricelist-tab-btn ${activeTab === "ai_import" ? "active" : ""}`}
					onClick={() => setActiveTab("ai_import")}
				>
					<Bot size={18} />
					<span>ИИ-Распознавание (Импорт)</span>
				</button>
			</div>

			{activeTab === "catalog" && (
				<PricesCatalogSection
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
					groupedCatalog={groupedCatalog}
					serviceCategoryLabels={serviceCategoryLabels}
					specialtyLabels={specialtyLabels}
					setEditServiceForm={setEditServiceForm}
					setEditServiceId={setEditServiceId}
					handleDeleteService={handleDeleteService}
					NEW_SERVICE_TEMPLATE={NEW_SERVICE_TEMPLATE}
				/>
			)}

			{activeTab === "ai_import" && (
				<PricesImportSection
					pricelistSourceKindLabels={pricelistSourceKindLabels}
					pricelistSourceKind={pricelistSourceKind}
					setPricelistSourceKind={setPricelistSourceKind}
					attachPricelistImage={attachPricelistImage}
					pricelistImageName={pricelistImageName}
					clearPricelistImage={clearPricelistImage}
					pricelistText={pricelistText}
					setPricelistText={setPricelistText}
					usePricelistAi={usePricelistAi}
					setUsePricelistAi={setUsePricelistAi}
					analyzePricelist={analyzePricelist}
					isPricelistAnalyzing={isPricelistAnalyzing}
					pricelistImageBase64={pricelistImageBase64}
					setPricelistAnalysis={setPricelistAnalysis}
					typedPricelistRecognitionServiceGroups={pricelistRecognitionServiceGroups as any[]}
					typedPricelistRecognitionBrandGroups={pricelistRecognitionBrandGroups as any[]}
					typedPricelistAnalysis={pricelistAnalysis}
					pricelistParserModeLabels={pricelistParserModeLabels}
					serviceCategoryLabels={serviceCategoryLabels}
					specialtyLabels={specialtyLabels}
					importResult={importResult}
					isImporting={isImporting}
					handleImportCatalog={handleImportCatalog}
				/>
			)}

			{editServiceId && (
				<PriceEditModal
					editServiceId={editServiceId}
					editServiceForm={editServiceForm}
					setEditServiceForm={setEditServiceForm}
					setEditServiceId={setEditServiceId}
					handleSaveService={(e) =>
						handleSaveService(e, editServiceId, editServiceForm, () =>
							setEditServiceId(null),
						)
					}
					isSaving={isSaving}
					serviceCategoryLabels={serviceCategoryLabels}
					specialtyLabels={specialtyLabels}
				/>
			)}
		</div>
	);
}
