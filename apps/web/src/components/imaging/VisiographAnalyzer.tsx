import { CheckCircle2, Loader2, Maximize2, Sparkles } from "lucide-react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { countLabel } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast, resolvePanelPhase } from "../../lib/panelStateText";
import { usePatientStore } from "../../store/patientStore";
import { useVisitStore } from "../../store/visitStore";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { TOOTH_STATE_LABELS, type ToothState } from "../odontogram/ToothChart";
import { planVisiographFindings } from "./visiographFindings";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode";
import {
	buildFindingsNotice,
	extractSummary,
	getInitialDefaultScan,
	saveVisiographScanToServer,
	updateVisiographScanMeta,
	type AiToothState,
	type XrayScan,
} from "./VisiographScanHelpers";
import { VisiographReportViewer } from "./VisiographReportViewer";
import { VisiographHistoryDrawer, type XrayHistoryItem } from "./VisiographHistoryDrawer";
import { VisiographStatusAlerts } from "./VisiographStatusAlerts";
import { printAiScanReport } from "./VisiographPrint";
import { useVisiographArchive } from "./useVisiographArchive";
import { VisiographDropzone } from "./VisiographDropzone";
import { VisiographHeaderBar } from "./VisiographHeaderBar";
import { VisiographCockpitPresets, type VisiographPresetType } from "./VisiographCockpitPresets";
import { VisiographViewport } from "./VisiographViewport";
import { VisiographFindingsSection } from "./VisiographFindingsSection";
import { VisiographBottomActions } from "./VisiographBottomActions";
import {
	RadiologyFilmstripDock,
	type RadiologyFilmstripItem,
} from "../radiology/RadiologyFilmstripDock";
import { SensorStudyViewer } from "../radiology/SensorStudyViewer";
import {
	cockpitToolbarStyle,
	demoScanButtonStyle,
	getAiButtonStyle,
	getApplyChartButtonStyle,
	getNormaButtonStyle,
	visiographContainerStyle,
} from "./VisiographAnalyzerStyles";

export type { XrayScan };

export interface VisiographAnalyzerProps {
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly toothCode?: string | undefined;
	readonly initialScan?: XrayScan | undefined;
	readonly patientId?: string | undefined;
	readonly onConnectRvg?: (() => void) | undefined;
	readonly onUploadDicom?: (() => void) | undefined;
	readonly onReferToRadiology?: (() => void) | undefined;
}

export function VisiographAnalyzer({
	onInsertToProtocol,
	toothCode,
	initialScan,
	patientId,
	onConnectRvg,
	onUploadDicom,
	onReferToRadiology,
}: VisiographAnalyzerProps = {}) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const dropRef = useRef<HTMLButtonElement>(null);
	const analysisInFlightRef = useRef(false);

	const { selectedPatientId, patientCoreDraft } = usePatientStore();
	const effectivePatientId = patientId ?? selectedPatientId;
	const patientFullName = patientCoreDraft?.fullName || (isDemoShowcaseMode() ? "Чухрова Лариса" : "Пациент клиники");
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
	const [initialStudioTool, setInitialStudioTool] = useState<"pointer" | "root_canal">("pointer");
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
			setSelectedFindingCodes(new Set(plan.groups.flatMap((g) => g.teeth.map((t) => t.code))));
		} else {
			setSelectedFindingCodes(new Set());
		}
	}, []);

	const handleScanDeletedFromArchive = useCallback((deletedId: string) => {
		if (currentScan?.id === deletedId) {
			setCurrentScan(null);
			setCurrentImageUrl(null);
			resetAnalysisState();
		}
	}, [currentScan?.id, resetAnalysisState]);

	const handleArchiveEmptyFallback = useCallback(() => {
		if (isDemoShowcaseMode() || isDemoPatientId(effectivePatientId)) {
			const fallbackScan = getInitialDefaultScan(toothCode, effectivePatientId);
			setCurrentScan(fallbackScan);
			currentScanRef.current = fallbackScan;
			if (fallbackScan.imageDataUri) setCurrentImageUrl(fallbackScan.imageDataUri);
			if (fallbackScan.aiToothStates) {
				const plan = planVisiographFindings(fallbackScan.aiToothStates);
				setSelectedFindingCodes(new Set(plan.groups.flatMap((g) => g.teeth.map((t) => t.code))));
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
				title: s.originalFilename || `Зуб #${s.toothCode || toothCode || "16"}`,
				modality: "intraoral_rvg",
				modalityLabel: "IO-СЕНСОР",
				studyDate: s.capturedAt || s.createdAt || "01.10.2026",
				teethFdi: s.toothCode ? [s.toothCode] : toothCode ? [toothCode] : ["16"],
				imageUrl: s.imageDataUri || "",
				thumbnailUrl: s.imageDataUri || "",
			}));
		}
		if (currentScan) {
			return [
				{
					id: currentScan.id,
					title: currentScan.originalFilename || `Зуб #${currentScan.toothCode || toothCode || "16"}`,
					modality: "intraoral_rvg",
					modalityLabel: "IO-СЕНСОР",
					studyDate: currentScan.capturedAt || currentScan.createdAt || "01.10.2026",
					teethFdi: currentScan.toothCode ? [currentScan.toothCode] : toothCode ? [toothCode] : ["16"],
					imageUrl: currentScan.imageDataUri || currentImageUrl || "",
					thumbnailUrl: currentScan.imageDataUri || currentImageUrl || "",
				},
			];
		}
		return [];
	}, [scanHistory, toothCode, currentScan, currentImageUrl]);

	// Write tooth states to live chart
	const writeToothStatesToChart = useCallback(
		async (
			targetPatientId: string,
			toothNumbers: number[],
			state: ToothState,
		): Promise<string | null> => {
			const action = `Отметка «${TOOTH_STATE_LABELS[state]}» по снимку на ${countLabel(toothNumbers.length, "зубе", "зубах", "зубах")} ${toothNumbers.join(", ")} не внесена в зубную формулу`;
			try {
				const res = await fetch(
					`/api/patients/${targetPatientId}/tooth-states/batch`,
					{
						method: "POST",
						headers: denteClinicalMutationHeaders({
							"Content-Type": "application/json",
						}),
						body: JSON.stringify({ toothNumbers, state }),
					},
				);
				if (!res.ok) {
					const rawBody = await res.text();
					logger.error(`[VisiographAnalyzer] формула не обновлена, ${res.status} ${rawBody.slice(0, 300)}`);
					return `${actionFailureToast(action, res.status)} Поставьте отметку на схеме зубов руками.`;
				}
				return null;
			} catch (err) {
				showToast(actionFailureToast("Ошибка выполнения операции", (err as { status?: number })?.status ?? null), "error");
				logger.error("[VisiographAnalyzer] запрос обновления формулы не выполнен", err);
				return `${actionFailureToast(action, null)} Поставьте отметку на схеме зубов руками.`;
			}
		},
		[denteClinicalMutationHeaders],
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

				const patientNow = (patientId ?? usePatientStore.getState().selectedPatientId) ?? null;
				if (patientAtStart !== patientNow) return;

				setCurrentImageUrl(dataUrl);

				const localScan: XrayScan = {
					id: crypto.randomUUID?.() ?? `local-${Date.now()}`,
					patientId: effectivePatientId ?? "unknown",
					status: "done",
					kind: "periapical",
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
		[effectivePatientId, patientId, resetAnalysisState, denteClinicalMutationHeaders, setScanHistory],
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
				throw new Error(errData.error || `AI сервис недоступен (HTTP ${aiRes.status})`);
			}

			const aiResult = (await aiRes.json()) as {
				report: string;
				toothStates: Record<string, string>;
				warnings: string[];
			};

			const patientNow = (patientId ?? usePatientStore.getState().selectedPatientId) ?? null;
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

			showToast("ИИ-анализ снимка завершён. Ознакомьтесь с рекомендациями ниже.", "success");
		} catch (err: any) {
			logger.error("[VisiographAnalyzer] AI Error:", err);
			setError(err.message || "Не удалось провести ИИ-анализ снимка. Проверьте подключение.");
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
			setFormulaFailure("Пациент не выбран, поэтому находки НЕ внесены в зубную формулу.");
			return;
		}

		const plan = planVisiographFindings(currentScan.aiToothStates);
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

			const failure = await writeToothStatesToChart(
				currentPatientId,
				teethToApply.map((t) => t.toothNumber),
				group.state,
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
			setAppliedToothCodes((prev) => Array.from(new Set([...prev, ...appliedCodes])));
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
		writeToothStatesToChart,
	]);

	// 1-Click Norma to Form 043/u
	const handleApplyNormaTo043 = useCallback(() => {
		const targetToothCode = toothCode || currentScan?.toothCode || null;
		const toothPrefix = targetToothCode ? ` зуба ${targetToothCode}` : "";
		const normaStatement = `Рентгенологическое исследование (визиография)${toothPrefix}: норма. Патологических изменений костной ткани и периапикальных очагов деструкции на снимке не выявлено. Кортикальная пластинка альвеолы и периодонтальная щель прослеживаются на всем протяжении.`;

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const current = prev.objectiveStatus || "";
				const updated = current.trim()
					? `${current.trim()}\n${normaStatement}`
					: normaStatement;
				return { ...prev, objectiveStatus: updated };
			});
		} catch (err) {
			logger.warn("[VisiographAnalyzer] visitStore update failed", err);
		}

		if (onInsertToProtocol) onInsertToProtocol(normaStatement);
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(normaStatement).catch(() => {});
		}

		setIsNormaApplied(true);
		showToast(
			`Заключение «Норма: патологии на снимке не выявлено» внесено в медицинскую карту${toothPrefix ? ` (${toothPrefix.trim()})` : ""}`,
			"success",
		);

		if (currentScan?.id && effectivePatientId) {
			updateVisiographScanMeta(
				currentScan.id,
				{
					aiSummary: "Норма: патологии на снимке не выявлено",
					notes: normaStatement,
				},
				denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
			);
		}
	}, [
		toothCode,
		currentScan?.toothCode,
		currentScan?.id,
		effectivePatientId,
		onInsertToProtocol,
		denteClinicalMutationHeaders,
	]);

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
		? Object.entries(currentScan.aiToothStates).map(([code, state]) => ({ code, state }))
		: [];
	const criticalCount = toothStatesArray.filter(
		(t) => t.state === "treatment" || t.state === "watch",
	).length;

	const historyPhase = resolvePanelPhase({
		isLoading: isLoadingHistory,
		hasFailure: historyFailure !== null,
		isEmpty: scanHistory.length === 0,
	});

	return (
		<div className="visiograph-analyzer-container" data-testid="visiograph-analyzer-container" style={visiographContainerStyle}>
			<VisiographHeaderBar
				scanHistoryCount={scanHistory.length}
				isLoadingHistory={isLoadingHistory}
				criticalCount={criticalCount}
				historyFailure={historyFailure}
				hasAiReport={Boolean(currentScan?.aiReport)}
				onUploadClick={() => fileInputRef.current?.click()}
				onPrintClick={() => currentScan && printAiScanReport(currentScan)}
				onClearClick={handleClear}
			/>

			<div style={{ padding: "12px" }}>
				<input
					type="file"
					accept="image/*"
					ref={fileInputRef}
					style={{ display: "none" }}
					onChange={(e) => {
						const f = e.target.files?.[0];
						if (f) processFile(f);
					}}
				/>

				{/* Drop Zone */}
				{!currentScan && (
					<VisiographDropzone
						dropRef={dropRef}
						fileInputRef={fileInputRef}
						isDragOver={isDragOver}
						setIsDragOver={setIsDragOver}
						isAnalyzing={isAnalyzing}
						onDrop={handleDrop}
						onConnectRvg={onConnectRvg}
						onUploadDicom={onUploadDicom}
						onReferToRadiology={onReferToRadiology}
						toothCode={toothCode}
						effectivePatientId={effectivePatientId}
						demoScanButton={
							<span
								role="button"
								tabIndex={0}
								data-testid="btn-load-demo-scan"
								onClick={(e) => {
									e.stopPropagation();
									handleLoadDemoScan();
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.stopPropagation();
										handleLoadDemoScan();
									}
								}}
								style={demoScanButtonStyle}
							>
								Показать демо-снимок
							</span>
						}
					/>
				)}

				{/* Alerts */}
				<VisiographStatusAlerts
					error={error}
					onClearError={() => setError(null)}
					openFailure={openFailure}
					onClearOpenFailure={() => setOpenFailure(null)}
					saveFailure={saveFailure}
					formulaFailure={formulaFailure}
					applyNotice={applyNotice}
					hasCurrentScan={Boolean(currentScan)}
				/>

				{/* Result View */}
				{currentScan && (
					<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
						{currentImageUrl && (
							<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
								{/* Cockpit toolbar */}
								<div data-testid="visiograph-cockpit-toolbar" style={cockpitToolbarStyle}>
									<VisiographCockpitPresets
										quickPreset={quickPreset}
										setQuickPreset={setQuickPreset}
										isStudioMode={isStudioMode}
										onToggleStudio={() => setIsStudioMode((prev) => !prev)}
										onOpenApexRuler={() => {
											setInitialStudioTool("root_canal");
											setIsStudioMode(true);
										}}
									/>

									{/* Actions */}
									<div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "nowrap" }}>
										<button
											type="button"
											data-testid="btn-visiograph-norma-043"
											onClick={handleApplyNormaTo043}
											style={getNormaButtonStyle(isNormaApplied)}
										>
											<CheckCircle2 size={13} style={{ color: "#10b981" }} />
											<span>{isNormaApplied ? "Норма внесена ✓" : "Норма: патологии нет ✓"}</span>
										</button>

										<button
											type="button"
											data-testid="btn-run-visiograph-ai"
											onClick={handleRunAiAnalysis}
											disabled={isAnalyzing}
											style={getAiButtonStyle(isAnalyzing)}
										>
											{isAnalyzing ? (
												<>
													<Loader2 size={13} className="animate-spin" />
													<span>Анализ...</span>
												</>
											) : (
												<>
													<Sparkles size={13} />
													<span>{currentScan?.aiReport ? "Перезапуск ИИ" : "ИИ-анализ"}</span>
												</>
											)}
										</button>

										{/* EzDent-i 2D Fullscreen Sensor Viewer Button (Screenshot 24) */}
										<button
											type="button"
											data-testid="btn-open-ezdent-sensor-viewer"
											onClick={() => setIsSensorViewerOpen(true)}
											style={{
												height: "30px",
												minHeight: "30px",
												padding: "0 10px",
												borderRadius: "6px",
												fontSize: "0.78rem",
												fontWeight: 700,
												background: "rgba(0, 200, 83, 0.15)",
												color: "#00C853",
												border: "1px solid rgba(0, 200, 83, 0.4)",
												cursor: "pointer",
												display: "inline-flex",
												alignItems: "center",
												gap: "5px",
											}}
											title="Открыть полноэкранный 2D HUD EzDent-i (Снимок 24) со шкалой 5 мм и фильтрами"
										>
											<Maximize2 size={13} />
											<span>EzDent-i 2D HUD</span>
										</button>
									</div>
								</div>

								{/* Viewport */}
								<VisiographViewport
									isStudioMode={isStudioMode}
									currentImageUrl={currentImageUrl}
									effectivePatientId={effectivePatientId}
									currentScan={currentScan}
									initialStudioTool={initialStudioTool}
									quickPreset={quickPreset}
									onCloseStudio={() => setIsStudioMode(false)}
								/>

								{/* Persistent EzDent-i Bottom Filmstrip Dock for 1-Click Patient X-Ray Switching */}
								{filmstripItems.length > 0 && !isStudioMode && (
									<div className="rounded-xl overflow-hidden border border-[var(--line)] shadow-xs">
										<RadiologyFilmstripDock
											studies={filmstripItems}
											activeStudyId={currentScan?.id || null}
											onSelectStudy={(item) => {
												const targetScan = scanHistory.find((s) => s.id === item.id);
												if (targetScan) handleScanSelectedFromArchive(targetScan as XrayScan);
											}}
											onDoubleClickStudy={(item) => {
												const targetScan = scanHistory.find((s) => s.id === item.id);
												if (targetScan) handleScanSelectedFromArchive(targetScan as XrayScan);
												setIsSensorViewerOpen(true);
											}}
										/>
									</div>
								)}
							</div>
						)}

						{/* Saving indicator */}
						{isSaving && (
							<div style={{ fontSize: "0.8rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}>
								<Loader2 size={12} className="animate-spin" /> Сохранение в карту пациента...
							</div>
						)}

						{/* Tooth findings approval */}
						<VisiographFindingsSection
							toothStates={toothStatesArray}
							appliedToothCodes={appliedToothCodes}
							isHistoryView={isHistoryView}
							selectedFindingCodes={selectedFindingCodes}
							onToggleFindingCode={(code) => {
								const next = new Set(selectedFindingCodes);
								if (next.has(code)) next.delete(code);
								else next.add(code);
								setSelectedFindingCodes(next);
							}}
							onToggleSelectAll={() => {
								const allCodes = toothStatesArray.map((t) => t.code);
								if (selectedFindingCodes.size === allCodes.length) setSelectedFindingCodes(new Set());
								else setSelectedFindingCodes(new Set(allCodes));
							}}
							applyButton={
								<button
									type="button"
									data-testid="btn-apply-findings-to-chart"
									onClick={handleApplyFindingsToChart}
									disabled={isApplyingToChart}
									style={getApplyChartButtonStyle(isApplyingToChart)}
								>
									{isApplyingToChart ? (
										<>
											<Loader2 size={14} className="animate-spin" />
											<span>Внесение...</span>
										</>
									) : (
										<>
											<CheckCircle2 size={14} />
											<span>Применить выбранные к формуле ({selectedFindingCodes.size})</span>
										</>
									)}
								</button>
							}
						/>

						{/* Full report */}
						{currentScan?.aiReport && (
							<VisiographReportViewer
								report={currentScan.aiReport}
								capturedAt={currentScan.capturedAt}
							/>
						)}

						{/* Actions */}
						<VisiographBottomActions
							isHistoryView={isHistoryView}
							currentScan={currentScan}
							deletingScanId={deletingScanId}
							onClear={handleClear}
							onDeleteScan={(s) => void deleteScan(s)}
						/>
					</div>
				)}

				{/* History Drawer */}
				<VisiographHistoryDrawer
					scanHistory={scanHistory as XrayHistoryItem[]}
					isLoadingHistory={isLoadingHistory}
					historyFailure={historyFailure}
					historyPhase={historyPhase}
					effectivePatientId={effectivePatientId}
					onLoadHistoryScan={(s) => void loadHistoryScan(s as XrayScan)}
					onDeleteScan={(s) => void deleteScan(s as XrayScan)}
					deletingScanId={deletingScanId}
					deleteFailure={deleteFailure}
					onRetry={() => effectivePatientId && loadHistory(effectivePatientId)}
				/>
			</div>

			{/* EzDent-i 2D Fullscreen Sensor Modal Viewer (Screenshot 24) */}
			{isSensorViewerOpen && (
				<div className="fixed inset-0 z-[99999] bg-[#020617] flex flex-col">
					<SensorStudyViewer
						initialImageUrl={currentImageUrl || undefined}
						studiesHistory={filmstripItems}
						study={filmstripItems.find((s) => s.id === currentScan?.id) || filmstripItems[0]}
						patientName={patientFullName}
						medicalCardNumber={effectivePatientId || undefined}
						toothFdiCode={currentScan?.toothCode || toothCode || "16"}
						onInsertToProtocol={onInsertToProtocol}
						onClose={() => setIsSensorViewerOpen(false)}
					/>
				</div>
			)}
		</div>
	);
}
