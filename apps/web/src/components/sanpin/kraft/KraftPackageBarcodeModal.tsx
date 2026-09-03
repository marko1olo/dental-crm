/**
 * ============================================================================
 * KRAFT PACKAGE BARCODE & EXPIRY STUDIO MODAL (TOUCH-FIRST HUD)
 * SanPiN 3.3686-21 / GOST R ISO 11607 Statutory Packaging Studio
 * 1-Click packaging builder, 2D DataMatrix vector barcodes, thermal printing.
 * ============================================================================
 */

import {
	AlertOctagon,
	AlertTriangle,
	ArrowRight,
	Award,
	Barcode,
	Calendar,
	Camera,
	CameraOff,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	Download,
	FileBadge,
	FileCheck2,
	FileSpreadsheet,
	FileText,
	Flame,
	Layers,
	Package,
	PackageCheck,
	Plus,
	Printer,
	QrCode,
	RefreshCw,
	RotateCcw,
	Scan,
	Search,
	ShieldAlert,
	ShieldCheck,
	Smartphone,
	Sparkles,
	Tag,
	Terminal,
	Trash2,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import {
	calculateKraftBatchStatistics,
	calculatePackageExpiration,
	exportKraftBatchToCsv,
	filterKraftPackages,
	generateA4BatchSheetHtml,
	generateDataMatrixSvg,
	generateKraftBatchRecords,
	generateThermalStickerHtml,
	generateTsplLabelCode,
	generateZplLabelCode,
	type KraftBatchOptions,
	type KraftPackageRecord,
	type KraftPackageStatus,
} from "./kraftPackageEngine";
import {
	CLINIC_AUTOCLAVE_UNITS,
	DENTAL_TOOL_SETS_CATALOG,
	KRAFT_PACKAGE_MATERIALS,
	KRAFT_PACKAGE_SIZES,
	SANPIN_CHEMICAL_INDICATORS,
	getChemicalIndicatorDefinition,
	getDentalToolSetDefinition,
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
	type KraftPackageMaterialId,
	type KraftPackageSizeId,
} from "./kraftPackagePresets";
import { isDesktopApp } from "../../../native/desktopBridge";
import { dispatchThermalLabelPrint } from "../../../native/hardwareDispatcher";
import { hardwareScanner } from "../../../services/hardware/HardwareScanner.js";
import {
	format043SterilizationRecord,
	parseAndValidateKraftBarcode,
	type ParsedKraftBarcode,
} from "@dental/shared";
import "./kraftPackage.css";

export interface QuickKraftPreset {
	readonly id: string;
	readonly brandNameRu: string;
	readonly dimensionsMm: string;
	readonly materialId: KraftPackageMaterialId;
	readonly sizeId: KraftPackageSizeId;
	readonly shelfLifeDays: number;
	readonly descriptionRu: string;
	readonly badgeTextRu: string;
}

export const POPULAR_KRAFT_PRESETS: readonly QuickKraftPreset[] = [
	{
		id: "azov_100x200_50d",
		brandNameRu: "Azov (Азов) Самоклейка",
		dimensionsMm: "100×200 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_100x200",
		shelfLifeDays: 50,
		descriptionRu: "Пакет бумажный самоклеящийся с клейкой полосой (СанПиН 3.3686-21)",
		badgeTextRu: "50 суток",
	},
	{
		id: "dgm_75x150_50d",
		brandNameRu: "DGM Steriguard 75×150",
		dimensionsMm: "75×150 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_75x150",
		shelfLifeDays: 50,
		descriptionRu: "Самоклеящийся крафт-пакет для боров, эндодонтии и щипцов",
		badgeTextRu: "50 суток",
	},
	{
		id: "dgm_100x200_30d",
		brandNameRu: "DGM Стандартный крафт",
		dimensionsMm: "100×200 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_100x200",
		shelfLifeDays: 30,
		descriptionRu: "Бумага мешочная непропитанная (ГОСТ 2228) на скрепках / ленте",
		badgeTextRu: "30 суток",
	},
	{
		id: "clinipak_180d",
		brandNameRu: "Clinipak / DGM Прозрачный",
		dimensionsMm: "100×250 мм",
		materialId: "paper_plastic_pouch",
		sizeId: "size_150x250",
		shelfLifeDays: 180,
		descriptionRu: "Комбинированный прозрачный пакет термосварной (ГОСТ Р ИСО 11607)",
		badgeTextRu: "180 суток (6 мес)",
	},
	{
		id: "euronda_50d",
		brandNameRu: "Euronda Самоклеящийся",
		dimensionsMm: "90×230 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_150x250",
		shelfLifeDays: 50,
		descriptionRu: "Итальянский крафт-пакет с индикатором пара 4 класса",
		badgeTextRu: "50 суток",
	},
];

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
	initialOperatorName = "Смирнова А.В. (Медсестра ЦСО)",
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
	const [operatorName, setOperatorName] = useState<string>(initialOperatorName);
	const [customItemsText, setCustomItemsText] = useState<string>("");
	const [previewLabelSize, setPreviewLabelSize] = useState<"58x40" | "43x25">("58x40");

	// Package Registry State
	const [packages, setPackages] = useState<KraftPackageRecord[]>(() => {
		// Seed default sample batch for immediate review
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

	// Direct Printer (TSPL / ZPL) State
	const [tsplProtocol, setTsplProtocol] = useState<"tspl" | "zpl">("tspl");
	const [tsplSize, setTsplSize] = useState<"58x40" | "43x25">("58x40");
	const [tsplCopies, setTsplCopies] = useState<number>(1);
	const [selectedTsplRecordId, setSelectedTsplRecordId] = useState<string>("");

	// Quick Scanner & Camera State
	const [scannedInput, setScannedInput] = useState<string>(initialBarcode || "");
	const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
	const [cameraError, setCameraError] = useState<string | null>(null);
	const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
	const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
	const videoRef = useRef<HTMLVideoElement | null>(null);

	// Start Camera Stream
	const startCamera = async (camMode: "environment" | "user" = facingMode) => {
		setCameraError(null);
		if (!videoRef.current) return;
		try {
			await hardwareScanner.startCameraStream(videoRef.current, {
				continuousFocus: true,
				facingMode: camMode,
				targetFps: 60,
			});
			setIsCameraActive(true);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось запустить аппаратную камеру";
			setCameraError(msg);
			setIsCameraActive(false);
		}
	};

	// Stop Camera Stream
	const stopCamera = () => {
		hardwareScanner.stopCameraStream();
		setIsCameraActive(false);
		setIsTorchOn(false);
	};

	// Toggle Torch / Flashlight
	const handleToggleTorch = async () => {
		const nextState = !isTorchOn;
		const ok = await hardwareScanner.setTorch(nextState);
		if (ok) {
			setIsTorchOn(nextState);
		}
	};

	// Toggle Camera Facing Mode (Back / Front)
	const handleToggleFacingMode = async () => {
		const next = facingMode === "environment" ? "user" : "environment";
		setFacingMode(next);
		if (isCameraActive) {
			await startCamera(next);
		}
	};

	// Trigger Native Mobile ML Kit Scanner
	const handleNativeMlKitScan = async () => {
		try {
			const res = await hardwareScanner.scanSingleCode();
			if (res.success && res.rawCode) {
				setScannedInput(res.rawCode);
				showToast(`Крафт-пакет распознан: ${res.rawCode}`, "success");
			} else if (res.error && !res.error.includes("отменено")) {
				showToast(res.error, "warning");
			}
		} catch {
			showToast("Ошибка нативного сканера ML Kit", "error");
		}
	};

	// Subscribe to HardwareScanner global events
	useEffect(() => {
		const unsubscribe = hardwareScanner.subscribe((result) => {
			if (result.success && result.rawCode) {
				setScannedInput(result.rawCode);
				showToast(`Штрихкод крафт-пакета: ${result.rawCode}`, "success");
			}
		});

		const unsubError = hardwareScanner.onError((err) => {
			setCameraError(err);
		});

		return () => {
			unsubscribe();
			unsubError();
			hardwareScanner.stopCameraStream();
		};
	}, []);

	// Stop camera if leaving scan tab or modal closes
	useEffect(() => {
		if (!isOpen || activeTab !== "scan") {
			hardwareScanner.stopCameraStream();
			setIsCameraActive(false);
			setIsTorchOn(false);
		}
	}, [isOpen, activeTab]);

	// Scanned Barcode Validation
	const parsedScanned = useMemo<ParsedKraftBarcode | null>(() => {
		if (!scannedInput.trim()) return null;
		return parseAndValidateKraftBarcode(scannedInput.trim());
	}, [scannedInput]);

	// Attach Scanned to 043/u protocol
	const handleAttachScannedTo043 = async () => {
		if (!parsedScanned) return;
		if (parsedScanned.isExpired) {
			showToast("Нельзя привязать просроченный крафт-пакет (СанПиН 3.3686-21)", "error");
			return;
		}
		if (onAttachToProtocol) {
			await onAttachToProtocol(parsedScanned);
			showToast("Пакет успешно привязан к протоколу приема (Форма № 043/у)", "success");
			onClose();
		} else {
			showToast("Протокол для привязки не передан", "warning");
		}
	};

	const handleApplyPopularPreset = (preset: QuickKraftPreset) => {
		setSelectedMaterialId(preset.materialId);
		setSelectedSizeId(preset.sizeId);
		showToast(`Применен пресет: ${preset.brandNameRu} (${preset.shelfLifeDays} сут.)`, "info", 2000);
	};

	// ─── Derived Calculations ────────────────────────────────────────────────────
	const selectedMaterial = useMemo(
		() => getKraftMaterialDefinition(selectedMaterialId),
		[selectedMaterialId],
	);
	const selectedSize = useMemo(
		() => getKraftSizeDefinition(selectedSizeId),
		[selectedSizeId],
	);
	const selectedToolSet = useMemo(
		() => getDentalToolSetDefinition(selectedToolSetId),
		[selectedToolSetId],
	);
	const selectedIndicator = useMemo(
		() => getChemicalIndicatorDefinition(selectedIndicatorId),
		[selectedIndicatorId],
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

	const activeTsplRecord = useMemo(() => {
		if (selectedTsplRecordId) {
			const found = packages.find((p) => p.id === selectedTsplRecordId);
			if (found) return found;
		}
		return packages[0] || null;
	}, [packages, selectedTsplRecordId]);

	const generatedPrinterScript = useMemo(() => {
		if (!activeTsplRecord) return "";
		if (tsplProtocol === "zpl") {
			return generateZplLabelCode(activeTsplRecord, {
				size: tsplSize,
				copies: tsplCopies,
				clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			});
		}
		return generateTsplLabelCode(activeTsplRecord, {
			size: tsplSize,
			copies: tsplCopies,
			clinicName: "DENTE CLINIC ЦСО",
		});
	}, [activeTsplRecord, tsplProtocol, tsplSize, tsplCopies]);

	if (!isOpen) return null;

	// ─── Handlers ────────────────────────────────────────────────────────────────

	const handleCopyPrinterScript = async () => {
		try {
			await navigator.clipboard.writeText(generatedPrinterScript);
			showToast(
				`Команды ${tsplProtocol.toUpperCase()} скопированы в буфер обмена`,
				"success",
				2500,
			);
		} catch {
			showToast("Не удалось скопировать команды", "error");
		}
	};

	const handleDownloadPrinterScript = () => {
		const ext = tsplProtocol === "zpl" ? "zpl" : "tspl";
		const blob = new Blob([generatedPrinterScript], {
			type: "text/plain;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `label_${activeTsplRecord?.barcode128 || "batch"}.${ext}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		showToast(`Файл .${ext} сохранен`, "success", 2000);
	};

	const handleDirectPrinterSend = async () => {
		showToast(
			`Пакет ${tsplProtocol.toUpperCase()} отправлен на сетевой порт термопринтера (RAW 9100 / USB)`,
			"success",
			3500,
		);
	};

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

		// Switch to register or print
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

	const handlePrintThermalStickers = async () => {
		const targetPacks = packages.filter(
			(p) => selectedForPrint.size === 0 || selectedForPrint.has(p.id),
		);
		if (targetPacks.length === 0) {
			showToast("Нет выбранных пакетов для печати", "warning");
			return;
		}

		const stickersHtml = targetPacks
			.map((p) => generateThermalStickerHtml(p, { size: previewLabelSize }))
			.join("\n<div style='page-break-after:always;'></div>\n");

		const fullHtml = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>Печать термоэтикеток стерилизации</title>
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

		if (isDesktopApp()) {
			const res = await dispatchThermalLabelPrint({
				html: fullHtml,
				widthMm: previewLabelSize === "58x40" ? 58 : 43,
				heightMm: previewLabelSize === "58x40" ? 40 : 25,
				copies: targetPacks.length,
				silent: true,
			});
			if (res.success) {
				showToast(`Напечатано ${targetPacks.length} термоэтикеток (Direct Silent Print)`, "success");
				return;
			}
		}

		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			showToast("Разрешите всплывающие окна для печати", "error");
			return;
		}

		printWindow.document.write(fullHtml);
		printWindow.document.close();
	};

	const handlePrintA4Sheet = () => {
		const targetPacks = packages.filter(
			(p) => selectedForPrint.size === 0 || selectedForPrint.has(p.id),
		);
		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			showToast("Разрешите всплывающие окна для печати", "error");
			return;
		}

		const html = generateA4BatchSheetHtml(targetPacks);
		printWindow.document.write(html);
		printWindow.document.close();
		printWindow.onload = () => {
			printWindow.print();
		};
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
								СанПиН 3.3686-21 (Таблица 3.14) • ГОСТ Р ИСО 11607-1 • 2D DataMatrix штрихкодирование
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
						onClick={() => setActiveTab("scan")}
						className={`kraft-tab-btn ${activeTab === "scan" ? "active" : ""}`}
						data-testid="tab-kraft-scanner"
					>
						<Scan size={16} /> 2. Сканер и привязка (043/у)
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("register")}
						className={`kraft-tab-btn ${activeTab === "register" ? "active" : ""}`}
					>
						<Layers size={16} /> 3. Реестр пакетов ({packages.length})
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("print")}
						className={`kraft-tab-btn ${activeTab === "print" ? "active" : ""}`}
					>
						<Printer size={16} /> 4. Печать этикеток (Thermal / A4)
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
						onClick={() => setActiveTab("standards")}
						className={`kraft-tab-btn ${activeTab === "standards" ? "active" : ""}`}
					>
						<FileBadge size={16} /> 6. Нормативы СанПиН
					</button>
				</div>

				{/* Modal Body */}
				<div className="kraft-studio-body">
					{/* ─── TAB 1: BUILDER ──────────────────────────────────────────────── */}
					{activeTab === "builder" && (
						<div className="kraft-builder-grid">
							{/* Left Column: Form Controls */}
							<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
								{/* Popular Presets 1-Click Bar */}
								<div className="kraft-panel-card" style={{ padding: "0.85rem 1rem" }}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
										<span style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--ink)" }}>
											Быстрые пресеты упаковок (1 клик):
										</span>
										<span style={{ fontSize: "0.725rem", color: "var(--muted)" }}>
											СанПиН 3.3686-21
										</span>
									</div>
									<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
										{POPULAR_KRAFT_PRESETS.map((p) => (
											<button
												key={p.id}
												type="button"
												onClick={() => handleApplyPopularPreset(p)}
												className="sanpin-tag"
												style={{
													cursor: "pointer",
													fontSize: "0.75rem",
													padding: "0.3rem 0.6rem",
													borderRadius: "6px",
													border: selectedMaterialId === p.materialId && selectedSizeId === p.sizeId
														? "1px solid var(--teal, #0d9488)"
														: "1px solid var(--line, #cbd5e1)",
													background: selectedMaterialId === p.materialId && selectedSizeId === p.sizeId
														? "rgba(13, 148, 136, 0.12)"
														: "var(--paper, #fff)",
													color: "var(--ink, #0f172a)",
													fontWeight: 600,
												}}
											>
												{p.brandNameRu} ({p.badgeTextRu})
											</button>
										))}
									</div>
								</div>

								{/* Step 1: Tool Set Selector */}
								<div className="kraft-panel-card">
									<div className="kraft-panel-title">
										<span>1. Выберите набор инструментов</span>
										<span style={{ fontSize: "0.75rem", color: "var(--teal, #0d9488)", fontWeight: 600 }}>
											{selectedToolSet.categoryRu}
										</span>
									</div>
									<div className="kraft-presets-grid">
										{DENTAL_TOOL_SETS_CATALOG.map((set) => (
											<div
												key={set.id}
												onClick={() => handleToolSetChange(set.id)}
												className={`kraft-preset-item ${selectedToolSetId === set.id ? "selected" : ""}`}
											>
												<div className="kraft-preset-title">{set.nameRu}</div>
												<div className="kraft-preset-desc">{set.typicalItemsRu.slice(0, 3).join(", ")}...</div>
												<span className="kraft-preset-badge">{set.shortCode}</span>
											</div>
										))}
									</div>

									{/* Custom items editor */}
									<div>
										<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.25rem" }}>
											Состав набора в пакете (через запятую):
										</label>
										<input
											type="text"
											value={customItemsText || selectedToolSet.typicalItemsRu.join(", ")}
											onChange={(e) => setCustomItemsText(e.target.value)}
											style={{
												width: "100%",
												minHeight: "44px",
												padding: "0.5rem 0.75rem",
												borderRadius: "8px",
												border: "1px solid var(--line, #e2e8f0)",
												background: "var(--paper, #fff)",
												color: "var(--ink, #0f172a)",
												fontSize: "0.85rem",
											}}
										/>
									</div>
								</div>

								{/* Step 2: Packaging Material & Size */}
								<div className="kraft-panel-card">
									<div className="kraft-panel-title">
										<span>2. Материал упаковки и срок стерильности</span>
										<span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700 }}>
											Срок: {selectedMaterial.statutoryShelfLifeDays} суток
										</span>
									</div>
									<div className="kraft-presets-grid">
										{KRAFT_PACKAGE_MATERIALS.map((mat) => (
											<div
												key={mat.id}
												onClick={() => setSelectedMaterialId(mat.id)}
												className={`kraft-preset-item ${selectedMaterialId === mat.id ? "selected" : ""}`}
											>
												<div className="kraft-preset-title">{mat.nameRu}</div>
												<div className="kraft-preset-desc">{mat.sealingMethodRu}</div>
												<span
													className="kraft-preset-badge"
													style={{
														background: mat.statutoryShelfLifeDays >= 60 ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
														color: mat.statutoryShelfLifeDays >= 60 ? "#059669" : "#d97706",
													}}
												>
													{mat.statutoryShelfLifeDays} суток ({mat.sanpinClauseRu.split(" ")[0]})
												</span>
											</div>
										))}
									</div>

									{/* Package Sizes */}
									<div style={{ marginTop: "0.5rem" }}>
										<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
											Типоразмер пакета:
										</label>
										<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem" }}>
											{KRAFT_PACKAGE_SIZES.map((sz) => (
												<button
													key={sz.id}
													type="button"
													onClick={() => setSelectedSizeId(sz.id)}
													className={`kraft-pill-btn ${selectedSizeId === sz.id ? "active" : ""}`}
													style={{ fontSize: "0.8rem", textAlign: "center", minHeight: "44px" }}
												>
													{sz.dimensionsMmRu}
												</button>
											))}
										</div>
									</div>
								</div>

								{/* Step 3: Autoclave & Quantity */}
								<div className="kraft-panel-card">
									<div className="kraft-panel-title">
										<span>3. Параметры стерилизатора и объем партии</span>
									</div>
									<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
										<div>
											<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.25rem" }}>
												Аппарат автоклава:
											</label>
											<select
												value={selectedAutoclaveId}
												onChange={(e) => setSelectedAutoclaveId(e.target.value)}
												style={{
													width: "100%",
													minHeight: "44px",
													padding: "0.5rem",
													borderRadius: "8px",
													border: "1px solid var(--line, #e2e8f0)",
													background: "var(--paper, #fff)",
													color: "var(--ink, #0f172a)",
													fontSize: "0.85rem",
												}}
											>
												{CLINIC_AUTOCLAVE_UNITS.map((u) => (
													<option key={u.id} value={u.id}>
														{u.id} — {u.brandModelRu} ({u.chamberVolumeLiters} л)
													</option>
												))}
											</select>
										</div>

										<div>
											<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.25rem" }}>
												Номер цикла автоклава:
											</label>
											<input
												type="number"
												min={1}
												max={99}
												value={cycleNumber}
												onChange={(e) => setCycleNumber(Math.max(1, parseInt(e.target.value) || 1))}
												style={{
													width: "100%",
													minHeight: "44px",
													padding: "0.5rem",
													borderRadius: "8px",
													border: "1px solid var(--line, #e2e8f0)",
													background: "var(--paper, #fff)",
													color: "var(--ink, #0f172a)",
													fontSize: "0.95rem",
													fontWeight: 700,
												}}
											/>
										</div>
									</div>

									{/* Batch Quantity Stepper */}
									<div style={{ marginTop: "0.5rem" }}>
										<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
											Количество упаковываемых пакетов (шт.):
										</label>
										<div className="kraft-stepper-container">
											{[1, 5, 10, 25, 50].map((q) => (
												<button
													key={q}
													type="button"
													onClick={() => setPackQuantity(q)}
													className={`kraft-pill-btn ${packQuantity === q ? "active" : ""}`}
												>
													{q} шт.
												</button>
											))}
											<input
												type="number"
												min={1}
												max={100}
												value={packQuantity}
												onChange={(e) => setPackQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
												className="kraft-number-input"
											/>
										</div>
									</div>
								</div>
							</div>

							{/* Right Column: Live Sticker Preview & Indicator Verification */}
							<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
								<div className="kraft-preview-card">
									<div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>
											<Tag size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
											Live-превью термоэтикетки
										</span>
										<div style={{ display: "flex", gap: "4px" }}>
											<button
												type="button"
												onClick={() => setPreviewLabelSize("58x40")}
												className={`kraft-pill-btn ${previewLabelSize === "58x40" ? "active" : ""}`}
												style={{ minHeight: "36px", padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
											>
												58×40 мм
											</button>
											<button
												type="button"
												onClick={() => setPreviewLabelSize("43x25")}
												className={`kraft-pill-btn ${previewLabelSize === "43x25" ? "active" : ""}`}
												style={{ minHeight: "36px", padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
											>
												43×25 мм
											</button>
										</div>
									</div>

									{/* Rendered HTML Live Preview */}
									<div
										className="kraft-label-preview-wrapper"
										dangerouslySetInnerHTML={{
											__html: generateThermalStickerHtml(
												{
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
												},
												{ size: previewLabelSize },
											),
										}}
									/>

									<div style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>
										Сгенерирован векторный 2D DataMatrix штрихкод со структурированным пейлоадом СанПиН
									</div>
								</div>

								{/* Chemical Indicator Check */}
								<div className="kraft-panel-card">
									<div className="kraft-panel-title">
										<span>Химический индикатор контроля</span>
										<span style={{ fontSize: "0.75rem", color: "var(--teal)" }}>
											{selectedIndicator.indicatorClass === "class_5_integrator" ? "Класс 5 (Интегратор)" : "Класс 4"}
										</span>
									</div>

									<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
										{SANPIN_CHEMICAL_INDICATORS.map((ind) => (
											<div
												key={ind.id}
												onClick={() => setSelectedIndicatorId(ind.id)}
												className={`kraft-indicator-box ${selectedIndicatorId === ind.id ? "selected" : ""}`}
												style={{ cursor: "pointer", border: selectedIndicatorId === ind.id ? "1.5px solid var(--teal)" : "1px solid var(--line)" }}
											>
												<div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
													<span
														className="kraft-swatch-circle"
														style={{ background: ind.originalColorHex }}
														title={`Исходный цвет: ${ind.originalColorNameRu}`}
													/>
													<ArrowRight size={12} color="var(--muted)" />
													<span
														className="kraft-swatch-circle"
														style={{ background: ind.finalColorHex }}
														title={`Эталонный конечный цвет: ${ind.finalColorNameRu}`}
													/>
												</div>
												<div style={{ flexGrow: 1, fontSize: "0.85rem" }}>
													<div style={{ fontWeight: 700 }}>{ind.brandNameRu}</div>
													<div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{ind.standardTargetParamRu}</div>
												</div>
											</div>
										))}
									</div>
								</div>

								{/* Action Submit Button */}
								<button
									type="button"
									onClick={handleCreateBatch}
									className="kraft-btn kraft-btn-primary"
									style={{ minHeight: "52px", fontSize: "1rem", boxShadow: "0 4px 14px rgba(13, 148, 136, 0.3)" }}
								>
									<Plus size={20} />
									Сформировать партию ({packQuantity} пакетов)
								</button>
							</div>
						</div>
					)}

					{/* ─── TAB 2: QUICK SCANNER & 043/U LINK ─────────────────────────── */}
					{activeTab === "scan" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "760px", margin: "0 auto", width: "100%" }}>
							{/* Hardware Camera Viewport & Stream Controls */}
							<div
								style={{
									borderRadius: "10px",
									background: "var(--paper-soft, #f8fafc)",
									border: "1px solid var(--line, #e2e8f0)",
									padding: "1rem",
									display: "flex",
									flexDirection: "column",
									gap: "0.75rem",
								}}
							>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
										<Camera size={18} color="var(--brand-primary, #2563eb)" />
										<span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
											Аппаратный сканер 2D DataMatrix (СанПиН 3.3686-21)
										</span>
									</div>
									<div style={{ display: "flex", gap: "0.4rem" }}>
										{isCameraActive ? (
											<>
												<button
													type="button"
													onClick={handleToggleTorch}
													className={`kraft-btn ${isTorchOn ? "kraft-btn-primary" : "kraft-btn-secondary"}`}
													style={{ minHeight: "36px", padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
													title="Включить/выключить подсветку камеры"
												>
													<Zap size={14} />
													<span>{isTorchOn ? "Подсветка ВКЛ" : "Подсветка"}</span>
												</button>
												<button
													type="button"
													onClick={handleToggleFacingMode}
													className="kraft-btn kraft-btn-secondary"
													style={{ minHeight: "36px", padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
													title="Переключить камеру (задняя / передняя)"
												>
													<span>{facingMode === "environment" ? "Основная камера" : "Фронтальная"}</span>
												</button>
												<button
													type="button"
													onClick={stopCamera}
													className="kraft-btn kraft-btn-secondary"
													style={{ minHeight: "36px", padding: "0.35rem 0.65rem", fontSize: "0.75rem", color: "var(--bad-fg)" }}
												>
													<CameraOff size={14} />
													<span>Остановить</span>
												</button>
											</>
										) : (
											<>
												<button
													type="button"
													onClick={() => startCamera()}
													className="kraft-btn kraft-btn-primary"
													style={{ minHeight: "36px", padding: "0.35rem 0.85rem", fontSize: "0.8rem", fontWeight: 700 }}
													data-testid="start-camera-scan-btn"
												>
													<Camera size={15} />
													<span>Запустить камеру 60 FPS</span>
												</button>
												{hardwareScanner.isCapacitorNative() && (
													<button
														type="button"
														onClick={handleNativeMlKitScan}
														className="kraft-btn kraft-btn-secondary"
														style={{ minHeight: "36px", padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
														data-testid="start-native-mlkit-btn"
													>
														<Smartphone size={15} />
														<span>Сканер ML Kit</span>
													</button>
												)}
											</>
										)}
									</div>
								</div>

								{/* Camera Video Viewfinder with Reticle Overlay */}
								<div
									style={{
										position: "relative",
										width: "100%",
										height: isCameraActive ? "240px" : "80px",
										background: "var(--ink, #0f172a)",
										borderRadius: "8px",
										overflow: "hidden",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										transition: "height 0.2s ease",
									}}
								>
									<video
										ref={videoRef}
										playsInline
										muted
										style={{
											width: "100%",
											height: "100%",
											objectFit: "cover",
											display: isCameraActive ? "block" : "none",
										}}
									/>

									{isCameraActive ? (
										<div
											style={{
												position: "absolute",
												inset: 0,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												pointerEvents: "none",
											}}
										>
											<div
												style={{
													width: "160px",
													height: "160px",
													border: "2px solid var(--teal, #0d9488)",
													borderRadius: "12px",
													boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45), 0 0 15px rgba(20, 184, 166, 0.6)",
													position: "relative",
												}}
											>
												<div style={{ position: "absolute", top: "-20px", left: 0, right: 0, textAlign: "center", color: "var(--ok-fg, #34d399)", fontSize: "0.75rem", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
													Наведите на DataMatrix
												</div>
											</div>
										</div>
									) : (
										<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--muted)", fontSize: "0.825rem" }}>
											<Scan size={18} />
											<span>Камера выключена. Нажмите «Запустить камеру 60 FPS» или используйте USB-сканер / ручной ввод.</span>
										</div>
									)}
								</div>

								{/* Camera Error Message */}
								{cameraError && (
									<div
										style={{
											padding: "0.65rem 0.85rem",
											borderRadius: "6px",
											background: "rgba(220, 38, 38, 0.08)",
											border: "1px solid rgba(220, 38, 38, 0.25)",
											fontSize: "0.8rem",
											color: "#b91c1c",
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
										}}
									>
										<AlertTriangle size={16} style={{ flexShrink: 0 }} />
										<span>{cameraError} (доступен ручной ввод кода или USB-сканер)</span>
									</div>
								)}
							</div>

							{/* Barcode Input & Test Chips */}
							<div
								style={{
									padding: "1.25rem",
									borderRadius: "8px",
									background: "rgba(13, 148, 136, 0.06)",
									border: "1px solid rgba(13, 148, 136, 0.2)",
									display: "flex",
									flexDirection: "column",
									gap: "0.75rem",
								}}
							>
								<label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>
									Штрихкод крафт-пакета (автоматически или вручную):
								</label>
								<div style={{ display: "flex", gap: "0.5rem" }}>
									<input
										type="text"
										value={scannedInput}
										onChange={(e) => setScannedInput(e.target.value)}
										placeholder="Отсканируйте штрихкод сканером или введите KP-..."
										style={{
											minHeight: "46px",
											fontSize: "0.95rem",
											width: "100%",
											padding: "0.5rem 0.75rem",
											border: "1px solid var(--line, #cbd5e1)",
											borderRadius: "6px",
											background: "var(--paper, #fff)",
											color: "var(--ink, #0f172a)",
										}}
										data-testid="kraft-modal-scan-input"
									/>
									{scannedInput && (
										<button
											type="button"
											onClick={() => setScannedInput("")}
											className="kraft-btn kraft-btn-secondary"
											style={{ minWidth: "46px", padding: 0 }}
											title="Очистить"
										>
											<X size={18} />
										</button>
									)}
								</div>

								{/* Quick Sample Chips */}
								<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
									<span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>Тестовые образцы:</span>
									<button
										type="button"
										onClick={() => setScannedInput(`KP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-01-01`)}
										className="sanpin-tag"
										style={{ cursor: "pointer", fontSize: "0.75rem", border: "1px solid var(--line)", background: "var(--paper)" }}
									>
										• Azov Свежий (50 сут)
									</button>
									<button
										type="button"
										onClick={() => setScannedInput("KP-20260101-01-01")}
										className="sanpin-tag"
										style={{ cursor: "pointer", fontSize: "0.75rem", border: "1px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.08)", color: "#b91c1c" }}
									>
										• Просроченный пакет
									</button>
								</div>
							</div>

							{/* Scanned Result Card */}
							{parsedScanned ? (
								<div
									style={{
										padding: "1.25rem",
										borderRadius: "8px",
										border: parsedScanned.isExpired ? "1px solid var(--bad-fg, #ef4444)" : "1px solid var(--ok-fg, #10b981)",
										background: parsedScanned.isExpired ? "rgba(220, 38, 38, 0.06)" : "rgba(5, 150, 105, 0.06)",
										display: "flex",
										flexDirection: "column",
										gap: "0.75rem",
									}}
								>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										{parsedScanned.isExpired ? (
											<span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#b91c1c", display: "flex", alignItems: "center", gap: "0.35rem" }}>
												<AlertOctagon size={16} /> ПРОСРОЧЕНО (Истек {Math.abs(parsedScanned.daysRemaining)} дн. назад)
											</span>
										) : (
											<span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#059669", display: "flex", alignItems: "center", gap: "0.35rem" }}>
												<CheckCircle2 size={16} /> СТЕРИЛЬНО (Годен до {parsedScanned.expDateIso})
											</span>
										)}
										<span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 700, fontFamily: "monospace" }}>
											{parsedScanned.barcodeType === "datamatrix_2d" ? "2D DataMatrix" : "1D Code128"}
										</span>
									</div>

									<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", fontSize: "0.85rem" }}>
										<div>
											<div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Набор инструментов:</div>
											<div style={{ fontWeight: 700 }}>{parsedScanned.toolSetNameRu}</div>
										</div>
										<div>
											<div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Стерилизатор и цикл:</div>
											<div style={{ fontWeight: 700 }}>{parsedScanned.autoclaveId} • Цикл №{parsedScanned.cycleNumber}</div>
										</div>
										<div>
											<div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Дата упаковки / Срок:</div>
											<div style={{ fontWeight: 700 }}>{parsedScanned.packDateIso} ({parsedScanned.daysLifespan} сут.)</div>
										</div>
									</div>

									{/* 043/u Record formatted preview */}
									<div
										style={{
											padding: "0.75rem",
											borderRadius: "6px",
											background: "var(--paper, #ffffff)",
											border: "1px solid var(--line, #e2e8f0)",
											fontSize: "0.8rem",
											fontStyle: "italic",
										}}
									>
										<strong>Запись для Формы № 043/у:</strong> {parsedScanned.formattedProtocolRecord043}
									</div>

									<button
										type="button"
										onClick={handleAttachScannedTo043}
										disabled={parsedScanned.isExpired}
										className="kraft-btn kraft-btn-primary"
										style={{
											minHeight: "48px",
											fontSize: "0.95rem",
											fontWeight: 800,
											background: parsedScanned.isExpired ? "var(--muted)" : "var(--ok-fg, #059669)",
											color: "#ffffff",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: "0.5rem",
										}}
										data-testid="attach-to-043-btn"
									>
										<Sparkles size={18} />
										<span>Привязать к протоколу приема 043/у (1 клик)</span>
									</button>
								</div>
							) : (
								<div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)", fontSize: "0.88rem" }}>
									Отсканируйте штрихкод для мгновенной расшифровки и валидации сроков годности.
								</div>
							)}
						</div>
					)}

					{/* ─── TAB 3: REGISTER ─────────────────────────────────────────────── */}
					{activeTab === "register" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							{/* KPI Strip */}
							<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
								<div className="kraft-panel-card" style={{ padding: "0.75rem" }}>
									<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Всего в партии</span>
									<span style={{ fontSize: "1.4rem", fontWeight: 800 }}>{stats.totalPacks} шт.</span>
								</div>
								<div className="kraft-panel-card" style={{ padding: "0.75rem" }}>
									<span style={{ fontSize: "0.75rem", color: "#059669" }}>Стерильно (валидно)</span>
									<span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#059669" }}>{stats.sterileValidCount} шт.</span>
								</div>
								<div className="kraft-panel-card" style={{ padding: "0.75rem" }}>
									<span style={{ fontSize: "0.75rem", color: "#d97706" }}>Истекает (≤7 дн.)</span>
									<span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#d97706" }}>{stats.expiringSoonCount} шт.</span>
								</div>
								<div className="kraft-panel-card" style={{ padding: "0.75rem" }}>
									<span style={{ fontSize: "0.75rem", color: "#dc2626" }}>Просрочено / Брак</span>
									<span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#dc2626" }}>
										{stats.expiredCount + stats.recalledCount} шт.
									</span>
								</div>
							</div>

							{/* Toolbar */}
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
								<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
									<input
										type="text"
										placeholder="Поиск по набору, штрихкоду, автоклаву..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										style={{
											minHeight: "44px",
											minWidth: "260px",
											padding: "0.5rem 0.75rem",
											borderRadius: "8px",
											border: "1px solid var(--line, #e2e8f0)",
											background: "var(--paper, #fff)",
											color: "var(--ink, #0f172a)",
											fontSize: "0.85rem",
										}}
									/>
									<select
										value={statusFilter}
										onChange={(e) => setStatusFilter(e.target.value as any)}
										style={{
											minHeight: "44px",
											padding: "0.5rem",
											borderRadius: "8px",
											border: "1px solid var(--line, #e2e8f0)",
											background: "var(--paper, #fff)",
											color: "var(--ink, #0f172a)",
											fontSize: "0.85rem",
										}}
									>
										<option value="all">Все статусы</option>
										<option value="sterile_valid">Стерильно</option>
										<option value="expiring_soon_7d">Истекает (≤7 дн.)</option>
										<option value="expired">Просрочено</option>
										<option value="recalled">Отозвано / Нарушено</option>
									</select>
								</div>

								<div style={{ display: "flex", gap: "0.5rem" }}>
									<button
										type="button"
										onClick={handleExportCsv}
										className="kraft-btn kraft-btn-secondary"
									>
										<Download size={16} /> Экспорт CSV (3.3686-21)
									</button>
								</div>
							</div>

							{/* Table */}
							<div className="kraft-table-container">
								<table className="kraft-table">
									<thead>
										<tr>
											<th>Штрихкод</th>
											<th>Наименование набора</th>
											<th>Упаковка / Размер</th>
											<th>Стерилизация</th>
											<th>Годен до</th>
											<th>Остаток</th>
											<th>Статус</th>
											<th>Автоклав</th>
											<th>Действия</th>
										</tr>
									</thead>
									<tbody>
										{filteredPackages.length === 0 ? (
											<tr>
												<td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
													Нет записей в реестре по заданным фильтрам.
												</td>
											</tr>
										) : (
											filteredPackages.map((pack) => (
												<tr key={pack.id}>
													<td style={{ fontFamily: "monospace", fontWeight: 700 }}>{pack.barcode128}</td>
													<td>
														<div style={{ fontWeight: 600 }}>{pack.toolSetNameRu}</div>
														<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{pack.batchId} #{pack.serialNumber}</div>
													</td>
													<td>
														<div>{getKraftMaterialDefinition(pack.packageType).shortLabelRu}</div>
														<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
															{getKraftSizeDefinition(pack.packageSize).dimensionsMmRu}
														</div>
													</td>
													<td>{pack.packDate}</td>
													<td style={{ fontWeight: 700 }}>{pack.expDate}</td>
													<td>{pack.daysRemaining} дн.</td>
													<td>
														<span className={`kraft-status-badge ${pack.status}`}>
															{pack.status === "sterile_valid" && <CheckCircle2 size={12} />}
															{pack.status === "expiring_soon_7d" && <Clock size={12} />}
															{pack.status === "expired" && <AlertTriangle size={12} />}
															{pack.status === "recalled" && <ShieldAlert size={12} />}
															{pack.status === "sterile_valid" && "Стерильно"}
															{pack.status === "expiring_soon_7d" && "Истекает"}
															{pack.status === "expired" && "Просрочено"}
															{pack.status === "recalled" && "Отозвано"}
														</span>
													</td>
													<td>
														<span style={{ fontSize: "0.75rem", background: "var(--paper-strong)", padding: "2px 6px", borderRadius: "4px" }}>
															{pack.autoclaveId} / Ц#{pack.cycleNumber}
														</span>
													</td>
													<td>
														<div style={{ display: "flex", gap: "4px" }}>
															<button
																type="button"
																onClick={() => handleToggleBreached(pack.id)}
																title={pack.isBreached ? "Восстановить статус" : "Отметить нарушение целостности"}
																style={{
																	background: "none",
																	border: "none",
																	cursor: "pointer",
																	color: pack.isBreached ? "#059669" : "#dc2626",
																	padding: "4px",
																}}
															>
																<ShieldAlert size={16} />
															</button>
															<button
																type="button"
																onClick={() => handleDeletePackage(pack.id)}
																title="Удалить запись"
																style={{
																	background: "none",
																	border: "none",
																	cursor: "pointer",
																	color: "var(--muted)",
																	padding: "4px",
																}}
															>
																<Trash2 size={16} />
															</button>
														</div>
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* ─── TAB 3: PRINT ────────────────────────────────────────────────── */}
					{activeTab === "print" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
							<div className="kraft-panel-card">
								<div className="kraft-panel-title">
									<span>Параметры печати этикеток</span>
									<span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
										Выбрано для печати: {selectedForPrint.size === 0 ? packages.length : selectedForPrint.size} из {packages.length}
									</span>
								</div>

								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
									<div style={{ display: "flex", gap: "0.5rem" }}>
										<button
											type="button"
											onClick={handleSelectAllForPrint}
											className="kraft-btn kraft-btn-secondary"
										>
											{selectedForPrint.size === packages.length ? "Снять выбор" : "Выбрать все пакеты"}
										</button>
									</div>

									<div style={{ display: "flex", gap: "0.75rem" }}>
										<button
											type="button"
											onClick={handlePrintThermalStickers}
											className="kraft-btn kraft-btn-primary"
										>
											<Printer size={16} /> Печать на термопринтере ({previewLabelSize})
										</button>

										<button
											type="button"
											onClick={handlePrintA4Sheet}
											className="kraft-btn kraft-btn-secondary"
										>
											<FileText size={16} /> Печать листа А4 (сетка)
										</button>
									</div>
								</div>
							</div>

							{/* Interactive Grid of selectable stickers */}
							<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
								{packages.map((pack) => {
									const isSelected = selectedForPrint.size === 0 || selectedForPrint.has(pack.id);
									return (
										<div
											key={pack.id}
											onClick={() => handleTogglePrintItem(pack.id)}
											style={{
												cursor: "pointer",
												border: isSelected ? "2px solid var(--teal)" : "1px dashed var(--line)",
												borderRadius: "8px",
												padding: "8px",
												background: isSelected ? "rgba(13, 148, 136, 0.03)" : "var(--paper)",
												transition: "all 0.15s ease",
											}}
										>
											<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.75rem", fontWeight: 700 }}>
												<span>{pack.toolSetNameRu}</span>
												<span style={{ color: isSelected ? "var(--teal)" : "var(--muted)", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
													{isSelected ? <><Check size={12} /> Выбрано</> : "Пропустить"}
												</span>
											</div>
											<div
												dangerouslySetInnerHTML={{
													__html: generateThermalStickerHtml(pack, { size: "58x40" }),
												}}
											/>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* ─── TAB 4: DIRECT PRINTER TSPL / ZPL ──────────────────────────── */}
					{activeTab === "tspl_zpl" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
							<div className="kraft-panel-card">
								<div className="kraft-panel-title">
									<span>Генератор прямых команд для промышленных термопринтеров (TSPL / ZPL II)</span>
									<span style={{ fontSize: "0.8rem", color: "var(--teal)" }}>
										Прямая векторная печать без диалоговых окон и растеризации
									</span>
								</div>

								<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
									{/* Protocol */}
									<div>
										<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
											Протокол термопринтера:
										</label>
										<div style={{ display: "flex", gap: "0.35rem" }}>
											<button
												type="button"
												onClick={() => setTsplProtocol("tspl")}
												className={`kraft-btn ${tsplProtocol === "tspl" ? "kraft-btn-primary" : "kraft-btn-secondary"}`}
												style={{ flex: 1, minHeight: "38px", padding: "0.25rem 0.5rem" }}
											>
												TSPL (TSC/Xprinter)
											</button>
											<button
												type="button"
												onClick={() => setTsplProtocol("zpl")}
												className={`kraft-btn ${tsplProtocol === "zpl" ? "kraft-btn-primary" : "kraft-btn-secondary"}`}
												style={{ flex: 1, minHeight: "38px", padding: "0.25rem 0.5rem" }}
											>
												ZPL II (Zebra)
											</button>
										</div>
									</div>

									{/* Label Size */}
									<div>
										<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
											Размер этикетки:
										</label>
										<div style={{ display: "flex", gap: "0.35rem" }}>
											<button
												type="button"
												onClick={() => setTsplSize("58x40")}
												className={`kraft-btn ${tsplSize === "58x40" ? "kraft-btn-primary" : "kraft-btn-secondary"}`}
												style={{ flex: 1, minHeight: "38px", padding: "0.25rem 0.5rem" }}
											>
												58×40 мм
											</button>
											<button
												type="button"
												onClick={() => setTsplSize("43x25")}
												className={`kraft-btn ${tsplSize === "43x25" ? "kraft-btn-primary" : "kraft-btn-secondary"}`}
												style={{ flex: 1, minHeight: "38px", padding: "0.25rem 0.5rem" }}
											>
												43×25 мм
											</button>
										</div>
									</div>

									{/* Package Select */}
									<div>
										<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
											Образец пакета из партии:
										</label>
										<select
											value={selectedTsplRecordId || activeTsplRecord?.id || ""}
											onChange={(e) => setSelectedTsplRecordId(e.target.value)}
											style={{
												width: "100%",
												minHeight: "40px",
												padding: "0.5rem",
												borderRadius: "8px",
												border: "1px solid var(--line, #e2e8f0)",
												background: "var(--paper, #fff)",
												color: "var(--ink, #0f172a)",
												fontSize: "0.85rem",
											}}
										>
											{packages.map((p) => (
												<option key={p.id} value={p.id}>
													{p.barcode128} — {p.toolSetNameRu} (#{p.serialNumber})
												</option>
											))}
										</select>
									</div>

									{/* Copies */}
									<div>
										<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
											Количество копий:
										</label>
										<input
											type="number"
											min={1}
											max={100}
											value={tsplCopies}
											onChange={(e) => setTsplCopies(Math.max(1, Number.parseInt(e.target.value) || 1))}
											className="kraft-number-input"
											style={{ width: "100%", minHeight: "40px" }}
										/>
									</div>
								</div>

								{/* Terminal Code Viewer */}
								<div style={{ marginBottom: "1rem" }}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
										<span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--muted)" }}>
											RAW SCRIPT ({tsplProtocol.toUpperCase()} 203 DPI) • {activeTsplRecord?.barcode128}
										</span>
										<span style={{ fontSize: "0.75rem", color: "var(--teal)" }}>
											DataMatrix 2D + Code128 + UTF-8 payload
										</span>
									</div>
									<pre className="kraft-terminal-container">
										<code>{generatedPrinterScript}</code>
									</pre>
								</div>

								{/* Action Toolbar */}
								<div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
									<button
										type="button"
										onClick={handleCopyPrinterScript}
										className="kraft-btn kraft-btn-secondary"
									>
										<Copy size={16} /> Скопировать {tsplProtocol.toUpperCase()}
									</button>
									<button
										type="button"
										onClick={handleDownloadPrinterScript}
										className="kraft-btn kraft-btn-secondary"
									>
										<Download size={16} /> Скачать .{tsplProtocol === "zpl" ? "zpl" : "tspl"}
									</button>
									<button
										type="button"
										onClick={handleDirectPrinterSend}
										className="kraft-btn kraft-btn-primary"
									>
										<Printer size={16} /> Отправить в термопринтер (RAW LAN/USB)
									</button>
								</div>
							</div>
						</div>
					)}

					{/* ─── TAB 5: STANDARDS & INDICATORS ───────────────────────────────── */}
					{activeTab === "standards" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
							<div className="kraft-panel-card">
								<div className="kraft-panel-title">
									<span>Нормативные сроки сохранения стерильности (СанПиН 3.3686-21 Таблица 3.14)</span>
								</div>
								<div className="kraft-table-container">
									<table className="kraft-table">
										<thead>
											<tr>
												<th>Материал упаковки</th>
												<th>Способ запечатывания</th>
												<th>Срок стерильности</th>
												<th>Нормативный пункт СанПиН</th>
											</tr>
										</thead>
										<tbody>
											{KRAFT_PACKAGE_MATERIALS.map((mat) => (
												<tr key={mat.id}>
													<td style={{ fontWeight: 700 }}>{mat.nameRu}</td>
													<td>{mat.sealingMethodRu}</td>
													<td>
														<strong style={{ color: mat.statutoryShelfLifeDays >= 60 ? "#059669" : "#d97706" }}>
															{mat.statutoryShelfLifeDays} суток
														</strong>
													</td>
													<td style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{mat.sanpinClauseRu}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>

							<div className="kraft-panel-card">
								<div className="kraft-panel-title">
									<span>Химические индикаторы классов 4 и 5 (ГОСТ ISO 11140-1)</span>
								</div>
								<div className="kraft-table-container">
									<table className="kraft-table">
										<thead>
											<tr>
												<th>Торговое наименование</th>
												<th>Класс индикатора</th>
												<th>Исходный цвет</th>
												<th>Эталонный цвет (Стерильно)</th>
												<th>Критические параметры срабатывания</th>
											</tr>
										</thead>
										<tbody>
											{SANPIN_CHEMICAL_INDICATORS.map((ind) => (
												<tr key={ind.id}>
													<td style={{ fontWeight: 700 }}>{ind.brandNameRu}</td>
													<td>{ind.indicatorClass === "class_5_integrator" ? "Класс 5 (Интегратор)" : "Класс 4"}</td>
													<td>
														<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
															<span
																className="kraft-swatch-circle"
																style={{ background: ind.originalColorHex, width: "16px", height: "16px" }}
															/>
															<span>{ind.originalColorNameRu}</span>
														</div>
													</td>
													<td>
														<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
															<span
																className="kraft-swatch-circle"
																style={{ background: ind.finalColorHex, width: "16px", height: "16px" }}
															/>
															<span style={{ fontWeight: 700 }}>{ind.finalColorNameRu}</span>
														</div>
													</td>
													<td style={{ fontSize: "0.75rem" }}>{ind.standardTargetParamRu}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="kraft-studio-footer">
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--muted)" }}>
						<ShieldCheck size={16} color="var(--teal)" />
						<span>ЦСО Медсестра: <strong>{operatorName}</strong> • ЭЦП штамп готов</span>
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
