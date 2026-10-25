import { useState, useEffect, useMemo, useCallback } from "react";
import { showToast } from "../../GlobalToast";
import { SoundFeedbackService } from "../../../services/audio/SoundFeedbackService";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../lib/demoMode.js";
import { SAMPLE_TRG_CEPHALOGRAM_URL } from "../CephalometricCanvas";
import {
	cephAiInferenceService,
	detectOptimalCephBackend,
	type CephAiBackendPreference,
	type CephBackendInfo,
} from "../cephAiInferenceService";
import type { CephAiStats } from "./types";
import type { LandmarkKey, LandmarkMap } from "../cephalometricMath";

export interface UseCephAiBackendProps {
	readonly isOpen: boolean;
	readonly patientId?: string | undefined;
	readonly imageUrl: string | null;
	readonly setImageUrl: (url: string | null) => void;
	readonly setLandmarks: (lm: LandmarkMap) => void;
	readonly setActiveTargetKey: (key: LandmarkKey | null) => void;
	readonly initialFallback?: boolean | undefined;
	readonly initialPlacedCount?: number | undefined;
}

export function useCephAiBackend({
	isOpen,
	patientId,
	imageUrl,
	setImageUrl,
	setLandmarks,
	setActiveTargetKey,
	initialFallback,
	initialPlacedCount,
}: UseCephAiBackendProps) {
	const [aiBackendPref, setAiBackendPref] = useState<CephAiBackendPreference>("auto");
	const [isAiInferring, setIsAiInferring] = useState<boolean>(false);
	const [aiStats, setAiStats] = useState<CephAiStats | null>(() => {
		if (initialFallback !== undefined && initialPlacedCount !== undefined) {
			return { latencyMs: 15, placedCount: initialPlacedCount, isCalibratedFallback: initialFallback };
		}
		return null;
	});
	const [detectedBackend, setDetectedBackend] = useState<CephBackendInfo | null>(null);

	useEffect(() => {
		if (!isOpen) return;
		setDetectedBackend(detectOptimalCephBackend(aiBackendPref));
	}, [isOpen, aiBackendPref]);

	const aiBackendBadge = useMemo(() => {
		if (aiStats?.isCalibratedFallback) return "Шаблон";
		if (aiBackendPref === "auto") return detectedBackend ? detectedBackend.badge : "GPU";
		if (aiBackendPref === "webgpu") return "WebGPU";
		if (aiBackendPref === "webgl") return "WebGL";
		return "CPU";
	}, [aiBackendPref, detectedBackend, aiStats]);

	const aiBackendLabel = useMemo(() => {
		if (aiStats?.isCalibratedFallback) return "Анатомический шаблон (калибровка)";
		if (aiBackendPref === "auto") return detectedBackend ? detectedBackend.labelRu : "Автоматически";
		if (aiBackendPref === "webgpu") return "Дискретная GPU (WebGPU)";
		if (aiBackendPref === "webgl") return "Интегрированная GPU (WebGL)";
		return "Процессор (WASM / CPU)";
	}, [aiBackendPref, detectedBackend, aiStats]);

	const handleRunAiAutoPlacement = useCallback(async () => {
		const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId || "");
		if (!imageUrl && !isDemo) {
			showToast("Для запуска AI авторазметки необходимо загрузить реальный снимок ТРГ пациента", "warning");
			return;
		}

		const targetUrl = imageUrl || (isDemo ? SAMPLE_TRG_CEPHALOGRAM_URL : null);
		if (!targetUrl) {
			showToast("Снимок ТРГ отсутствует. Загрузите снимок пациента.", "warning");
			return;
		}

		if (!imageUrl && isDemo) setImageUrl(targetUrl);
		setIsAiInferring(true);
		try {
			const result = await cephAiInferenceService.runInference(targetUrl, { backend: aiBackendPref, allowFallback: isDemo });
			setLandmarks(result.landmarks);
			setActiveTargetKey(null);
			const count = Object.keys(result.landmarks).length;
			setAiStats({ latencyMs: result.latencyMs, placedCount: count, isCalibratedFallback: result.isCalibratedFallback });
			void SoundFeedbackService.getInstance().playActionSuccess();
			if (result.isCalibratedFallback) {
				showToast(`✓ Применен анатомический шаблон (${count} ориентиров). Выполните ручную проверку`, "success");
			} else {
				const badge = result.backend === "webgpu" ? "WebGPU" : result.backend === "webgl" ? "WebGL" : "CPU";
				showToast(`✓ Авторазметка: ${count} ориентиров расставлены за ${result.latencyMs} мс [${badge}]`, "success");
			}
		} catch (err) {
			showToast(`Ошибка AI авторазметки: ${err instanceof Error ? err.message : String(err)}`, "error");
		} finally {
			setIsAiInferring(false);
		}
	}, [imageUrl, aiBackendPref, patientId, setImageUrl, setLandmarks, setActiveTargetKey]);

	return {
		aiBackendPref,
		setAiBackendPref,
		isAiInferring,
		aiStats,
		detectedBackend,
		aiBackendBadge,
		aiBackendLabel,
		handleRunAiAutoPlacement,
	};
}
