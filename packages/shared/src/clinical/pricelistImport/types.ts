/**
 * packages/shared/src/clinical/pricelistImport/types.ts
 *
 * Data contracts, schemas & interfaces for tabular price list batch import.
 */

import type { DentalSpecialty, ServiceCategory } from "../../index.js";

export type PricelistVendorSignature =
	| "ident"
	| "dentalpro"
	| "istom"
	| "1c_medicina"
	| "generic_table";

export const PRICELIST_VENDOR_LABELS: Record<PricelistVendorSignature, string> = {
	ident: "IDENT",
	dentalpro: "DentalPRO",
	istom: "iStom",
	"1c_medicina": "1С:Медицина",
	generic_table: "Таблица Excel / CSV",
};

export type PricelistCollisionStrategy =
	| "update_existing"
	| "skip_duplicates"
	| "create_new";

export const PRICELIST_COLLISION_STRATEGY_LABELS: Record<
	PricelistCollisionStrategy,
	string
> = {
	update_existing: "Обновить цены существующих услуг (Рекомендуется)",
	skip_duplicates: "Пропустить существующие услуги (без перезаписи)",
	create_new: "Создать все позиции как новые",
};

export type PricelistColumnTargetKey =
	| "code"
	| "order804nCode"
	| "title"
	| "category"
	| "specialty"
	| "priceRub"
	| "costRub"
	| "durationMinutes"
	| "warrantyMonths"
	| "ignore";

export const PRICELIST_COLUMN_TARGET_LABELS: Record<
	PricelistColumnTargetKey,
	string
> = {
	code: "Артикул / Код клиники",
	order804nCode: "Код номенклатуры 804н",
	title: "Наименование услуги",
	category: "Раздел / Группа",
	specialty: "Специализация врача",
	priceRub: "Цена (руб)",
	costRub: "Себестоимость / Расход",
	durationMinutes: "Длительность (мин)",
	warrantyMonths: "Гарантия (мес)",
	ignore: "Не импортировать",
};

export interface ColumnMappingConfig {
	codeCol?: number | undefined;
	order804nCol?: number | undefined;
	titleCol: number;
	categoryCol?: number | undefined;
	specialtyCol?: number | undefined;
	priceCol: number;
	costCol?: number | undefined;
	durationCol?: number | undefined;
	warrantyCol?: number | undefined;
}

export interface ParsedTabularRow {
	rowNumber: number; // 1-based (Excel row index)
	rawCells: string[];
	code?: string | undefined;
	order804nCode?: string | undefined;
	commercialTitle: string;
	category: ServiceCategory;
	specialty: DentalSpecialty;
	priceRub: number;
	priceKopecks: number;
	costRub?: number | undefined;
	durationMinutes: number;
	warrantyMonths?: number | undefined;
	validationStatus: "valid" | "warning" | "error";
	validationMessage?: string | undefined;
	suggestedAction: "create_new" | "update_existing" | "identical";
	matchedExistingServiceId?: string | null | undefined;
	matchedExistingTitle?: string | null | undefined;
	matchedExistingPriceRub?: number | null | undefined;
}

export interface TabularRowValidationError {
	rowNumber: number;
	field: string;
	message: string;
	rawCell?: string | undefined;
}

export interface TabularImportAnalysis {
	vendorSignature: PricelistVendorSignature;
	vendorLabel: string;
	detectedMapping: ColumnMappingConfig;
	headerRowIndex: number;
	headers: string[];
	previewRows: ParsedTabularRow[];
	allRows: ParsedTabularRow[];
	totalRows: number;
	validRowsCount: number;
	errorRowsCount: number;
	stats: {
		newCount: number;
		updateCount: number;
		identicalCount: number;
	};
	errors: TabularRowValidationError[];
}

export interface PriceParseResult {
	success: boolean;
	priceRub: number;
	priceKopecks: number;
	isWarrantyOrFree: boolean;
	error?: string | undefined;
}
