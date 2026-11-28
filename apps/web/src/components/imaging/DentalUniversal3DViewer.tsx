/**
 * apps/web/src/components/imaging/DentalUniversal3DViewer.tsx
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIVERSAL DENTAL 3D INTRAORAL SCAN VIEWER (БОЕВОЙ 3D ПРОСМОТРЩИК ЧЕЛЮСТЕЙ)
 * ═══════════════════════════════════════════════════════════════════════════
 * TrueColor 24-bit PLY/STL/OBJ, Dual-Arch Occlusion Matrix Kinematics,
 * Dynamic Occlusion Distance Heatmap (<50um, 50-150um, 150-350um),
 * Preparation Undercut Inspection, 3D Micrometer Caliper, Instant Drag & Drop
 * ZIP extraction, and Direct Laboratory Order integration.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { UploadCloud, FileBox, AlertCircle, Loader2, Box } from "lucide-react";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import { isLowSpecDevice } from "../../lib/hardwareCapabilities/domAdapter.js";
import type {
	DentalArchLayer,
	DentalMaterialMode,
	DentalUniversal3DViewerProps,
	LayerVisibilityState,
	CaliperMeasurement,
	OcclusionContactStats,
} from "./dental3d/dental3dTypes.js";
import { Dental3DSceneEngine } from "./dental3d/dental3dSceneEngine.js";
import { extractDentalScansFromZip } from "./dental3d/dental3dMath.js";
import { Dental3dToolbar } from "./dental3d/Dental3dToolbar.js";
import { OcclusionLegendHud } from "./dental3d/OcclusionLegendHud.js";

export * from "./dental3d/dental3dTypes.js";
export * from "./dental3d/dental3dMath.js";

export const DentalUniversal3DViewer: React.FC<DentalUniversal3DViewerProps> = ({
	sessionId,
	modelUrl,
	modelFormat,
	upperArchUrl,
	lowerArchUrl,
	biteRegistrationUrl,
	prepUrl,
	scanbodyUrl,
	occlusionMatrix,
	patientName,
	toothCode,
	activeTeeth,
	onOpenLabOrder,
	onPopout,
	onClose,
	initialMaterialMode = "truecolor",
	className = "",
	style,
	isStandalone = false,
}) => {
	const canvasContainerRef = useRef<HTMLDivElement | null>(null);
	const engineRef = useRef<Dental3DSceneEngine | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const [isLoading, setIsLoading] = useState(false);
	const [loadingMessage, setLoadingMessage] = useState("Инициализация 3D сцены...");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isDragOver, setIsDragOver] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [hasModelsLoaded, setHasModelsLoaded] = useState(false);
	const isLowSpec = isLowSpecDevice();

	// Viewer Controls State
	const [materialMode, setMaterialMode] = useState<DentalMaterialMode>(initialMaterialMode);
	const [isBiteClosed, setIsBiteClosed] = useState(true);
	const [isCaliperActive, setIsCaliperActive] = useState(false);
	const [caliperMeasurement, setCaliperMeasurement] = useState<CaliperMeasurement | null>(null);
	const [occlusionStats, setOcclusionStats] = useState<OcclusionContactStats | null>(null);
	const [layerVisibility, setLayerVisibility] = useState<LayerVisibilityState>({
		upper: true,
		lower: true,
		bite: true,
		prep: true,
		scanbody: true,
	});

	// Detect current theme (dark by default in dental 3D viewports)
	const [theme, setTheme] = useState<"light" | "dark">(() => {
		if (typeof document !== "undefined") {
			return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
		}
		return "dark";
	});

	// Track theme attribute mutations
	useEffect(() => {
		if (typeof MutationObserver === "undefined") return;
		const observer = new MutationObserver(() => {
			const current = document.documentElement.getAttribute("data-theme");
			const nextTheme = current === "light" ? "light" : "dark";
			setTheme(nextTheme);
			if (engineRef.current) {
				engineRef.current.updateThemeBackground(nextTheme);
			}
		});
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
		return () => observer.disconnect();
	}, []);

	// Initialize Three.js Engine
	useEffect(() => {
		const container = canvasContainerRef.current;
		if (!container) return;

		const engine = new Dental3DSceneEngine(container, {
			theme,
			onCaliperMeasured: (m) => setCaliperMeasurement(m),
			onOcclusionStatsUpdated: (stats) => setOcclusionStats(stats),
		});
		engineRef.current = engine;

		const handleResize = () => engine.handleResize();
		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
			engine.dispose();
			engineRef.current = null;
		};
	}, []);

	// Apply initial or updated occlusion matrix
	useEffect(() => {
		if (engineRef.current) {
			engineRef.current.setOcclusionMatrix(occlusionMatrix);
		}
	}, [occlusionMatrix]);

	// Load Initial Arch URLs if provided, or default procedural realistic arches
	useEffect(() => {
		const engine = engineRef.current;
		if (!engine) return;

		let isCancelled = false;
		const abortController = new AbortController();

		const loadInitialModels = async () => {
			setIsLoading(true);
			setErrorMessage(null);
			try {
				let loadedAny = false;

				// 1. If backend sessionId is provided, fetch scan session
				if (sessionId && typeof fetch !== "undefined") {
					try {
						setLoadingMessage("Загрузка сессии интраорального сканирования...");
						const res = await fetch(`/api/v1/scans/sessions/${encodeURIComponent(sessionId)}`, {
							signal: abortController.signal,
						});
						if (res.ok && !abortController.signal.aborted) {
							const session = await res.json();
							if (session.occlusionMatrix && Array.isArray(session.occlusionMatrix)) {
								engine.setOcclusionMatrix(session.occlusionMatrix);
							}
							if (session.files && Array.isArray(session.files)) {
								for (const f of session.files) {
									const fileUrl = f.url || `/api/v1/scans/files/${sessionId}/${encodeURIComponent(f.fileName)}`;
									const ext = (f.fileName?.split(".").pop() || "ply").toLowerCase() as "ply" | "stl" | "obj";
									const role = String(f.role || "").toLowerCase();
									if (role.includes("upper")) {
										await engine.loadFromUrl(fileUrl, ext, "upper");
										loadedAny = true;
									} else if (role.includes("lower") || role.includes("mandible")) {
										await engine.loadFromUrl(fileUrl, ext, "lower");
										loadedAny = true;
									} else if (role.includes("bite")) {
										await engine.loadFromUrl(fileUrl, ext, "bite");
										loadedAny = true;
									} else if (role.includes("prep")) {
										await engine.loadFromUrl(fileUrl, ext, "prep");
										loadedAny = true;
									} else if (role.includes("scanbody")) {
										await engine.loadFromUrl(fileUrl, ext, "scanbody");
										loadedAny = true;
									}
								}
							}
						}
					} catch (manifestErr) {
						// Non-fatal, fallback to direct URLs or procedural
						console.warn("[DentalUniversal3DViewer] Study manifest fallback:", manifestErr);
					}
				}

				// Determine effective URLs supporting single modelUrl fallback
				const isMandible = Boolean(
					modelUrl && (modelUrl.toLowerCase().includes("mandible") || modelUrl.toLowerCase().includes("lower")),
				);
				const effectiveUpperUrl = upperArchUrl ?? (!isMandible ? modelUrl : undefined);
				const effectiveLowerUrl = lowerArchUrl ?? (isMandible ? modelUrl : undefined);

				if (effectiveUpperUrl) {
					setLoadingMessage("Загрузка верхнего зубного ряда...");
					const ext = modelFormat ?? ((effectiveUpperUrl.split(".").pop() || "stl").toLowerCase() as "ply" | "stl" | "obj");
					await engine.loadFromUrl(effectiveUpperUrl, ext, "upper");
					loadedAny = true;
				}

				if (effectiveLowerUrl) {
					setLoadingMessage("Загрузка нижнего зубного ряда...");
					const ext = modelFormat ?? ((effectiveLowerUrl.split(".").pop() || "stl").toLowerCase() as "ply" | "stl" | "obj");
					await engine.loadFromUrl(effectiveLowerUrl, ext, "lower");
					loadedAny = true;
				}

				if (biteRegistrationUrl) {
					const ext = (biteRegistrationUrl.split(".").pop() || "stl").toLowerCase() as "ply" | "stl" | "obj";
					await engine.loadFromUrl(biteRegistrationUrl, ext, "bite");
					loadedAny = true;
				}

				if (prepUrl) {
					const ext = (prepUrl.split(".").pop() || "stl").toLowerCase() as "ply" | "stl" | "obj";
					await engine.loadFromUrl(prepUrl, ext, "prep");
					loadedAny = true;
				}

				if (scanbodyUrl) {
					const ext = (scanbodyUrl.split(".").pop() || "stl").toLowerCase() as "ply" | "stl" | "obj";
					await engine.loadFromUrl(scanbodyUrl, ext, "scanbody");
					loadedAny = true;
				}

				if (loadedAny) {
					setHasModelsLoaded(true);
				} else {
					setHasModelsLoaded(false);
				}
			} catch (err: unknown) {
				if (!isCancelled && !abortController.signal.aborted && !(err instanceof Error && err.name === "AbortError")) {
					const msg = err instanceof Error ? err.message : "Не удалось загрузить 3D модель";
					setErrorMessage(`Ошибка загрузки: ${msg}`);
				}
			} finally {
				if (!isCancelled && !abortController.signal.aborted) {
					setIsLoading(false);
				}
			}
		};

		loadInitialModels();

		return () => {
			isCancelled = true;
			abortController.abort();
		};
	}, [sessionId, modelUrl, modelFormat, upperArchUrl, lowerArchUrl, biteRegistrationUrl, prepUrl, scanbodyUrl]);

	// Handlers for Toolbar
	const handleToggleLayer = useCallback((layer: DentalArchLayer) => {
		if (!engineRef.current) return;
		const nextVis = engineRef.current.toggleLayer(layer);
		setLayerVisibility((prev) => ({ ...prev, [layer]: nextVis }));
	}, []);

	const handleChangeMaterialMode = useCallback((mode: DentalMaterialMode) => {
		setMaterialMode(mode);
		if (engineRef.current) {
			engineRef.current.setMaterialMode(mode);
		}
	}, []);

	const handleToggleBite = useCallback(() => {
		if (!engineRef.current) return;
		engineRef.current.toggleBiteClosed();
		setIsBiteClosed(engineRef.current.isBiteCurrentlyClosed());
	}, []);

	const handleToggleCaliper = useCallback(() => {
		if (!engineRef.current) return;
		const nextActive = engineRef.current.toggleCaliper();
		setIsCaliperActive(nextActive);
		if (!nextActive) {
			setCaliperMeasurement(null);
		}
	}, []);

	const handleClearCaliper = useCallback(() => {
		if (engineRef.current) {
			engineRef.current.clearCaliper();
		}
		setCaliperMeasurement(null);
	}, []);

	const handleResetCamera = useCallback(() => {
		if (engineRef.current) {
			engineRef.current.resetCamera();
		}
	}, []);

	// Laboratory work order trigger
	const handleOpenLabOrder = useCallback(() => {
		const teethList = activeTeeth || (toothCode ? [String(toothCode)] : ["16"]);
		if (onOpenLabOrder) {
			onOpenLabOrder({
				teeth: teethList,
				scanSummary: `Интраоральный скан: режим ${materialMode}, челюсти в прикусе`,
			});
		}
	}, [activeTeeth, toothCode, materialMode, onOpenLabOrder]);

	// Drag & Drop File Ingestion (PLY, STL, OBJ, ZIP)
	const processFile = useCallback(async (file: File) => {
		const engine = engineRef.current;
		if (!engine) return;

		setIsLoading(true);
		setErrorMessage(null);
		const lowerName = file.name.toLowerCase();

		try {
			if (lowerName.endsWith(".zip")) {
				setLoadingMessage(`Распаковка архива 3D скана: ${file.name}...`);
				const zipBuffer = await file.arrayBuffer();
				const extracted = extractDentalScansFromZip(zipBuffer);
				if (extracted.length === 0) {
					throw new Error("В ZIP-архиве не найдено поддерживаемых 3D моделей (.ply, .stl, .obj)");
				}
				for (const item of extracted) {
					await engine.loadGeometryFromBuffer(item.buffer, item.format, item.layer, item.name);
				}
				setHasModelsLoaded(true);
			} else {
				setLoadingMessage(`Чтение 3D скана: ${file.name}...`);
				await engine.loadArchFromFile(file);
				setHasModelsLoaded(true);
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось прочитать файл";
			setErrorMessage(msg);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const handleLoadDemoPreset = useCallback(() => {
		const engine = engineRef.current;
		if (!engine) return;
		setIsLoading(true);
		setLoadingMessage("Загрузка демонстрационного образца челюстей...");
		try {
			engine.loadProceduralDefaultArches();
			setHasModelsLoaded(true);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragOver(false);
			const files = e.dataTransfer.files;
			if (files && files.length > 0) {
				for (let i = 0; i < files.length; i++) {
					const f = files[i];
					if (f) processFile(f);
				}
			}
		},
		[processFile],
	);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (files && files.length > 0) {
				for (let i = 0; i < files.length; i++) {
					const f = files[i];
					if (f) processFile(f);
				}
			}
		},
		[processFile],
	);

	return (
		<div
			className={`relative w-full h-full min-h-[460px] flex flex-col rounded-xl overflow-hidden bg-slate-950 text-slate-100 border border-[var(--line)] select-none ${className}`}
			style={style}
			onDragOver={(e) => {
				e.preventDefault();
				setIsDragOver(true);
			}}
			onDragLeave={(e) => {
				e.preventDefault();
				setIsDragOver(false);
			}}
			onDrop={handleDrop}
			data-testid="dental-universal-3d-viewer"
		>
			{/* Hidden Native File Input */}
			<input
				ref={fileInputRef}
				type="file"
				multiple
				accept=".ply,.stl,.obj,.zip"
				onChange={handleFileInputChange}
				className="hidden"
				data-testid="hidden-3d-file-input"
			/>

			{/* Main Interactive Toolbar */}
			<Dental3dToolbar
				patientName={patientName}
				toothCode={toothCode}
				activeTeeth={activeTeeth}
				layerVisibility={layerVisibility}
				onToggleLayer={handleToggleLayer}
				materialMode={materialMode}
				onChangeMaterialMode={handleChangeMaterialMode}
				isBiteClosed={isBiteClosed}
				onToggleBite={handleToggleBite}
				isCaliperActive={isCaliperActive}
				onToggleCaliper={handleToggleCaliper}
				caliperMeasurement={caliperMeasurement}
				onClearCaliper={handleClearCaliper}
				onResetCamera={handleResetCamera}
				onOpenFilePicker={() => fileInputRef.current?.click()}
				onOpenLabOrder={onOpenLabOrder ? handleOpenLabOrder : undefined}
				onPopout={onPopout}
				onClose={onClose}
				isFullscreen={isFullscreen}
				onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
				isStandalone={isStandalone}
			/>

			{/* WebGL Canvas Viewport */}
			<div
				ref={canvasContainerRef}
				className="w-full h-full flex-1 relative cursor-grab active:cursor-grabbing outline-hidden"
				tabIndex={0}
				data-testid="webgl-canvas-viewport"
			/>

			{/* Occlusion Heatmap Legend HUD */}
			<OcclusionLegendHud
				visible={materialMode === "occlusion"}
				stats={occlusionStats}
			/>

			{/* Честный пустой стейт при отсутствии реального файла скана */}
			{!hasModelsLoaded && !isLoading && (
				<div
					className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center select-text ${
						isLowSpec ? "bg-slate-950" : "bg-slate-950/90 backdrop-blur-xs"
					}`}
					data-testid="3d-viewer-empty-state"
				>
					<div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-[var(--primary)] mb-3 shadow-inner">
						<Box className="w-7 h-7" />
					</div>
					<h4 className="text-base font-semibold text-slate-100 tracking-tight">
						Интраоральный 3D-скан отсутствует
					</h4>
					<p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
						Загрузите файлы сканирования челюстей (.stl, .ply, .obj) со сканера 3Shape, Medit, iTero или перетащите их в это окно
					</p>
					<div className="mt-4 flex items-center gap-2.5 flex-wrap justify-center">
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
							data-testid="load-3d-scan-file-btn"
						>
							<UploadCloud className="w-4 h-4" />
							<span>Загрузить скан (.stl / .ply)</span>
						</button>
						{isDemoShowcaseMode() && (
							<button
								type="button"
								onClick={handleLoadDemoPreset}
								className="h-9 px-3.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium transition-all cursor-pointer"
								data-testid="load-demo-3d-model-btn"
							>
								Загрузить демо-образец
							</button>
						)}
					</div>
				</div>
			)}

			{/* Loading Spinner Indicator */}
			{isLoading && (
				<div
					className={`absolute inset-0 z-40 flex flex-col items-center justify-center ${
						isLowSpec ? "bg-black/80" : "bg-black/70 backdrop-blur-xs"
					}`}
					data-testid="viewer3d-loader"
				>
					<div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col items-center gap-2.5 max-w-[280px] text-center">
						<Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
						<p className="text-xs font-semibold text-[var(--ink)]">{loadingMessage}</p>
					</div>
				</div>
			)}

			{/* Error Banner */}
			{errorMessage && (
				<div
					className="absolute bottom-4 right-4 z-40 p-3 rounded-xl bg-red-950/90 border border-red-500/50 shadow-xl max-w-[340px] text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2"
					data-testid="viewer3d-error-banner"
				>
					<AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
					<div className="flex-1">
						<p className="font-semibold text-red-300">Ошибка 3D-модуля</p>
						<p className="mt-0.5 leading-snug text-red-200/90">{errorMessage}</p>
					</div>
					<button
						type="button"
						onClick={() => setErrorMessage(null)}
						className="text-red-400 hover:text-red-200 cursor-pointer"
					>
						✕
					</button>
				</div>
			)}

			{/* Drag & Drop Visual Overlay */}
			{isDragOver && (
				<div
					className={`absolute inset-0 z-50 flex flex-col items-center justify-center border-2 border-dashed border-teal-400 p-6 text-center animate-in fade-in duration-150 ${
						isLowSpec ? "bg-teal-950" : "bg-teal-950/80 backdrop-blur-sm"
					}`}
					data-testid="drag-drop-overlay"
				>
					<UploadCloud className="w-12 h-12 text-teal-400 animate-bounce mb-3" />
					<h4 className="text-base font-bold text-white tracking-tight">
						Отпустите файл для загрузки
					</h4>
					<p className="text-xs text-teal-200 mt-1 max-w-sm">
						Поддерживаются файлы оптических сканеров 3Shape, Medit, iTero (.ply, .stl, .obj или .zip)
					</p>
				</div>
			)}
		</div>
	);
};
