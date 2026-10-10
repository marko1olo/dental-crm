import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { countLabel } from "../../../AppHelpers.js";
import { useAppLogicContext } from "../../../contexts/AppLogicContext.js";
import { resolvePanelPhase } from "../../../lib/panelStateText.js";
import { usePatientStore } from "../../../store/patientStore.js";
import { logger } from "../../../utils/logger.js";
import { showToast } from "../../GlobalToast.js";
import type { ToothState } from "../../odontogram/ToothChart.js";
import { planVisiographFindings } from "../visiographFindings.js";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode.js";
import {
	buildFindingsNotice,
	extractSummary,
	getInitialDefaultScan,
	saveVisiographScanToServer,
	updateVisiographScanMeta,
	type AiToothState,
	type XrayScan,
} from "../VisiographScanHelpers.js";
import { useVisiographArchive } from "../useVisiographArchive.js";
import type { VisiographPresetType } from "../VisiographCockpitPresets.js";
import type { RadiologyFilmstripItem } from "../../radiology/RadiologyFilmstripDock.js";
import { useAppStore } from "../../../store/appStore.js";
import type {
	VisiographAnalyzerProps,
	VisiographScaleCalibration,
} from "./types.js";
import {
	applyNormaTo043,
	insertReportTo043Protocol,
	writeToothStatesToChart,
} from "./visiographChartBridge.js";

export function useVisiographAnalyzer({
	onInsertToProtocol,
	toothCode,
	initialScan,
	patientId,
	visitId,
	selectedStudy,
}: VisiographAnalyzerProps = {}) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const dropRef = useRef<HTMLButtonElement>(null);
	const analysisInFlightRef = useRef(false);

	const { selectedPatientId, patientCoreDraft } = usePatientStore();
	const effectivePatientId = patientId ?? selectedPatientId;
	const appActiveVisitId = useAppStore((s) => s.dashboard?.activeVisit?.id);
	const effectiveVisitId = visitId ?? appActiveVisitId ?? undefined;
	const patientFullName =
		patientCoreDraft?.fullName ||
		(isDemoShowcaseMode() ? "Чухрова Лариса" : "Пациент клиники");
	const [isSensorViewerOpen, setIsSensorViewerOpen] = useState(false);

	const defaultInitialScan = useMemo(() => {
		if (initialScan) return initialScan;
		if (isDemoShowcaseMode() || isDemoPatientId(effectivePatientId)) {
			return getInitialDefaultScan(toothCode, effectivePatientId);
		}
		return null;
	}, [initialScan, toothCode, effectivePatientId]);

	const appLogic = useAppLogicContext();
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

	const [isDragOver, setIsDragOver] = useState(false);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
		defaultInitialScan?.imageDataUri ?? null,
	);
	const [currentScan, setCurrentScan] = useState<XrayScan | null>(
		defaultInitialScan,
	);
	const currentScanRef = useRef<XrayScan | null>(defaultInitialScan);
	currentScanRef.current = currentScan;

	const [saveFailure, setSaveFailure] = useState<string | null>(null);
	const [appliedToothCodes, setAppliedToothCodes] = useState<string[]>([]);
	const [applyNotice, setApplyNotice] = useState<string | null>(null);
	const [formulaFailure, setFormulaFailure] = useState<string | null>(null);
	const [selectedFindingCodes, setSelectedFindingCodes] = useState<Set<string>>(() => {
		if (defaultInitialScan?.aiToothStates) {
			const plan = planVisiographFindings(defaultInitialScan.aiToothStates);
			return new Set(plan.groups.flatMap((g) => g.teeth.map((t) => t.code)));
		}
		return new Set();
	});

	// Calibrated scale (standard 5 mm ball target)
	const [calibration, setCalibration] = useState<VisiographScaleCalibration>({
		standardReferenceMm: 5.0,
		pixelsPerMm: 28.57, // ~35 µm standard RVG pitch
		mmPerPixel: 0.035,
		isCalibrated: true,
	});

	const [workingLengthMm, setWorkingLengthMm] = useState<number | null>(null);

	const handleMeasureWorkingLength = useCallback(
		(lengthMm: number) => {
			const rounded = Math.round(lengthMm * 10) / 10;
			setWorkingLengthMm(rounded);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-endo-wl-measured", {
						detail: {
							toothNumber: toothCode ? Number(toothCode) : 16,
							lengthMm: rounded,
						},
					}),
				);
			}
		},
		[toothCode],
	);

	const calibrateWithBall = useCallback((measuredBallDiameterPx: number) => {
		if (measuredBallDiameterPx > 0) {
			const pxPerMm = measuredBallDiameterPx / 5.0;
			setCalibration({
				standardReferenceMm: 5.0,
				pixelsPerMm: pxPerMm,
				mmPerPixel: 1 / pxPerMm,
				isCalibrated: true,
			});
			showToast(
				`Калибровка по шарику 5 мм выполнена (${pxPerMm.toFixed(1)} пкс/мм)`,
				"success",
			);
		}
	}, []);

	useEffect(() => {
		if (!selectedStudy) return;
		const imageUrl = selectedStudy.previewUrl || selectedStudy.viewerUrl;
		if (!imageUrl) return;

		setCurrentImageUrl(imageUrl);
		const scanTooth = selectedStudy.toothCode ?? toothCode ?? "16";
		const scan: XrayScan = {
			id: selectedStudy.id || `study-${Date.now()}`,
			patientId: effectivePatientId || "active_patient",
			status: "done",
			kind: selectedStudy.modality || "periapical",
			toothCode: scanTooth,
			originalFilename: selectedStudy.title || `rvg_${scanTooth}.jpg`,
			aiReport: selectedStudy.title
				? `### Снимок\n${selectedStudy.title}`
				: `### Снимок зуба ${scanTooth}\nПрицельная радиовизиография`,
			aiSummary: selectedStudy.title || `Снимок зуба ${scanTooth}`,
			aiToothStates: { [scanTooth]: "treatment" },
			hasImage: true,
			imageDataUri: imageUrl,
			capturedAt: selectedStudy.capturedAt || new Date().toISOString(),
			createdAt: selectedStudy.capturedAt || new Date().toISOString(),
		};
		setCurrentScan(scan);
		currentScanRef.current = scan;
		const plan = planVisiographFindings({ [scanTooth]: "treatment" });
		setSelectedFindingCodes(
			new Set(plan.groups.flatMap((g) => g.teeth.map((t) => t.code))),
		);
	}, [selectedStudy, toothCode, effectivePatientId]);

	const handleLoadDemoScan = useCallback(() => {
		const demoScan = getInitialDefaultScan(toothCode, effectivePatientId);
		setCurrentScan(demoScan);
		currentScanRef.current = demoScan;
		if (demoScan.imageDataUri) setCurrentImageUrl(demoScan.imageDataUri);
		if (demoScan.aiToothStates) {
			const plan = planVisiographFindings(demoScan.aiToothStates);
			const allPlanCodes = plan.groups.flatMap((g) => g.teeth.map((t) => t.code));
			setSelectedFindingCodes(new Set(allPlanCodes));
		}
	}, [toothCode, effectivePatientId]);

	const [isApplyingToChart, setIsApplyingToChart] = useState(false);
	const [isHistoryView, setIsHistoryView] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isStudioMode, setIsStudioMode] = useState(false);
	const [quickPreset, setQuickPreset] = useState<VisiographPresetType>("standard");
	const [initialStudioTool, setInitialStudioTool] = useState<
		"pointer" | "root_canal"
	>("pointer");
	const [isNormaApplied, setIsNormaApplied] = useState(false);

	const resetAnalysisState = useCallback(() => {
		setError(null);
		setSaveFailure(null);
		setFormulaFailure(null);
		setAppliedToothCodes([]);
		setSelectedFindingCodes(new Set());
		setApplyNotice(null);
		setIsHistoryView(false);
		setIsNormaApplied(false);
	}, []);

	const handleScanSelectedFromArchive = useCallback((scan: XrayScan) => {
		setCurrentScan(scan);
		currentScanRef.current = scan;
		setCurrentImageUrl(scan.imageDataUri ?? null);
		setIsHistoryView(true);
		setIsNormaApplied(false);
		setAppliedToothCodes([]);
		setApplyNotice(null);
		setSaveFailure(null);
		setFormulaFailure(null);
		setError(null);
		if (scan.aiToothStates) {
			const plan = planVisiographFindings(scan.aiToothStates);
			setSelectedFindingCodes(
				new Set(plan.groups.flatMap((g) => g.teeth.map((t) => t.code))),
			);
		} else {
			setSelectedFindingCodes(new Set());
		}
	}, []);

	const handleScanDeletedFromArchive = useCallback(
		(deletedId: string) => {
			if (currentScan?.id === deletedId) {
				setCurrentScan(null);
				setCurrentImageUrl(null);
				resetAnalysisState();
			}
		},
		[currentScan?.id, resetAnalysisState],
	);

	const handleArchiveEmptyFallback = useCallback(() => {
		if (isDemoShowcaseMode() || isDemoPatientId(effectivePatientId)) {
			const fallbackScan = getInitialDefaultScan(toothCode, effectivePatientId);
			setCurrentScan(fallbackScan);
			currentScanRef.current = fallbackScan;
			if (fallbackScan.imageDataUri) setCurrentImageUrl(fallbackScan.imageDataUri);
			if (fallbackScan.aiToothStates) {
				const plan = planVisiographFindings(fallbackScan.aiToothStates);
				setSelectedFindingCodes(
					new Set(plan.groups.flatMap((g) => g.teeth.map((t) => t.code))),
				);
			}
		} else {
			setCurrentScan(null);
			currentScanRef.current = null;
			setCurrentImageUrl(null);
			setSelectedFindingCodes(new Set());
		}
	}, [toothCode, effectivePatientId]);

	const {
		scanHistory,
		setScanHistory,
		isLoadingHistory,
		historyFailure,
		deletingScanId,
		deleteFailure,
		openFailure,
		setOpenFailure,
		loadHistory,
		loadHistoryScan,
		deleteScan,
	} = useVisiographArchive({
		patientId,
		effectivePatientId,
		toothCode,
		denteClinicalReadHeaders,
		denteClinicalMutationHeaders,
		onScanSelected: handleScanSelectedFromArchive,
		onScanDeleted: handleScanDeletedFromArchive,
		onEmptyFallback: handleArchiveEmptyFallback,
	});

	// Transform patient scanHistory into EzDent-i filmstrip dock items
	const filmstripItems: RadiologyFilmstripItem[] = useMemo(() => {
		if (scanHistory && scanHistory.length > 0) {
			return scanHistory.map((s) => ({
				id: s.id,
				title: s.originalFilename || (s.toothCode || toothCode ? `Зуб #${s.toothCode || toothCode}` : "Снимок RVG"),
				modality: "intraoral_rvg",
				modalityLabel: "IO-СЕНСОР",
				studyDate: s.capturedAt || s.createdAt || "01.10.2026",
				teethFdi: s.toothCode ? [s.toothCode] : toothCode ? [toothCode] : [],
				imageUrl: s.imageDataUri || "",
				thumbnailUrl: s.imageDataUri || "",
			}));
		}
		if (currentScan) {
			return [
				{
					id: currentScan.id,
					title:
						currentScan.originalFilename ||
						(currentScan.toothCode || toothCode ? `Зуб #${currentScan.toothCode || toothCode}` : "Снимок RVG"),
					modality: "intraoral_rvg",
					modalityLabel: "IO-СЕНСОР",
					studyDate: currentScan.capturedAt || currentScan.createdAt || "01.10.2026",
					teethFdi: currentScan.toothCode
						? [currentScan.toothCode]
						: toothCode
							? [toothCode]
							: [],
					imageUrl: currentScan.imageDataUri || currentImageUrl || "",
					thumbnailUrl: currentScan.imageDataUri || currentImageUrl || "",
				},
			];
		}
		return [];
	}, [scanHistory, toothCode, currentScan, currentImageUrl]);

	const handleSelectFilmstripStudy = useCallback(
		(item: any) => {
			const targetScan = scanHistory.find((s) => s.id === item.id);
			if (targetScan) handleScanSelectedFromArchive(targetScan as XrayScan);
		},
		[scanHistory, handleScanSelectedFromArchive],
	);

	const handleDoubleClickFilmstripStudy = useCallback(
		(item: any) => {
			const targetScan = scanHistory.find((s) => s.id === item.id);
			if (targetScan) handleScanSelectedFromArchive(targetScan as XrayScan);
			setIsSensorViewerOpen(true);
		},
		[scanHistory, handleScanSelectedFromArchive],
	);

	// File processing
	const processFile = useCallback(
		async (file: File) => {
			if (!file.type.startsWith("image/")) {
				setError("Поддерживаются только изображения (JPG, PNG, BMP, TIFF).");
				return;
			}

			const patientAtStart = effectivePatientId;
			resetAnalysisState();
			setCurrentScan(null);
			setCurrentImageUrl(null);

			try {
				const dataUrl = await new Promise<string>((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = (ev) => resolve(ev.target?.result as string);
					reader.onerror = reject;
					reader.readAsDataURL(file);
				});

				const patientNow =
					(patientId ?? usePatientStore.getState().selectedPatientId) ?? null;
				if (patientAtStart !== patientNow) return;

				setCurrentImageUrl(dataUrl);

				const localScan: XrayScan = {
					id: crypto.randomUUID?.() ?? `local-${Date.now()}`,
					patientId: effectivePatientId ?? "unknown",
					status: "done",
					kind: "periapical",
					toothCode: toothCode || null,
					originalFilename: file.name,
					hasImage: true,
					imageDataUri: dataUrl,
					capturedAt: new Date().toISOString(),
					createdAt: new Date().toISOString(),
				};
				setCurrentScan(localScan);

				if (effectivePatientId) {
					setIsSaving(true);
					const { saved, failure } = await saveVisiographScanToServer(
						effectivePatientId,
						dataUrl,
						file,
						denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
						toothCode,
						effectiveVisitId,
					);
					setIsSaving(false);
					if (failure) {
						setSaveFailure(failure);
					} else if (saved) {
						setCurrentScan((prev) => ({
							...(prev ?? saved),
							id: saved.id,
							imageDataUri: dataUrl,
							hasImage: true,
						}));
						setScanHistory((prev) => [saved, ...prev]);
					}
				}
			} catch (err: any) {
				logger.error("[VisiographAnalyzer] Error reading file:", err);
				setError(err.message || "Не удалось загрузить снимок.");
			} finally {
				if (fileInputRef.current) fileInputRef.current.value = "";
			}
		},
		[
			effectivePatientId,
			patientId,
			toothCode,
			effectiveVisitId,
			resetAnalysisState,
			denteClinicalMutationHeaders,
			setScanHistory,
		],
	);

	// Explicit doctor-initiated AI analysis
	const handleRunAiAnalysis = useCallback(async () => {
		if (!currentImageUrl) {
			showToast("Сначала загрузите снимок визиографа", "warning");
			return;
		}
		if (analysisInFlightRef.current || isAnalyzing) return;
		analysisInFlightRef.current = true;
		setIsAnalyzing(true);
		setError(null);
		setFormulaFailure(null);
		setApplyNotice(null);

		const patientAtStart = effectivePatientId ?? null;

		try {
			const aiRes = await fetch("/api/imaging/visiograph-ai", {
				method: "POST",
				headers: denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ imageBase64: currentImageUrl }),
			});

			if (!aiRes.ok) {
				const errData = await aiRes.json().catch(() => ({}));
				throw new Error(
					errData.error || `AI сервис недоступен (HTTP ${aiRes.status})`,
				);
			}

			const aiResult = (await aiRes.json()) as {
				report: string;
				toothStates: Record<string, string>;
				warnings: string[];
			};

			const patientNow =
				(patientId ?? usePatientStore.getState().selectedPatientId) ?? null;
			if (patientAtStart !== patientNow) {
				setError("Пациент был изменён во время анализа. Результат не применён.");
				return;
			}

			setCurrentScan((prev) => {
				if (!prev) return null;
				return {
					...prev,
					aiReport: aiResult.report,
					aiSummary: extractSummary(aiResult.report),
					aiToothStates: aiResult.toothStates,
				};
			});

			if (currentScan?.id && effectivePatientId) {
				updateVisiographScanMeta(
					currentScan.id,
					{
						aiReport: aiResult.report,
						aiSummary: extractSummary(aiResult.report),
						aiToothStates: aiResult.toothStates,
					},
					denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
				);
			}

			const plan = planVisiographFindings(aiResult.toothStates);
			const allPlanCodes = plan.groups.flatMap((g) => g.teeth.map((t) => t.code));
			setSelectedFindingCodes(new Set(allPlanCodes));

			const notices = buildFindingsNotice(plan);
			if (notices) setApplyNotice(notices);

			showToast(
				"ИИ-анализ снимка завершён. Ознакомьтесь с рекомендациями ниже.",
				"success",
			);
		} catch (err: any) {
			logger.error("[VisiographAnalyzer] AI Error:", err);
			setError(
				err.message ||
					"Не удалось провести ИИ-анализ снимка. Проверьте подключение.",
			);
		} finally {
			analysisInFlightRef.current = false;
			setIsAnalyzing(false);
		}
	}, [
		currentImageUrl,
		isAnalyzing,
		effectivePatientId,
		patientId,
		currentScan?.id,
		denteClinicalReadHeaders,
		denteClinicalMutationHeaders,
	]);

	// Apply findings to chart
	const handleApplyFindingsToChart = useCallback(async () => {
		if (!currentScan?.aiToothStates) return;
		const currentPatientId = effectivePatientId;
		if (!currentPatientId) {
			setFormulaFailure(
				"Пациент не выбран, поэтому находки НЕ внесены в зубную формулу.",
			);
			return;
		}

		const plan = planVisiographFindings(currentScan.aiToothStates);
		if (plan.groups.length === 0) {
			showToast("Нет подходящих для зубной формулы находок", "warning");
			return;
		}

		if (selectedFindingCodes.size === 0) {
			showToast(
				"Отметьте галочками хотя бы одну находку ИИ или нажмите «Выбрать все»",
				"info",
			);
			return;
		}

		setIsApplyingToChart(true);
		setFormulaFailure(null);
		const appliedCodes: string[] = [];
		const writeFailures: string[] = [];

		for (const group of plan.groups) {
			const teethToApply = group.teeth.filter((t) =>
				selectedFindingCodes.has(t.code),
			);
			if (teethToApply.length === 0) continue;

			const failure = await writeToothStatesToChart(
				currentPatientId,
				teethToApply.map((t) => t.toothNumber),
				group.state as ToothState,
				denteClinicalMutationHeaders,
			);
			if (failure) {
				writeFailures.push(failure);
			} else {
				appliedCodes.push(...teethToApply.map((t) => t.code));
			}
		}

		if (writeFailures.length > 0) {
			setFormulaFailure(writeFailures.join(" "));
		}
		if (appliedCodes.length > 0) {
			setAppliedToothCodes((prev) =>
				Array.from(new Set([...prev, ...appliedCodes])),
			);
			showToast(
				`В зубную формулу внесено: ${countLabel(appliedCodes.length, "зуб", "зуба", "зубов")} (${appliedCodes.join(", ")})`,
				"success",
			);
		}
		setIsApplyingToChart(false);
	}, [
		currentScan?.aiToothStates,
		effectivePatientId,
		selectedFindingCodes,
		denteClinicalMutationHeaders,
	]);

	// 1-Click Norma to Form 043/u
	const handleApplyNormaTo043 = useCallback(() => {
		const targetToothCode = toothCode || currentScan?.toothCode || null;
		applyNormaTo043({
			targetToothCode,
			currentScanId: currentScan?.id,
			effectivePatientId: effectivePatientId ?? undefined,
			onInsertToProtocol,
			mutationHeaders: denteClinicalMutationHeaders,
		});
		setIsNormaApplied(true);
	}, [
		toothCode,
		currentScan?.toothCode,
		currentScan?.id,
		effectivePatientId,
		onInsertToProtocol,
		denteClinicalMutationHeaders,
	]);

	// Transfer full radiology report to 043/u clinical protocol
	const handleInsertReportToProtocol = useCallback(
		(reportText: string) => {
			const targetToothCode = toothCode || currentScan?.toothCode || null;
			insertReportTo043Protocol({
				reportText,
				targetToothCode,
				onInsertToProtocol,
			});
		},
		[toothCode, currentScan?.toothCode, onInsertToProtocol],
	);

	// Drag & Drop
	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragOver(false);
			const file = e.dataTransfer.files?.[0];
			if (file) processFile(file);
		},
		[processFile],
	);

	const handleClear = () => {
		setCurrentScan(null);
		setCurrentImageUrl(null);
		setIsApplyingToChart(false);
		resetAnalysisState();
	};

	const toothStatesArray: AiToothState[] = currentScan?.aiToothStates
		? Object.entries(currentScan.aiToothStates).map(([code, state]) => ({
				code,
				state,
			}))
		: [];
	const criticalCount = toothStatesArray.filter(
		(t) => t.state === "treatment" || t.state === "watch",
	).length;

	const historyPhase = resolvePanelPhase({
		isLoading: isLoadingHistory,
		hasFailure: historyFailure !== null,
		isEmpty: scanHistory.length === 0,
	});

	return {
		fileInputRef,
		dropRef,
		effectivePatientId,
		effectiveVisitId,
		patientFullName,
		isSensorViewerOpen,
		setIsSensorViewerOpen,
		isDragOver,
		setIsDragOver,
		isAnalyzing,
		isSaving,
		currentImageUrl,
		currentScan,
		saveFailure,
		appliedToothCodes,
		applyNotice,
		formulaFailure,
		selectedFindingCodes,
		setSelectedFindingCodes,
		isApplyingToChart,
		isHistoryView,
		error,
		setError,
		isStudioMode,
		setIsStudioMode,
		quickPreset,
		setQuickPreset,
		initialStudioTool,
		setInitialStudioTool,
		isNormaApplied,
		scanHistory,
		setScanHistory,
		isLoadingHistory,
		historyFailure,
		deletingScanId,
		deleteFailure,
		openFailure,
		setOpenFailure,
		loadHistory,
		loadHistoryScan,
		deleteScan,
		filmstripItems,
		handleSelectFilmstripStudy,
		handleDoubleClickFilmstripStudy,
		handleLoadDemoScan,
		handleScanSelectedFromArchive,
		handleScanDeletedFromArchive,
		processFile,
		handleRunAiAnalysis,
		handleApplyFindingsToChart,
		handleApplyNormaTo043,
		handleInsertReportToProtocol,
		handleDrop,
		handleClear,
		resetAnalysisState,
		toothStatesArray,
		criticalCount,
		historyPhase,
		calibration,
		setCalibration,
		workingLengthMm,
		handleMeasureWorkingLength,
		calibrateWithBall,
	};
}
