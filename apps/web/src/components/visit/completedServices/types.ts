import {
	CLINICAL_SERVICE_BUNDLES,
	type ClinicalServiceBundle,
} from "../clinicalServiceBundles";
import type {
	ChairsideExpressService,
	CompletedServicesSummary,
	FilteredCatalogService,
	ParsedCompletedServiceLine,
	VisitPlanItemLike,
} from "../completedServicesPlan";

export {
	CLINICAL_SERVICE_BUNDLES,
	type ClinicalServiceBundle,
	type ChairsideExpressService,
	type CompletedServicesSummary,
	type FilteredCatalogService,
	type ParsedCompletedServiceLine,
	type VisitPlanItemLike,
};

export interface CompletedServicesChecklistProps {
	/** Прямая передача прейскуранта клиники (удобно для модульных тестов и изоляции) */
	serviceCatalog?: unknown[];
}

export interface QuickServiceSearchAndPresetsProps {
	selectedTooth: string | null;
	onSelectTooth: (tooth: string | null) => void;
	isToothGridOpen: boolean;
	onToggleToothGrid: () => void;
	onAddExpressService: (service: ChairsideExpressService) => void;
	catalogSearch: string;
	onCatalogSearchChange: (value: string) => void;
	filteredCatalog: FilteredCatalogService[];
	onAddCatalogService: (item: FilteredCatalogService) => void;
	visitPatientId: string | null;
	visitId: string | null;
	effectiveCatalog: readonly unknown[];
	onApplyDiagnosisPackage: (newLines: string[], invoicePayload: unknown) => void;
	bundlesExpanded: boolean;
	onToggleBundlesExpanded: () => void;
	onAddBundle: (bundle: ClinicalServiceBundle) => void;
}

export interface CompletedServiceRowItemProps {
	item: VisitPlanItemLike;
	index: number;
	marked: boolean;
	onToggle: (item: VisitPlanItemLike) => void;
}

export interface PreliminaryTreatmentPlanSectionProps {
	planItems: readonly VisitPlanItemLike[];
	isMarked: (item: VisitPlanItemLike) => boolean;
	onTogglePlanItem: (item: VisitPlanItemLike) => void;
}
