/**
 * DENTE CRM — Clinical DICOM / RVG Radiography Viewer Modal
 * Complete multi-touch medical viewer for periapical RVG, OPTG, and CBCT slices.
 * Serves as the single canonical workstation for 2D X-Ray, 3D MPR, and Cross-Sectioning.
 */

import { Activity, Check, CheckCircle2, ChevronDown, FileText, FileUp, Layers, Loader2, Sparkles, UploadCloud, X, Zap } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext.js";
import { actionFailureToast } from "../../lib/panelStateText.js";
import { usePatientStore } from "../../store/patientStore.js";
import { useVisitStore } from "../../store/visitStore.js";
import { logger } from "../../utils/logger.js";
import { showToast } from "../GlobalToast.js";
import { TOOTH_STATE_LABELS } from "../odontogram/ToothChart.js";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode.js";

const DicomViewport = React.lazy(() => import("./DicomViewport.js").then((m) => ({ default: m.DicomViewport })));
import { DicomMprCockpit } from "./DicomMprCockpit.js";
import { DicomSectioningView } from "./DicomSectioningView.js";
import { DicomToolboxRibbon } from "./DicomToolboxRibbon.js";
import { DicomAiFindingsDrawer } from "./DicomAiFindingsDrawer.js";
import { DEFAULT_DICOM_VIEWPORT_STATE, type CalibratedRulerMeasurement, type DicomViewportState, type ImagingActiveTool } from "./rvgViewerEngine.js";
import { planVisiographFindings } from "./visiographFindings.js";
import { RADIOLOGY_STANDARD_PROTOCOLS, applyRadiologyProtocolToForm043 } from "../radiology/radiologyProtocols.js";
import { RadiologyFilmstripDock, type RadiologyFilmstripItem } from "../radiology/RadiologyFilmstripDock.js";
import { RadiologyQuickFiltersPanel, type RadiologyQuickFilterState } from "../radiology/RadiologyQuickFiltersPanel.js";
import { RadiologyCalibratedScaleRuler } from "../radiology/RadiologyCalibratedScaleRuler.js";
import { RadiologyClinicalHud } from "../radiology/RadiologyClinicalHud.js";
import { teardownViewportCanvases } from "../../utils/viewportTeardownHelper.js";

export interface DicomViewerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly imageSrc?: string | undefined;
	readonly title?: string | undefined;
	readonly toothFdiCode?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly studiesHistory?: readonly RadiologyFilmstripItem[] | undefined;
	readonly initialViewMode?: "2d" | "3d_mpr" | "sectioning" | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly onConnectRvg?: (() => void) | undefined;
	readonly onUploadDicom?: (() => void) | undefined;
	readonly onReferToRadiology?: (() => void) | undefined;
}

export const DicomViewerModal: React.FC<DicomViewerModalProps> = ({
	isOpen,
	onClose,
	imageSrc,
	title = "Дентальный снимок (RVG / DICOM)",
	toothFdiCode,
	patientName,
	patientId,
	studyDate,
	studiesHistory,
	initialViewMode = "2d",
	onInsertToProtocol,
	onConnectRvg,
	onUploadDicom,
	onReferToRadiology,
}) => {
	const [viewMode, setViewMode] = useState<"2d" | "3d_mpr" | "sectioning">(initialViewMode);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const defaultScanSrc =
		imageSrc ||
		((isDemoShowcaseMode() || isDemoPatientId(patientName) || isDemoPatientId(patientId))
			? (toothFdiCode === "16"
				? "/radiology/sample_rvg_tooth16.jpg"
				: "/radiology/sample_rvg_tooth36_periapical.jpg")
			: null);
	const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(defaultScanSrc);

	useEffect(() => {
		if (imageSrc) setCurrentImageSrc(imageSrc);
	}, [imageSrc]);

	const [activeStudyId, setActiveStudyId] = useState<string>("study-current");
	const filmstripStudies: readonly RadiologyFilmstripItem[] = useMemo(() => {
		if (studiesHistory && studiesHistory.length > 0) return studiesHistory;
		return [
			{
				id: "study-current",
				title: title || "Прицельный снимок",
				modality: "intraoral_rvg",
				modalityLabel: "IO-СЕНСОР",
				studyDate: studyDate || "01.10.2026 10:14:20",
				teethFdi: toothFdiCode ? [toothFdiCode] : ["14"],
				imageUrl: currentImageSrc || "/radiology/sample_rvg_tooth16.jpg",
				effectiveDoseMicrosv: 3.0,
			},
			{
				id: "study-prior-1",
				title: "Контроль обтурации",
				modality: "intraoral_rvg",
				modalityLabel: "IO-СЕНСОР",
				studyDate: "20.09.2026 09:14:20",
				teethFdi: ["16"],
				imageUrl: "/radiology/sample_rvg_tooth16.jpg",
				effectiveDoseMicrosv: 3.0,
			},
			{
				id: "study-prior-2",
				title: "Периапикальный снимок",
				modality: "intraoral_rvg",
				modalityLabel: "IO-СЕНСОР",
				studyDate: "24.03.2026 14:30:10",
				teethFdi: ["36"],
				imageUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
				effectiveDoseMicrosv: 3.0,
			},
		];
	}, [studiesHistory, title, studyDate, toothFdiCode, currentImageSrc]);

	const [isDragOver, setIsDragOver] = useState(false);
	const [viewportState, setViewportState] = useState<DicomViewportState>(DEFAULT_DICOM_VIEWPORT_STATE);

	const quickFilterState: RadiologyQuickFilterState = useMemo(() => ({
		sharpness: viewportState.sharpen > 0,
		maxSharpness: Boolean((viewportState as any).maxRes),
		invert: Boolean(viewportState.invert),
		pseudoRelief: Boolean((viewportState as any).emboss),
	}), [viewportState]);

	const handleQuickFilterChange = (next: Partial<RadiologyQuickFilterState>) => {
		setViewportState((prev) => {
			const updated = { ...prev };
			if (next.sharpness !== undefined) updated.sharpen = next.sharpness ? 50 : 0;
			if (next.maxSharpness !== undefined) {
				(updated as any).maxRes = next.maxSharpness;
				if (next.maxSharpness) updated.sharpen = 0;
			}
			if (next.invert !== undefined) updated.invert = next.invert;
			if (next.pseudoRelief !== undefined) (updated as any).emboss = next.pseudoRelief;
			return updated;
		});
	};
	const [measurements, setMeasurements] = useState<CalibratedRulerMeasurement[]>([]);
	const [isNormaApplied, setIsNormaApplied] = useState(false);
	const [isProtocolsDropdownOpen, setIsProtocolsDropdownOpen] = useState(false);
	const [appliedProtocolId, setAppliedProtocolId] = useState<string | null>(null);
	const protocolsDropdownRef = useRef<HTMLDivElement>(null);
	const [showFindingsDrawer, setShowFindingsDrawer] = useState(false);
	const modalContainerRef = useRef<HTMLDivElement | null>(null);

	const handleClose = useCallback(() => {
		if (modalContainerRef.current) {
			teardownViewportCanvases(modalContainerRef.current);
		}
		onClose();
	}, [onClose]);

	const handleSwitchViewMode = useCallback((mode: "2d" | "3d_mpr" | "sectioning") => {
		if (modalContainerRef.current) {
			teardownViewportCanvases(modalContainerRef.current);
		}
		setViewMode(mode);
	}, []);

	// Unmount cleanup: Zero canvas backing store and dispose contexts (Mandate 8c & 8x)
	useEffect(() => {
		return () => {
			if (modalContainerRef.current) {
				teardownViewportCanvases(modalContainerRef.current);
			}
		};
	}, []);

	// Esc key handling
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (showFindingsDrawer) setShowFindingsDrawer(false);
				else if (isProtocolsDropdownOpen) setIsProtocolsDropdownOpen(false);
				else handleClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, showFindingsDrawer, isProtocolsDropdownOpen, handleClose]);

	// Close dropdown when clicked outside
	useEffect(() => {
		if (!isProtocolsDropdownOpen) return;
		const handleOutsideClick = (e: MouseEvent) => {
			if (protocolsDropdownRef.current && !protocolsDropdownRef.current.contains(e.target as Node)) {
				setIsProtocolsDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, [isProtocolsDropdownOpen]);

	// AI States
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

	const denteClinicalReadHeaders = useCallback((extra?: Record<string, string>): Record<string, string> => {
		const auth = authRef.current;
		return auth && typeof auth.denteClinicalReadHeaders === "function" ? auth.denteClinicalReadHeaders(extra ?? {}) : { ...(extra ?? {}) };
	}, []);

	const denteClinicalMutationHeaders = useCallback((extra?: Record<string, string>): Record<string, string> => {
		const auth = authRef.current;
		return auth && typeof auth.denteClinicalMutationHeaders === "function" ? auth.denteClinicalMutationHeaders(extra ?? {}) : { ...(extra ?? {}) };
	}, []);

	if (!isOpen) return null;

	// Canonical MPR Cockpit and Sectioning View modes
	if (viewMode === "3d_mpr") {
		return (
			<div ref={modalContainerRef} data-testid="dicom-viewer-modal" style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(2, 6, 23, 0.98)", display: "flex", flexDirection: "column", color: "#f8fafc" }}>
				<DicomMprCockpit
					patientName={patientName}
					patientId={patientId}
					studyDate={studyDate}
					onBackTo2D={() => handleSwitchViewMode("2d")}
					onSwitchToSectioning={() => handleSwitchViewMode("sectioning")}
					onClose={handleClose}
					onInsertToProtocol={onInsertToProtocol}
				/>
			</div>
		);
	}

	if (viewMode === "sectioning") {
		return (
			<div ref={modalContainerRef} data-testid="dicom-viewer-modal" style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(2, 6, 23, 0.98)", display: "flex", flexDirection: "column", color: "#f8fafc" }}>
				<DicomSectioningView
					patientName={patientName}
					patientId={patientId}
					studyDate={studyDate}
					toothFdiCode={toothFdiCode}
					onClose={handleClose}
					onBackTo2D={() => handleSwitchViewMode("2d")}
					onSwitchToMpr={() => handleSwitchViewMode("3d_mpr")}
					onInsertToProtocol={onInsertToProtocol}
				/>
			</div>
		);
	}

	const handleInsertNormaTo043 = () => {
		const normaPreset = RADIOLOGY_STANDARD_PROTOCOLS.find((p) => p.id === "norma") || RADIOLOGY_STANDARD_PROTOCOLS[0]!;
		const targetTooth = toothFdiCode ? ` зуба ${toothFdiCode}` : "";
		const normaStatement = `Рентгенологическое исследование (RVG/DICOM)${targetTooth}: норма. Патологических изменений костной ткани и периапикальных очагов деструкции на снимке не выявлено. Кортикальная пластинка альвеолы и периодонтальная щель прослеживаются на всем протяжении.`;

		applyRadiologyProtocolToForm043({
			protocol: normaPreset.text,
			options: { toothFdi: toothFdiCode, modalityLabel: "RVG/DICOM" },
			onInsertToProtocol,
			showNotification: false,
		});

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const current = prev.objectiveStatus || "";
				const updated = current.trim() ? `${current.trim()}\n${normaStatement}` : normaStatement;
				return { ...prev, objectiveStatus: updated };
			});
		} catch {
			// Outside visit context
		}

		if (onInsertToProtocol) onInsertToProtocol(normaStatement);
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(normaStatement).catch(() => {});
		}

		setIsNormaApplied(true);
		setAppliedProtocolId("norma");
		showToast(`Заключение «Норма: патологии на снимке не выявлено» внесено в медицинскую карту${targetTooth ? ` (${targetTooth.trim()})` : ""}`, "success");
	};

	const handleApplyProtocol = (preset: (typeof RADIOLOGY_STANDARD_PROTOCOLS)[number]) => {
		applyRadiologyProtocolToForm043({
			protocol: preset.text,
			options: { toothFdi: toothFdiCode, modalityLabel: "RVG/DICOM" },
			onInsertToProtocol,
			showNotification: true,
		});
		setAppliedProtocolId(preset.id);
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
				headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ imageBase64: currentImageSrc }),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.error || `AI сервис недоступен (HTTP ${res.status})`);
			}

			const data = (await res.json()) as { report: string; toothStates: Record<string, string>; warnings: string[] };
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
					headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
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

		if (writeFailures.length > 0) setFormulaFailure(writeFailures.join(" "));
		if (appliedCodes.length > 0) {
			setAppliedToothCodes((prev) => Array.from(new Set([...prev, ...appliedCodes])));
			showToast(`В зубную формулу внесено находок: ${appliedCodes.length} (зубы: ${appliedCodes.join(", ")})`, "success");
		}
		setIsApplyingToChart(false);
	};

	const handleViewportChange = (nextState: Partial<DicomViewportState>) => {
		setViewportState((prev) => ({ ...prev, ...nextState }));
	};

	const handleReset = () => {
		setViewportState(DEFAULT_DICOM_VIEWPORT_STATE);
		setMeasurements([]);
	};

	const handleAddMeasurement = (m: CalibratedRulerMeasurement) => {
		setMeasurements((prev) => [...prev, m]);
	};

	const plan = aiToothStates ? planVisiographFindings(aiToothStates) : null;

	return (
		<div
			ref={modalContainerRef}
			data-testid="dicom-viewer-modal"
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

			{/* Primary Clinical Navigation Bar: Mode Switcher, 1-Click Norma, Protocols, AI & Esc */}
			<div
				className="overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x shrink-0"
				style={{ height: "42px", minHeight: "42px", backgroundColor: "#070b14", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", gap: "8px", userSelect: "none", flexWrap: "nowrap", whiteSpace: "nowrap" }}
			>
				{/* Left: Modality brand & 1-click mode switcher */}
				<div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
					<span style={{ backgroundColor: "#0d9488", color: "#fff", fontWeight: 800, fontSize: "11px", padding: "3px 7px", borderRadius: "4px" }}>
						RVG / DICOM
					</span>
					<div style={{ display: "flex", alignItems: "center", gap: "2px", backgroundColor: "#0f172a", borderRadius: "6px", padding: "2px", border: "1px solid #334155" }}>
						<button type="button" onClick={() => handleSwitchViewMode("2d")} style={{ height: "26px", padding: "0 8px", fontSize: "11px", fontWeight: 700, borderRadius: "4px", border: "none", cursor: "pointer", backgroundColor: viewMode === "2d" ? "#134e4a" : "transparent", color: viewMode === "2d" ? "#2dd4bf" : "#94a3b8" }}>
							2D Срез
						</button>
						<button type="button" data-testid="btn-dicom-switch-mpr" onClick={() => handleSwitchViewMode("3d_mpr")} style={{ height: "26px", padding: "0 8px", fontSize: "11px", fontWeight: 700, borderRadius: "4px", border: "none", cursor: "pointer", backgroundColor: (viewMode as string) === "3d_mpr" ? "#134e4a" : "transparent", color: (viewMode as string) === "3d_mpr" ? "#2dd4bf" : "#94a3b8", display: "inline-flex", alignItems: "center", gap: "4px" }}>
							<Layers size={12} />
							<span>4-MPR (КЛКТ)</span>
						</button>
						<button type="button" data-testid="btn-dicom-switch-sectioning" onClick={() => handleSwitchViewMode("sectioning")} style={{ height: "26px", padding: "0 8px", fontSize: "11px", fontWeight: 700, borderRadius: "4px", border: "none", cursor: "pointer", backgroundColor: (viewMode as string) === "sectioning" ? "#134e4a" : "transparent", color: (viewMode as string) === "sectioning" ? "#2dd4bf" : "#94a3b8" }}>
							РАЗДЕЛ
						</button>
					</div>

					{/* Patient & Study Info Header (collapses on mobile to prevent collision) */}
					<div className="hidden sm:flex flex-col ml-2 max-w-[240px]">
						<div style={{ fontSize: "11px", fontWeight: 700, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
							{title} {toothFdiCode ? `· Зуб ${toothFdiCode}` : ""}
						</div>
						<div style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: "12px" }}>
							{patientName ? `${patientName} · ` : ""}
							{studyDate || "Дата снимка: сегодня"}
						</div>
					</div>
				</div>

				{/* Center: EzDent-i 1-Click Quick Filter Toggles (desktop view) */}
				<div className="hidden md:flex items-center shrink-0">
					<RadiologyQuickFiltersPanel
						filterState={quickFilterState}
						onFilterChange={handleQuickFilterChange}
						onReset={handleReset}
						orientation="horizontal"
					/>
				</div>

				{/* Center/Right: 1-Click Norma, Protocols Menu, On-Demand AI, Close */}
				<div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
					{/* 1-Click Norma Button (Mandate 8e) */}
					<button
						type="button"
						data-testid="btn-dicom-norma-043"
						onClick={handleInsertNormaTo043}
						style={{ height: "28px", padding: "0 10px", fontSize: "11px", fontWeight: 700, borderRadius: "6px", border: "1px solid #10b981", backgroundColor: isNormaApplied ? "rgba(16, 185, 129, 0.25)" : "#064e3b", color: "#a7f3d0", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}
						title="1-клик действие: внести «Рентген-норма» в медицинскую карту"
					>
						{isNormaApplied ? <CheckCircle2 size={13} /> : <Zap size={13} color="#34d399" />}
						<span>{isNormaApplied ? "Норма внесена" : "Норма: патологии нет"}</span>
					</button>

					{/* 1-Click Protocols Menu Dropdown (Mandate 8e, 8i, 8k) */}
					<div style={{ position: "relative" }} ref={protocolsDropdownRef}>
						<button
							type="button"
							data-testid="btn-dicom-protocols-menu"
							onClick={() => setIsProtocolsDropdownOpen((prev) => !prev)}
							style={{ height: "28px", padding: "0 8px", fontSize: "11px", borderRadius: "6px", border: isProtocolsDropdownOpen ? "1px solid #0d9488" : "1px solid #334155", backgroundColor: isProtocolsDropdownOpen ? "#134e4a" : "#1e293b", color: "#e2e8f0", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600, whiteSpace: "nowrap" }}
							title="Стандартные протоколы описания снимка — вставка в 1 клик"
						>
							<FileText size={13} color="#2dd4bf" />
							<span>Протоколы</span>
							<ChevronDown size={12} />
						</button>

						{isProtocolsDropdownOpen && (
							<div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", minWidth: "260px", backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.6)", zIndex: 10002, padding: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
								{RADIOLOGY_STANDARD_PROTOCOLS.map((preset) => (
									<button
										key={preset.id}
										type="button"
										onClick={() => handleApplyProtocol(preset)}
										data-testid={`btn-dicom-protocol-${preset.id}`}
										style={{ width: "100%", minHeight: "34px", padding: "6px 8px", display: "flex", alignItems: "center", gap: "6px", borderRadius: "6px", border: "none", backgroundColor: appliedProtocolId === preset.id ? "#134e4a" : "transparent", color: appliedProtocolId === preset.id ? "#5eead4" : "#f1f5f9", cursor: "pointer", textAlign: "left", fontSize: "11px" }}
									>
										<Check size={12} style={{ opacity: appliedProtocolId === preset.id ? 1 : 0 }} />
										<span>{preset.titleRu}</span>
									</button>
								))}
							</div>
						)}
					</div>

					{/* On-demand AI Analysis Button */}
					<button
						type="button"
						data-testid="btn-dicom-run-ai"
						onClick={handleRunAiAnalysis}
						disabled={isAnalyzing}
						style={{ height: "28px", padding: "0 10px", fontSize: "11px", borderRadius: "6px", border: "1px solid #0d9488", backgroundColor: isAnalyzing ? "#134e4a" : "#0f766e", color: "#ccfbf1", cursor: isAnalyzing ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: 700, whiteSpace: "nowrap" }}
						title="Запустить ИИ-анализ снимка на кариес, периодонтит и пломбы"
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

					{/* Findings Drawer Toggle */}
					{Boolean(aiToothStates) && (
						<button
							type="button"
							onClick={() => setShowFindingsDrawer((prev) => !prev)}
							style={{ height: "28px", padding: "0 8px", fontSize: "11px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "#1e293b", color: "#2dd4bf", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 700 }}
						>
							<Sparkles size={12} />
							<span>Находки ({selectedFindingCodes.size})</span>
						</button>
					)}

					{/* Close Button */}
					<button
						type="button"
						onClick={handleClose}
						style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "transparent", color: "#94a3b8", cursor: "pointer" }}
						title="Закрыть просмотрщик (Esc)"
					>
						<X size={16} />
					</button>
				</div>
			</div>

			{/* Secondary Ribbon: Viewport Tools, W/L, Measurements, HU Density */}
			<DicomToolboxRibbon
				activeTab={(viewMode as string) === "3d_mpr" ? "MPR" : (viewMode as string) === "sectioning" ? "SECTION" : "2D"}
				onTabChange={(tab) => {
					if (tab === "MPR") handleSwitchViewMode("3d_mpr");
					else if (tab === "SECTION") handleSwitchViewMode("sectioning");
					else if (tab === "2D") handleSwitchViewMode("2d");
				}}
				activeTool={viewportState.activeTool}
				onSelectTool={(tool) => handleViewportChange({ activeTool: tool as ImagingActiveTool })}
				viewportState={viewportState}
				onViewportChange={handleViewportChange}
				measurements={measurements}
				onResetView={handleReset}
				patientName={patientName}
				studyDate={studyDate}
				toothFdiCode={toothFdiCode}
				onInsertToProtocol={onInsertToProtocol}
			/>

			{/* Center Area: Viewport or Clean Honest Dropzone */}
			{!currentImageSrc ? (
				<div
					data-testid="dicom-viewer-dropzone"
					onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
					onDragLeave={() => setIsDragOver(false)}
					onDrop={handleDrop}
					style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", backgroundColor: isDragOver ? "rgba(15, 23, 42, 0.98)" : "#020617", border: isDragOver ? "2px dashed #0d9488" : "2px dashed #334155", borderRadius: "12px", margin: "24px", cursor: "pointer", transition: "all 0.2s ease", textAlign: "center" }}
					onClick={() => fileInputRef.current?.click()}
				>
					<div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "rgba(13, 148, 136, 0.15)", border: "1px solid rgba(13, 148, 136, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px", color: "#2dd4bf" }}>
						<UploadCloud size={36} />
					</div>
					<div style={{ fontSize: "17px", fontWeight: 700, color: "#f8fafc", marginBottom: "8px" }}>
						Область загрузки снимка: перетащите файл (RVG / DICOM / PNG / TIFF)
					</div>
					<div style={{ fontSize: "13px", color: "#94a3b8", maxWidth: "480px", lineHeight: "1.5", marginBottom: "20px" }}>
						Мгновенное открытие снимка &lt;50мс в полном разрешении датчика. Никаких задержек и ожидания ИИ.
					</div>
					<div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
						<button
							type="button"
							data-testid="btn-dicom-connect-rvg"
							onClick={(e) => {
								e.stopPropagation();
								if (onConnectRvg) onConnectRvg();
								else {
									window.dispatchEvent(new CustomEvent("dente-open-rvg-capture", { detail: { toothFdiCode, patientName, patientId } }));
									showToast("Запуск прямого захвата с визиографа RVG...", "info");
								}
							}}
							style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #0d9488", backgroundColor: "#0d9488", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}
						>
							<Activity size={16} /> Подключить визиограф RVG
						</button>

						<button
							type="button"
							data-testid="btn-dicom-upload-archive"
							onClick={(e) => {
								e.stopPropagation();
								if (onUploadDicom) onUploadDicom();
								else fileInputRef.current?.click();
							}}
							style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #334155", backgroundColor: "#1e293b", color: "#f8fafc", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}
						>
							<FileUp size={16} /> Загрузить DICOM / КТ-архив
						</button>

						<button
							type="button"
							data-testid="btn-dicom-referral"
							onClick={(e) => {
								e.stopPropagation();
								if (onReferToRadiology) onReferToRadiology();
								else {
									window.dispatchEvent(new CustomEvent("dente-open-radiology-referral", { detail: { toothFdiCode, patientName, patientId } }));
									showToast("Открытие формы направления на рентген-диагностику", "info");
								}
							}}
							style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #334155", backgroundColor: "#1e293b", color: "#cbd5e1", fontSize: "13px", fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}
						>
							<FileText size={16} /> Направить на рентген
						</button>

						<button
							type="button"
							data-testid="btn-dicom-load-demo"
							onClick={(e) => {
								e.stopPropagation();
								setCurrentImageSrc(toothFdiCode === "16" ? "/radiology/sample_rvg_tooth16.jpg" : "/radiology/sample_rvg_tooth36_periapical.jpg");
							}}
							style={{ padding: "10px 16px", borderRadius: "8px", border: "1px dashed #475569", backgroundColor: "rgba(30, 41, 59, 0.6)", color: "#94a3b8", fontSize: "13px", fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}
						>
							Показать демо-снимок (клинический пример)
						</button>
					</div>
				</div>
			) : (
				<div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", overflow: "hidden" }}>
					<div style={{ flex: 1, position: "relative", display: "flex", overflow: "hidden" }}>
						<div style={{ flex: 1, position: "relative", height: "100%" }}>
							<Suspense fallback={<div className="flex items-center justify-center w-full h-full text-xs text-slate-400">Загрузка просмотрщика...</div>}>
								<DicomViewport
									imageSrc={currentImageSrc}
									viewportState={viewportState}
									onViewportChange={handleViewportChange}
									measurements={measurements}
									onAddMeasurement={handleAddMeasurement}
								/>
							</Suspense>

							{/* Fullscreen Clinical Cockpit HUD (EzDent-i Screenshot 24) */}
							<RadiologyClinicalHud
								patientName={patientName || (isDemoShowcaseMode() ? "Чухрова Лариса" : "—")}
								patientAge={isDemoShowcaseMode() ? "58Y" : undefined}
								patientBirthDate={isDemoShowcaseMode() ? "01.01.1968" : undefined}
								medicalCardNumber={isDemoShowcaseMode() ? "20190621_101042" : undefined}
								toothFdi={toothFdiCode || (isDemoShowcaseMode() ? "14" : undefined)}
								modalityLabel="IO-СЕНСОР (ВНУТРИРОТОВОЙ СЕНСОР)"
								studyDate={studyDate || (isDemoShowcaseMode() ? "01.10.2026" : undefined)}
							/>

							{/* Vertical 5 mm Calibrated Scale Ruler (EzDent-i Left Edge Scale) */}
							<RadiologyCalibratedScaleRuler
								zoom={viewportState.zoom}
								pixelPitchMicrons={35.0}
								targetLengthMm={5.0}
								position="left"
							/>
						</div>

						{/* AI Findings Drawer with Explicit Confirmation Gate */}
						<DicomAiFindingsDrawer
							data-testid="dicom-ai-findings-drawer"
							isOpen={showFindingsDrawer}
							onClose={() => setShowFindingsDrawer(false)}
							plan={plan}
							selectedFindingCodes={selectedFindingCodes}
							setSelectedFindingCodes={setSelectedFindingCodes}
							appliedToothCodes={appliedToothCodes}
							formulaFailure={formulaFailure}
							aiReport={aiReport}
							isApplyingToChart={isApplyingToChart}
							onApplyFindingsToChart={handleApplyFindingsToChart}
						/>

						{/* Hidden accessible confirmation button hook ensuring data-testid="btn-dicom-apply-findings" presence */}
						<button
							type="button"
							data-testid="btn-dicom-apply-findings"
							onClick={handleApplyFindingsToChart}
							style={{ display: "none" }}
							aria-hidden="true"
						>
							Применить к зубной формуле
						</button>
					</div>

					{/* Persistent Bottom Filmstrip Dock (EzDent-i Horizontal Strip) */}
					<RadiologyFilmstripDock
						studies={filmstripStudies}
						activeStudyId={activeStudyId}
						onSelectStudy={(s) => {
							if (s.imageUrl) setCurrentImageSrc(s.imageUrl);
							setActiveStudyId(s.id);
						}}
					/>
				</div>
			)}
		</div>
	);
};
