import { useCallback, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext.js";
import { resolvePanelPhase } from "../../../lib/panelStateText.js";
import { usePatientStore } from "../../../store/patientStore.js";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { planVisiographFindings } from "../visiographFindings.js";
import { getInitialDefaultScan, type AiToothState, type XrayScan } from "../VisiographScanHelpers.js";
import type { VisiographPresetType } from "../VisiographCockpitPresets.js";
import { useAppStore } from "../../../store/appStore.js";
import type { VisiographAnalyzerProps } from "./types.js";
import { useVisiographAnalyzerCalibration } from "./useVisiographAnalyzer/useVisiographAnalyzerCalibration.js";
import { useVisiographAnalyzerToothBind } from "./useVisiographAnalyzer/useVisiographAnalyzerToothBind.js";
import { useVisiographAnalyzerAi } from "./useVisiographAnalyzer/useVisiographAnalyzerAi.js";
import { useVisiographAnalyzerFindingsApply } from "./useVisiographAnalyzer/useVisiographAnalyzerFindingsApply.js";
import { useVisiographAnalyzerScan } from "./useVisiographAnalyzer/useVisiographAnalyzerScan.js";
import { useVisiographFilmstrip } from "./useVisiographAnalyzer/useVisiographFilmstrip.js";
import { useStudySelectionEffect } from "./useVisiographAnalyzer/useStudySelectionEffect.js";
import { useVisiographArchiveBridge } from "./useVisiographAnalyzer/useVisiographArchiveBridge.js";

export function useVisiographAnalyzer({ onInsertToProtocol, toothCode, initialScan, patientId, visitId, selectedStudy }: VisiographAnalyzerProps = {}) {
	const { selectedPatientId, patientCoreDraft } = usePatientStore();
	const effectivePatientId = patientId ?? selectedPatientId;
	const appActiveVisitId = useAppStore((s) => s.dashboard?.activeVisit?.id);
	const effectiveVisitId = visitId ?? appActiveVisitId ?? undefined;
	const patientFullName = patientCoreDraft?.fullName || (isDemoShowcaseMode() ? "Чухрова Лариса" : "Пациент клиники");

	const defaultInitialScan = useMemo(() => {
		if (initialScan) return initialScan;
		if (isDemoShowcaseMode() || isDemoPatientId(effectivePatientId)) return getInitialDefaultScan(toothCode, effectivePatientId);
		return null;
	}, [initialScan, toothCode, effectivePatientId]);

	const appLogic = useAppLogicContext();
	const authRef = useRef(appLogic?.auth);
	authRef.current = appLogic?.auth;

	const denteClinicalReadHeaders = useCallback((extra?: Record<string, string>) => authRef.current?.denteClinicalReadHeaders?.(extra ?? {}) ?? { ...(extra ?? {}) }, []);
	const denteClinicalMutationHeaders = useCallback((extra?: Record<string, string>) => authRef.current?.denteClinicalMutationHeaders?.(extra ?? {}) ?? { ...(extra ?? {}) }, []);

	const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(defaultInitialScan?.imageDataUri ?? null);
	const [currentScan, setCurrentScan] = useState<XrayScan | null>(defaultInitialScan);
	const currentScanRef = useRef<XrayScan | null>(defaultInitialScan);
	currentScanRef.current = currentScan;

	const [saveFailure, setSaveFailure] = useState<string | null>(null);
	const [appliedToothCodes, setAppliedToothCodes] = useState<string[]>([]);
	const [applyNotice, setApplyNotice] = useState<string | null>(null);
	const [formulaFailure, setFormulaFailure] = useState<string | null>(null);
	const [isHistoryView, setIsHistoryView] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isStudioMode, setIsStudioMode] = useState(false);
	const [quickPreset, setQuickPreset] = useState<VisiographPresetType>("standard");
	const [initialStudioTool, setInitialStudioTool] = useState<"pointer" | "root_canal">("pointer");

	const [selectedFindingCodes, setSelectedFindingCodes] = useState<Set<string>>(() => {
		if (defaultInitialScan?.aiToothStates) {
			const plan = planVisiographFindings(defaultInitialScan.aiToothStates);
			return new Set(plan.groups.flatMap((g) => g.teeth.map((t) => t.code)));
		}
		return new Set();
	});

	const resetAnalysisState = useCallback(() => {
		setError(null); setSaveFailure(null); setFormulaFailure(null);
		setAppliedToothCodes([]); setSelectedFindingCodes(new Set()); setApplyNotice(null);
		setIsHistoryView(false); apply.setIsNormaApplied(false);
	}, []);

	const archive = useVisiographArchiveBridge({
		patientId, effectivePatientId, toothCode, denteClinicalReadHeaders, denteClinicalMutationHeaders,
		currentScan, setCurrentScan, currentScanRef, setCurrentImageUrl, resetAnalysisState,
		setIsHistoryView, setIsNormaApplied: (val: boolean) => apply.setIsNormaApplied(val),
		setAppliedToothCodes, setApplyNotice, setSaveFailure, setFormulaFailure, setError, setSelectedFindingCodes,
	});

	useStudySelectionEffect({ selectedStudy, toothCode, effectivePatientId, setCurrentImageUrl, setCurrentScan, currentScanRef, setSelectedFindingCodes });

	const filmstrip = useVisiographFilmstrip({ scanHistory: archive.scanHistory, currentScan, currentImageUrl, toothCode, onScanSelected: archive.handleScanSelectedFromArchive });
	const scan = useVisiographAnalyzerScan({ effectivePatientId, patientId, toothCode, effectiveVisitId, denteClinicalMutationHeaders, setCurrentScan, currentScanRef, setCurrentImageUrl, setSelectedFindingCodes, setScanHistory: archive.setScanHistory, resetAnalysisState, setError, setSaveFailure });
	const ai = useVisiographAnalyzerAi({ currentImageUrl, currentScan, setCurrentScan, effectivePatientId, patientId, setSelectedFindingCodes, denteClinicalReadHeaders, denteClinicalMutationHeaders, setError, setFormulaFailure, setApplyNotice });
	const apply = useVisiographAnalyzerFindingsApply({ currentScan, effectivePatientId, selectedFindingCodes, toothCode, onInsertToProtocol, denteClinicalMutationHeaders, setFormulaFailure, setAppliedToothCodes });
	const bind = useVisiographAnalyzerToothBind({ currentScan, currentScanRef, setCurrentScan, selectedStudy, effectivePatientId, denteClinicalMutationHeaders, toothCode });
	const calib = useVisiographAnalyzerCalibration(toothCode);

	const handleClear = () => { setCurrentScan(null); setCurrentImageUrl(null); apply.setIsApplyingToChart(false); resetAnalysisState(); };
	const toothStatesArray: AiToothState[] = currentScan?.aiToothStates ? Object.entries(currentScan.aiToothStates).map(([code, state]) => ({ code, state })) : [];
	const criticalCount = toothStatesArray.filter((t) => t.state === "treatment" || t.state === "watch").length;
	const historyPhase = resolvePanelPhase({ isLoading: archive.isLoadingHistory, hasFailure: archive.historyFailure !== null, isEmpty: archive.scanHistory.length === 0 });

	return {
		fileInputRef: scan.fileInputRef, dropRef: scan.dropRef, effectivePatientId, effectiveVisitId, patientFullName,
		isSensorViewerOpen: filmstrip.isSensorViewerOpen, setIsSensorViewerOpen: filmstrip.setIsSensorViewerOpen,
		isDragOver: scan.isDragOver, setIsDragOver: scan.setIsDragOver, isAnalyzing: ai.isAnalyzing, isSaving: scan.isSaving,
		currentImageUrl, currentScan, saveFailure, appliedToothCodes, applyNotice, formulaFailure, selectedFindingCodes, setSelectedFindingCodes,
		isApplyingToChart: apply.isApplyingToChart, isHistoryView, error, setError, isStudioMode, setIsStudioMode, quickPreset, setQuickPreset,
		initialStudioTool, setInitialStudioTool, isNormaApplied: apply.isNormaApplied, scanHistory: archive.scanHistory, setScanHistory: archive.setScanHistory,
		isLoadingHistory: archive.isLoadingHistory, historyFailure: archive.historyFailure, deletingScanId: archive.deletingScanId, deleteFailure: archive.deleteFailure,
		openFailure: archive.openFailure, setOpenFailure: archive.setOpenFailure, loadHistory: archive.loadHistory, loadHistoryScan: archive.loadHistoryScan, deleteScan: archive.deleteScan,
		filmstripItems: filmstrip.filmstripItems, handleSelectFilmstripStudy: filmstrip.handleSelectFilmstripStudy, handleDoubleClickFilmstripStudy: filmstrip.handleDoubleClickFilmstripStudy,
		handleLoadDemoScan: scan.handleLoadDemoScan, handleScanSelectedFromArchive: archive.handleScanSelectedFromArchive, handleScanDeletedFromArchive: archive.handleScanDeletedFromArchive,
		processFile: scan.processFile, handleRunAiAnalysis: ai.handleRunAiAnalysis, handleApplyFindingsToChart: apply.handleApplyFindingsToChart,
		handleApplyNormaTo043: apply.handleApplyNormaTo043, handleInsertReportToProtocol: apply.handleInsertReportToProtocol,
		handleDrop: scan.handleDrop, handleClear, handleBindTooth: bind.handleBindTooth, boundToothCode: bind.boundToothCode, resetAnalysisState,
		toothStatesArray, criticalCount, historyPhase, calibration: calib.calibration, setCalibration: calib.setCalibration, workingLengthMm: calib.workingLengthMm,
		handleMeasureWorkingLength: calib.handleMeasureWorkingLength, calibrateWithBall: calib.calibrateWithBall,
	};
}
