import type {
	DentalSpecialty,
	PricelistCollisionStrategy,
	PricelistColumnTargetKey,
	ServiceCategory,
	TabularImportAnalysis,
} from "@dental/shared";
import {
	AlertTriangle,
	ArrowRight,
	Bot,
	CheckCircle2,
	ChevronDown,
	Database,
	FileSpreadsheet,
	FileText,
	ImageIcon,
	Layers,
	RefreshCw,
	Sparkles,
	UploadCloud,
	X,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { money } from "../../AppHelpers";
import {
	type IngestedMappingItem,
	PriceListMappingDiffView,
} from "../pricing/PriceListMappingDiffView";
import {
	type SettingsAccessHeaders,
	staffMutationHeaders,
} from "./staffMutationRequest";
import "./SettingsPricesTab.css";

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

export const SettingsPricesAiImportSection: React.FC<
	SettingsPricesAiImportSectionProps
> = ({
	pricelistSourceKindLabels,
	pricelistSourceKind = "excel_csv",
	setPricelistSourceKind,
	clearPricelistImage,
	setPricelistAnalysis,
	pricelistRecognitionServiceGroups = [],
	pricelistRecognitionBrandGroups = [],
	pricelistText = "",
	setPricelistText,
	pricelistImageName = null,
	attachPricelistImage,
	usePricelistAi = false,
	setUsePricelistAi,
	analyzePricelist,
	isPricelistAnalyzing = false,
	pricelistImageBase64 = null,
	pricelistAnalysis,
	pricelistParserModeLabels = {},
	serviceCategoryLabels = {},
	specialtyLabels = {},
	accessHeaders,
	isImporting: externalIsImporting,
	importResult: externalImportResult,
	onImportCatalog,
	onImportSuccess,
}) => {
	// Mode State
	const [activeSourceMode, setActiveSourceMode] = useState<
		"excel_csv" | "text" | "photo" | "scan"
	>("excel_csv");

	// Tabular Excel & CSV Import State
	const [dragOver, setDragOver] = useState(false);
	const [selectedFile, setSelectedFile] = useState<{
		name: string;
		base64: string;
		size: number;
	} | null>(null);
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
	const [internalImportResult, setInternalImportResult] = useState<{
		count?: number;
		error?: string;
	} | null>(null);

	// Dual-Pane Diff Modal State
	const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const isImporting = externalIsImporting ?? internalIsImporting;
	const importResult = externalImportResult ?? internalImportResult;

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

	return (
		<>
			{/* Main Upload Section Card */}
			<section className="pricelist-section-card">
				<div className="pricelist-section-header">
					<div className="pricelist-section-icon">
						<FileSpreadsheet size={24} />
					</div>
					<div className="pricelist-section-title">
						<h3>Пакетный импорт прейскуранта (Excel & CSV)</h3>
						<p>
							Автоматическое сопоставление с каталогом медицинских услуг, защита от дубликатов и
							поддержка форматов IDENT, DentalPRO, iStom, 1С:Медицина.
						</p>
					</div>
				</div>

				<div className="pricelist-upload-area">
					{/* Mode Switcher — Canonical Dente Segmented Bar */}
					<div className="dente-segmented-bar mb-3 shrink-0" role="tablist">
						<button
							type="button"
							className={`dente-segmented-item ${activeSourceMode === "excel_csv" ? "active" : ""}`}
							data-active={activeSourceMode === "excel_csv"}
							onClick={() => setActiveSourceMode("excel_csv")}
						>
							<FileSpreadsheet size={15} />
							<span>Excel (.xlsx, .xls) и CSV (.csv)</span>
						</button>
						<button
							type="button"
							className={`dente-segmented-item ${activeSourceMode === "text" ? "active" : ""}`}
							data-active={activeSourceMode === "text"}
							onClick={() => {
								setActiveSourceMode("text");
								setPricelistSourceKind?.("text");
							}}
						>
							<FileText size={15} />
							<span>Вставка текста</span>
						</button>
						<button
							type="button"
							className={`dente-segmented-item ${activeSourceMode === "photo" ? "active" : ""}`}
							data-active={activeSourceMode === "photo"}
							onClick={() => {
								setActiveSourceMode("photo");
								setPricelistSourceKind?.("photo");
							}}
						>
							<ImageIcon size={15} />
							<span>Фото / Скан (ИИ-распознавание)</span>
						</button>
					</div>

					{/* 1. Excel / CSV Dropzone Mode */}
					{activeSourceMode === "excel_csv" && (
						<div>
							<div
								className={`pricelist-dropzone ${dragOver ? "pricelist-dropzone-active" : ""}`}
								onDragOver={(e) => {
									e.preventDefault();
									setDragOver(true);
								}}
								onDragLeave={(e) => {
									e.preventDefault();
									setDragOver(false);
								}}
								onDrop={(e) => {
									e.preventDefault();
									setDragOver(false);
									const file = e.dataTransfer.files[0];
									if (file) handleFileSelect(file);
								}}
								onClick={() => fileInputRef.current?.click()}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										fileInputRef.current?.click();
									}
								}}
								role="button"
								tabIndex={0}
							>
								<input
									type="file"
									ref={fileInputRef}
									accept=".xlsx,.xls,.ods,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
									style={{ display: "none" }}
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (file) handleFileSelect(file);
									}}
								/>

								<div className="dropzone-placeholder">
									<UploadCloud size={40} className="text-teal mb-2" />
									<p style={{ fontWeight: 600, fontSize: "14px", margin: "4px 0" }}>
										Перетащите сюда файл прейскуранта или нажмите для выбора
									</p>
									<span style={{ fontSize: "12px", color: "var(--muted)" }}>
										Поддерживаются книги Excel (.xlsx, .xls), OpenDocument (.ods) и
										файлы CSV (.csv)
									</span>

									{selectedFile && (
										<div
											style={{
												marginTop: "12px",
												display: "inline-flex",
												alignItems: "center",
												gap: "8px",
												padding: "6px 14px",
												background: "var(--paper-soft)",
												border: "1px solid var(--line)",
												borderRadius: "6px",
											}}
										>
											<FileSpreadsheet size={18} className="text-teal" />
											<strong style={{ fontSize: "13px" }}>{selectedFile.name}</strong>
											<span style={{ fontSize: "12px", color: "var(--muted)" }}>
												({Math.round(selectedFile.size / 1024)} КБ)
											</span>
										</div>
									)}
								</div>
							</div>

							{isParsingFile && (
								<div style={{ marginTop: "12px", textAlign: "center" }}>
									<div className="pricelist-progress-bar-container">
										<div
											className="pricelist-progress-bar-fill"
											style={{ width: "70%" }}
										/>
									</div>
									<span style={{ fontSize: "13px", color: "var(--muted)" }}>
										Анализ книги, распознавание колонок и сопоставление услуг...
									</span>
								</div>
							)}
						</div>
					)}

					{/* 2. Text Area Mode */}
					{activeSourceMode === "text" && (
						<div className="pricelist-input-group">
							<textarea
								placeholder="Вставьте сюда строки прейскуранта (например, из буфера обмена или таблицы)..."
								rows={8}
								value={pricelistText}
								onChange={(e) => setPricelistText?.(e.target.value)}
							/>
							<div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
								<button
									className="primary-button"
									type="button"
									disabled={isPricelistAnalyzing || !pricelistText.trim()}
									onClick={analyzePricelist}
								>
									<Sparkles size={16} className="mr-1 inline" />
									{isPricelistAnalyzing ? "Анализ..." : "Распознать текст"}
								</button>
							</div>
						</div>
					)}

					{/* 3. Photo / Scan Mode */}
					{(activeSourceMode === "photo" || activeSourceMode === "scan") && (
						<div className="pricelist-dropzone">
							<input
								type="file"
								id="pricelist-file"
								accept="image/*"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file && attachPricelistImage) attachPricelistImage(file);
								}}
								style={{ display: "none" }}
							/>
							<label htmlFor="pricelist-file" className="dropzone-label">
								{pricelistImageName ? (
									<div className="file-attached">
										<ImageIcon size={32} />
										<span>{pricelistImageName}</span>
										<button
											type="button"
											className="icon-button danger"
											onClick={(e) => {
												e.preventDefault();
												clearPricelistImage?.();
											}}
										>
											<X size={16} />
										</button>
									</div>
								) : (
									<div className="dropzone-placeholder">
										<UploadCloud size={36} />
										<p>Нажмите для загрузки фото или скана</p>
										<span>PNG, JPG до 10MB</span>
									</div>
								)}
							</label>
						</div>
					)}
				</div>
			</section>

			{/* Tabular Analysis Results & Column Mapping Preview */}
			{tabularAnalysis && (
				<section className="pricelist-section-card">
					{/* Header with Vendor Badge */}
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							borderBottom: "1px solid var(--line)",
							paddingBottom: "12px",
							marginBottom: "16px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
							<span className="pricelist-vendor-badge">
								<Layers size={14} />
								Формат: {tabularAnalysis.vendorLabel}
							</span>
							{availableSheets.length > 1 && (
								<div className="dente-segmented-bar shrink-0" role="tablist">
									{availableSheets.map((sheet, idx) => (
										<button
											key={sheet}
											type="button"
											className={`dente-segmented-item ${selectedSheetIndex === idx ? "active" : ""}`}
											data-active={selectedSheetIndex === idx}
											onClick={() => {
												if (selectedFile) {
													parseSpreadsheetFile(
														selectedFile.base64,
														selectedFile.name,
														idx,
														customMapping,
													);
												}
											}}
										>
											{sheet}
										</button>
									))}
								</div>
							)}
						</div>

						<div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
							<span>
								Всего строк: <strong>{tabularAnalysis.totalRows}</strong>
							</span>
							<span style={{ color: "var(--teal)" }}>
								Корректных: <strong>{tabularAnalysis.validRowsCount}</strong>
							</span>
							{tabularAnalysis.errorRowsCount > 0 && (
								<span style={{ color: "var(--danger-color, #ef4444)" }}>
									С ошибками: <strong>{tabularAnalysis.errorRowsCount}</strong>
								</span>
							)}
						</div>
					</div>

					{/* Collision Strategy Selector */}
					<div style={{ marginBottom: "16px" }}>
						<label
							htmlFor="collision-strategy-selector"
							style={{
								fontSize: "13px",
								fontWeight: 600,
								color: "var(--ink)",
								display: "block",
								marginBottom: "6px",
							}}
						>
							Стратегия при совпадении с существующим прейскурантом:
						</label>
						<div id="collision-strategy-selector" className="pricelist-collision-group">
							<label className="pricelist-collision-option">
								<input
									type="radio"
									name="collisionStrat"
									value="update_existing"
									checked={collisionStrategy === "update_existing"}
									onChange={() => setCollisionStrategy("update_existing")}
								/>
								<span>
									<strong>Обновить цены существующих</strong> (новые услуги добавляются,
									найденные по коду/названию обновляют цену)
								</span>
							</label>

							<label className="pricelist-collision-option">
								<input
									type="radio"
									name="collisionStrat"
									value="skip_duplicates"
									checked={collisionStrategy === "skip_duplicates"}
									onChange={() => setCollisionStrategy("skip_duplicates")}
								/>
								<span>
									<strong>Пропустить дубликаты</strong> (добавить только новые услуги, не
									трогая текущие)
								</span>
							</label>

							<label className="pricelist-collision-option">
								<input
									type="radio"
									name="collisionStrat"
									value="create_new"
									checked={collisionStrategy === "create_new"}
									onChange={() => setCollisionStrategy("create_new")}
								/>
								<span>
									<strong>Создать новые копии</strong> (создать новую позицию для каждой
									строки файла)
								</span>
							</label>
						</div>
					</div>

					{/* 10-Row Live Preview Table with Column Mapping Selectors */}
					<div>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "8px",
							}}
						>
							<h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
								Предпросмотр структуры колонок (первые 10 строк)
							</h4>
							<span style={{ fontSize: "12px", color: "var(--muted)" }}>
								Выберите назначение колонок в выпадающих списках для точной настройки
							</span>
						</div>

						<div className="pricelist-preview-container">
							<div className="pricelist-preview-table-wrapper">
								<table className="pricelist-preview-table">
									<thead>
										<tr>
											<th style={{ width: "40px" }}>№</th>
											{tabularAnalysis.headers.map((hdr, colIdx) => (
												<th key={`hdr-${hdr || `col-${colIdx}`}`}>
													<div style={{ fontSize: "12px", color: "var(--muted)" }}>
														{hdr || `Колонка ${colIdx + 1}`}
													</div>
													<select
														className="pricelist-mapping-select"
														value={(() => {
															if (customMapping.titleCol === colIdx) return "title";
															if (customMapping.priceCol === colIdx) return "priceRub";
															if (customMapping.codeCol === colIdx) return "code";
															if (customMapping.order804nCol === colIdx)
																return "order804nCode";
															if (customMapping.categoryCol === colIdx)
																return "category";
															if (customMapping.specialtyCol === colIdx)
																return "specialty";
															if (customMapping.costCol === colIdx) return "costRub";
															if (customMapping.durationCol === colIdx)
																return "durationMinutes";
															if (customMapping.warrantyCol === colIdx)
																return "warrantyMonths";
															return "ignore";
														})()}
														onChange={(e) =>
															handleColumnMappingChange(
																e.target.value as PricelistColumnTargetKey,
																colIdx,
															)
														}
													>
														<option value="ignore">— Не импортировать —</option>
														<option value="title">Наименование услуги (Обязательно)</option>
														<option value="priceRub">Цена услуги в рублях (Обязательно)</option>
														<option value="code">Артикул / Код клиники</option>
														<option value="order804nCode">Официальный код услуги (Номенклатура)</option>
														<option value="category">Раздел / Группа</option>
														<option value="specialty">Специальность врача</option>
														<option value="costRub">Себестоимость / Расход</option>
														<option value="durationMinutes">Длительность (мин)</option>
														<option value="warrantyMonths">Гарантия (мес)</option>
													</select>
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{tabularAnalysis.previewRows.map((row) => (
											<tr
												key={row.rowNumber}
												style={{
													background:
														row.validationStatus === "error"
															? "rgba(239, 68, 68, 0.05)"
															: undefined,
												}}
											>
												<td style={{ color: "var(--muted)", fontWeight: 600 }}>
													{row.rowNumber}
												</td>
												{tabularAnalysis.headers.map((_, colIdx) => (
													<td
														key={`cell-${row.rowNumber}-${colIdx}`}
														title={row.rawCells[colIdx] || ""}
													>
														{row.rawCells[colIdx] || (
															<span style={{ color: "var(--muted)", fontStyle: "italic" }}>
																—
															</span>
														)}
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>

					{/* Actionable Error Box (if any) */}
					{tabularAnalysis.errors.length > 0 && (
						<div className="pricelist-error-box">
							<h4>
								<AlertTriangle size={16} />
								Предупреждения валидации строк ({tabularAnalysis.errors.length})
							</h4>
							<ul className="pricelist-error-list">
								{tabularAnalysis.errors.slice(0, 8).map((err) => (
									<li key={`err-${err.rowNumber}-${err.field}`}>
										<strong>Строка {err.rowNumber}:</strong> {err.message}
										{err.rawCell ? ` ("${err.rawCell}")` : ""}
									</li>
								))}
								{tabularAnalysis.errors.length > 8 && (
									<li>
										...и ещё {tabularAnalysis.errors.length - 8} строк с аналогичными
										замечаниями.
									</li>
								)}
							</ul>
						</div>
					)}

					{/* Action Bar */}
					<div className="pricelist-save-bar">
						<div>
							{importResult?.count !== undefined && (
								<span
									style={{
										color: "var(--teal)",
										fontWeight: 600,
										fontSize: "14px",
										display: "inline-flex",
										alignItems: "center",
										gap: "6px",
									}}
								>
									<CheckCircle2 size={16} />
									Успешно импортировано: {importResult.count} услуг. База обновлена.
								</span>
							)}
							{importResult?.error && (
								<span
									style={{
										color: "var(--danger-color, #ef4444)",
										fontWeight: 600,
										fontSize: "14px",
										display: "inline-flex",
										alignItems: "center",
										gap: "6px",
									}}
								>
									<X size={16} />
									Ошибка: {importResult.error}
								</span>
							)}
						</div>

						<div className="flex items-center gap-2">
							<button
								className="secondary-button h-8 px-3 text-[13px] font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
								type="button"
								onClick={() => setIsDiffModalOpen(true)}
							>
								<Sparkles size={15} className="text-[var(--teal)] shrink-0" />
								<span>Сопоставление с каталогом услуг</span>
							</button>

							<button
								className="primary-button h-8 px-4 text-[13px] font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
								type="button"
								disabled={isImporting || tabularAnalysis.validRowsCount === 0}
								onClick={() => handleBatchImportSubmit()}
							>
								<Database size={15} className="shrink-0" />
								<span>
									{isImporting
										? "Импорт в базу..."
										: `Импортировать в прейскурант (${tabularAnalysis.validRowsCount})`}
								</span>
							</button>
						</div>
					</div>
				</section>
			)}

			{/* Dual-Pane Mapping Diff Modal */}
			{isDiffModalOpen && (
				<div
					role="dialog"
					aria-modal="true"
					className="premium-modal-overlay"
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0, 0, 0, 0.65)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 9999,
						padding: "16px",
					}}
				>
					<div
						style={{
							background: "var(--paper)",
							borderRadius: "12px",
							width: "95vw",
							maxWidth: "1400px",
							height: "90vh",
							maxHeight: "900px",
							display: "flex",
							flexDirection: "column",
							overflow: "hidden",
							boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
							border: "1px solid var(--line)",
						}}
					>
						<div
							style={{
								padding: "12px 20px",
								borderBottom: "1px solid var(--line)",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<Sparkles size={18} className="text-teal" />
								<h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
									Интеллектуальное сопоставление с официальным каталогом услуг
								</h3>
							</div>
							<button
								type="button"
								className="icon-button"
								onClick={() => setIsDiffModalOpen(false)}
							>
								<X size={18} />
							</button>
						</div>

						<div style={{ flex: 1, overflow: "hidden" }}>
							<PriceListMappingDiffView
								items={mappingDiffItems}
								onApply={(approved) => handleBatchImportSubmit(approved)}
								onCancel={() => setIsDiffModalOpen(false)}
								isLoading={isImporting}
							/>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
