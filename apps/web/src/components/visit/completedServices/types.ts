import {
	CLINICAL_SERVICE_BUNDLES,
	type ClinicalServiceBundle,
} from "../clinicalServiceBundles";
import type {
	ChairsideExpressService,
	CompletedServicesSummary,
	FilteredCatalogService,
	ParsedCompletedServiceLine,
} from "../completedServicesPlan";

export {
	CLINICAL_SERVICE_BUNDLES,
	type ClinicalServiceBundle,
	type ChairsideExpressService,
	type CompletedServicesSummary,
	type FilteredCatalogService,
	type ParsedCompletedServiceLine,
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
	// biome-ignore lint/suspicious/noExplicitAny: dynamic catalog items
	effectiveCatalog: readonly any[];
	// biome-ignore lint/suspicious/noExplicitAny: dynamic invoice payload
	onApplyDiagnosisPackage: (newLines: string[], invoicePayload: any) => void;
	bundlesExpanded: boolean;
	onToggleBundlesExpanded: () => void;
	onAddBundle: (bundle: ClinicalServiceBundle) => void;
}

export interface CompletedServiceRowItemProps {
	// biome-ignore lint/suspicious/noExplicitAny: generic service item from plan
	item: any;
	index: number;
	marked: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: generic service item from plan
	onToggle: (item: any) => void;
}

export interface PreliminaryTreatmentPlanSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: generic service item from plan
	planItems: any[];
	// biome-ignore lint/suspicious/noExplicitAny: generic service item from plan
	isMarked: (item: any) => boolean;
	// biome-ignore lint/suspicious/noExplicitAny: generic service item from plan
	onTogglePlanItem: (item: any) => void;
}
