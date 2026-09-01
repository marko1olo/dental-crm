/**
 * ============================================================================
 * KRAFT PACKAGE MODAL (СанПиН 3.3686-21 / ГОСТ Р ИСО 11607-1)
 * Интерактивное 1-клик сканирование и генерация штрихкодов крафт-пакетов (Azov/DGM)
 * с автопривязкой к номеру цикла стерилизации и нормативному сроку годности (30 / 50 суток).
 * Чистый минималистичный интерфейс без лишних рамок и вложенных карточек (Anti-Matryoshka).
 * ============================================================================
 */

import {
	AlertOctagon,
	AlertTriangle,
	Award,
	Barcode,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	Download,
	FileBadge,
	FileText,
	Flame,
	Layers,
	Package,
	PackageCheck,
	Plus,
	Printer,
	QrCode,
	RefreshCw,
	Scan,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Tag,
	Trash2,
	Camera,
	CameraOff,
	Smartphone,
	Zap,
	X,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../GlobalToast";
import { isDesktopApp } from "../../native/desktopBridge";
import { dispatchThermalLabelPrint } from "../../native/hardwareDispatcher";
import { hardwareScanner } from "../../services/hardware/HardwareScanner.js";
import {
	calculateKraftBatchStatistics,
	calculatePackageExpiration,
	exportKraftBatchToCsv,
	filterKraftPackages,
	generateA4BatchSheetHtml,
	generateDataMatrixSvg,
	generateKraftBatchRecords,
	generateThermalStickerHtml,
	type KraftPackageRecord,
	type KraftPackageStatus,
} from "./kraft/kraftPackageEngine";
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
} from "./kraft/kraftPackagePresets";
import {
	format043SterilizationRecord,
	parseAndValidateKraftBarcode,
	type ParsedKraftBarcode,
} from "@dental/shared";
import "./kraft/kraftPackage.css";

export interface KraftPackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onBatchCreated?: ((records: KraftPackageRecord[]) => void) | undefined;
	readonly onAttachToProtocol?: ((parsed: ParsedKraftBarcode) => void | Promise<void>) | undefined;
	readonly initialAutoclaveId?: string | undefined;
	readonly initialCycleNumber?: number | undefined;
	readonly initialOperatorName?: string | undefined;
	readonly initialBarcode?: string | undefined;
}

export type KraftModalMode = "generate" | "scan" | "batch_register";

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

export function KraftPackageModal({
	isOpen,
	onClose,
	onBatchCreated,
	onAttachToProtocol,
	initialAutoclaveId,
	initialCycleNumber = 1,
	initialOperatorName = "Смирнова А.В. (Медсестра ЦСО)",
	initialBarcode = "",
}: KraftPackageModalProps) {
	// Active Mode: generate (default 1-click), scan (quick scanner), batch_register
	const [mode, setMode] = useState<KraftModalMode>("generate");

	// 1. Generation State
	const [selectedPresetId, setSelectedPresetId] = useState<string>("azov_100x200_50d");
	const [selectedMaterialId, setSelectedMaterialId] =
		useState<KraftPackageMaterialId>("paper_self_seal_single");
	const [selectedSizeId, setSelectedSizeId] =
		useState<KraftPackageSizeId>("size_100x200");
	const [selectedToolSetId, setSelectedToolSetId] =
		useState<string>("set_therapeutic_tray");
	const [selectedIndicatorId, setSelectedIndicatorId] =
		useState<string>("vinar_inte_5");
	const [selectedAutoclaveId, setSelectedAutoclaveId] =
		useState<string>(initialAutoclaveId || CLINIC_AUTOCLAVE_UNITS[0]?.id || "AUTO-01");
	const [cycleNumber, setCycleNumber] = useState<number>(initialCycleNumber);
	const [packQuantity, setPackQuantity] = useState<number>(5);
	const [operatorName, setOperatorName] = useState<string>(initialOperatorName);
	const [previewLabelSize, setPreviewLabelSize] = useState<"58x40" | "43x25">("58x40");

	// 2. Quick Scanner State & Camera Facade
	const [scannedInput, setScannedInput] = useState<string>(initialBarcode || "");
	const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
	const [cameraError, setCameraError] = useState<string | null>(null);
	const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
	const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
	const videoRef = useRef<HTMLVideoElement | null>(null);

	// Start Camera 60 FPS Stream
	const startCamera = async (mode: "environment" | "user" = facingMode) => {
		setCameraError(null);
		if (!videoRef.current) return;
		try {
			await hardwareScanner.startCameraStream(videoRef.current, {
				continuousFocus: true,
				facingMode: mode,
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

	// Stop camera if leaving scan mode or modal closes
	useEffect(() => {
		if (!isOpen || mode !== "scan") {
			hardwareScanner.stopCameraStream();
			setIsCameraActive(false);
			setIsTorchOn(false);
		}
	}, [isOpen, mode]);

	// 3. Batch Register State
	const [packages, setPackages] = useState<KraftPackageRecord[]>(() => {
		return generateKraftBatchRecords({
			autoclaveId: initialAutoclaveId || "AUTO-01",
			cycleNumber: initialCycleNumber || 1,
			packageType: "paper_self_seal_single",
			packageSize: "size_100x200",
			toolSetId: "set_therapeutic_tray",
			quantity: 4,
			operatorName: initialOperatorName,
			indicatorId: "vinar_inte_5",
		});
	});

	// Derived calculations
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

	// Scanned Barcode Validation
	const parsedScanned = useMemo<ParsedKraftBarcode | null>(() => {
		if (!scannedInput.trim()) return null;
		return parseAndValidateKraftBarcode(scannedInput.trim());
	}, [scannedInput]);

	// Single Package Live Record for Preview
	const livePreviewRecord = useMemo<KraftPackageRecord>(() => {
		const generatedBarcode = `KP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(cycleNumber).padStart(2, "0")}-01`;
		return {
			id: "preview-pouch-id",
			batchId: `KB-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${cycleNumber}`,
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
			barcode128: generatedBarcode,
			barcodeDataMatrixPayload: `${generatedBarcode}|${selectedAutoclaveId}|CYC${cycleNumber}|${liveExpiry.packDateFormatted}|${liveExpiry.expDateFormatted}|${operatorName}|${selectedToolSet.shortCode}`,
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

	// Handlers
	const handleSelectPreset = (preset: QuickKraftPreset) => {
		setSelectedPresetId(preset.id);
		setSelectedMaterialId(preset.materialId);
		setSelectedSizeId(preset.sizeId);
		showToast(`Выбран стандарт: ${preset.brandNameRu} (${preset.badgeTextRu})`, "info", 1800);
	};

	const handleCreateBatch = () => {
		const newBatch = generateKraftBatchRecords({
			autoclaveId: selectedAutoclaveId,
			cycleNumber,
			packageType: selectedMaterialId,
			packageSize: selectedSizeId,
			toolSetId: selectedToolSetId,
			quantity: packQuantity,
			operatorName,
			indicatorId: selectedIndicatorId,
			indicatorVerified: true,
		});

		setPackages((prev) => [...newBatch, ...prev]);
		onBatchCreated?.(newBatch);

		showToast(
			`Сформирована партия из ${newBatch.length} крафт-пакетов «${selectedToolSet.nameRu}». Цикл №${cycleNumber}, срок: ${liveExpiry.daysLifespan} сут.`,
			"success",
		);

		setMode("batch_register");
	};

	const handlePrintThermalDirect = async () => {
		const stickerHtml = generateThermalStickerHtml(livePreviewRecord, { size: previewLabelSize });
		const fullHtml = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>Печать термоэтикетки крафт-пакета</title>
				<style>
					@page { size: ${previewLabelSize === "58x40" ? "58mm 40mm" : "43mm 25mm"}; margin: 0; }
					body { margin: 0; padding: 0; background: #fff; }
				</style>
			</head>
			<body>
				${stickerHtml}
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
				copies: 1,
				silent: true,
			});
			if (res.success) {
				showToast("Термоэтикетка отправлена на печать (Direct Silent Print)", "success");
				return;
			}
		}

		const printWindow = window.open("", "_blank", "width=500,height=420");
		if (!printWindow) {
			showToast("Разрешите всплывающие окна для печати", "error");
			return;
		}
		printWindow.document.write(fullHtml);
		printWindow.document.close();
	};

	const handlePrintA4Sheet = () => {
		const batchToPrint = packages.length > 0 ? packages : [livePreviewRecord];
		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			showToast("Разрешите всплывающие окна для печати", "error");
			return;
		}
		const html = generateA4BatchSheetHtml(batchToPrint);
		printWindow.document.write(html);
		printWindow.document.close();
		printWindow.onload = () => {
			printWindow.print();
		};
	};

	const handleAttachScannedTo043 = () => {
		if (!parsedScanned) return;
		if (onAttachToProtocol) {
			onAttachToProtocol(parsedScanned);
		}
		showToast("Штрихкод крафт-пакета успешно привязан к форме 043/у", "success");
		onClose();
	};

	return (
		<div
			className="kraft-studio-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Студия маркировки и учета крафт-пакетов стерилизации (СанПиН 3.3686-21)"
			data-testid="kraft-package-modal-overlay"
		>
			<div className="kraft-studio-modal" style={{ maxWidth: "980px" }}>
				{/* 1. Monolithic Clean Header */}
				<div className="kraft-studio-header" style={{ padding: "1rem 1.25rem" }}>
					<div className="kraft-studio-title-block">
						<div
							style={{
								width: "42px",
								height: "42px",
								borderRadius: "10px",
								background: "rgba(13, 148, 136, 0.12)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "#0d9488",
								flexShrink: 0,
							}}
						>
							<PackageCheck size={24} />
						</div>
						<div>
							<h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--ink, #0f172a)" }}>
								Маркировка и штрихкоды крафт-пакетов (СанПиН 3.3686-21)
							</h2>
							<div className="kraft-studio-subtitle" style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>
								1-Клик генерация штрихкодов Azov / DGM • Автопривязка к циклу №{cycleNumber} • Термоэтикетка 58×40 мм
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="kraft-studio-close-btn"
						title="Закрыть модальное окно"
						aria-label="Закрыть"
						style={{ minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
					>
						<X size={20} />
					</button>
				</div>

				{/* 2. Mode Navigation Switcher */}
				<div className="kraft-studio-tabs-nav" style={{ padding: "0.5rem 1.25rem 0", gap: "0.5rem" }}>
					<button
						type="button"
						onClick={() => setMode("generate")}
						className={`kraft-tab-btn ${mode === "generate" ? "active" : ""}`}
						style={{ minHeight: "44px", fontSize: "0.85rem", fontWeight: 700 }}
						data-testid="mode-generate-btn"
					>
						<Sparkles size={16} /> 1. Генератор штрихкодов Azov / DGM
					</button>

					<button
						type="button"
						onClick={() => setMode("scan")}
						className={`kraft-tab-btn ${mode === "scan" ? "active" : ""}`}
						style={{ minHeight: "44px", fontSize: "0.85rem", fontWeight: 700 }}
						data-testid="mode-scan-btn"
					>
						<Scan size={16} /> 2. Сканер и привязка к 043/у
					</button>

					<button
						type="button"
						onClick={() => setMode("batch_register")}
						className={`kraft-tab-btn ${mode === "batch_register" ? "active" : ""}`}
						style={{ minHeight: "44px", fontSize: "0.85rem", fontWeight: 700 }}
						data-testid="mode-batch-register-btn"
					>
						<Layers size={16} /> 3. Реестр партии ({packages.length} пакетов)
					</button>
				</div>

				{/* 3. Modal Body: Single Cohesive Surface (Anti-Matryoshka) */}
				<div className="kraft-studio-body" style={{ padding: "1.25rem", maxHeight: "calc(88vh - 120px)", overflowY: "auto" }}>
					{/* ─── MODE 1: GENERATE & PRINT ────────────────────────────────────── */}
					{mode === "generate" && (
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
								gap: "1.25rem",
								alignItems: "start",
							}}
						>
							{/* Left Column: Fast Presets & Autoclave Cycle Binding */}
							<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
								{/* Step 1: Packaging Brand Presets (Azov / DGM / Clinipak) */}
								<div>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
										<label style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--muted, #475569)" }}>
											1. Выберите упаковку (Azov / DGM):
										</label>
										<span style={{ fontSize: "0.78rem", color: "#059669", fontWeight: 700 }}>
											Норма: {selectedMaterial.statutoryShelfLifeDays} суток
										</span>
									</div>

									<div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.45rem" }}>
										{POPULAR_KRAFT_PRESETS.map((preset) => {
											const isSelected = selectedPresetId === preset.id;
											return (
												<div
													key={preset.id}
													onClick={() => handleSelectPreset(preset)}
													style={{
														padding: "0.65rem 0.85rem",
														borderRadius: "8px",
														border: isSelected ? "2px solid #0d9488" : "1px solid var(--line, #e2e8f0)",
														background: isSelected ? "rgba(13, 148, 136, 0.08)" : "var(--paper-soft, #f8fafc)",
														cursor: "pointer",
														display: "flex",
														justifyContent: "space-between",
														alignItems: "center",
														transition: "all 0.15s ease",
													}}
													data-testid={`preset-card-${preset.id}`}
												>
													<div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
														<div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--ink, #0f172a)" }}>
															{preset.brandNameRu}
														</div>
														<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
															{preset.descriptionRu}
														</div>
													</div>

													<span
														style={{
															padding: "0.25rem 0.55rem",
															borderRadius: "6px",
															fontSize: "0.75rem",
															fontWeight: 800,
															background: preset.shelfLifeDays >= 50 ? "rgba(5, 150, 105, 0.12)" : "rgba(217, 119, 6, 0.12)",
															color: preset.shelfLifeDays >= 50 ? "#059669" : "#d97706",
															whiteSpace: "nowrap",
															flexShrink: 0,
															marginLeft: "0.5rem",
														}}
													>
														{preset.badgeTextRu}
													</span>
												</div>
											);
										})}
									</div>
								</div>

								{/* Step 2: Tool Set & Autoclave Cycle Auto-Binding */}
								<div
									style={{
										padding: "1rem",
										borderRadius: "8px",
										background: "var(--paper-soft, #f8fafc)",
										border: "1px solid var(--line, #e2e8f0)",
										display: "flex",
										flexDirection: "column",
										gap: "0.75rem",
									}}
								>
									<span style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--muted, #475569)" }}>
										2. Автопривязка к циклу и набору:
									</span>

									{/* Tool Set Selection */}
									<div>
										<label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.25rem" }}>
											Стоматологический набор:
										</label>
										<select
											value={selectedToolSetId}
											onChange={(e) => setSelectedToolSetId(e.target.value)}
											className="sanpin-select"
											style={{ minHeight: "44px", fontSize: "0.88rem", width: "100%" }}
										>
											{DENTAL_TOOL_SETS_CATALOG.map((ts) => (
												<option key={ts.id} value={ts.id}>
													{ts.nameRu} ({ts.shortCode})
												</option>
											))}
										</select>
									</div>

									{/* Autoclave Unit & Cycle Number */}
									<div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: "0.5rem" }}>
										<div>
											<label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.25rem" }}>
												Стерилизатор (Автоклав):
											</label>
											<select
												value={selectedAutoclaveId}
												onChange={(e) => setSelectedAutoclaveId(e.target.value)}
												className="sanpin-select"
												style={{ minHeight: "44px", fontSize: "0.85rem", width: "100%" }}
											>
												{CLINIC_AUTOCLAVE_UNITS.map((u) => (
													<option key={u.id} value={u.id}>
														{u.brandModelRu}
													</option>
												))}
											</select>
										</div>

										<div>
											<label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.25rem" }}>
												№ Цикла:
											</label>
											<input
												type="number"
												min={1}
												max={99}
												value={cycleNumber}
												onChange={(e) => setCycleNumber(Math.max(1, parseInt(e.target.value) || 1))}
												className="sanpin-input"
												style={{ minHeight: "44px", fontSize: "1rem", fontWeight: 800, textAlign: "center", width: "100%" }}
											/>
										</div>
									</div>

									{/* Indicator Selection */}
									<div>
										<label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.25rem" }}>
											Химический индикатор контроля:
										</label>
										<select
											value={selectedIndicatorId}
											onChange={(e) => setSelectedIndicatorId(e.target.value)}
											className="sanpin-select"
											style={{ minHeight: "44px", fontSize: "0.85rem", width: "100%" }}
										>
											{SANPIN_CHEMICAL_INDICATORS.map((ind) => (
												<option key={ind.id} value={ind.id}>
													{ind.brandNameRu} ({ind.standardTargetParamRu})
												</option>
											))}
										</select>
									</div>

									{/* Batch Quantity Stepper */}
									<div>
										<label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
											Количество пакетов в партии:
										</label>
										<div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
											{[1, 5, 10, 25].map((q) => (
												<button
													key={q}
													type="button"
													onClick={() => setPackQuantity(q)}
													className={`sanpin-btn ${packQuantity === q ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
													style={{
														minHeight: "40px",
														padding: "0.3rem 0.75rem",
														fontSize: "0.85rem",
														fontWeight: 700,
														flex: 1,
													}}
												>
													{q} шт.
												</button>
											))}
										</div>
									</div>
								</div>
							</div>

							{/* Right Column: Live Thermal Sticker Preview & Direct Print Actions */}
							<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
								<div
									style={{
										padding: "1rem",
										borderRadius: "8px",
										border: "1px solid var(--line, #e2e8f0)",
										background: "var(--paper, #ffffff)",
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										gap: "0.75rem",
									}}
								>
									<div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										<span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink)" }}>
											<Tag size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
											Live-превью термоэтикетки 58×40 мм
										</span>
										<span
											className="sanpin-tag sanpin-tag-success"
											style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}
										>
											<CheckCircle2 size={12} /> Стерильно
										</span>
									</div>

									{/* Live Rendered Sticker */}
									<div
										className="kraft-label-preview-wrapper"
										dangerouslySetInnerHTML={{
											__html: generateThermalStickerHtml(livePreviewRecord, { size: previewLabelSize }),
										}}
									/>

									<div style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>
										Векторный 2D DataMatrix штрихкод со структурированным пейлоадом СанПиН 3.3686-21
									</div>
								</div>

								{/* 1-Click Action Buttons */}
								<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
									<button
										type="button"
										onClick={handlePrintThermalDirect}
										className="sanpin-btn sanpin-btn-primary"
										style={{
											minHeight: "50px",
											fontSize: "0.95rem",
											fontWeight: 800,
											background: "#0d9488",
											color: "#ffffff",
											borderRadius: "8px",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: "0.5rem",
											boxShadow: "0 4px 12px rgba(13, 148, 136, 0.3)",
										}}
										data-testid="print-thermal-sticker-btn"
									>
										<Printer size={18} />
										<span>Распечатать термоэтикетку (1 клик)</span>
									</button>

									<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
										<button
											type="button"
											onClick={handleCreateBatch}
											className="sanpin-btn sanpin-btn-secondary"
											style={{
												minHeight: "44px",
												fontSize: "0.85rem",
												fontWeight: 700,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												gap: "0.35rem",
											}}
											data-testid="save-batch-btn"
										>
											<Plus size={16} />
											<span>В партию ({packQuantity} шт)</span>
										</button>

										<button
											type="button"
											onClick={handlePrintA4Sheet}
											className="sanpin-btn sanpin-btn-secondary"
											style={{
												minHeight: "44px",
												fontSize: "0.85rem",
												fontWeight: 700,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												gap: "0.35rem",
											}}
											data-testid="print-a4-sheet-btn"
										>
											<FileText size={16} />
											<span>Лист А4 (24 шт)</span>
										</button>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* ─── MODE 2: QUICK SCANNER & 043/U LINK ─────────────────────────── */}
					{mode === "scan" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "720px", margin: "0 auto" }}>
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
													className={`sanpin-btn ${isTorchOn ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
													style={{ minHeight: "36px", padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
													title="Включить/выключить подсветку камеры"
												>
													<Zap size={14} />
													<span>{isTorchOn ? "Подсветка ВКЛ" : "Подсветка"}</span>
												</button>
												<button
													type="button"
													onClick={handleToggleFacingMode}
													className="sanpin-btn sanpin-btn-secondary"
													style={{ minHeight: "36px", padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
													title="Переключить камеру (задняя / передняя)"
												>
													<span>{facingMode === "environment" ? "Основная камера" : "Фронтальная"}</span>
												</button>
												<button
													type="button"
													onClick={stopCamera}
													className="sanpin-btn sanpin-btn-secondary"
													style={{ minHeight: "36px", padding: "0.35rem 0.65rem", fontSize: "0.75rem", color: "#dc2626" }}
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
													className="sanpin-btn sanpin-btn-primary"
													style={{ minHeight: "36px", padding: "0.35rem 0.85rem", fontSize: "0.8rem", fontWeight: 700, background: "var(--teal-600, #0d9488)", color: "#fff" }}
													data-testid="start-camera-scan-btn"
												>
													<Camera size={15} />
													<span>Запустить камеру 60 FPS</span>
												</button>
												{hardwareScanner.isCapacitorNative() && (
													<button
														type="button"
														onClick={handleNativeMlKitScan}
														className="sanpin-btn sanpin-btn-secondary"
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
										background: "#0f172a",
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
											{/* 2D DataMatrix Aiming Reticle */}
											<div
												style={{
													width: "160px",
													height: "160px",
													border: "2px solid #14b8a6",
													borderRadius: "12px",
													boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45), 0 0 15px rgba(20, 184, 166, 0.6)",
													position: "relative",
												}}
											>
												<div style={{ position: "absolute", top: "-20px", left: 0, right: 0, textAlign: "center", color: "#34d399", fontSize: "0.75rem", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
													Наведите на DataMatrix
												</div>
											</div>
										</div>
									) : (
										<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", fontSize: "0.825rem" }}>
											<Scan size={18} />
											<span>Камера выключена. Нажмите «Запустить камеру 60 FPS» или введите код вручную.</span>
										</div>
									)}
								</div>

								{/* Camera Error Message with Fallback Instructions */}
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

							{/* Manual Barcode Text Input & Samples */}
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
										className="sanpin-input"
										style={{ minHeight: "46px", fontSize: "0.95rem", width: "100%" }}
										data-testid="kraft-modal-scan-input"
									/>
									{scannedInput && (
										<button
											type="button"
											onClick={() => setScannedInput("")}
											className="sanpin-btn sanpin-btn-secondary"
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
										className="sanpin-tag sanpin-tag-neutral"
										style={{ cursor: "pointer", fontSize: "0.75rem" }}
									>
										• Azov Свежий (50 сут)
									</button>
									<button
										type="button"
										onClick={() => setScannedInput("KP-20260101-01-01")}
										className="sanpin-tag sanpin-tag-danger"
										style={{ cursor: "pointer", fontSize: "0.75rem" }}
									>
										• Просроченный пакет
									</button>
								</div>
							</div>

							{/* Scanned Package Result Card */}
							{parsedScanned ? (
								<div
									style={{
										padding: "1.25rem",
										borderRadius: "8px",
										border: parsedScanned.isExpired ? "1px solid #dc2626" : "1px solid #059669",
										background: parsedScanned.isExpired ? "rgba(220, 38, 38, 0.06)" : "rgba(5, 150, 105, 0.06)",
										display: "flex",
										flexDirection: "column",
										gap: "0.75rem",
									}}
								>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										{parsedScanned.isExpired ? (
											<span className="sanpin-tag sanpin-tag-danger" style={{ fontSize: "0.85rem", fontWeight: 800 }}>
												<AlertOctagon size={16} /> ПРОСРОЧЕНО (Истек {Math.abs(parsedScanned.daysRemaining)} дн. назад)
											</span>
										) : (
											<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.85rem", fontWeight: 800 }}>
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
										className="sanpin-btn sanpin-btn-primary"
										style={{
											minHeight: "48px",
											fontSize: "0.95rem",
											fontWeight: 800,
											background: "#059669",
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

					{/* ─── MODE 3: BATCH REGISTER TABLE ────────────────────────────────── */}
					{mode === "batch_register" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
								<span style={{ fontSize: "0.88rem", fontWeight: 700 }}>
									Сформированные крафт-пакеты текущей партии ({packages.length} шт.):
								</span>
								<div style={{ display: "flex", gap: "0.5rem" }}>
									<button
										type="button"
										onClick={handlePrintA4Sheet}
										className="sanpin-btn sanpin-btn-secondary"
										style={{ minHeight: "38px", fontSize: "0.8rem" }}
									>
										<Printer size={14} /> Печать листа А4
									</button>
									<button
										type="button"
										onClick={() => {
											const csv = exportKraftBatchToCsv(packages);
											const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
											const url = URL.createObjectURL(blob);
											const a = document.createElement("a");
											a.href = url;
											a.download = `kraft_batch_cycle_${cycleNumber}.csv`;
											document.body.appendChild(a);
											a.click();
											document.body.removeChild(a);
											URL.revokeObjectURL(url);
											showToast("Реестр экспортирован в CSV", "success");
										}}
										className="sanpin-btn sanpin-btn-secondary"
										style={{ minHeight: "38px", fontSize: "0.8rem" }}
									>
										<Download size={14} /> Экспорт CSV
									</button>
								</div>
							</div>

							<div className="sanpin-table-wrapper">
								<table className="sanpin-table">
									<thead>
										<tr>
											<th style={{ width: "40px" }}>№</th>
											<th>Штрихкод (Code128)</th>
											<th>Набор инструментов</th>
											<th>Упаковка (Срок)</th>
											<th>Дата / Срок годности</th>
											<th>Статус</th>
											<th>Действия</th>
										</tr>
									</thead>
									<tbody>
										{packages.map((pkg, idx) => (
											<tr key={pkg.id}>
												<td style={{ textAlign: "center" }}>{idx + 1}</td>
												<td>
													<span
														style={{
															fontFamily: "monospace",
															fontWeight: 700,
															fontSize: "0.8rem",
															background: "rgba(13, 148, 136, 0.1)",
															padding: "0.15rem 0.4rem",
															borderRadius: "4px",
															color: "#0d9488",
														}}
													>
														{pkg.barcode128}
													</span>
												</td>
												<td style={{ fontWeight: 600 }}>{pkg.toolSetNameRu}</td>
												<td>
													<span style={{ fontSize: "0.78rem" }}>
														{pkg.packageType === "paper_self_seal_single"
															? "Azov/DGM Самоклейка"
															: "Стандартный крафт"}{" "}
														({pkg.daysLifespan} сут)
													</span>
												</td>
												<td>
													<div style={{ fontSize: "0.8rem" }}>{pkg.packDate}</div>
													<div style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>
														до {pkg.expDate}
													</div>
												</td>
												<td>
													<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.72rem" }}>
														<Check size={11} /> Стерильно
													</span>
												</td>
												<td>
													<button
														type="button"
														onClick={() => {
															const stickerHtml = generateThermalStickerHtml(pkg, { size: "58x40" });
															const printWindow = window.open("", "_blank", "width=500,height=420");
															if (printWindow) {
																printWindow.document.write(`
																	<!DOCTYPE html><html><head><meta charset="utf-8"><title>Этикетка</title>
																	<style>@page { size: 58mm 40mm; margin: 0; } body { margin: 0; padding: 0; }</style>
																	</head><body>${stickerHtml}<script>window.onload=function(){window.print();};</script></body></html>
																`);
																printWindow.document.close();
															}
														}}
														className="sanpin-btn sanpin-btn-secondary"
														style={{ minHeight: "32px", padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
														title="Печать термоэтикетки"
													>
														<Printer size={13} /> 58×40
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>

				{/* 4. Footer */}
				<div
					style={{
						padding: "0.75rem 1.25rem",
						borderTop: "1px solid var(--line, #e2e8f0)",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						background: "var(--paper-soft, #f8fafc)",
					}}
				>
					<span style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>
						Стандарт стерилизации СанПиН 3.3686-21 • Режим: 134°C / 2.1 бар / 5 мин
					</span>
					<button
						type="button"
						onClick={onClose}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "40px", padding: "0.4rem 1.25rem", fontWeight: 600 }}
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
}

export default KraftPackageModal;
