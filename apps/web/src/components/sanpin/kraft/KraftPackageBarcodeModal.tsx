/**
 * ============================================================================
 * KRAFT PACKAGE BARCODE & EXPIRY STUDIO MODAL (TOUCH-FIRST HUD)
 * SanPiN 3.3686-21 / GOST R ISO 11607 Statutory Packaging Studio
 * Экспресс-конструктор упаковок, 2D DataMatrix vector barcodes, thermal printing.
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8b, 8e, 8n, 8v
 * All components strictly <= 800 lines (subcomponents <= 500 lines).
 * ============================================================================
 */

import {
	FileBadge,
	Layers,
	PackageCheck,
	Plus,
	Printer,
	Scan,
	ShieldCheck,
	Terminal,
	X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast";
import {
	calculateKraftBatchStatistics,
	calculatePackageExpiration,
	exportKraftBatchToCsv,
	filterKraftPackages,
	generateKraftBatchRecords,
	generateThermalStickerHtml,
	type KraftPackageRecord,
	type KraftPackageStatus,
} from "./kraftPackageEngine";
import {
	CLINIC_AUTOCLAVE_UNITS,
	getDentalToolSetDefinition,
	type KraftPackageMaterialId,
	type KraftPackageSizeId,
} from "./kraftPackagePresets";
import {
	KraftToolSetSelector,
	POPULAR_KRAFT_PRESETS,
	type QuickKraftPreset,
} from "./KraftToolSetSelector";
import { KraftAutoclaveBatchConfig } from "./KraftAutoclaveBatchConfig";
import { KraftSterilizationIndicatorValidator } from "./KraftSterilizationIndicatorValidator";
import { KraftBarcodeLabelGenerator } from "./KraftBarcodeLabelGenerator";
import { KraftPackageRegistryTab } from "./KraftPackageRegistryTab";
import { KraftScannerProtocolLinkTab } from "./KraftScannerProtocolLinkTab";
import { KraftStandardsTab } from "./KraftStandardsTab";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { hardwareScanner } from "../../../services/hardware/HardwareScanner.js";
import {
	parseAndValidateKraftBarcode,
	type ParsedKraftBarcode,
} from "@dental/shared";
import "./kraftPackage.css";

// Canonical re-export for external consumers
export { POPULAR_KRAFT_PRESETS, type QuickKraftPreset };

export interface KraftPackageBarcodeModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onBatchCreated?: ((records: KraftPackageRecord[]) => void) | undefined;
	readonly onAttachToProtocol?: ((parsed: ParsedKraftBarcode) => void | Promise<void>) | undefined;
	readonly initialAutoclaveId?: string | undefined;
	readonly initialCycleNumber?: number | undefined;
	readonly initialOperatorName?: string | undefined;
	readonly initialBarcode?: string | undefined;
}

export type StudioActiveTab = "builder" | "scan" | "register" | "print" | "tspl_zpl" | "standards";

export function KraftPackageBarcodeModal({
	isOpen,
	onClose,
	onBatchCreated,
	onAttachToProtocol,
	initialAutoclaveId,
	initialCycleNumber = 1,
	initialOperatorName = "Персонал клиники",
	initialBarcode = "",
}: KraftPackageBarcodeModalProps) {
	// ─── Modal State ─────────────────────────────────────────────────────────────
	const [activeTab, setActiveTab] = useState<StudioActiveTab>("builder");

	// Builder Form State
	const [selectedMaterialId, setSelectedMaterialId] =
		useState<KraftPackageMaterialId>("paper_self_seal_single");
	const [selectedSizeId, setSelectedSizeId] =
		useState<KraftPackageSizeId>("size_100x200");
	const [selectedToolSetId, setSelectedToolSetId] =
		useState<string>("set_therapeutic_tray");
	const [selectedIndicatorId, setSelectedIndicatorId] =
		useState<string>("vinar_steritest_4");
	const [selectedAutoclaveId, setSelectedAutoclaveId] =
		useState<string>(initialAutoclaveId || CLINIC_AUTOCLAVE_UNITS[0]?.id || "AUTO-01");
	const [cycleNumber, setCycleNumber] = useState<number>(initialCycleNumber);
	const [packQuantity, setPackQuantity] = useState<number>(10);
	const [operatorName] = useState<string>(initialOperatorName || "Персонал клиники");
	const [customItemsText, setCustomItemsText] = useState<string>("");
	const [previewLabelSize, setPreviewLabelSize] = useState<"58x40" | "43x25">("58x40");

	// Package Registry State
	const [packages, setPackages] = useState<KraftPackageRecord[]>(() => {
		if (!isDemoShowcaseMode()) {
			return [];
		}
		return generateKraftBatchRecords({
			autoclaveId: initialAutoclaveId || "AUTO-01",
			cycleNumber: initialCycleNumber || 1,
			packageType: "paper_self_seal_single",
			packageSize: "size_100x200",
			toolSetId: "set_therapeutic_tray",
			quantity: 6,
			operatorName: initialOperatorName,
			indicatorId: "vinar_steritest_4",
		});
	});

	// Filters & Selection
	const [statusFilter, setStatusFilter] = useState<KraftPackageStatus | "all">("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());

	// Quick Scanner State
	const [scannedInput, setScannedInput] = useState<string>(initialBarcode || "");

	// Subscribe to HardwareScanner global events
	useEffect(() => {
		const unsubscribe = hardwareScanner.subscribe((result) => {
			if (result.success && result.rawCode) {
				setScannedInput(result.rawCode);
				showToast(`Штрихкод крафт-пакета: ${result.rawCode}`, "success");
			}
		});

		return () => {
			unsubscribe();
		};
	}, []);

	// Scanned Barcode Validation
	const parsedScanned = useMemo<ParsedKraftBarcode | null>(() => {
		if (!scannedInput.trim()) return null;
		return parseAndValidateKraftBarcode(scannedInput.trim());
	}, [scannedInput]);

	// Attach Scanned to medical card protocol
	const handleAttachScannedTo043 = async () => {
		if (!parsedScanned) return;
		if (parsedScanned.isExpired) {
			showToast("Внимание: крафт-пакет просрочен по СанПиН 3.3686-21! Привязан к протоколу приёма с предупреждением.", "warning");
		}
		if (onAttachToProtocol) {
			await onAttachToProtocol(parsedScanned);
			if (!parsedScanned.isExpired) {
				showToast("Пакет успешно привязан к протоколу приёма (медицинская карта)", "success");
			}
			onClose();
		} else {
			showToast("Протокол для привязки не передан", "warning");
		}
	};

	// Регламентная фиксация стерилизации (Норма / Тест-индикатор 5 класса)
	const handleFixateSterilizationNorm = async () => {
		const todayIso = new Date().toISOString().slice(0, 10);
		const expDateIso = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
		const autoId = selectedAutoclaveId || "AUTO-01";
		const cycNum = cycleNumber || 1;
		const toolName = selectedToolSet?.nameRu || "Набор смотровой терапевтический";
		const rawCode = `KP-AUTO-NORM-${Date.now().toString().slice(-4)}`;
		const record: ParsedKraftBarcode = {
			rawInput: rawCode,
			barcodeType: "datamatrix_2d",
			isValid: true,
			isExpired: false,
			isExpiringSoon: false,
			daysRemaining: 30,
			daysLifespan: 30,
			batchId: `KB-${todayIso.replace(/-/g, "")}-01`,
			autoclaveId: autoId,
			cycleNumber: cycNum,
			packDateIso: todayIso,
			expDateIso: expDateIso,
			operatorId: "STAFF-01",
			operatorName: operatorName || "Персонал клиники",
			toolSetId: selectedToolSetId || "set_therapeutic_tray",
			toolSetNameRu: toolName,
			packageMaterialId: selectedMaterialId || "paper_self_seal_single",
			packageSizeId: selectedSizeId || "size_100x200",
			indicatorId: "vinar_intetest_5",
			indicatorClassRu: "Химический интегратор 5 класса (ИнтеТЕСТ / ГОСТ ISO 11140-1)",
			indicatorPassed: true,
			sanpinClauseRu: "СанПиН 3.3686-21 Таблица 3.14",
			formattedProtocolRecord043: `Стерилизация проведена: Автоклав ${autoId}, цикл №${cycNum}, крафт-пакет «${toolName}». Тест-индикатор 5 класса (Норма). Вскрыт при пациенте.`,
		};
		setScannedInput(rawCode);
		if (onAttachToProtocol) {
			await onAttachToProtocol(record);
			showToast("Стерилизация зафиксирована (Тест-индикатор 5 класса, Норма) и внесена в карту", "success");
			onClose();
		} else {
			showToast("Стерилизация зафиксирована: Тест-индикатор 5 класса (Норма)", "success");
		}
	};

	const handleApplyPopularPreset = (preset: QuickKraftPreset) => {
		setSelectedMaterialId(preset.materialId);
		setSelectedSizeId(preset.sizeId);
		showToast(`Применен пресет: ${preset.brandNameRu} (${preset.shelfLifeDays} сут.)`, "info", 2000);
	};

	// ─── Derived Calculations ────────────────────────────────────────────────────
	const selectedToolSet = useMemo(
		() => getDentalToolSetDefinition(selectedToolSetId),
		[selectedToolSetId],
	);

	const liveExpiry = useMemo(
		() => calculatePackageExpiration(new Date(), selectedMaterialId),
		[selectedMaterialId],
	);

	const filteredPackages = useMemo(() => {
		return filterKraftPackages(packages, {
			status: statusFilter,
			query: searchQuery,
		});
	}, [packages, statusFilter, searchQuery]);

	const stats = useMemo(
		() => calculateKraftBatchStatistics(packages),
		[packages],
	);

	const previewPackageRecord = useMemo<KraftPackageRecord>(() => {
		return {
			id: "preview-id",
			batchId: "KB-20260822-01",
			serialNumber: 1,
			packageType: selectedMaterialId,
			packageSize: selectedSizeId,
			toolSetId: selectedToolSet.id,
			toolSetNameRu: selectedToolSet.nameRu,
			itemsListRu: selectedToolSet.typicalItemsRu,
			packDate: liveExpiry.packDateFormatted,
			expDate: liveExpiry.expDateFormatted,
			daysLifespan: liveExpiry.daysLifespan,
			daysRemaining: liveExpiry.daysRemaining,
			status: liveExpiry.status,
			autoclaveId: selectedAutoclaveId,
			cycleNumber,
			operatorId: "NURSE-01",
			operatorName,
			indicatorId: selectedIndicatorId,
			indicatorVerified: true,
			barcode128: "KB2608220001",
			barcodeDataMatrixPayload: `KB-20260822-01#1|${selectedAutoclaveId}|CYC${cycleNumber}|${liveExpiry.packDateFormatted}|${liveExpiry.expDateFormatted}|NURSE-01|${selectedToolSet.shortCode}`,
			isBreached: false,
			notes: "",
			createdAt: new Date().toISOString(),
		};
	}, [
		selectedMaterialId,
		selectedSizeId,
		selectedToolSet,
		liveExpiry,
		selectedAutoclaveId,
		cycleNumber,
		operatorName,
		selectedIndicatorId,
	]);

	if (!isOpen) return null;

	// ─── Handlers ────────────────────────────────────────────────────────────────
	const handleToolSetChange = (toolSetId: string) => {
		setSelectedToolSetId(toolSetId);
		const def = getDentalToolSetDefinition(toolSetId);
		setSelectedMaterialId(def.defaultMaterialId);
		setSelectedSizeId(def.defaultSizeId);
		setCustomItemsText(def.typicalItemsRu.join(", "));
	};

	const handleCreateBatch = () => {
		const customItems = customItemsText
			? customItemsText.split(",").map((s) => s.trim()).filter(Boolean)
			: selectedToolSet.typicalItemsRu;

		const newBatch = generateKraftBatchRecords({
			autoclaveId: selectedAutoclaveId,
			cycleNumber,
			packageType: selectedMaterialId,
			packageSize: selectedSizeId,
			toolSetId: selectedToolSetId,
			customItems,
			quantity: packQuantity,
			operatorName,
			indicatorId: selectedIndicatorId,
			indicatorVerified: true,
		});

		const updated = [...newBatch, ...packages];
		setPackages(updated);
		onBatchCreated?.(newBatch);

		showToast(
			`Сформирована партия из ${newBatch.length} крафт-пакетов «${selectedToolSet.nameRu}». Срок стерильности: ${liveExpiry.daysLifespan} сут.`,
			"success",
		);

		setActiveTab("register");
	};

	const handleQuickBatchAndPrint = (count = 10) => {
		const customItems = customItemsText
			? customItemsText.split(",").map((s) => s.trim()).filter(Boolean)
			: selectedToolSet.typicalItemsRu;

		const newBatch = generateKraftBatchRecords({
			autoclaveId: selectedAutoclaveId,
			cycleNumber,
			packageType: "paper_self_seal_single",
			packageSize: selectedSizeId,
			toolSetId: selectedToolSetId,
			customItems,
			quantity: count,
			operatorName,
			indicatorId: selectedIndicatorId,
			indicatorVerified: true,
		});

		const updated = [...newBatch, ...packages];
		setPackages(updated);
		onBatchCreated?.(newBatch);

		const stickersHtml = newBatch
			.map((p) => generateThermalStickerHtml(p, { size: previewLabelSize }))
			.join("\n<div style='page-break-after:always;'></div>\n");

		const fullHtml = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>Печать термоэтикеток стерилизации (${count} шт., 30 дн.)</title>
				<style>
					@page { size: ${previewLabelSize === "58x40" ? "58mm 40mm" : "43mm 25mm"}; margin: 0; }
					body { margin: 0; padding: 0; background: #fff; }
				</style>
			</head>
			<body>
				${stickersHtml}
				<script>
					window.onload = function() { window.print(); };
				</script>
			</body>
			</html>
		`;

		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(fullHtml);
			printWindow.document.close();
		}

		showToast(
			`Сформирована и отправлена на печать пачка из ${count} крафт-пакетов (срок 30 суток по СанПиН 3.3686-21)`,
			"success",
		);
		setActiveTab("register");
	};

	const handleDeletePackage = (id: string) => {
		setPackages((prev) => prev.filter((p) => p.id !== id));
		showToast("Пакет удален из реестра ЦСО", "info");
	};

	const handleToggleBreached = (id: string) => {
		setPackages((prev) =>
			prev.map((p) => {
				if (p.id === id) {
					const nextBreached = !p.isBreached;
					return {
						...p,
						isBreached: nextBreached,
						status: nextBreached ? "recalled" : "sterile_valid",
					};
				}
				return p;
			}),
		);
		showToast("Статус целостности упаковки обновлен", "info");
	};

	const handleExportCsv = () => {
		const csv = exportKraftBatchToCsv(packages);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `kraft_packages_register_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast("Реестр крафт-пакетов экспортирован в CSV (UTF-8 BOM)", "success");
	};

	const handleSelectAllForPrint = () => {
		if (selectedForPrint.size === packages.length) {
			setSelectedForPrint(new Set());
		} else {
			setSelectedForPrint(new Set(packages.map((p) => p.id)));
		}
	};

	const handleTogglePrintItem = (id: string) => {
		setSelectedForPrint((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	// ─── Render ──────────────────────────────────────────────────────────────────
	return (
		<div className="kraft-studio-overlay" role="dialog" aria-modal="true">
			<div className="kraft-studio-modal">
				{/* Top Header */}
				<div className="kraft-studio-header">
					<div className="kraft-studio-title-block">
						<PackageCheck size={26} color="var(--teal, #0d9488)" />
						<div>
							<h2>Студия маркировки и учета крафт-пакетов ЦСО</h2>
							<div className="kraft-studio-subtitle">
								Контроль стерильности • Стандарты упаковки • 2D DataMatrix маркировка
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="kraft-studio-close-btn"
						title="Закрыть студию"
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>

				{/* Tabs Navigation */}
				<div className="kraft-studio-tabs-nav">
					<button
						type="button"
						onClick={() => setActiveTab("builder")}
						className={`kraft-tab-btn ${activeTab === "builder" ? "active" : ""}`}
					>
						<Plus size={16} /> 1. Новая партия (Мастер упаковки)
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("register")}
						className={`kraft-tab-btn ${activeTab === "register" ? "active" : ""}`}
					>
						<Layers size={16} /> 2. Реестр пакетов ({packages.length})
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("print")}
						className={`kraft-tab-btn ${activeTab === "print" ? "active" : ""}`}
					>
						<Printer size={16} /> 3. Печать этикеток (Thermal / A4)
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("standards")}
						className={`kraft-tab-btn ${activeTab === "standards" ? "active" : ""}`}
					>
						<FileBadge size={16} /> 4. Нормативы стерильности
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("tspl_zpl")}
						className={`kraft-tab-btn ${activeTab === "tspl_zpl" ? "active" : ""}`}
					>
						<Terminal size={16} /> 5. Прямая печать TSPL / ZPL
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("scan")}
						className={`kraft-tab-btn ${activeTab === "scan" ? "active" : ""}`}
						data-testid="tab-kraft-scanner"
					>
						<Scan size={16} /> 6. Служебный сканер (опционально)
					</button>
				</div>

				{/* Modal Body */}
				<div className="kraft-studio-body">
					{/* ─── TAB 1: BUILDER ──────────────────────────────────────────────── */}
					{activeTab === "builder" && (
						<div className="kraft-builder-grid">
							{/* Left Column: Form Controls */}
							<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
								{/* Step 1: Tool Set Selector (Subcomponent) */}
								<KraftToolSetSelector
									selectedToolSetId={selectedToolSetId}
									onToolSetChange={handleToolSetChange}
									customItemsText={customItemsText}
									onCustomItemsChange={setCustomItemsText}
									selectedMaterialId={selectedMaterialId}
									selectedSizeId={selectedSizeId}
									onApplyPopularPreset={handleApplyPopularPreset}
								/>

								{/* Steps 2 & 3: Material, Size, Autoclave & Quantity (Subcomponent) */}
								<KraftAutoclaveBatchConfig
									selectedMaterialId={selectedMaterialId}
									onMaterialChange={setSelectedMaterialId}
									selectedSizeId={selectedSizeId}
									onSizeChange={setSelectedSizeId}
									selectedAutoclaveId={selectedAutoclaveId}
									onAutoclaveChange={setSelectedAutoclaveId}
									cycleNumber={cycleNumber}
									onCycleNumberChange={setCycleNumber}
									packQuantity={packQuantity}
									onPackQuantityChange={setPackQuantity}
								/>
							</div>

							{/* Right Column: Live Sticker Preview & Chemical Indicator Validator */}
							<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
								{/* Barcode Label Preview (Subcomponent) */}
								<KraftBarcodeLabelGenerator
									viewMode="live_preview"
									previewPackage={previewPackageRecord}
									previewLabelSize={previewLabelSize}
									onPreviewLabelSizeChange={setPreviewLabelSize}
									packages={packages}
									selectedForPrint={selectedForPrint}
									onTogglePrintItem={handleTogglePrintItem}
									onSelectAllForPrint={handleSelectAllForPrint}
								/>

								{/* Chemical Indicator Validator (Subcomponent) */}
								<KraftSterilizationIndicatorValidator
									selectedIndicatorId={selectedIndicatorId}
									onIndicatorChange={setSelectedIndicatorId}
								/>

								{/* Action Submit Buttons */}
								<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
									<button
										type="button"
										onClick={() => handleQuickBatchAndPrint(10)}
										className="kraft-btn touch-manipulation"
										style={{
											minHeight: "52px",
											fontSize: "1rem",
											fontWeight: 700,
											background: "var(--teal, #0d9488)",
											borderColor: "var(--teal, #0d9488)",
											color: "#ffffff",
											boxShadow: "0 4px 14px rgba(13, 148, 136, 0.35)",
											display: "inline-flex",
											alignItems: "center",
											justifyContent: "center",
											gap: "0.5rem",
											cursor: "pointer",
										}}
										title="Формирование и печать пачки из 10 наклеек (срок годности 30 дней для запечатанных пакетов) без блокирующих окон"
										data-testid="kraft-quick-batch-and-print-btn"
									>
										<Printer size={20} />
										<span>Печать пачки (10 шт. / 30 дн.)</span>
									</button>

									<button
										type="button"
										onClick={handleCreateBatch}
										className="kraft-btn kraft-btn-secondary"
										style={{ minHeight: "44px", fontSize: "0.95rem" }}
									>
										<Plus size={18} />
										Сформировать партию ({packQuantity} пакетов)
									</button>
								</div>
							</div>
						</div>
					)}

					{/* ─── TAB 2: QUICK SCANNER & 043/U LINK (Subcomponent) ───────────── */}
					{activeTab === "scan" && (
						<KraftScannerProtocolLinkTab
							scannedInput={scannedInput}
							onScannedInputChange={setScannedInput}
							parsedScanned={parsedScanned}
							onFixateSterilizationNorm={handleFixateSterilizationNorm}
							onAttachScannedTo043={handleAttachScannedTo043}
						/>
					)}

					{/* ─── TAB 3: REGISTER (Subcomponent) ─────────────────────────────── */}
					{activeTab === "register" && (
						<KraftPackageRegistryTab
							packages={packages}
							filteredPackages={filteredPackages}
							stats={stats}
							searchQuery={searchQuery}
							onSearchQueryChange={setSearchQuery}
							statusFilter={statusFilter}
							onStatusFilterChange={setStatusFilter}
							onExportCsv={handleExportCsv}
							onToggleBreached={handleToggleBreached}
							onDeletePackage={handleDeletePackage}
						/>
					)}

					{/* ─── TAB 4: PRINT (Subcomponent) ─────────────────────────────────── */}
					{activeTab === "print" && (
						<KraftBarcodeLabelGenerator
							viewMode="batch_print"
							previewLabelSize={previewLabelSize}
							onPreviewLabelSizeChange={setPreviewLabelSize}
							packages={packages}
							selectedForPrint={selectedForPrint}
							onTogglePrintItem={handleTogglePrintItem}
							onSelectAllForPrint={handleSelectAllForPrint}
						/>
					)}

					{/* ─── TAB 5: DIRECT PRINTER TSPL / ZPL (Subcomponent) ─────────────── */}
					{activeTab === "tspl_zpl" && (
						<KraftBarcodeLabelGenerator
							viewMode="tspl_zpl"
							previewPackage={previewPackageRecord}
							previewLabelSize={previewLabelSize}
							onPreviewLabelSizeChange={setPreviewLabelSize}
							packages={packages}
							selectedForPrint={selectedForPrint}
							onTogglePrintItem={handleTogglePrintItem}
							onSelectAllForPrint={handleSelectAllForPrint}
						/>
					)}

					{/* ─── TAB 6: STANDARDS & INDICATORS (Subcomponent) ───────────────── */}
					{activeTab === "standards" && <KraftStandardsTab />}
				</div>

				{/* Modal Footer */}
				<div className="kraft-studio-footer">
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--muted)" }}>
						<ShieldCheck size={16} color="var(--teal)" />
						<span>Ответственный: <strong>{operatorName}</strong> • ЭЦП штамп готов</span>
					</div>

					<div style={{ display: "flex", gap: "0.75rem" }}>
						<button
							type="button"
							onClick={onClose}
							className="kraft-btn kraft-btn-secondary"
						>
							Закрыть
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// Canonical re-export
export default KraftPackageBarcodeModal;
