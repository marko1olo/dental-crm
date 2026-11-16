import type {
	DentalSpecialty,
	PricelistCollisionStrategy,
	ServiceCatalogItem,
	ServiceCategory,
} from "@dental/shared";
import type {
	ExistingCatalogReference,
	IngestedMappingItem,
} from "../../catalog/mappingDiff/types";
import type { ServicePricelistItem } from "../../catalog/pricelist/servicePricelistPresets";

export interface ServiceEditFormData {
	title: string;
	code: string;
	catalogCode?: string;
	standardCode?: string;
	order804nCode?: string;
	category: ServiceCategory;
	specialty: DentalSpecialty;
	basePriceRub: number;
	materialsCostRub?: number;
	durationMinutes: number;
	taxDeductible: boolean;
	vatRate?: "vat_exempt" | "vat_0" | "vat_20" | undefined;
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
	isCodesMenuOpen?: boolean | undefined;
	setIsCodesMenuOpen?: React.Dispatch<React.SetStateAction<boolean>> | undefined;
	codesMenuRef?: React.RefObject<HTMLDivElement | null> | undefined;
	/** Алиасы обратной совместимости */
	is804nCodesMenuOpen?: boolean | undefined;
	setIs804nCodesMenuOpen?: React.Dispatch<React.SetStateAction<boolean>> | undefined;
	codes804nMenuRef?: React.RefObject<HTMLDivElement | null> | undefined;
	isSeedingBaseline: boolean;
	onSeedStandardCatalog?: ((replace?: boolean) => void) | undefined;
	onSeedBaseline804n?: ((replace?: boolean) => void) | undefined;
	onExportCsv: () => void;
	isNativeScannerDropzoneOpen: boolean;
	onToggleNativeScannerDropzone: () => void;
	onOpenServicePricelistModal: () => void;
	onPrintPricelist?: (() => void) | undefined;
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
	serviceCategoryLabels?: Record<string, string> | undefined;
	specialtyLabels?: Record<string, string> | undefined;
	onClose: () => void;
	onSave: (e: React.FormEvent) => void;
}

export type PriceItemModalProps = PriceItemEditModalProps;

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
	onDirectFlatImport?: (opts: {
		fileBase64?: string;
		filename?: string;
		rawContent?: string;
	}) => Promise<void>;
}

export interface CreateServicePayload {
	title: string;
	code?: string;
	category: ServiceCategory;
	specialty: DentalSpecialty;
	basePriceRub: number;
	materialsCostRub?: number;
	durationMinutes: number;
	taxDeductible: boolean;
	vatRate?: "vat_exempt" | "vat_0" | "vat_20" | undefined;
	active: boolean;
	order804nCode?: string | null;
}

export interface ClinicDashboardResponse {
	clinic?: { name?: string; [key: string]: unknown };
	clinicSettings?: {
		name?: string;
		profile?: { organizationId?: string; clinicName?: string; mode?: string; [key: string]: unknown };
		[key: string]: unknown;
	};
	serviceCatalog?: readonly ServiceCatalogItem[];
	[key: string]: unknown;
}

export interface PricesCatalogTableProps {
	groupedCatalog: Record<string, readonly ServiceCatalogItem[]>;
	categoryLimits: Record<string, number>;
	setCategoryLimits: React.Dispatch<React.SetStateAction<Record<string, number>>>;
	serviceCategoryLabels?: Record<string, string>;
	specialtyLabels?: Record<string, string>;
	deletingServiceId: string | null;
	onEditService: (item: ServiceCatalogItem) => void;
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
	dashboard?: ClinicDashboardResponse | undefined;
	serviceCategoryLabels?: Record<string, string> | undefined;
	specialtyLabels?: Record<string, string> | undefined;
	createServiceCatalogItem?: ((payload: CreateServicePayload) => Promise<unknown>) | undefined;
	updateServiceCatalogItem?: ((id: string, payload: Partial<CreateServicePayload>) => Promise<unknown>) | undefined;
	deleteServiceCatalogItem?: ((id: string) => Promise<unknown>) | undefined;
}
