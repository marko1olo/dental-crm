import { showToast } from "../../GlobalToast";
import { clientLogger } from "../../../services/logging/clientLogger";
import { useVisitStore } from "../../../store/visitStore";
import { saveCephalometricAnalysisToEmr } from "../../orthodontics/cephalometricPersistence";
import { cacheActiveCephStudy } from "../../orthodontics/cephStudioSyncChannel";
import { buildCephStudioPopoutUrl } from "../../../utils/runtimeRouter";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../lib/demoMode.js";
import {
	generateConsultationNoteWithoutCeph,
	type CephalometricAnalysisResult,
	type LandmarkMap,
} from "../../orthodontics/cephalometricMath";

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

	let emrSaveFailed = false;
	try {
		saveCephalometricAnalysisToEmr({
			patientId: patientId || undefined,
			patientName: patientName || undefined,
			imageUrl: imageUrl ?? null,
			landmarks,
			scaleMmPerPixel,
			analysis,
			source: "manual",
			backendUsed: "Предварительная консультация",
			isCalibratedFallback: false,
		});
	} catch (err) {
		emrSaveFailed = true;
		clientLogger.warn("[CephModal] Error saving consultation to EMR", err, { module: "CephModal" });
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
	} catch (storeErr) {
		clientLogger.warn("[CephModal] Error updating visit store for consultation", storeErr, {
			module: "CephModal",
		});
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
		} catch (eventErr) {
			clientLogger.warn("[CephModal] Error dispatching SOAP protocol event", eventErr, {
				module: "CephModal",
			});
		}
	}
	if (navigator?.clipboard?.writeText) {
		navigator.clipboard.writeText(consultationText).catch((clipErr) => {
			clientLogger.warn("[CephModal] Error copying consultation text to clipboard", clipErr, {
				module: "CephModal",
			});
		});
	}
	if (emrSaveFailed) {
		showToast("Консультация добавлена в визит, но не удалось сохранить запись в ЭМК", "warning");
	} else {
		showToast("Консультация сохранена в карту (без полного ТРГ-расчета)", "success");
	}
	onClose();
}

export interface OpenPopoutStudioParams {
	patientId?: string | undefined;
	patientName?: string | undefined;
	imageUrl?: string | null | undefined;
	landmarks: LandmarkMap;
	scaleMmPerPixel: number;
	analysis: CephalometricAnalysisResult;
	onClose: () => void;
}

export function executeOpenPopoutStudio(params: OpenPopoutStudioParams): void {
	const { patientId, patientName, imageUrl, landmarks, scaleMmPerPixel, analysis, onClose } = params;

	cacheActiveCephStudy({
		...(patientId ? { patientId } : {}),
		...(patientName ? { patientName } : {}),
		...(imageUrl ? { imageUrl } : {}),
		landmarks,
		scaleMmPerPixel,
		analysis,
	});

	const popoutUrl = buildCephStudioPopoutUrl({
		...(patientId ? { patientId } : {}),
		...(patientName ? { patientName } : {}),
		...(imageUrl ? { imageUrl } : {}),
		demo: isDemoShowcaseMode() || isDemoPatientId(patientId || ""),
	});

	if (typeof window !== "undefined") {
		const popout = window.open(
			popoutUrl,
			"DenteCephStudio",
			"width=1600,height=1000,left=100,top=100,resizable=yes,scrollbars=yes",
		);
		if (popout) {
			popout.focus();
		}
	}

	showToast("Студия ТРГ открыта на 2-м мониторе. Синхронизация с картой пациента активна.", "success", 4000);
	onClose();
}
