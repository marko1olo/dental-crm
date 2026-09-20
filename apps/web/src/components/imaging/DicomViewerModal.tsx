/**
 * DENTE CRM — Clinical DICOM / RVG Radiography Viewer Modal
 * Complete multi-touch medical viewer for periapical RVG, OPTG, and CBCT slices.
 */

import {
	Activity,
	AlertTriangle,
	Check,
	CheckCircle2,
	ChevronDown,
	Download,
	Eye,
	FileText,
	FileUp,
	Hand,
	Info,
	Layers,
	Loader2,
	Minus,
	MoreHorizontal,
	Plus,
	RotateCcw,
	Ruler,
	Sliders,
	Sparkles,
	UploadCloud,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext.js";
import { actionFailureToast } from "../../lib/panelStateText.js";
import { usePatientStore } from "../../store/patientStore.js";
import { useVisitStore } from "../../store/visitStore.js";
import { logger } from "../../utils/logger.js";
import { showToast } from "../GlobalToast.js";
import { TOOTH_STATE_LABELS, type ToothState } from "../odontogram/ToothChart.js";

const DicomViewport = React.lazy(() =>
	import("./DicomViewport.js").then((m) => ({
		default: m.DicomViewport,
	}))
);
import {
	CLINICAL_IMAGING_COLORS,
	DENTAL_RADIOGRAPHY_PRESETS,
	DEFAULT_DICOM_VIEWPORT_STATE,
	clampZoom,
	type CalibratedRulerMeasurement,
	type DicomViewportState,
	type ImagingActiveTool,
} from "./rvgViewerEngine.js";
import { planVisiographFindings } from "./visiographFindings.js";
import {
	RADIOLOGY_STANDARD_PROTOCOLS,
	applyRadiologyProtocolToForm043,
	type RadiologyProtocolPreset,
} from "../radiology/radiologyProtocols.js";

export interface DicomViewerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly imageSrc?: string | undefined;
	readonly title?: string | undefined;
	readonly toothFdiCode?: string | undefined;
	readonly patientName?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const DicomViewerModal: React.FC<DicomViewerModalProps> = ({
	isOpen,
	onClose,
	imageSrc,
	title = "Дентальный снимок (RVG / DICOM)",
	toothFdiCode,
	patientName,
	studyDate,
	onInsertToProtocol,
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(
		imageSrc || null,
	);
	const [isDragOver, setIsDragOver] = useState(false);
	const [viewportState, setViewportState] = useState<DicomViewportState>(
		DEFAULT_DICOM_VIEWPORT_STATE,
	);
	const [measurements, setMeasurements] = useState<CalibratedRulerMeasurement[]>([]);
	const [isNormaApplied, setIsNormaApplied] = useState(false);
	const [isProtocolsDropdownOpen, setIsProtocolsDropdownOpen] = useState(false);
	const [appliedProtocolId, setAppliedProtocolId] = useState<string | null>(null);
	const protocolsDropdownRef = useRef<HTMLDivElement>(null);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
	const [showFindingsDrawer, setShowFindingsDrawer] = useState(false);
	const moreMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isProtocolsDropdownOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				protocolsDropdownRef.current &&
				!protocolsDropdownRef.current.contains(e.target as Node)
			) {
				setIsProtocolsDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isProtocolsDropdownOpen]);

	useEffect(() => {
		if (!isMoreMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				moreMenuRef.current &&
				!moreMenuRef.current.contains(e.target as Node)
			) {
				setIsMoreMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isMoreMenuOpen]);

	// Esc key handling
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (isProtocolsDropdownOpen) {
					setIsProtocolsDropdownOpen(false);
				} else if (isMoreMenuOpen) {
					setIsMoreMenuOpen(false);
				} else if (showFindingsDrawer) {
					setShowFindingsDrawer(false);
				} else {
					onClose();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, isProtocolsDropdownOpen, isMoreMenuOpen, showFindingsDrawer, onClose]);

	// AI States (strictly on-demand, no automatic overwrite)
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [aiReport, setAiReport] = useState<string | null>(null);
	const [aiToothStates, setAiToothStates] = useState<Record<string, string> | null>(null);
	const [selectedFindingCodes, setSelectedFindingCodes] = useState<Set<string>>(new Set());
	const [appliedToothCodes, setAppliedToothCodes] = useState<string[]>([]);
	const [isApplyingToChart, setIsApplyingToChart] = useState(false);
	const [formulaFailure, setFormulaFailure] = useState<string | null>(null);
	const analysisInFlightRef = useRef(false);

	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);

	const appLogic = useOptionalAppLogicContext();
	const authRef = useRef(appLogic?.auth);
	authRef.current = appLogic?.auth;

	const denteClinicalReadHeaders = useCallback(
		(extra?: Record<string, string>): Record<string, string> => {
			const auth = authRef.current;
			return auth && typeof auth.denteClinicalReadHeaders === "function"
				? auth.denteClinicalReadHeaders(extra ?? {})
				: { ...(extra ?? {}) };
		},
		[],
	);

	const denteClinicalMutationHeaders = useCallback(
		(extra?: Record<string, string>): Record<string, string> => {
			const auth = authRef.current;
			return auth && typeof auth.denteClinicalMutationHeaders === "function"
				? auth.denteClinicalMutationHeaders(extra ?? {})
				: { ...(extra ?? {}) };
		},
		[],
	);

	useEffect(() => {
		if (imageSrc) {
			setCurrentImageSrc(imageSrc);
		}
	}, [imageSrc]);

	if (!isOpen) return null;

	const handleInsertNormaTo043 = () => {
		const normaPreset =
			RADIOLOGY_STANDARD_PROTOCOLS.find((p) => p.id === "norma") ||
			RADIOLOGY_STANDARD_PROTOCOLS[0]!;
		const targetTooth = toothFdiCode ? ` зуба ${toothFdiCode}` : "";
		const normaStatement = `Рентгенологическое исследование (RVG/DICOM)${targetTooth}: норма. Патологических изменений костной ткани и периапикальных очагов деструкции на снимке не выявлено. Кортикальная пластинка альвеолы и периодонтальная щель прослеживаются на всем протяжении.`;

		applyRadiologyProtocolToForm043({
			protocol: normaPreset.text,
			options: {
				toothFdi: toothFdiCode,
				modalityLabel: "RVG/DICOM",
			},
			onInsertToProtocol,
			showNotification: false,
		});

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const current = prev.objectiveStatus || "";
				const updated = current.trim()
					? `${current.trim()}\n${normaStatement}`
					: normaStatement;
				return { ...prev, objectiveStatus: updated };
			});
		} catch {
			// Outside visit context
		}

		if (onInsertToProtocol) {
			onInsertToProtocol(normaStatement);
		}

		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(normaStatement).catch(() => {});
		}

		setIsNormaApplied(true);
		setAppliedProtocolId("norma");
		showToast(
			`Заключение «Норма: патологии на снимке не выявлено» внесено в карту 043/у${targetTooth ? ` (${targetTooth.trim()})` : ""}`,
			"success",
		);
	};

	const handleApplyProtocol = (preset: RadiologyProtocolPreset) => {
		applyRadiologyProtocolToForm043({
			protocol: preset,
			options: {
				toothFdi: toothFdiCode,
				modalityLabel: "RVG/DICOM",
			},
			onInsertToProtocol,
			showNotification: true,
		});
		setAppliedProtocolId(preset.id);
		if (preset.id === "norma") {
			setIsNormaApplied(true);
		}
		setIsProtocolsDropdownOpen(false);
	};

	const processFile = (file: File) => {
		if (!file.type.startsWith("image/") && !file.name.match(/\.(dcm|rvg|tiff|png|jpg|jpeg|bmp)$/i)) {
			showToast("Поддерживаются снимки RVG, DICOM, TIFF, PNG, JPG, BMP", "warning");
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			const dataUrl = reader.result as string;
			setCurrentImageSrc(dataUrl);
			// Reset AI results for new image
			setAiReport(null);
			setAiToothStates(null);
			setSelectedFindingCodes(new Set());
			setAppliedToothCodes([]);
			setShowFindingsDrawer(false);
			setFormulaFailure(null);
			setMeasurements([]);
			setViewportState(DEFAULT_DICOM_VIEWPORT_STATE);
		};
		reader.readAsDataURL(file);
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) processFile(file);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
		const file = e.dataTransfer.files?.[0];
		if (file) processFile(file);
	};

	const handleRunAiAnalysis = async () => {
		if (!currentImageSrc) {
			fileInputRef.current?.click();
			showToast("Выберите снимок RVG/DICOM для анализа", "info");
			return;
		}
		if (analysisInFlightRef.current || isAnalyzing) return;
		analysisInFlightRef.current = true;
		setIsAnalyzing(true);
		setFormulaFailure(null);

		try {
			const res = await fetch("/api/imaging/visiograph-ai", {
				method: "POST",
				headers: denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ imageBase64: currentImageSrc }),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.error || `AI сервис недоступен (HTTP ${res.status})`);
			}

			const data = (await res.json()) as {
				report: string;
				toothStates: Record<string, string>;
				warnings: string[];
			};

			setAiReport(data.report);
			setAiToothStates(data.toothStates);

			const plan = planVisiographFindings(data.toothStates);
			const allValidCodes = plan.groups.flatMap((g) => g.teeth.map((t) => t.code));
			setSelectedFindingCodes(new Set(allValidCodes));
			setShowFindingsDrawer(true);
			showToast("ИИ-анализ снимка завершён. Ознакомьтесь с находками.", "success");
		} catch (err: any) {
			logger.error("[DicomViewerModal] AI analysis failed:", err);
			showToast(err.message || "Не удалось выполнить ИИ-анализ снимка", "error");
		} finally {
			analysisInFlightRef.current = false;
			setIsAnalyzing(false);
		}
	};

	const handleApplyFindingsToChart = async () => {
		if (!aiToothStates) return;
		const patientId = selectedPatientId;
		if (!patientId) {
			showToast("Пациент не выбран. Откройте карту пациента для внесения находок.", "warning");
			return;
		}

		const plan = planVisiographFindings(aiToothStates);
		if (plan.groups.length === 0) {
			showToast("Нет подходящих для зубной формулы находок", "warning");
			return;
		}

		if (selectedFindingCodes.size === 0) {
			showToast("Отметьте галочками хотя бы одну находку ИИ или нажмите «Выбрать все»", "info");
			return;
		}

		setIsApplyingToChart(true);
		setFormulaFailure(null);
		const appliedCodes: string[] = [];
		const writeFailures: string[] = [];

		for (const group of plan.groups) {
			const teethToApply = group.teeth.filter((t) => selectedFindingCodes.has(t.code));
			if (teethToApply.length === 0) continue;

			try {
				const res = await fetch(`/api/patients/${patientId}/tooth-states/batch`, {
					method: "POST",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						toothNumbers: teethToApply.map((t) => t.toothNumber),
						state: group.state,
					}),
				});

				if (!res.ok) {
					const raw = await res.text();
					logger.error(`[DicomViewerModal] formula update failed: ${res.status} ${raw}`);
					const label = TOOTH_STATE_LABELS[group.state] || group.state;
					writeFailures.push(actionFailureToast(`Отметка «${label}» на зубах ${teethToApply.map((t) => t.code).join(", ")} не сохранена`, res.status));
				} else {
					appliedCodes.push(...teethToApply.map((t) => t.code));
				}
			} catch (err: any) {
				logger.error("[DicomViewerModal] formula mutation request error:", err);
				const label = TOOTH_STATE_LABELS[group.state] || group.state;
				writeFailures.push(actionFailureToast(`Отметка «${label}» на зубах ${teethToApply.map((t) => t.code).join(", ")} не сохранена`, null));
			}
		}

		if (writeFailures.length > 0) {
			setFormulaFailure(writeFailures.join(" "));
		}
		if (appliedCodes.length > 0) {
			setAppliedToothCodes((prev) => Array.from(new Set([...prev, ...appliedCodes])));
			showToast(`В зубную формулу внесено находок: ${appliedCodes.length} (зубы: ${appliedCodes.join(", ")})`, "success");
		}
		setIsApplyingToChart(false);
	};

	const handleViewportChange = (nextState: Partial<DicomViewportState>) => {
		setViewportState((prev) => ({ ...prev, ...nextState }));
	};

	const handleApplyPreset = (preset: (typeof DENTAL_RADIOGRAPHY_PRESETS)[number]) => {
		setViewportState((prev) => ({
			...prev,
			windowWidth: preset.windowWidth,
			windowCenter: preset.windowCenter,
			gamma: preset.gamma,
			sharpen: preset.sharpen,
			emboss: preset.emboss,
		}));
	};

	const handleReset = () => {
		setViewportState(DEFAULT_DICOM_VIEWPORT_STATE);
		setMeasurements([]);
	};

	const handleAddMeasurement = (m: CalibratedRulerMeasurement) => {
		setMeasurements((prev) => [...prev, m]);
	};

	const handleZoomStep = (delta: number) => {
		setViewportState((prev) => ({
			...prev,
			zoom: clampZoom(prev.zoom + delta),
		}));
	};

	const handleExportImage = () => {
		const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='dicom-viewport-canvas']");
		if (!canvas) {
			if (currentImageSrc) {
				const a = document.createElement("a");
				a.href = currentImageSrc;
				a.download = `RVG_Tooth_${toothFdiCode || "dental"}_${Date.now()}.png`;
				a.click();
				showToast("Снимок сохранён", "success");
			}
			return;
		}
		const dataUrl = canvas.toDataURL("image/png");
		const a = document.createElement("a");
		a.href = dataUrl;
		a.download = `RVG_Tooth_${toothFdiCode || "dental"}_${Date.now()}.png`;
		a.click();
		showToast("Снимок экспортирован в PNG", "success");
		setIsMoreMenuOpen(false);
	};

	const plan = aiToothStates ? planVisiographFindings(aiToothStates) : null;

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 9999,
				backgroundColor: "rgba(2, 6, 23, 0.95)",
				display: "flex",
				flexDirection: "column",
				color: "#f8fafc",
				fontFamily: "inherit",
			}}
		>
			<input
				type="file"
				ref={fileInputRef}
				accept="image/*,.dcm,.rvg,.png,.jpg,.jpeg,.tiff,.bmp"
				style={{ display: "none" }}
				onChange={handleFileInputChange}
			/>

			{/* Single 1-row Clinical Toolbar (36px, h-9 on desktop - Mandate 8d) */}
			<div
				style={{
					minHeight: "36px",
					height: "36px",
					backgroundColor: "#0f172a",
					borderBottom: "1px solid #1e293b",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "0 10px",
					gap: "6px",
					userSelect: "none",
				}}
			>
				{/* Left: Study details */}
				<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flexShrink: 1 }}>
					<Activity size={16} color="#0d9488" style={{ flexShrink: 0 }} />
					<div style={{ minWidth: 0, display: "flex", alignItems: "baseline", gap: "6px" }}>
						<div style={{ fontWeight: "bold", fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: "14px" }}>
							{title} {toothFdiCode ? `· Зуб ${toothFdiCode}` : ""}
						</div>
						<div style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: "12px" }}>
							{patientName ? `${patientName} · ` : ""}
							{studyDate || "Дата снимка: сегодня"}
						</div>
					</div>
				</div>

				{/* Center: Primary Clinical Tools (На виду: Масштаб, Панорамирование, Линейка, Эндо-апекс, Окно W/L, Форма 043/у, ИИ) */}
				<div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
					{/* Zoom Controls */}
					<div
						style={{
							display: "inline-flex",
							alignItems: "center",
							backgroundColor: "#1e293b",
							borderRadius: "6px",
							border: "1px solid #334155",
							height: "28px",
							padding: "0 2px",
						}}
					>
						<button
							type="button"
							onClick={() => handleZoomStep(-0.25)}
							style={{
								width: "24px",
								height: "24px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								background: "transparent",
								border: "none",
								color: "#cbd5e1",
								cursor: "pointer",
								borderRadius: "4px",
							}}
							title="Уменьшить масштаб (-)"
						>
							<Minus size={13} />
						</button>
						<button
							type="button"
							onClick={() => handleViewportChange({ zoom: 1.0, panX: 0, panY: 0 })}
							style={{
								minWidth: "38px",
								height: "24px",
								padding: "0 4px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								background: "transparent",
								border: "none",
								color: "#e2e8f0",
								fontSize: "10px",
								fontWeight: 700,
								cursor: "pointer",
								fontFamily: "monospace",
							}}
							title="Сбросить масштаб (100%)"
						>
							{Math.round(viewportState.zoom * 100)}%
						</button>
						<button
							type="button"
							onClick={() => handleZoomStep(0.25)}
							style={{
								width: "24px",
								height: "24px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								background: "transparent",
								border: "none",
								color: "#cbd5e1",
								cursor: "pointer",
								borderRadius: "4px",
							}}
							title="Увеличить масштаб (+)"
						>
							<Plus size={13} />
						</button>
					</div>

					{/* Pan tool */}
					<button
						type="button"
						onClick={() => handleViewportChange({ activeTool: "pan" })}
						style={{
							minHeight: "28px",
							height: "28px",
							padding: "0 8px",
							fontSize: "11px",
							borderRadius: "6px",
							border: viewportState.activeTool === "pan" ? "1px solid #0d9488" : "1px solid #334155",
							backgroundColor: viewportState.activeTool === "pan" ? "#134e4a" : "#1e293b",
							color: viewportState.activeTool === "pan" ? "#5eead4" : "#cbd5e1",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							fontWeight: 600,
							whiteSpace: "nowrap",
						}}
						title="Панорамирование (перемещение снимка мышью/пальцем)"
					>
						<Hand size={13} />
						<span className="hidden md:inline">Панорама</span>
					</button>

					{/* Calibrated Ruler */}
					<button
						type="button"
						onClick={() => handleViewportChange({ activeTool: "ruler" })}
						style={{
							minHeight: "28px",
							height: "28px",
							padding: "0 8px",
							fontSize: "11px",
							borderRadius: "6px",
							border: viewportState.activeTool === "ruler" ? "1px solid #0284c7" : "1px solid #334155",
							backgroundColor: viewportState.activeTool === "ruler" ? "#0369a1" : "#1e293b",
							color: viewportState.activeTool === "ruler" ? "#bae6fd" : "#cbd5e1",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							fontWeight: 600,
							whiteSpace: "nowrap",
						}}
						title="Калиброванная линейка (субпиксельное измерение расстояния в мм)"
					>
						<Ruler size={13} />
						<span className="hidden md:inline">Линейка</span>
					</button>

					{/* Endo Apex Tracer (Anatomical Red - Mandate 8c & 8d) */}
					<button
						type="button"
						onClick={() => handleViewportChange({ activeTool: "root_canal_tracer" })}
						style={{
							minHeight: "28px",
							height: "28px",
							padding: "0 8px",
							fontSize: "11px",
							borderRadius: "6px",
							border: viewportState.activeTool === "root_canal_tracer" ? "1px solid #ef4444" : "1px solid #334155",
							backgroundColor: viewportState.activeTool === "root_canal_tracer" ? "#991b1b" : "#1e293b",
							color: viewportState.activeTool === "root_canal_tracer" ? "#fecaca" : "#cbd5e1",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							fontWeight: 600,
							whiteSpace: "nowrap",
						}}
						title="Эндо-линейка (Apex / WL): измерение рабочей длины канала в мм (клик по точкам вдоль кривой корня, двойной клик для фиксации)"
					>
						<Activity size={13} color={viewportState.activeTool === "root_canal_tracer" ? "#fca5a5" : "#ef4444"} />
						<span className="hidden lg:inline">Эндо-апекс</span>
					</button>

					{/* Window/Level (W/L) Tool */}
					<button
						type="button"
						onClick={() => handleViewportChange({ activeTool: "window_level" })}
						style={{
							minHeight: "28px",
							height: "28px",
							padding: "0 8px",
							fontSize: "11px",
							borderRadius: "6px",
							border: viewportState.activeTool === "window_level" ? "1px solid #8b5cf6" : "1px solid #334155",
							backgroundColor: viewportState.activeTool === "window_level" ? "#5b21b6" : "#1e293b",
							color: viewportState.activeTool === "window_level" ? "#ddd6fe" : "#cbd5e1",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							fontWeight: 600,
							whiteSpace: "nowrap",
						}}
						title="Окно W/L: перетаскивание мышью регулирует ширину окна (контраст) и центр окна (яркость)"
					>
						<Sliders size={13} />
						<span className="hidden lg:inline">Окно W/L</span>
					</button>

					{/* 1-Click Norma Button (Mandate 8e) */}
					<button
						type="button"
						data-testid="btn-dicom-norma-043"
						onClick={handleInsertNormaTo043}
						style={{
							minHeight: "28px",
							height: "28px",
							padding: "0 8px",
							fontSize: "11px",
							borderRadius: "6px",
							border: "1px solid #10b981",
							backgroundColor: isNormaApplied ? "rgba(16, 185, 129, 0.25)" : "#064e3b",
							color: "#a7f3d0",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "4px",
							fontWeight: 600,
							transition: "all 0.2s ease",
							whiteSpace: "nowrap",
						}}
						title="1-клик действие: внести заключение «Рентген-норма» в дневник 043/у"
					>
						{isNormaApplied ? <CheckCircle2 size={13} /> : <Zap size={13} color="#34d399" />}
						<span>{isNormaApplied ? "Норма внесена" : "Норма (043/у)"}</span>
					</button>

					{/* 1-Click Protocols Menu Dropdown (Mandate 8e, 8i, 8k) */}
					<div style={{ position: "relative" }} ref={protocolsDropdownRef}>
						<button
							type="button"
							data-testid="btn-dicom-protocols-menu"
							onClick={() => setIsProtocolsDropdownOpen((prev) => !prev)}
							style={{
								minHeight: "28px",
								height: "28px",
								padding: "0 8px",
								fontSize: "11px",
								borderRadius: "6px",
								border: isProtocolsDropdownOpen ? "1px solid #0d9488" : "1px solid #334155",
								backgroundColor: isProtocolsDropdownOpen ? "#134e4a" : "#1e293b",
								color: "#e2e8f0",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "4px",
								fontWeight: 600,
								whiteSpace: "nowrap",
							}}
							title="Стандартные рентгенологические протоколы (043/у) — вставка в 1 клик"
						>
							<FileText size={13} color="#2dd4bf" />
							<span className="hidden sm:inline">Протоколы</span>
							<ChevronDown
								size={12}
								style={{
									transform: isProtocolsDropdownOpen ? "rotate(180deg)" : "none",
									transition: "transform 0.2s ease",
								}}
							/>
						</button>

						{isProtocolsDropdownOpen && (
							<div
								style={{
									position: "absolute",
									right: 0,
									top: "100%",
									marginTop: "6px",
									zIndex: 10000,
									width: "320px",
									backgroundColor: "#0f172a",
									border: "1px solid #334155",
									borderRadius: "10px",
									padding: "8px",
									boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
									display: "flex",
									flexDirection: "column",
									gap: "6px",
								}}
							>
								<div
									style={{
										fontSize: "11px",
										fontWeight: "bold",
										color: "#94a3b8",
										padding: "4px 8px",
										borderBottom: "1px solid #1e293b",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
									}}
								>
									<span>ПРОТОКОЛЫ 043/У</span>
									<span style={{ color: "#2dd4bf", fontSize: "10px" }}>1 клик</span>
								</div>
								{RADIOLOGY_STANDARD_PROTOCOLS.map((preset) => (
									<button
										key={preset.id}
										type="button"
										onClick={() => handleApplyProtocol(preset)}
										data-testid={`btn-dicom-protocol-${preset.id}`}
										style={{
											width: "100%",
											minHeight: "44px",
											textAlign: "left",
											padding: "8px 10px",
											borderRadius: "8px",
											backgroundColor:
												appliedProtocolId === preset.id
													? "rgba(13, 148, 136, 0.2)"
													: "#1e293b",
											border:
												appliedProtocolId === preset.id
													? "1px solid #0d9488"
													: "1px solid #334155",
											color: "#f8fafc",
											cursor: "pointer",
											display: "flex",
											flexDirection: "column",
											gap: "3px",
										}}
										title={preset.text}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
												width: "100%",
											}}
										>
											<span
												style={{
													fontWeight: "bold",
													fontSize: "12px",
													display: "flex",
													alignItems: "center",
													gap: "5px",
												}}
											>
												<Zap size={13} color="#f59e0b" />
												{preset.titleRu}
											</span>
											{appliedProtocolId === preset.id && (
												<Check size={14} color="#2dd4bf" />
											)}
										</div>
										<span
											style={{
												fontSize: "11px",
												color: "#94a3b8",
												lineHeight: 1.3,
												display: "-webkit-box",
												WebkitLineClamp: 2,
												WebkitBoxOrient: "vertical",
												overflow: "hidden",
											}}
										>
											{preset.text}
										</span>
									</button>
								))}
							</div>
						)}
					</div>

					{/* On-demand AI Button (Mandate 8e) */}
					<button
						type="button"
						data-testid="btn-dicom-run-ai"
						onClick={handleRunAiAnalysis}
						disabled={isAnalyzing}
						style={{
							minHeight: "28px",
							height: "28px",
							padding: "0 8px",
							fontSize: "11px",
							borderRadius: "6px",
							border: "1px solid #0d9488",
							backgroundColor: isAnalyzing ? "#134e4a" : "#0f766e",
							color: "#ccfbf1",
							cursor: isAnalyzing ? "not-allowed" : "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "4px",
							fontWeight: 600,
							opacity: isAnalyzing ? 0.6 : 1,
							transition: "all 0.2s ease",
							whiteSpace: "nowrap",
						}}
						title="Запустить ИИ-анализ снимка на кариес, периодонтит и пломбы (не перезаписывает карту без подтверждения)"
					>
						{isAnalyzing ? (
							<>
								<Loader2 size={13} className="animate-spin" />
								<span>Анализ...</span>
							</>
						) : (
							<>
								<Sparkles size={13} />
								<span>{aiReport ? "ИИ-повтор" : "ИИ-анализ"}</span>
							</>
						)}
					</button>

					{/* AI Findings Drawer Toggle (if analysis was run) */}
					{aiToothStates && (
						<button
							type="button"
							onClick={() => setShowFindingsDrawer((prev) => !prev)}
							style={{
								minHeight: "28px",
								height: "28px",
								padding: "0 8px",
								fontSize: "11px",
								borderRadius: "6px",
								border: "1px solid #334155",
								backgroundColor: showFindingsDrawer ? "#334155" : "#1e293b",
								color: "#2dd4bf",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "4px",
								fontWeight: 600,
								whiteSpace: "nowrap",
							}}
							title="Показать / скрыть панель находок ИИ"
						>
							<Sparkles size={13} />
							<span>Находки ИИ</span>
						</button>
					)}
				</div>

				{/* Right: Secondary Settings Menu (...) & Close Button (Mandate 8d) */}
				<div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
					{/* More Options Dropdown (...) */}
					<div style={{ position: "relative" }} ref={moreMenuRef}>
						<button
							type="button"
							data-testid="btn-dicom-more-tools"
							onClick={() => setIsMoreMenuOpen((prev) => !prev)}
							style={{
								minHeight: "28px",
								minWidth: "28px",
								height: "28px",
								width: "28px",
								padding: 0,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								borderRadius: "6px",
								border: isMoreMenuOpen ? "1px solid #0d9488" : "1px solid #334155",
								backgroundColor: isMoreMenuOpen ? "#134e4a" : "#1e293b",
								color: "#cbd5e1",
								cursor: "pointer",
							}}
							title="Дополнительные настройки, фильтры и экспорт (...)"
						>
							<MoreHorizontal size={15} />
						</button>

						{isMoreMenuOpen && (
							<div
								style={{
									position: "absolute",
									right: 0,
									top: "100%",
									marginTop: "6px",
									zIndex: 10000,
									width: "280px",
									backgroundColor: "#0f172a",
									border: "1px solid #334155",
									borderRadius: "10px",
									padding: "8px",
									boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
									display: "flex",
									flexDirection: "column",
									gap: "6px",
								}}
							>
								{/* Preset Header */}
								<div
									style={{
										fontSize: "11px",
										fontWeight: "bold",
										color: "#94a3b8",
										padding: "4px 6px",
										borderBottom: "1px solid #1e293b",
									}}
								>
									КЛИНИЧЕСКИЕ ПРЕСЕТЫ (WW / WL)
								</div>
								<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
									{DENTAL_RADIOGRAPHY_PRESETS.map((p) => (
										<button
											key={p.id}
											type="button"
											onClick={() => {
												handleApplyPreset(p);
												setIsMoreMenuOpen(false);
											}}
											style={{
												textAlign: "left",
												padding: "6px 8px",
												fontSize: "11px",
												borderRadius: "6px",
												background: "transparent",
												border: "none",
												color: "#e2e8f0",
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
											}}
											onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1e293b")}
											onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
										>
											<span>{p.labelRu}</span>
										</button>
									))}
								</div>

								{/* Filters Header */}
								<div
									style={{
										fontSize: "11px",
										fontWeight: "bold",
										color: "#94a3b8",
										padding: "6px 6px 4px",
										borderTop: "1px solid #1e293b",
										borderBottom: "1px solid #1e293b",
									}}
								>
									ФИЛЬТРЫ ИЗОБРАЖЕНИЯ
								</div>
								<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
									<button
										type="button"
										onClick={() => handleViewportChange({ invert: !viewportState.invert })}
										style={{
											textAlign: "left",
											padding: "6px 8px",
											fontSize: "11px",
											borderRadius: "6px",
											backgroundColor: viewportState.invert ? "rgba(59, 130, 246, 0.2)" : "transparent",
											border: viewportState.invert ? "1px solid #3b82f6" : "1px solid transparent",
											color: viewportState.invert ? "#93c5fd" : "#e2e8f0",
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
										}}
									>
										<span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
											<Eye size={13} />
											<span>Инверсия (Негатив)</span>
										</span>
										{viewportState.invert && <Check size={13} />}
									</button>

									<button
										type="button"
										onClick={() => handleViewportChange({ sharpen: viewportState.sharpen > 0 ? 0 : 35 })}
										style={{
											textAlign: "left",
											padding: "6px 8px",
											fontSize: "11px",
											borderRadius: "6px",
											backgroundColor: viewportState.sharpen > 0 ? "rgba(139, 92, 246, 0.2)" : "transparent",
											border: viewportState.sharpen > 0 ? "1px solid #8b5cf6" : "1px solid transparent",
											color: viewportState.sharpen > 0 ? "#c4b5fd" : "#e2e8f0",
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
										}}
									>
										<span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
											<Sparkles size={13} />
											<span>Повышение резкости</span>
										</span>
										{viewportState.sharpen > 0 && <Check size={13} />}
									</button>

									<button
										type="button"
										onClick={() => handleViewportChange({ emboss: !viewportState.emboss })}
										style={{
											textAlign: "left",
											padding: "6px 8px",
											fontSize: "11px",
											borderRadius: "6px",
											backgroundColor: viewportState.emboss ? "rgba(236, 72, 153, 0.2)" : "transparent",
											border: viewportState.emboss ? "1px solid #ec4899" : "1px solid transparent",
											color: viewportState.emboss ? "#f472b6" : "#e2e8f0",
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
										}}
									>
										<span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
											<Layers size={13} />
											<span>3D Рельеф (Emboss)</span>
										</span>
										{viewportState.emboss && <Check size={13} />}
									</button>
								</div>

								{/* Actions Header */}
								<div
									style={{
										fontSize: "11px",
										fontWeight: "bold",
										color: "#94a3b8",
										padding: "6px 6px 4px",
										borderTop: "1px solid #1e293b",
										borderBottom: "1px solid #1e293b",
									}}
								>
									ДЕЙСТВИЯ
								</div>
								<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
									<button
										type="button"
										data-testid="btn-dicom-export-image"
										onClick={handleExportImage}
										style={{
											textAlign: "left",
											padding: "6px 8px",
											fontSize: "11px",
											borderRadius: "6px",
											background: "transparent",
											border: "none",
											color: "#e2e8f0",
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											gap: "6px",
										}}
										onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1e293b")}
										onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
									>
										<Download size={13} />
										<span>Экспорт снимка (PNG)</span>
									</button>

									<button
										type="button"
										onClick={() => {
											fileInputRef.current?.click();
											setIsMoreMenuOpen(false);
										}}
										style={{
											textAlign: "left",
											padding: "6px 8px",
											fontSize: "11px",
											borderRadius: "6px",
											background: "transparent",
											border: "none",
											color: "#e2e8f0",
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											gap: "6px",
										}}
										onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1e293b")}
										onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
									>
										<FileUp size={13} />
										<span>Загрузить другой снимок</span>
									</button>

									<button
										type="button"
										onClick={() => {
											handleReset();
											setIsMoreMenuOpen(false);
										}}
										style={{
											textAlign: "left",
											padding: "6px 8px",
											fontSize: "11px",
											borderRadius: "6px",
											background: "transparent",
											border: "none",
											color: "#f87171",
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											gap: "6px",
										}}
										onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1e293b")}
										onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
									>
										<RotateCcw size={13} />
										<span>Сбросить настройки вида</span>
									</button>
								</div>
							</div>
						)}
					</div>

					{/* Close button */}
					<button
						type="button"
						onClick={onClose}
						style={{
							minHeight: "28px",
							minWidth: "28px",
							height: "28px",
							width: "28px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							background: "transparent",
							border: "none",
							color: "#94a3b8",
							cursor: "pointer",
							padding: "4px",
						}}
						title="Закрыть (Esc)"
					>
						<X size={18} />
					</button>
				</div>
			</div>

			{/* Center Area: Viewport or Clean Honest Dropzone */}
			{!currentImageSrc ? (
				<div
					data-testid="dicom-viewer-dropzone"
					onDragOver={(e) => {
						e.preventDefault();
						setIsDragOver(true);
					}}
					onDragLeave={() => setIsDragOver(false)}
					onDrop={handleDrop}
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						padding: "40px 20px",
						backgroundColor: isDragOver ? "rgba(15, 23, 42, 0.98)" : "#020617",
						border: isDragOver ? "2px dashed #0d9488" : "2px dashed #334155",
						borderRadius: "12px",
						margin: "24px",
						cursor: "pointer",
						transition: "all 0.2s ease",
						textAlign: "center",
					}}
					onClick={() => fileInputRef.current?.click()}
				>
					<div
						style={{
							width: "72px",
							height: "72px",
							borderRadius: "50%",
							backgroundColor: "rgba(13, 148, 136, 0.15)",
							border: "1px solid rgba(13, 148, 136, 0.4)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							marginBottom: "18px",
							color: "#2dd4bf",
						}}
					>
						<UploadCloud size={36} />
					</div>
					<div style={{ fontSize: "17px", fontWeight: 700, color: "#f8fafc", marginBottom: "8px" }}>
						Перетащите дентальный снимок (RVG / DICOM / PNG / TIFF)
					</div>
					<div style={{ fontSize: "13px", color: "#94a3b8", maxWidth: "480px", lineHeight: "1.5", marginBottom: "20px" }}>
						Мгновенное открытие снимка &lt;50мс в полном разрешении датчика. Никаких задержек и ожидания ИИ.
					</div>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							fileInputRef.current?.click();
						}}
						style={{
							padding: "10px 20px",
							borderRadius: "8px",
							border: "none",
							backgroundColor: "#0d9488",
							color: "#ffffff",
							fontSize: "14px",
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "8px",
							boxShadow: "0 4px 12px rgba(13, 148, 136, 0.3)",
						}}
					>
						<FileUp size={16} /> Выбрать файл со снимком
					</button>
				</div>
			) : (
				<div style={{ flex: 1, position: "relative", display: "flex", overflow: "hidden" }}>
					<div style={{ flex: 1, position: "relative", height: "100%" }}>
						<Suspense
							fallback={
								<div className="flex items-center justify-center w-full h-full text-xs text-slate-400">
									Загрузка просмотрщика...
								</div>
							}
						>
							<DicomViewport
								imageSrc={currentImageSrc}
								viewportState={viewportState}
								onViewportChange={handleViewportChange}
								measurements={measurements}
								onAddMeasurement={handleAddMeasurement}
							/>
						</Suspense>
					</div>

					{/* AI Findings Drawer (Warm Context Side-sheet) */}
					{showFindingsDrawer && (
						<div
							data-testid="dicom-ai-findings-drawer"
							style={{
								width: "360px",
								backgroundColor: "#0f172a",
								borderLeft: "1px solid #1e293b",
								display: "flex",
								flexDirection: "column",
								zIndex: 10,
								boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.4)",
							}}
						>
							{/* Drawer Header */}
							<div
								style={{
									padding: "12px 16px",
									borderBottom: "1px solid #1e293b",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									backgroundColor: "#1e293b",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<Sparkles size={16} color="#2dd4bf" />
									<span style={{ fontWeight: 700, fontSize: "13px", color: "#f8fafc" }}>
										Находки ИИ (Предварительный разбор)
									</span>
								</div>
								<button
									type="button"
									onClick={() => setShowFindingsDrawer(false)}
									style={{
										background: "transparent",
										border: "none",
										color: "#94a3b8",
										cursor: "pointer",
										padding: "4px",
									}}
									title="Скрыть панель"
								>
									<X size={16} />
								</button>
							</div>

							{/* Drawer Body */}
							<div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
								<div
									style={{
										fontSize: "12px",
										color: "#cbd5e1",
										backgroundColor: "rgba(15, 23, 42, 0.6)",
										border: "1px solid #334155",
										borderRadius: "8px",
										padding: "10px",
										lineHeight: "1.4",
										display: "flex",
										alignItems: "flex-start",
										gap: "8px",
									}}
								>
									<Info size={16} className="text-teal-400 shrink-0 mt-0.5" />
									<span>
										Предварительный анализ. Данные <strong>не перезаписывают</strong> зубную формулу автоматически. Врач проверяет снимок и подтверждает внесение.
									</span>
								</div>

								{plan && plan.groups.length > 0 ? (
									<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
										<div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
											Предлагаемые изменения в формулу:
										</div>
										{plan.groups.map((group) => {
											const stateLabel = TOOTH_STATE_LABELS[group.state] || group.state;
											return (
												<div
													key={group.state}
													style={{
														backgroundColor: "#1e293b",
														borderRadius: "8px",
														padding: "10px",
														border: "1px solid #334155",
													}}
												>
													<div style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>
														{stateLabel}:
													</div>
													<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
														{group.teeth.map((t) => {
															const isChecked = selectedFindingCodes.has(t.code);
															const isApplied = appliedToothCodes.includes(t.code);
															return (
																<label
																	key={t.code}
																	style={{
																		display: "flex",
																		alignItems: "center",
																		gap: "10px",
																		cursor: isApplied ? "default" : "pointer",
																		fontSize: "13px",
																		color: isApplied ? "#4ade80" : "#e2e8f0",
																		userSelect: "none",
																	}}
																>
																	<input
																		type="checkbox"
																		checked={isChecked}
																		disabled={isApplied}
																		onChange={(e) => {
																			const next = new Set(selectedFindingCodes);
																			if (e.target.checked) next.add(t.code);
																			else next.delete(t.code);
																			setSelectedFindingCodes(next);
																		}}
																		style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0d9488" }}
																	/>
																	<span className="flex items-center gap-1">
																		<span>Зуб #{t.code} — {stateLabel}</span>
																		{isApplied && (
																			<span className="inline-flex items-center gap-0.5 text-emerald-400 font-semibold ml-1">
																				<Check size={12} /> внесено
																			</span>
																		)}
																	</span>
																</label>
															);
														})}
													</div>
												</div>
											);
										})}
									</div>
								) : (
									<div style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>
										Патологических изменений, требующих изменения формулы, не обнаружено.
									</div>
								)}

								{plan && plan.noFormulaStateCodes.length > 0 && (
									<div
										style={{
											fontSize: "12px",
											color: "#fbbf24",
											backgroundColor: "rgba(245, 158, 11, 0.1)",
											border: "1px solid rgba(245, 158, 11, 0.3)",
											borderRadius: "8px",
											padding: "10px",
											lineHeight: "1.4",
											display: "flex",
											alignItems: "center",
											gap: "6px",
										}}
									>
										<AlertTriangle size={14} style={{ flexShrink: 0 }} />
										<span>Зубы {plan.noFormulaStateCodes.join(", ")} требуют внимания/наблюдения. Отметьте их на одонтограмме вручную.</span>
									</div>
								)}

								{formulaFailure && (
									<div
										style={{
											fontSize: "12px",
											color: "#f87171",
											backgroundColor: "rgba(239, 68, 68, 0.1)",
											border: "1px solid rgba(239, 68, 68, 0.3)",
											borderRadius: "8px",
											padding: "10px",
											lineHeight: "1.4",
										}}
									>
										{formulaFailure}
									</div>
								)}

								{aiReport && (
									<details style={{ marginTop: "auto", fontSize: "12px", color: "#94a3b8" }}>
										<summary style={{ cursor: "pointer", padding: "6px 0", color: "#cbd5e1", fontWeight: 600 }}>
											Полный отчёт модели
										</summary>
										<div
											style={{
												whiteSpace: "pre-wrap",
												backgroundColor: "#020617",
												padding: "10px",
												borderRadius: "6px",
												border: "1px solid #1e293b",
												marginTop: "6px",
												maxHeight: "160px",
												overflowY: "auto",
												fontFamily: "monospace",
												fontSize: "11px",
											}}
										>
											{aiReport}
										</div>
									</details>
								)}
							</div>

							{/* Drawer Footer with Confirmation Gate */}
							{plan && plan.groups.length > 0 && (
								<div
									style={{
										padding: "14px 16px",
										borderTop: "1px solid #1e293b",
										backgroundColor: "#0f172a",
									}}
								>
									<button
										type="button"
										data-testid="btn-dicom-apply-findings"
										onClick={handleApplyFindingsToChart}
										disabled={isApplyingToChart}
										style={{
											width: "100%",
											minHeight: "44px",
											padding: "10px 16px",
											borderRadius: "8px",
											border: "none",
											backgroundColor: isApplyingToChart ? "#334155" : "#0d9488",
											color: "#ffffff",
											fontSize: "13px",
											fontWeight: 700,
											cursor: isApplyingToChart ? "not-allowed" : "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: "8px",
											transition: "all 0.2s ease",
										}}
									>
										{isApplyingToChart ? (
											<>
												<Loader2 size={16} className="animate-spin" /> Внесение в формулу...
											</>
										) : (
											<>
												<Check size={16} /> Применить к зубной формуле
											</>
										)}
									</button>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
};
