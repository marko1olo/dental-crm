import type {
	DentalSpecialty,
	PricelistCollisionStrategy,
	ServiceCategory,
} from "@dental/shared";
import type {
	ExistingCatalogReference,
	IngestedMappingItem,
} from "../../pricing/PriceListMappingDiffView";
import type { ServicePricelistItem } from "../../catalog/pricelist/servicePricelistPresets";

export interface ServiceEditFormData {
	title: string;
	code: string;
	category: ServiceCategory;
	specialty: DentalSpecialty;
	basePriceRub: number;
	durationMinutes: number;
	taxDeductible: boolean;
	vatRate: "vat_exempt" | "vat_0" | "vat_20";
	active: boolean;
}

export type PricelistStudioTab = "catalog" | "ai_import";

export interface ScannerFileState {
	name: string;
	base64: string;
	size: number;
}

export interface PricesFilterToolbarProps {
	selectedCategoryFilter: string;
	onSelectCategoryFilter: (catId: string) => void;
	searchQuery: string;
	onSearchChange: (query: string) => void;
	is804nCodesMenuOpen: boolean;
	setIs804nCodesMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	codes804nMenuRef: React.RefObject<HTMLDivElement | null>;
	isSeedingBaseline: boolean;
	onSeedBaseline804n: (replace?: boolean) => void;
	onExportCsv: () => void;
	isNativeScannerDropzoneOpen: boolean;
	onToggleNativeScannerDropzone: () => void;
	onOpenServicePricelistModal: () => void;
	onOpenNewServiceModal: () => void;
}

export interface PriceItemEditModalProps {
	isOpen: boolean;
	isNew: boolean;
	editServiceForm: ServiceEditFormData;
	setEditServiceForm: React.Dispatch<React.SetStateAction<ServiceEditFormData>>;
	priceRubInput: string;
	setPriceRubInput: (val: string) => void;
	priceProblem: string | null;
	setPriceProblem: (problem: string | null) => void;
	isSaving: boolean;
	serviceCategoryLabels?: Record<string, string>;
	specialtyLabels?: Record<string, string>;
	onClose: () => void;
	onSave: (e: React.FormEvent) => void;
}

export interface PriceImportModalProps {
	isDropzoneOpen: boolean;
	onCloseDropzone: () => void;
	scannerMode: "file" | "text";
	setScannerMode: (mode: "file" | "text") => void;
	scannerDragOver: boolean;
	setScannerDragOver: (drag: boolean) => void;
	scannerFile: ScannerFileState | null;
	scannerText: string;
	setScannerText: (text: string) => void;
	scannerCollisionStrategy: PricelistCollisionStrategy;
	setScannerCollisionStrategy: (strategy: PricelistCollisionStrategy) => void;
	isScanningPricelist: boolean;
	scannerError: string | null;
	nativeFileInputRef: React.RefObject<HTMLInputElement | null>;
	onProcessScannerFile: (file: File) => void;
	onRunScannerRequest: (opts: {
		fileBase64?: string;
		filename?: string;
		rawContent?: string;
	}) => void;
	isMappingDiffOpen: boolean;
	onCloseMappingDiff: () => void;
	mappingDiffItems: IngestedMappingItem[];
	setMappingDiffItems: React.Dispatch<React.SetStateAction<IngestedMappingItem[]>>;
	handleCommitPricelistDiff: (
		approvedItems: readonly IngestedMappingItem[],
	) => Promise<void>;
	isCommittingImport: boolean;
	existingCatalogReferences: readonly ExistingCatalogReference[];
}

export interface PricesCatalogTableProps {
	// biome-ignore lint/suspicious/noExplicitAny: generic item array from catalog
	groupedCatalog: Record<string, any[]>;
	categoryLimits: Record<string, number>;
	setCategoryLimits: React.Dispatch<React.SetStateAction<Record<string, number>>>;
	serviceCategoryLabels?: Record<string, string>;
	specialtyLabels?: Record<string, string>;
	deletingServiceId: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: service item
	onEditService: (item: any) => void;
	onDeleteService: (id: string) => void;
	searchQuery: string;
	selectedCategoryFilter: string;
	onResetFilters: () => void;
	isSeedingBaseline: boolean;
	onSeedBaseline: () => void;
	onAddNewService: () => void;
	onOpenScannerDropzone: () => void;
}

export interface UseSettingsPricesLogicProps {
	// biome-ignore lint/suspicious/noExplicitAny: dashboard object
	dashboard?: any;
	serviceCategoryLabels?: Record<string, string>;
	specialtyLabels?: Record<string, string>;
	// biome-ignore lint/suspicious/noExplicitAny: mutation payload
	createServiceCatalogItem?: (payload: any) => Promise<any>;
	// biome-ignore lint/suspicious/noExplicitAny: mutation payload
	updateServiceCatalogItem?: (id: string, payload: any) => Promise<any>;
	deleteServiceCatalogItem?: (id: string) => Promise<any>;
}
