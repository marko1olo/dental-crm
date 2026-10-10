import type {
	PricelistCollisionStrategy,
	PricelistColumnTargetKey,
	TabularImportAnalysis,
} from "@dental/shared";
import { useRef, useState } from "react";
import type { IngestedMappingItem } from "../../pricing/PriceListMappingDiffView";
import { staffMutationHeaders } from "../staffMutationRequest";
import type {
	ImportResultSummary,
	PricelistSourceMode,
	SelectedFileInfo,
	SettingsPricesAiImportSectionProps,
} from "./types";

export function usePricesAiImport(props: SettingsPricesAiImportSectionProps) {
	const {
		attachPricelistImage,
		accessHeaders,
		isImporting: externalIsImporting,
		importResult: externalImportResult,
		onImportCatalog,
		onImportSuccess,
	} = props;

	// Mode State
	const [activeSourceMode, setActiveSourceMode] =
		useState<PricelistSourceMode>("excel_csv");

	// Tabular Excel & CSV Import State
	const [dragOver, setDragOver] = useState(false);
	const [selectedFile, setSelectedFile] = useState<SelectedFileInfo | null>(null);
	const [isParsingFile, setIsParsingFile] = useState(false);
	const [availableSheets, setAvailableSheets] = useState<string[]>([]);
	const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
	const [tabularAnalysis, setTabularAnalysis] =
		useState<TabularImportAnalysis | null>(null);
	const [customMapping, setCustomMapping] = useState<Record<string, number>>({});
	const [collisionStrategy, setCollisionStrategy] =
		useState<PricelistCollisionStrategy>("update_existing");

	// Batch Import State
	const [internalIsImporting, setInternalIsImporting] = useState(false);
	const [internalImportResult, setInternalImportResult] =
		useState<ImportResultSummary | null>(null);

	// Dual-Pane Diff Modal State
	const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const isImporting = externalIsImporting ?? internalIsImporting;
	const importResult = externalImportResult ?? internalImportResult;

	const parseSpreadsheetFile = async (
		fileBase64: string,
		filename: string,
		sheetIndex: number,
		mapping: Record<string, number>,
	) => {
		setIsParsingFile(true);
		setInternalImportResult(null);
		try {
			const headers = staffMutationHeaders(accessHeaders);
			const res = await fetch("/api/pricelist/parse-file", {
				method: "POST",
				headers,
				body: JSON.stringify({
					fileBase64,
					filename,
					selectedSheetIndex: sheetIndex,
					customMapping: mapping,
				}),
			});

			if (!res.ok) {
				const errorJson = await res.json().catch(() => ({}));
				throw new Error(
					errorJson.message || `Ошибка сервера при разборе таблицы (HTTP ${res.status})`,
				);
			}

			const data = await res.json();
			if (data.success && data.analysis) {
				setTabularAnalysis(data.analysis);
				setAvailableSheets(data.sheets || ["Лист 1"]);
				setSelectedSheetIndex(data.selectedSheetIndex || 0);
				// Initialize custom mapping from detected
				const det = data.analysis.detectedMapping;
				setCustomMapping({
					...(det.codeCol !== undefined ? { codeCol: det.codeCol } : {}),
					...(det.order804nCol !== undefined ? { order804nCol: det.order804nCol } : {}),
					titleCol: det.titleCol,
					...(det.categoryCol !== undefined ? { categoryCol: det.categoryCol } : {}),
					...(det.specialtyCol !== undefined ? { specialtyCol: det.specialtyCol } : {}),
					priceCol: det.priceCol,
					...(det.costCol !== undefined ? { costCol: det.costCol } : {}),
					...(det.durationCol !== undefined ? { durationCol: det.durationCol } : {}),
					...(det.warrantyCol !== undefined ? { warrantyCol: det.warrantyCol } : {}),
				});
			}
		} catch (err: unknown) {
			setInternalImportResult({
				error: err instanceof Error ? err.message : "Не удалось разобрать файл",
			});
		} finally {
			setIsParsingFile(false);
		}
	};

	const handleFileSelect = (file: File) => {
		const lower = file.name.toLowerCase();
		const isSpreadsheetOrCsv =
			lower.endsWith(".xlsx") ||
			lower.endsWith(".xls") ||
			lower.endsWith(".ods") ||
			lower.endsWith(".csv");

		if (!isSpreadsheetOrCsv) {
			if (attachPricelistImage) attachPricelistImage(file);
			return;
		}

		const reader = new FileReader();
		reader.onload = async () => {
			const resultStr = reader.result as string;
			const base64 = resultStr.split(",")[1] || "";
			setSelectedFile({
				name: file.name,
				base64,
				size: file.size,
			});
			await parseSpreadsheetFile(base64, file.name, 0, {});
		};
		reader.readAsDataURL(file);
	};

	const handleColumnMappingChange = (
		targetField: PricelistColumnTargetKey,
		colIndex: number,
	) => {
		if (!selectedFile) return;
		const updated = { ...customMapping };
		if (targetField === "ignore") {
			// Remove from mapping
			for (const [k, v] of Object.entries(updated)) {
				if (v === colIndex) delete updated[k];
			}
		} else {
			// Set target
			const keyMap: Record<string, string> = {
				code: "codeCol",
				order804nCode: "order804nCol",
				title: "titleCol",
				category: "categoryCol",
				specialty: "specialtyCol",
				priceRub: "priceCol",
				costRub: "costCol",
				durationMinutes: "durationCol",
				warrantyMonths: "warrantyCol",
			};
			const configKey = keyMap[targetField];
			if (configKey) {
				updated[configKey] = colIndex;
			}
		}
		setCustomMapping(updated);
		parseSpreadsheetFile(
			selectedFile.base64,
			selectedFile.name,
			selectedSheetIndex,
			updated,
		);
	};

	const handleBatchImportSubmit = async (
		itemsOverride?: readonly IngestedMappingItem[],
	) => {
		if (onImportCatalog) {
			onImportCatalog();
			return;
		}

		if (!tabularAnalysis || tabularAnalysis.allRows.length === 0) {
			return;
		}

		setInternalIsImporting(true);
		setInternalImportResult(null);

		const itemsToImport = itemsOverride
			? itemsOverride.map((it) => ({
					code: it.code804n ? undefined : it.cleanedTitle,
					order804nCode: it.code804n,
					title: it.cleanedTitle,
					category: it.category,
					specialty: it.specialty,
					priceRub: it.priceRub,
					durationMinutes: 30,
					suggestedAction: it.suggestedAction,
					matchedExistingServiceId: it.matchedExistingServiceId,
				}))
			: tabularAnalysis.allRows
					.filter((r) => r.validationStatus === "valid")
					.map((r) => ({
						code: r.code,
						order804nCode: r.order804nCode,
						title: r.commercialTitle,
						category: r.category,
						specialty: r.specialty,
						priceRub: r.priceRub,
						costRub: r.costRub,
						durationMinutes: r.durationMinutes,
						warrantyMonths: r.warrantyMonths,
						suggestedAction: r.suggestedAction,
						matchedExistingServiceId: r.matchedExistingServiceId,
					}));

		if (itemsToImport.length === 0) {
			setInternalImportResult({ error: "Нет корректных позиций для импорта" });
			setInternalIsImporting(false);
			return;
		}

		try {
			const headers = staffMutationHeaders(accessHeaders);
			const response = await fetch("/api/pricelist/batch-import", {
				method: "POST",
				headers,
				body: JSON.stringify({
					items: itemsToImport,
					collisionStrategy,
				}),
			});

			if (!response.ok) {
				const errorJson = await response.json().catch(() => ({}));
				throw new Error(
					errorJson.message ||
						`Сбой транзакции при пакетном импорте (HTTP ${response.status})`,
				);
			}

			const data = await response.json();
			const committed = data.committedCount ?? itemsToImport.length;
			setInternalImportResult({ count: committed });

			// Reactive state refresh without page reload
			if (onImportSuccess) {
				await onImportSuccess();
			}
		} catch (err: unknown) {
			setInternalImportResult({
				error: err instanceof Error ? err.message : "Ошибка транзакции импорта",
			});
		} finally {
			setInternalIsImporting(false);
			setIsDiffModalOpen(false);
		}
	};

	// Convert tabular analysis rows into IngestedMappingItem format for Diff View
	const mappingDiffItems: IngestedMappingItem[] = tabularAnalysis
		? tabularAnalysis.allRows.map((r) => ({
				id: `tab-row-${r.rowNumber}`,
				sourceLineNumber: r.rowNumber,
				rawLine: r.rawCells.filter(Boolean).join(" | "),
				cleanedTitle: r.commercialTitle,
				code804n: r.order804nCode || "A16.07.002",
				statutoryTitle804n: r.commercialTitle,
				category: r.category,
				specialty: r.specialty,
				priceRub: r.priceRub,
				priceKopecks: r.priceKopecks,
				confidence: r.order804nCode ? 0.95 : 0.75,
				confidenceKind: r.order804nCode ? "exact_code" : "medium_keyword",
				matchedExistingServiceId: r.matchedExistingServiceId,
				matchedExistingTitle: r.matchedExistingTitle,
				matchedExistingPriceRub: r.matchedExistingPriceRub,
				suggestedAction: r.suggestedAction,
				isApproved: r.validationStatus === "valid",
			}))
		: [];

	const handleSheetChange = (sheetIndex: number) => {
		if (selectedFile) {
			parseSpreadsheetFile(
				selectedFile.base64,
				selectedFile.name,
				sheetIndex,
				customMapping,
			);
		}
	};

	return {
		activeSourceMode,
		setActiveSourceMode,
		dragOver,
		setDragOver,
		selectedFile,
		setSelectedFile,
		isParsingFile,
		availableSheets,
		selectedSheetIndex,
		tabularAnalysis,
		customMapping,
		collisionStrategy,
		setCollisionStrategy,
		isImporting,
		importResult,
		isDiffModalOpen,
		setIsDiffModalOpen,
		fileInputRef,
		mappingDiffItems,
		handleFileSelect,
		handleColumnMappingChange,
		handleBatchImportSubmit,
		handleSheetChange,
	};
}
