import { useMemo, useState } from "react";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../lib/demoMode.js";
import { loadLatestCephalometricStudy } from "../cephalometricPersistence";
import {
	calculateCephalometrics,
	generateConsultationNoteWithoutCeph,
	CEPHALOMETRIC_LANDMARKS,
} from "../cephalometricMath";
import { useCephLandmarksState } from "./useCephLandmarksState";
import { useCephAiBackend } from "./useCephAiBackend";
import { useCephVoiceDictation } from "./useCephVoiceDictation";
import { useCephDisplaySettings } from "./useCephDisplaySettings";
import { useCephSyncAndEmrActions } from "./useCephSyncAndEmrActions";
import type { CephalometricAnalysisModalProps, CephTabId, CephMobileViewId } from "./types";

export function useCephLandmarks(props: CephalometricAnalysisModalProps) {
	const { isOpen, onClose, patientId, patientName, initialImageUrl, initialTab, onInsertToProtocol } = props;
	const isDemoSession = useMemo(() => isDemoShowcaseMode() || isDemoPatientId(patientId || ""), [patientId]);
	const latestSavedStudy = useMemo(() => (patientId ? loadLatestCephalometricStudy(patientId) : null), [patientId]);

	const [activeTab, setActiveTab] = useState<CephTabId>(initialTab ?? "landmarks");
	const [mobileView, setMobileView] = useState<CephMobileViewId>(initialTab ? initialTab : "canvas");
	const display = useCephDisplaySettings(latestSavedStudy?.scaleMmPerPixel);

	const state = useCephLandmarksState({
		initialImageUrl,
		savedImageUrl: latestSavedStudy?.imageUrl,
		savedLandmarks: latestSavedStudy?.landmarks,
		isDemoSession,
		patientId,
	});

	const ai = useCephAiBackend({
		isOpen,
		patientId,
		imageUrl: state.imageUrl,
		setImageUrl: state.setImageUrl,
		setLandmarks: state.setLandmarks,
		setActiveTargetKey: state.setActiveTargetKey,
		initialFallback: latestSavedStudy?.isCalibratedFallback,
		initialPlacedCount: latestSavedStudy?.placedCount,
	});

	const analysis = useMemo(() => calculateCephalometrics(state.landmarks, display.scaleMmPerPixel), [state.landmarks, display.scaleMmPerPixel]);
	const activeLm = useMemo(() => (state.activeTargetKey ? CEPHALOMETRIC_LANDMARKS.find((l) => l.key === state.activeTargetKey) ?? null : null), [state.activeTargetKey]);
	const isAllPlaced = analysis.placedCount === CEPHALOMETRIC_LANDMARKS.length;
	const placedPercent = Math.round((analysis.placedCount / analysis.totalCount) * 100);

	const voice = useCephVoiceDictation({ isOpen, setActiveTargetKey: state.setActiveTargetKey, handleRemoveLandmark: state.handleRemoveLandmark });

	const currentEffectiveProtocolText = useMemo(() => {
		if (analysis.placedCount >= 10) return analysis.diagnosis.protocol043Text;
		return generateConsultationNoteWithoutCeph(patientName, Boolean(state.imageUrl), analysis.placedCount, analysis.totalCount);
	}, [analysis.placedCount, analysis.diagnosis.protocol043Text, patientName, state.imageUrl, analysis.totalCount]);

	const actions = useCephSyncAndEmrActions({
		isOpen,
		onClose,
		patientId,
		patientName,
		imageUrl: state.imageUrl,
		landmarks: state.landmarks,
		setLandmarks: state.setLandmarks,
		scaleMmPerPixel: display.scaleMmPerPixel,
		setScaleMmPerPixel: display.setScaleMmPerPixel,
		filterMode: display.filterMode,
		brightness: display.brightness,
		contrast: display.contrast,
		analysis,
		aiStats: ai.aiStats,
		aiBackendLabel: ai.aiBackendLabel,
		currentEffectiveProtocolText,
		isImageLoaded: Boolean(state.imageUrl),
		onInsertToProtocol,
	});

	return {
		activeTab,
		setActiveTab,
		mobileView,
		setMobileView,
		isImageLoaded: Boolean(state.imageUrl),
		...state,
		...display,
		...voice,
		...ai,
		...actions,
		analysis,
		activeLm,
		isAllPlaced,
		placedPercent,
		currentEffectiveProtocolText,
	};
}
