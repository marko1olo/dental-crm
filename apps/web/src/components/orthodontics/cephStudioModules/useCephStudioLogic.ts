/**
 * useCephStudioLogic.ts — Реактивное состояние и EMR-мост студии ТРГ (Мандат 8b <= 120 строк).
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
	calculateCephalometrics, DEFAULT_CEPH_LANDMARKS_PRESET,
	type LandmarkKey, type LandmarkMap, type Point2D,
} from "../cephalometricMath";
import { SAMPLE_TRG_CEPHALOGRAM_URL } from "../CephalometricCanvas";
import { publishCephSyncEvent, getCachedActiveCephStudy } from "../cephStudioSyncChannel";
import { showToast } from "../../GlobalToast";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../utils/demoModeEngine";
import { SoundFeedbackService } from "../../../services/audio/SoundFeedbackService";
import { useCephStudioThemeAndDisplay } from "./useCephStudioThemeAndDisplay";
import { useCephStudioEmrBridge } from "./useCephStudioEmrBridge";
import { getTorqueRecommendation } from "./cephTorqueAdvice";
import type { CephStandaloneStudioViewProps, CephStudioTab } from "./cephStudioTypes";

export function useCephStudioLogic(props: CephStandaloneStudioViewProps) {
	const {
		patientId = "pat-ortho-live", patientName = "Пациент ортодонтического приема",
		initialImageUrl, initialStudioMode, autoLoadDemo = false,
	} = props;

	const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl ?? null);
	const [landmarks, setLandmarks] = useState<LandmarkMap>({});
	const [scaleMmPerPixel, setScaleMmPerPixel] = useState<number>(0.1);
	const [activeTargetKey, setActiveTargetKey] = useState<LandmarkKey | null>(null);
	const [activeTab, setActiveTab] = useState<CephStudioTab>("landmarks");
	const display = useCephStudioThemeAndDisplay();

	useEffect(() => {
		const cached = getCachedActiveCephStudy();
		if (cached) {
			if (cached.imageUrl && !imageUrl) setImageUrl(cached.imageUrl);
			if (cached.landmarks && Object.keys(cached.landmarks).length > 0) setLandmarks(cached.landmarks);
			if (cached.scaleMmPerPixel) setScaleMmPerPixel(cached.scaleMmPerPixel);
		} else if (autoLoadDemo || isDemoShowcaseMode() || isDemoPatientId(patientId)) {
			setImageUrl(SAMPLE_TRG_CEPHALOGRAM_URL);
			setLandmarks(DEFAULT_CEPH_LANDMARKS_PRESET);
		}
		publishCephSyncEvent("CEPH_STUDIO_OPENED", { status: "ready", patientId }, { patientId, patientName });
	}, [autoLoadDemo, patientId, patientName, imageUrl]);

	const analysis = useMemo(() => calculateCephalometrics(landmarks, scaleMmPerPixel), [landmarks, scaleMmPerPixel]);

	useEffect(() => {
		if (analysis.placedCount > 0) {
			publishCephSyncEvent("CEPH_ANALYSIS_COMPLETED", {
				analysis, protocolText: analysis.diagnosis.protocol043Text,
				skeletalClassRu: analysis.diagnosis.skeletalClassRu, growthPatternRu: analysis.diagnosis.growthPatternRu,
			}, { patientId, patientName });
		}
	}, [analysis, patientId, patientName]);

	const handleLandmarkChange = useCallback((key: LandmarkKey, point: Point2D) => {
		setLandmarks((prev) => {
			const updated = { ...prev, [key]: point };
			publishCephSyncEvent("CEPH_LANDMARKS_UPDATED", {
				landmarks: updated, scaleMmPerPixel, placedCount: Object.keys(updated).length,
			}, { patientId, patientName });
			return updated;
		});
		void SoundFeedbackService.getInstance().playActionSuccess();
	}, [scaleMmPerPixel, patientId, patientName]);

	const handleRemoveLandmark = useCallback((key: LandmarkKey) => {
		setLandmarks((prev) => {
			const copy = { ...prev };
			delete copy[key];
			return copy;
		});
	}, []);

	const handleApplyPreset = useCallback((preset: LandmarkMap, label: string) => {
		if (!imageUrl) setImageUrl(SAMPLE_TRG_CEPHALOGRAM_URL);
		setLandmarks(preset);
		setActiveTargetKey(null);
		showToast(`Применен пресет разметки: ${label}`, "success");
		void SoundFeedbackService.getInstance().playActionSuccess();
	}, [imageUrl]);

	const emr = useCephStudioEmrBridge({
		patientId, patientName, imageUrl, landmarks, scaleMmPerPixel, analysis, initialStudioMode,
	});

	const torqueRecommendation = useMemo(() => getTorqueRecommendation(analysis), [analysis]);

	return {
		patientId, patientName, imageUrl, setImageUrl, landmarks, scaleMmPerPixel, setScaleMmPerPixel,
		activeTargetKey, setActiveTargetKey, activeTab, setActiveTab,
		...display, ...emr, analysis, torqueRecommendation,
		handleLandmarkChange, handleRemoveLandmark, handleApplyPreset,
	};
}
