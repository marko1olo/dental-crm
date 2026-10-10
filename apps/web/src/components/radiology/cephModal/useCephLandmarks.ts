import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast";
import { SoundFeedbackService } from "../../../services/audio/SoundFeedbackService";
import { globalDentalVoiceEngine } from "../../../services/voice";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../lib/demoMode.js";
import { loadLatestCephalometricStudy, saveCephalometricAnalysisToEmr } from "../../orthodontics/cephalometricPersistence";
import { subscribeCephSyncChannel } from "../../orthodontics/cephStudioSyncChannel";
import {
	SAMPLE_TRG_CEPHALOGRAM_URL,
	type XrayFilterMode,
} from "../../orthodontics/CephalometricCanvas";
import {
	cephAiInferenceService,
	detectOptimalCephBackend,
	type CephAiBackendPreference,
	type CephBackendInfo,
} from "../../orthodontics/cephAiInferenceService";
import {
	calculateCephalometrics,
	generateConsultationNoteWithoutCeph,
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	type LandmarkKey,
	type LandmarkMap,
	type Point2D,
} from "../cephalometricMath";
import {
	executeSaveConsultationWithoutCeph,
	executeOpenPopoutStudio,
} from "./cephConsultationPersistence";
import { useVisitStore } from "../../../store/visitStore";
import type {
	CephalometricAnalysisModalProps,
	CephAiStats,
	CephTabId,
	CephMobileViewId,
} from "./types";

export function useCephLandmarks({
	isOpen,
	onClose,
	patientId,
	patientName,
	initialImageUrl,
	initialTab,
	onInsertToProtocol,
}: CephalometricAnalysisModalProps) {
	const isDemoSession = useMemo(
		() => isDemoShowcaseMode() || isDemoPatientId(patientId || ""),
		[patientId],
	);

	const latestSavedStudy = useMemo(() => {
		if (patientId) {
			return loadLatestCephalometricStudy(patientId);
		}
		return null;
	}, [patientId]);

	const [activeTab, setActiveTab] = useState<CephTabId>(initialTab ?? "landmarks");
	const [mobileView, setMobileView] = useState<CephMobileViewId>(initialTab ? initialTab : "canvas");

	const [imageUrl, setImageUrl] = useState<string | null>(
		() => initialImageUrl ?? latestSavedStudy?.imageUrl ?? null,
	);
	const [landmarks, setLandmarks] = useState<LandmarkMap>(() => {
		if (latestSavedStudy?.landmarks && Object.keys(latestSavedStudy.landmarks).length > 0) {
			return latestSavedStudy.landmarks;
		}
		if (initialImageUrl && isDemoSession) {
			return DEFAULT_CEPH_LANDMARKS_PRESET;
		}
		return {};
	});
	const [activeTargetKey, setActiveTargetKey] = useState<LandmarkKey | null>(
		() => (initialImageUrl || latestSavedStudy?.imageUrl) ? "S" : null,
	);

	const isImageLoaded = Boolean(imageUrl);
	const [filterMode, setFilterMode] = useState<XrayFilterMode>("normal");
	const [brightness, setBrightness] = useState<number>(100);
	const [contrast, setContrast] = useState<number>(100);
	const [showPolygon, setShowPolygon] = useState<boolean>(true);
	const [showPlanes, setShowPlanes] = useState<boolean>(true);
	const [showLabels, setShowLabels] = useState<boolean>(true);
	const [scaleMmPerPixel, setScaleMmPerPixel] = useState<number>(
		() => latestSavedStudy?.scaleMmPerPixel ?? 0.15,
	);
	const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
	const [voiceInterimText, setVoiceInterimText] = useState<string>("");
	const [copied, setCopied] = useState<boolean>(false);

	const [aiBackendPref, setAiBackendPref] = useState<CephAiBackendPreference>("auto");
	const [isAiInferring, setIsAiInferring] = useState<boolean>(false);
	const [aiStats, setAiStats] = useState<CephAiStats | null>(() => {
		if (latestSavedStudy?.isCalibratedFallback !== undefined) {
			return {
				latencyMs: 15,
				placedCount: latestSavedStudy.placedCount,
				isCalibratedFallback: latestSavedStudy.isCalibratedFallback,
			};
		}
		return null;
	});
	const [detectedBackend, setDetectedBackend] = useState<CephBackendInfo | null>(null);

	useEffect(() => {
		if (!isOpen) return;
		setDetectedBackend(detectOptimalCephBackend(aiBackendPref));
	}, [isOpen, aiBackendPref]);

	const aiBackendBadge = useMemo(() => {
		if (aiStats?.isCalibratedFallback) {
			return "Шаблон";
		}
		if (aiBackendPref === "auto") {
			return detectedBackend ? detectedBackend.badge : "GPU";
		}
		if (aiBackendPref === "webgpu") return "WebGPU";
		if (aiBackendPref === "webgl") return "WebGL";
		return "CPU";
	}, [aiBackendPref, detectedBackend, aiStats]);

	const aiBackendLabel = useMemo(() => {
		if (aiStats?.isCalibratedFallback) {
			return "Анатомический шаблон (калибровка)";
		}
		if (aiBackendPref === "auto") {
			return detectedBackend ? detectedBackend.labelRu : "Автоматически";
		}
		if (aiBackendPref === "webgpu") return "Дискретная GPU (WebGPU)";
		if (aiBackendPref === "webgl") return "Интегрированная GPU (WebGL)";
		return "Процессор (WASM / CPU)";
	}, [aiBackendPref, detectedBackend, aiStats]);

	const handleRunAiAutoPlacement = useCallback(async () => {
		const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId || "");
		if (!imageUrl && !isDemo) {
			showToast(
				"Для запуска AI авторазметки необходимо загрузить реальный снимок ТРГ пациента",
				"warning",
			);
			return;
		}

		const targetUrl = imageUrl || (isDemo ? SAMPLE_TRG_CEPHALOGRAM_URL : null);
		if (!targetUrl) {
			showToast("Снимок ТРГ отсутствует. Загрузите снимок пациента.", "warning");
			return;
		}

		if (!imageUrl && isDemo) {
			setImageUrl(targetUrl);
		}
		setIsAiInferring(true);
		try {
			const result = await cephAiInferenceService.runInference(targetUrl, {
				backend: aiBackendPref,
				allowFallback: isDemo,
			});
			setLandmarks(result.landmarks);
			setActiveTargetKey(null);
			const count = Object.keys(result.landmarks).length;
			setAiStats({
				latencyMs: result.latencyMs,
				placedCount: count,
				isCalibratedFallback: result.isCalibratedFallback,
			});
			void SoundFeedbackService.getInstance().playActionSuccess();
			if (result.isCalibratedFallback) {
				showToast(
					`⚠️ Внимание: Нейросеть ONNX недоступна. Установлен калиброванный анатомический шаблон (${count} точек). Проверьте ориентиры вручную!`,
					"warning",
				);
			} else {
				const badge = result.backend === "webgpu" ? "WebGPU" : result.backend === "webgl" ? "WebGL" : "CPU";
				showToast(
					`✓ AI авторазметка: ${count} ориентиров расставлены за ${result.latencyMs} мс [${badge}]`,
					"success",
				);
			}
		} catch (err) {
			showToast(
				`Ошибка AI авторазметки: ${err instanceof Error ? err.message : String(err)}`,
				"error",
			);
		} finally {
			setIsAiInferring(false);
		}
	}, [imageUrl, aiBackendPref, patientId]);

	const analysis = useMemo(() => calculateCephalometrics(landmarks, scaleMmPerPixel), [landmarks, scaleMmPerPixel]);
	const activeLm = useMemo(() => (activeTargetKey ? CEPHALOMETRIC_LANDMARKS.find((l) => l.key === activeTargetKey) ?? null : null), [activeTargetKey]);
	const isAllPlaced = analysis.placedCount === CEPHALOMETRIC_LANDMARKS.length;
	const placedPercent = Math.round((analysis.placedCount / analysis.totalCount) * 100);

	const handleLandmarkChange = useCallback((key: LandmarkKey, point: Point2D) => {
		setLandmarks((prev) => ({ ...prev, [key]: point }));
		void SoundFeedbackService.getInstance().playActionSuccess();
		const currentIndex = CEPHALOMETRIC_LANDMARKS.findIndex((l) => l.key === key);
		if (currentIndex !== -1) {
			const count = CEPHALOMETRIC_LANDMARKS.length;
			const nextUnplaced = Array.from({ length: count }, (_, offset) => {
				const idx = (currentIndex + 1 + offset) % count;
				return CEPHALOMETRIC_LANDMARKS[idx]!;
			}).find((l) => l.key !== key && !landmarks[l.key]);
			setActiveTargetKey(nextUnplaced ? nextUnplaced.key : null);
		}
	}, [landmarks]);

	const handleRemoveLandmark = useCallback((key: LandmarkKey) => {
		setLandmarks((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
	}, []);

	useEffect(() => {
		if (!isOpen) return;
		const unsub = globalDentalVoiceEngine.addListener({
			onListeningChange: (isL) => {
				setIsVoiceListening(isL);
				if (!isL) setVoiceInterimText("");
			},
			onTranscriptChange: (interim, final) => setVoiceInterimText(interim || final || ""),
			onIntentParsed: (intent) => {
				if (intent.cephLandmarks && intent.cephLandmarks.length > 0) {
					const firstL = intent.cephLandmarks[0];
					if (firstL) {
						const matchedDef = CEPHALOMETRIC_LANDMARKS.find((l) => l.key.toLowerCase() === firstL.landmarkKey.toLowerCase());
						if (matchedDef) {
							if (firstL.action === "clear") {
								handleRemoveLandmark(matchedDef.key);
								showToast(`Голос: Сброшена ${matchedDef.nameRu}`, "info");
							} else {
								setActiveTargetKey(matchedDef.key);
								void SoundFeedbackService.getInstance().playActionSuccess();
								showToast(`Голос: Выбран ориентир ${matchedDef.nameRu}`, "success");
							}
						}
					}
				}
			},
		});
		return () => unsub();
	}, [isOpen, handleRemoveLandmark]);

	const handleApplyPreset = useCallback((preset: LandmarkMap, label: string) => {
		const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId || "");
		if (!imageUrl) {
			if (isDemo) {
				setImageUrl(SAMPLE_TRG_CEPHALOGRAM_URL);
			} else {
				showToast("Снимок ТРГ не загружен. Пресет применен к координатам, прикрепите снимок пациента.", "info");
			}
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

	const handleLoadPreset = () => {
		const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId || "");
		if (isDemo) {
			setImageUrl(SAMPLE_TRG_CEPHALOGRAM_URL);
			setLandmarks(DEFAULT_CEPH_LANDMARKS_PRESET);
			setActiveTargetKey(null);
			showToast("Загружена эталонная анатомическая разметка ТРГ со снимком", "success");
		} else {
			showToast("Загрузка тестового образца снимка доступна только в Демо-режиме. Загрузите снимок пациента.", "warning");
		}
	};

	const currentEffectiveProtocolText = useMemo(() => {
		if (analysis.placedCount >= 10) return analysis.diagnosis.protocol043Text;
		return generateConsultationNoteWithoutCeph(patientName, isImageLoaded, analysis.placedCount, analysis.totalCount);
	}, [analysis.placedCount, analysis.diagnosis.protocol043Text, patientName, isImageLoaded, analysis.totalCount]);

	const handleSaveToEmrOnly = useCallback(() => {
		try {
			const record = saveCephalometricAnalysisToEmr({
				patientId,
				patientName,
				imageUrl,
				landmarks,
				scaleMmPerPixel,
				analysis,
				source: aiStats ? "ai" : "manual",
				backendUsed: aiStats?.isCalibratedFallback ? "Калиброванный шаблон" : aiBackendLabel,
				isCalibratedFallback: aiStats?.isCalibratedFallback,
			});
			void SoundFeedbackService.getInstance().playActionSuccess();
			showToast(`Анализ ТРГ успешно зафиксирован в ЭМК пациента (ID: ${record.id})`, "success");
		} catch (err) {
			showToast(`Ошибка сохранения в ЭМК: ${err instanceof Error ? err.message : String(err)}`, "error");
		}
	}, [patientId, patientName, imageUrl, landmarks, scaleMmPerPixel, analysis, aiStats, aiBackendLabel]);

	const handleInsertToChart = () => {
		if (onInsertToProtocol) onInsertToProtocol(currentEffectiveProtocolText);

		// Честное сохранение структурированных данных цефалометрии в ЭМК и базу данных
		try {
			saveCephalometricAnalysisToEmr({
				patientId,
				patientName,
				imageUrl,
				landmarks,
				scaleMmPerPixel,
				analysis,
				source: aiStats ? "ai" : "manual",
				backendUsed: aiStats?.isCalibratedFallback ? "Калиброванный шаблон" : aiBackendLabel,
				isCalibratedFallback: aiStats?.isCalibratedFallback,
			});
		} catch (err) {
			console.warn("[CephModal] Error saving cephalometrics to EMR:", err);
		}

		try {
			const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
			if (setVisitNoteForm) {
				setVisitNoteForm((prev) => ({
					...prev,
					complaint: prev.complaint ? `${prev.complaint}\n\n[Ортодонтия] Ортодонтический прием (ТРГ)` : "Ортодонтический приём. Жалобы на скученность зубов и прикус.",
					objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n\n${currentEffectiveProtocolText}` : currentEffectiveProtocolText,
					treatmentPlan: prev.treatmentPlan ? `${prev.treatmentPlan}\n\n[Ортодонтия] Диагностический протокол ТРГ сохранен: ${analysis.diagnosis.skeletalClassRu}.` : `Ортодонтическое лечение: протокол ТРГ сохранен (${analysis.diagnosis.skeletalClassRu}), согласование аппаратуры.`,
				}));
			}
		} catch { /* ignore */ }

		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
					detail: { protocolText: currentEffectiveProtocolText, title: "Протокол ТРГ (Медицинская карта)", soap: { treatmentDescription: currentEffectiveProtocolText }, mode: "smart_append" },
				}));
			} catch { /* ignore */ }
		}
		showToast("Протокол ТРГ успешно вставлен в медицинскую карту!", "success");
		onClose();
	};

	const handleSaveConsultationWithoutCeph = useCallback(() => {
		executeSaveConsultationWithoutCeph({
			patientId,
			patientName,
			imageUrl,
			landmarks,
			scaleMmPerPixel,
			analysis,
			isImageLoaded,
			onInsertToProtocol,
			onClose,
		});
	}, [patientName, isImageLoaded, analysis, landmarks, scaleMmPerPixel, imageUrl, patientId, onInsertToProtocol, onClose]);

	const handleOpenPopoutStudio = useCallback(() => {
		executeOpenPopoutStudio({
			patientId,
			patientName,
			imageUrl,
			landmarks,
			scaleMmPerPixel,
			analysis,
			onClose,
		});
	}, [patientId, patientName, imageUrl, landmarks, scaleMmPerPixel, analysis, onClose]);

	useEffect(() => {
		if (!isOpen) return;
		const unsub = subscribeCephSyncChannel((msg) => {
			if (msg.type === "CEPH_LANDMARKS_UPDATED") {
				const payload = msg.payload as { landmarks?: LandmarkMap; scaleMmPerPixel?: number };
				if (payload?.landmarks) setLandmarks(payload.landmarks);
				if (payload?.scaleMmPerPixel) setScaleMmPerPixel(payload.scaleMmPerPixel);
			} else if (msg.type === "CEPH_INSERT_TO_PROTOCOL") {
				const payload = msg.payload as { protocolText?: string };
				if (payload?.protocolText && onInsertToProtocol) {
					onInsertToProtocol(payload.protocolText);
				}
			}
		});
		return () => unsub();
	}, [isOpen, onInsertToProtocol]);

	const handleCopyText = async () => {
		try {
			await navigator.clipboard.writeText(currentEffectiveProtocolText);
			setCopied(true);
			showToast("Протокол скопирован в буфер обмена", "success");
			setTimeout(() => setCopied(false), 2000);
		} catch {
			showToast("Не удалось скопировать текст", "error");
		}
	};

	const toggleVoiceListening = useCallback(async () => {
		if (isVoiceListening) {
			globalDentalVoiceEngine.stop();
		} else {
			const started = await globalDentalVoiceEngine.start();
			if (!started) showToast("Не удалось запустить микрофон", "warning");
		}
	}, [isVoiceListening]);

	return {
		activeTab,
		setActiveTab,
		mobileView,
		setMobileView,
		imageUrl,
		setImageUrl,
		landmarks,
		setLandmarks,
		activeTargetKey,
		setActiveTargetKey,
		isImageLoaded,
		filterMode,
		setFilterMode,
		brightness,
		setBrightness,
		contrast,
		setContrast,
		showPolygon,
		setShowPolygon,
		showPlanes,
		setShowPlanes,
		showLabels,
		setShowLabels,
		scaleMmPerPixel,
		setScaleMmPerPixel,
		isVoiceListening,
		voiceInterimText,
		copied,
		aiBackendPref,
		setAiBackendPref,
		isAiInferring,
		aiStats,
		detectedBackend,
		aiBackendBadge,
		aiBackendLabel,
		analysis,
		activeLm,
		isAllPlaced,
		placedPercent,
		handleRunAiAutoPlacement,
		handleLandmarkChange,
		handleRemoveLandmark,
		handleApplyPreset,
		handleResetLandmarks,
		handleLoadPreset,
		currentEffectiveProtocolText,
		handleSaveToEmrOnly,
		handleInsertToChart,
		handleSaveConsultationWithoutCeph,
		handleOpenPopoutStudio,
		handleCopyText,
		toggleVoiceListening,
	};
}
