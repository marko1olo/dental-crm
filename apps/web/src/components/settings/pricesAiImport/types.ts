import type {
	DentalSpecialty,
	PricelistCollisionStrategy,
	PricelistColumnTargetKey,
	ServiceCategory,
	TabularImportAnalysis,
} from "@dental/shared";
import type { IngestedMappingItem } from "../../pricing/PriceListMappingDiffView";
import type { SettingsAccessHeaders } from "../staffMutationRequest";

export type PricelistSourceMode = "excel_csv" | "text" | "photo" | "scan";

export interface SelectedFileInfo {
	name: string;
	base64: string;
	size: number;
}

export interface ImportResultSummary {
	count?: number;
	error?: string;
}

export interface PricelistImportBatchItem {
	code?: string;
	order804nCode?: string;
	title: string;
	category?: ServiceCategory;
	specialty?: DentalSpecialty;
	priceRub: number;
	costRub?: number;
	durationMinutes?: number;
	warrantyMonths?: number;
	suggestedAction?: string;
	matchedExistingServiceId?: string;
}

export interface SettingsPricesAiImportSectionProps {
	readonly pricelistSourceKindLabels?: Record<string, string> | undefined;
	readonly pricelistSourceKind?: string | undefined;
	readonly setPricelistSourceKind?: ((val: string) => void) | undefined;
	readonly clearPricelistImage?: (() => void) | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: generic analysis payload
	readonly setPricelistAnalysis?: ((analysis: any) => void) | undefined;
	readonly pricelistRecognitionServiceGroups?: Array<{
		title: string;
		items: string[];
	}> | undefined;
	readonly pricelistRecognitionBrandGroups?: Array<{
		title: string;
		items: string[];
	}> | undefined;
	readonly pricelistText?: string | undefined;
	readonly setPricelistText?: ((val: string) => void) | undefined;
	readonly pricelistImageName?: string | null | undefined;
	readonly attachPricelistImage?: ((file: File) => void) | undefined;
	readonly usePricelistAi?: boolean | undefined;
	readonly setUsePricelistAi?: ((val: boolean) => void) | undefined;
	readonly analyzePricelist?: (() => void) | undefined;
	readonly isPricelistAnalyzing?: boolean | undefined;
	readonly pricelistImageBase64?: string | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: generic analysis result
	readonly pricelistAnalysis?: any | undefined;
	readonly pricelistParserModeLabels?: Record<string, string> | undefined;
	readonly serviceCategoryLabels?: Record<string, string> | undefined;
	readonly specialtyLabels?: Record<string, string> | undefined;
	readonly accessHeaders?: SettingsAccessHeaders | undefined;
	readonly isImporting?: boolean | undefined;
	readonly importResult?: { count?: number | undefined; error?: string | undefined } | null | undefined;
	readonly onImportCatalog?: (() => void) | undefined;
	readonly onImportSuccess?: (() => Promise<void> | void) | undefined;
}

export interface PricesImportDropzoneProps {
	readonly activeSourceMode: PricelistSourceMode;
	readonly setActiveSourceMode: (mode: PricelistSourceMode) => void;
	readonly setPricelistSourceKind?: ((val: string) => void) | undefined;
	readonly dragOver: boolean;
	readonly setDragOver: (drag: boolean) => void;
	readonly selectedFile: SelectedFileInfo | null;
	readonly isParsingFile: boolean;
	readonly handleFileSelect: (file: File) => void;
	readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
	readonly pricelistText?: string | undefined;
	readonly setPricelistText?: ((val: string) => void) | undefined;
	readonly isPricelistAnalyzing?: boolean | undefined;
	readonly analyzePricelist?: (() => void) | undefined;
	readonly pricelistImageName?: string | null | undefined;
	readonly clearPricelistImage?: (() => void) | undefined;
	readonly attachPricelistImage?: ((file: File) => void) | undefined;
}

export interface PricesMatchingReviewTableProps {
	readonly tabularAnalysis: TabularImportAnalysis;
	readonly availableSheets: string[];
	readonly selectedSheetIndex: number;
	readonly selectedFile: SelectedFileInfo | null;
	readonly customMapping: Record<string, number>;
	readonly collisionStrategy: PricelistCollisionStrategy;
	readonly setCollisionStrategy: (strat: PricelistCollisionStrategy) => void;
	readonly onSheetChange: (sheetIndex: number) => void;
	readonly onColumnMappingChange: (targetField: PricelistColumnTargetKey, colIndex: number) => void;
}

export interface PricesImportActionToolbarProps {
	readonly importResult?: ImportResultSummary | null | undefined;
	readonly isImporting: boolean;
	readonly validRowsCount: number;
	readonly onOpenDiffModal: () => void;
	readonly onSubmitBatchImport: () => void;
}
