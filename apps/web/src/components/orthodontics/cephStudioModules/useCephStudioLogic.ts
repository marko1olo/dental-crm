/**
 * apps/web/src/components/orthodontics/cephStudioModules/useCephStudioLogic.ts
 *
 * Layer 3: Reactive state, dual-window broadcast sync, and EMR persistence
 * for Cephalometric TRG Studio.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
	calculateCephalometrics,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	type LandmarkKey,
	type LandmarkMap,
	type Point2D,
	type CephalometricAnalysisResult,
} from "../cephalometricMath";
import { SAMPLE_TRG_CEPHALOGRAM_URL, type XrayFilterMode } from "../CephalometricCanvas";
import { saveCephalometricAnalysisToEmr } from "../cephalometricPersistence";
import {
	publishCephSyncEvent,
	getCachedActiveCephStudy,
} from "../cephStudioSyncChannel";
import { showToast } from "../../GlobalToast";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../utils/demoModeEngine";
import { SoundFeedbackService } from "../../../services/audio/SoundFeedbackService";
import type {
	CephStandaloneStudioViewProps,
	CephStudioTab,
	CephStudioTheme,
	TorqueRecommendation,
} from "./cephStudioTypes";

export function useCephStudioLogic(props: CephStandaloneStudioViewProps) {
	const {
		patientId = "pat-ortho-live",
		patientName = "Пациент ортодонтического приема",
		initialImageUrl,
		initialStudioMode,
		autoLoadDemo = false,
	} = props;

	const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl ?? null);
	const [landmarks, setLandmarks] = useState<LandmarkMap>({});
	const [scaleMmPerPixel, setScaleMmPerPixel] = useState<number>(0.1);
	const [activeTargetKey, setActiveTargetKey] = useState<LandmarkKey | null>(null);
	const [activeTab, setActiveTab] = useState<CephStudioTab>("landmarks");
	const [isPatientDemoMode, setIsPatientDemoMode] = useState<boolean>(
		initialStudioMode === "patient",
	);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [copiedProtocol, setCopiedProtocol] = useState<boolean>(false);
	const [showPlanes, setShowPlanes] = useState<boolean>(true);
	const [showPolygon, setShowPolygon] = useState<boolean>(true);
	const [showLabels, setShowLabels] = useState<boolean>(true);
	const [filterMode, setFilterMode] = useState<XrayFilterMode>("normal");
	const [brightness] = useState<number>(100);
	const [contrast] = useState<number>(100);
	const [theme, setTheme] = useState<CephStudioTheme>(() => {
		if (typeof document !== "undefined") {
			const current = document.documentElement.getAttribute("data-theme");
			if (current === "light") return "light";
		}
		return "dark";
	});

	useEffect(() => {
		if (typeof document === "undefined") return;
		const updateTheme = () => {
			const current = document.documentElement.getAttribute("data-theme");
			setTheme(current === "light" ? "light" : "dark");
		};
		updateTheme();
		const observer = new MutationObserver(updateTheme);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
		return () => observer.disconnect();
	}, []);

	const toggleTheme = useCallback(() => {
		const next = theme === "dark" ? "light" : "dark";
		setTheme(next);
		if (typeof document !== "undefined") {
			document.documentElement.setAttribute("data-theme", next);
		}
	}, [theme]);

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

	const toggleFullscreen = useCallback(() => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch(() => {});
			setIsFullscreen(true);
		} else {
			document.exitFullscreen().catch(() => {});
			setIsFullscreen(false);
		}
	}, []);

	const analysis: CephalometricAnalysisResult = useMemo(() => {
		return calculateCephalometrics(landmarks, scaleMmPerPixel);
	}, [landmarks, scaleMmPerPixel]);

	useEffect(() => {
		if (analysis.placedCount > 0) {
			publishCephSyncEvent("CEPH_ANALYSIS_COMPLETED", {
				analysis,
				protocolText: analysis.diagnosis.protocol043Text,
				skeletalClassRu: analysis.diagnosis.skeletalClassRu,
				growthPatternRu: analysis.diagnosis.growthPatternRu,
			}, { patientId, patientName });
		}
	}, [analysis, patientId, patientName]);

	const handleLandmarkChange = useCallback((key: LandmarkKey, point: Point2D) => {
		setLandmarks((prev) => {
			const updated = { ...prev, [key]: point };
			publishCephSyncEvent("CEPH_LANDMARKS_UPDATED", {
				landmarks: updated,
				scaleMmPerPixel,
				placedCount: Object.keys(updated).length,
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

	const handleInsertToChart = useCallback(() => {
		const payload = {
			protocolText: analysis.diagnosis.protocol043Text,
			diagnosisSummary: analysis.diagnosis.summaryRu,
			skeletalClass: analysis.diagnosis.skeletalClass,
			growthPattern: analysis.diagnosis.growthPattern,
			anbAngle: analysis.measurements.find((m) => m.id === "ANB")?.value ?? null,
			fmaAngle: analysis.measurements.find((m) => m.id === "FMA")?.value ?? null,
			u1SnAngle: analysis.measurements.find((m) => m.id === "U1-SN")?.value ?? null,
			impaAngle: analysis.measurements.find((m) => m.id === "IMPA")?.value ?? null,
		};

		publishCephSyncEvent("CEPH_INSERT_TO_PROTOCOL", payload, { patientId, patientName });

		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							protocolText: analysis.diagnosis.protocol043Text,
							title: "Протокол ТРГ (Студия на 2-м мониторе)",
							mode: "smart_append",
						},
					}),
				);
			} catch {}
		}

		try {
			saveCephalometricAnalysisToEmr({
				patientId,
				patientName,
				imageUrl,
				landmarks,
				scaleMmPerPixel,
				analysis,
				source: "manual",
				backendUsed: "Pop-out Studio Workstation",
				isCalibratedFallback: false,
			});
		} catch (err) {
			console.warn("[CephStudio] Failed to save to EMR:", err);
		}

		showToast("Протокол ТРГ отправлен в медицинскую карту пациента!", "success", 3500);
		void SoundFeedbackService.getInstance().playActionSuccess();
	}, [analysis, patientId, patientName, imageUrl, landmarks, scaleMmPerPixel]);

	const handleCopyProtocol = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(analysis.diagnosis.protocol043Text);
			setCopiedProtocol(true);
			setTimeout(() => setCopiedProtocol(false), 2500);
			showToast("Протокол ТРГ скопирован в буфер обмена", "success");
		}
	}, [analysis.diagnosis.protocol043Text]);

	const handleCloseWindow = useCallback(() => {
		publishCephSyncEvent("CEPH_STUDIO_CLOSED", { reason: "user_close" }, { patientId });
		if (typeof window !== "undefined") {
			if (window.opener) window.close();
			else window.history.back();
		}
	}, [patientId]);

	const toggleDemoMode = useCallback(() => {
		const next = !isPatientDemoMode;
		setIsPatientDemoMode(next);
		publishCephSyncEvent("CEPH_DEMO_MODE_TOGGLED", { isPatientDemoMode: next }, { patientId });
		showToast(
			next
				? "Включен режим демонстрации пациенту (эстетический профиль)"
				: "Возврат в экспертный диагностический режим ТРГ",
			"info",
			2500,
		);
	}, [isPatientDemoMode, patientId]);

	const u1SnVal = analysis.measurements.find((m) => m.id === "U1-SN")?.value;
	const torqueRecommendation: TorqueRecommendation | null = useMemo(() => {
		if (u1SnVal === null || u1SnVal === undefined) return null;
		if (u1SnVal > 106) {
			return { type: "Low Torque (Низкий торк)", reason: "Проклинация резцов (>106°): предотвращение веерообразного наклона" };
		}
		if (u1SnVal < 102) {
			return { type: "High Torque (Высокий торк)", reason: "Ретроклинация резцов (<102°): активное корпусное движение корней" };
		}
		return { type: "Standard Torque (Стандартный торк)", reason: "Наклон резцов в пределах анатомической нормы (102°..106°)" };
	}, [u1SnVal]);

	return {
		patientId,
		patientName,
		imageUrl,
		setImageUrl,
		landmarks,
		scaleMmPerPixel,
		setScaleMmPerPixel,
		activeTargetKey,
		setActiveTargetKey,
		activeTab,
		setActiveTab,
		isPatientDemoMode,
		toggleDemoMode,
		isFullscreen,
		toggleFullscreen,
		copiedProtocol,
		showPlanes,
		setShowPlanes,
		showPolygon,
		setShowPolygon,
		showLabels,
		setShowLabels,
		filterMode,
		setFilterMode,
		brightness,
		contrast,
		theme,
		toggleTheme,
		analysis,
		torqueRecommendation,
		handleLandmarkChange,
		handleRemoveLandmark,
		handleApplyPreset,
		handleInsertToChart,
		handleCopyProtocol,
		handleCloseWindow,
	};
}
