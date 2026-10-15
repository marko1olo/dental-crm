import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import { saveCephalometricAnalysisToEmr } from "../cephalometricPersistence";
import { cacheActiveCephStudy } from "../cephStudioSyncChannel";
import { buildCephStudioPopoutUrl } from "../../../utils/runtimeRouter";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../lib/demoMode.js";
import {
	generateConsultationNoteWithoutCeph,
	type CephalometricAnalysisResult,
	type LandmarkMap,
} from "../cephalometricMath";

export interface SaveConsultationParams {
	patientId?: string | undefined;
	patientName?: string | undefined;
	imageUrl?: string | null | undefined;
	landmarks: LandmarkMap;
	scaleMmPerPixel: number;
	analysis: CephalometricAnalysisResult;
	isImageLoaded: boolean;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	onClose: () => void;
}

export function executeSaveConsultationWithoutCeph(params: SaveConsultationParams): void {
	const {
		patientId,
		patientName,
		imageUrl,
		landmarks,
		scaleMmPerPixel,
		analysis,
		isImageLoaded,
		onInsertToProtocol,
		onClose,
	} = params;

	const consultationText = generateConsultationNoteWithoutCeph(
		patientName,
		isImageLoaded,
		analysis.placedCount,
		analysis.totalCount,
	);
	if (onInsertToProtocol) onInsertToProtocol(consultationText);

	try {
		saveCephalometricAnalysisToEmr({
			patientId: patientId || "PAT-001",
			patientName: patientName || "Пациент",
			imageUrl: imageUrl ?? null,
			landmarks,
			scaleMmPerPixel,
			analysis,
			source: "manual",
			backendUsed: "Предварительная консультация",
			isCalibratedFallback: false,
		});
	} catch (err) {
		console.warn("[CephModal] Error saving consultation to EMR:", err);
	}

	try {
		const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
		if (setVisitNoteForm) {
			setVisitNoteForm((prev) => ({
				...prev,
				complaint: prev.complaint
					? `${prev.complaint}\n\n[Ортодонтия] Первичная консультация ортодонта`
					: "Консультация врача-ортодонта. Жалобы на скученность зубов и нарушение прикуса.",
				objectiveStatus: prev.objectiveStatus
					? `${prev.objectiveStatus}\n\n${consultationText}`
					: consultationText,
				treatmentPlan: prev.treatmentPlan
					? `${prev.treatmentPlan}\n\n[Ортодонтия] Направлен на диагностический сетап, санацию и профгигиену.`
					: "Ортодонтическое лечение: диагностический сетап, санация, согласование брекетов/элайнеров.",
			}));
		}
	} catch {
		/* ignore */
	}

	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						protocolText: consultationText,
						title: "Ортодонтическая консультация (без полного ТРГ-расчета)",
						soap: { treatmentDescription: consultationText },
						mode: "smart_append",
					},
				}),
			);
		} catch {
			/* ignore */
		}
	}
	if (navigator?.clipboard?.writeText) {
		navigator.clipboard.writeText(consultationText).catch(() => {});
	}

	showToast("Консультация ортодонта внесена в карту (ТРГ не блокирует приём)", "success");
	onClose();
}

export function executeSaveToEmrOnly(params: SaveConsultationParams): void {
	const {
		patientId,
		patientName,
		imageUrl,
		landmarks,
		scaleMmPerPixel,
		analysis,
	} = params;

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
	const {
		patientId,
		patientName,
		imageUrl,
		landmarks,
		scaleMmPerPixel,
		filterMode,
		brightness,
		contrast,
	} = params;

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
