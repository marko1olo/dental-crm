import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PriceImportModal } from "../components/settings/pricesTab/PriceImportModal.js";
import { PricesFilterToolbar } from "../components/settings/pricesTab/PricesFilterToolbar.js";
import { SettingsPricesTab } from "../components/settings/SettingsPricesTab.js";
import { AppLogicProvider } from "../contexts/AppLogicContext.js";

describe("Интеграция нативного сканнера прейскуранта в SettingsPricesTab", () => {
	it("SettingsPricesTab монтирует каталог без ошибок при пустом провайдере", () => {
		const html = renderToStaticMarkup(
			React.createElement(
				AppLogicProvider,
				{
					value: {
						dashboard: null,
						serviceCategoryLabels: { therapy: "Терапия" },
						specialtyLabels: { therapist: "Терапевт" },
					},
				},
				React.createElement(SettingsPricesTab),
			),
		);
		assert.ok(html.includes("Каталог клиники"));
		assert.ok(html.includes('data-testid="btn-native-pricelist-import"'));
	});

	it("PricesFilterToolbar рендерит кнопку импорта прейскуранта без 804н в видимой подписи", () => {
		const html = renderToStaticMarkup(
			React.createElement(PricesFilterToolbar, {
				selectedCategoryFilter: "all",
				onSelectCategoryFilter: () => {},
				searchQuery: "",
				onSearchChange: () => {},
				isCodesMenuOpen: false,
				setIsCodesMenuOpen: () => {},
				codesMenuRef: { current: null },
				is804nCodesMenuOpen: false,
				setIs804nCodesMenuOpen: () => {},
				codes804nMenuRef: { current: null },
				isSeedingBaseline: false,
				onSeedStandardCatalog: () => {},
				onSeedBaseline804n: () => {},
				onExportCsv: () => {},
				isNativeScannerDropzoneOpen: false,
				onToggleNativeScannerDropzone: () => {},
				onOpenServicePricelistModal: () => {},
				onPrintPricelist: () => {},
				onOpenNewServiceModal: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="btn-native-pricelist-import"'));
		assert.ok(html.includes("Импорт прейскуранта (Excel/CSV/Текст)"));
	});

	it("PriceImportModal рендерит dropzone, .xlsx/.csv input, стратегии коллизий и текстовый ввод", () => {
		const fileModeHtml = renderToStaticMarkup(
			React.createElement(PriceImportModal, {
				isDropzoneOpen: true,
				onCloseDropzone: () => {},
				scannerMode: "file",
				setScannerMode: () => {},
				scannerDragOver: false,
				setScannerDragOver: () => {},
				scannerFile: null,
				scannerText: "",
				setScannerText: () => {},
				scannerCollisionStrategy: "update_existing",
				setScannerCollisionStrategy: () => {},
				isScanningPricelist: false,
				scannerError: null,
				nativeFileInputRef: { current: null },
				onProcessScannerFile: () => {},
				onRunScannerRequest: () => {},
				isMappingDiffOpen: false,
				onCloseMappingDiff: () => {},
				mappingDiffItems: [],
				setMappingDiffItems: () => {},
				handleCommitPricelistDiff: () => {},
				isCommittingImport: false,
				existingCatalogReferences: [],
				onDirectFlatImport: () => {},
			}),
		);
		assert.ok(fileModeHtml.includes('data-testid="native-pricelist-dropzone-banner"'));
		assert.ok(fileModeHtml.includes(".xlsx") && fileModeHtml.includes(".csv"));
		assert.ok(fileModeHtml.includes('value="update_existing"'));
		assert.ok(fileModeHtml.includes('value="skip_duplicates"'));
		assert.ok(fileModeHtml.includes('value="create_new"'));

		const textModeHtml = renderToStaticMarkup(
			React.createElement(PriceImportModal, {
				isDropzoneOpen: true,
				onCloseDropzone: () => {},
				scannerMode: "text",
				setScannerMode: () => {},
				scannerDragOver: false,
				setScannerDragOver: () => {},
				scannerFile: null,
				scannerText: "Консультация - 1500",
				setScannerText: () => {},
				scannerCollisionStrategy: "update_existing",
				setScannerCollisionStrategy: () => {},
				isScanningPricelist: false,
				scannerError: null,
				nativeFileInputRef: { current: null },
				onProcessScannerFile: () => {},
				onRunScannerRequest: () => {},
				isMappingDiffOpen: false,
				onCloseMappingDiff: () => {},
				mappingDiffItems: [],
				setMappingDiffItems: () => {},
				handleCommitPricelistDiff: () => {},
				isCommittingImport: false,
				existingCatalogReferences: [],
				onDirectFlatImport: () => {},
			}),
		);
		assert.ok(textModeHtml.includes('data-testid="native-pricelist-text-input"'));
	});
});
