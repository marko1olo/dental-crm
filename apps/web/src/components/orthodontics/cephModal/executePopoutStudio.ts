import { showToast } from "../../GlobalToast";
import { saveCephalometricAnalysisToEmr } from "../cephalometricPersistence";
import { cacheActiveCephStudy } from "../cephStudioSyncChannel";
import { buildCephStudioPopoutUrl } from "../../../utils/runtimeRouter";
import type { LandmarkMap } from "../cephalometricMath";
import type { SaveConsultationParams } from "./executeSaveConsultation";

export function executeSaveToEmrOnly(params: SaveConsultationParams): void {
	const { patientId, patientName, imageUrl, landmarks, scaleMmPerPixel, analysis } = params;
	try {
		saveCephalometricAnalysisToEmr({
			patientId: patientId || "PAT-001",
			patientName: patientName || "Пациент",
			imageUrl: imageUrl ?? null,
			landmarks,
			scaleMmPerPixel,
			analysis,
			source: "manual",
			backendUsed: "Ручная/полуавтоматическая разметка",
			isCalibratedFallback: false,
		});
		showToast("ТРГ-исследование и анатомические ориентиры сохранены в ЭМК", "success");
	} catch (err) {
		console.error("[CephModal] Error saving to EMR:", err);
		showToast("Ошибка сохранения исследования ТРГ в ЭМК", "error");
	}
}

export function executeOpenPopoutStudio(params: {
	patientId?: string | undefined;
	patientName?: string | undefined;
	imageUrl?: string | null | undefined;
	landmarks: LandmarkMap;
	scaleMmPerPixel: number;
	filterMode: string;
	brightness: number;
	contrast: number;
}): void {
	const { patientId, patientName, imageUrl, landmarks, scaleMmPerPixel, filterMode, brightness, contrast } = params;

	try {
		cacheActiveCephStudy({
			patientId: patientId || "PAT-DEMO",
			patientName: patientName || "Пациент",
			imageUrl: imageUrl || undefined,
			landmarks,
			scaleMmPerPixel,
			filterMode,
			brightness,
			contrast,
			activeTab: "metrics",
			timestamp: Date.now(),
		});

		const popoutUrl = buildCephStudioPopoutUrl({ patientId, patientName });
		const win = window.open(
			popoutUrl,
			"DenteCephStudioPopout",
			"width=1440,height=900,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes",
		);

		if (win) {
			win.focus();
			showToast("Студия ТРГ открыта в отдельном окне / на 2-м мониторе", "success");
		} else {
			showToast("Браузер заблокировал всплывающее окно. Разрешите pop-up для домена клиники.", "warning");
		}
	} catch (err) {
		console.error("[CephModal] Failed to open pop-out studio:", err);
		showToast("Не удалось открыть окно студии цефалометрии", "error");
	}
}
