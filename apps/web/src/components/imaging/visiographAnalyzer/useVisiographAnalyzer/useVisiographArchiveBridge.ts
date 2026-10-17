import { useCallback } from "react";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import { planVisiographFindings } from "../../visiographFindings.js";
import { getInitialDefaultScan, type XrayScan } from "../../VisiographScanHelpers.js";
import { useVisiographArchive } from "../../useVisiographArchive.js";

export function useVisiographArchiveBridge({
	patientId,
	effectivePatientId,
	toothCode,
	denteClinicalReadHeaders,
	denteClinicalMutationHeaders,
	currentScan,
	setCurrentScan,
	currentScanRef,
	setCurrentImageUrl,
	resetAnalysisState,
	setIsHistoryView,
	setIsNormaApplied,
	setAppliedToothCodes,
	setApplyNotice,
	setSaveFailure,
	setFormulaFailure,
	setError,
	setSelectedFindingCodes,
}: any) {
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
	}, [setCurrentScan, currentScanRef, setCurrentImageUrl, setIsHistoryView, setIsNormaApplied, setAppliedToothCodes, setApplyNotice, setSaveFailure, setFormulaFailure, setError, setSelectedFindingCodes]);

	const handleScanDeletedFromArchive = useCallback(
		(deletedId: string) => {
			if (currentScan?.id === deletedId) {
				setCurrentScan(null);
				setCurrentImageUrl(null);
				resetAnalysisState();
			}
		},
		[currentScan?.id, resetAnalysisState, setCurrentScan, setCurrentImageUrl],
	);

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
	}, [toothCode, effectivePatientId, setCurrentScan, currentScanRef, setCurrentImageUrl, setSelectedFindingCodes]);

	const archive = useVisiographArchive({
		patientId,
		effectivePatientId,
		toothCode,
		denteClinicalReadHeaders,
		denteClinicalMutationHeaders,
		onScanSelected: handleScanSelectedFromArchive,
		onScanDeleted: handleScanDeletedFromArchive,
		onEmptyFallback: handleArchiveEmptyFallback,
	});

	return { ...archive, handleScanSelectedFromArchive, handleScanDeletedFromArchive, handleArchiveEmptyFallback };
}
