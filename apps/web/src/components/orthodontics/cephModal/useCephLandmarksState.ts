import { useState, useCallback } from "react";
import { showToast } from "../../GlobalToast";
import { SoundFeedbackService } from "../../../services/audio/SoundFeedbackService";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../lib/demoMode.js";
import { SAMPLE_TRG_CEPHALOGRAM_URL } from "../CephalometricCanvas";
import {
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	type LandmarkKey,
	type LandmarkMap,
	type Point2D,
} from "../cephalometricMath";

export interface UseCephLandmarksStateProps {
	readonly initialImageUrl?: string | null | undefined;
	readonly savedImageUrl?: string | null | undefined;
	readonly savedLandmarks?: LandmarkMap | undefined;
	readonly isDemoSession: boolean;
	readonly patientId?: string | undefined;
}

export function useCephLandmarksState({
	initialImageUrl,
	savedImageUrl,
	savedLandmarks,
	isDemoSession,
	patientId,
}: UseCephLandmarksStateProps) {
	const [imageUrl, setImageUrl] = useState<string | null>(() => initialImageUrl ?? savedImageUrl ?? null);
	const [landmarks, setLandmarks] = useState<LandmarkMap>(() => {
		if (savedLandmarks && Object.keys(savedLandmarks).length > 0) return savedLandmarks;
		if (initialImageUrl && isDemoSession) return DEFAULT_CEPH_LANDMARKS_PRESET;
		return {};
	});
	const [activeTargetKey, setActiveTargetKey] = useState<LandmarkKey | null>(() => (initialImageUrl || savedImageUrl) ? "S" : null);

	const handleLandmarkChange = useCallback((key: LandmarkKey, point: Point2D) => {
		setLandmarks((prev) => ({ ...prev, [key]: point }));
		void SoundFeedbackService.getInstance().playActionSuccess();
		const curIdx = CEPHALOMETRIC_LANDMARKS.findIndex((l) => l.key === key);
		if (curIdx !== -1) {
			const count = CEPHALOMETRIC_LANDMARKS.length;
			const next = Array.from({ length: count }, (_, o) => CEPHALOMETRIC_LANDMARKS[(curIdx + 1 + o) % count]!).find((l) => l.key !== key && !landmarks[l.key]);
			setActiveTargetKey(next ? next.key : null);
		}
	}, [landmarks]);

	const handleRemoveLandmark = useCallback((key: LandmarkKey) => {
		setLandmarks((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
	}, []);

	const handleApplyPreset = useCallback((preset: LandmarkMap, label: string) => {
		const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId || "");
		if (!imageUrl) {
			if (isDemo) setImageUrl(SAMPLE_TRG_CEPHALOGRAM_URL);
			else showToast("Снимок ТРГ не загружен. Пресет применен к координатам, прикрепите снимок пациента.", "info");
		}
		setLandmarks(preset);
		setActiveTargetKey(null);
		showToast(`Применен пресет: ${label}`, "success");
		void SoundFeedbackService.getInstance().playActionSuccess();
	}, [imageUrl, patientId]);

	const handleResetLandmarks = useCallback(() => {
		setLandmarks({});
		setActiveTargetKey(null);
		showToast("Разметка ориентиров сброшена", "info");
	}, []);

	const handleLoadPreset = useCallback(() => {
		if (isDemoSession) {
			setImageUrl(SAMPLE_TRG_CEPHALOGRAM_URL);
			setLandmarks(DEFAULT_CEPH_LANDMARKS_PRESET);
			setActiveTargetKey(null);
			showToast("Загружена эталонная анатомическая разметка ТРГ со снимком", "success");
		} else {
			showToast("Загрузка тестового образца снимка доступна только в Демо-режиме. Загрузите снимок пациента.", "warning");
		}
	}, [isDemoSession]);

	return {
		imageUrl,
		setImageUrl,
		landmarks,
		setLandmarks,
		activeTargetKey,
		setActiveTargetKey,
		handleLandmarkChange,
		handleRemoveLandmark,
		handleApplyPreset,
		handleResetLandmarks,
		handleLoadPreset,
	};
}
