import { useState, useEffect, useCallback } from "react";
import { showToast } from "../../GlobalToast";
import { SoundFeedbackService } from "../../../services/audio/SoundFeedbackService";
import { saveCephalometricAnalysisToEmr } from "../cephalometricPersistence";
import { subscribeCephSyncChannel } from "../cephStudioSyncChannel";
import { executeSaveConsultationWithoutCeph, executeOpenPopoutStudio } from "./cephConsultationPersistence";
import { saveCephToVisitStoreAndDom } from "./cephVisitStoreBridge";
import type { LandmarkMap } from "../cephalometricMath";
import type { UseCephSyncAndEmrActionsProps } from "./cephSyncActionTypes";

export function useCephSyncAndEmrActions(props: UseCephSyncAndEmrActionsProps) {
	const {
		isOpen,
		onClose,
		patientId,
		patientName,
		imageUrl,
		landmarks,
		setLandmarks,
		scaleMmPerPixel,
		setScaleMmPerPixel,
		filterMode,
		brightness,
		contrast,
		analysis,
		aiStats,
		aiBackendLabel,
		currentEffectiveProtocolText,
		isImageLoaded,
		onInsertToProtocol,
	} = props;
	const [copied, setCopied] = useState<boolean>(false);

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
		saveCephToVisitStoreAndDom(currentEffectiveProtocolText, analysis);
		showToast("Протокол ТРГ успешно вставлен в медицинскую карту!", "success");
		onClose();
	};

	const handleSaveConsultationWithoutCeph = useCallback(() => {
		executeSaveConsultationWithoutCeph({ patientId, patientName, imageUrl, landmarks, scaleMmPerPixel, analysis, isImageLoaded, onInsertToProtocol, onClose });
	}, [patientName, isImageLoaded, analysis, landmarks, scaleMmPerPixel, imageUrl, patientId, onInsertToProtocol, onClose]);

	const handleOpenPopoutStudio = useCallback(() => {
		executeOpenPopoutStudio({ patientId, patientName, imageUrl, landmarks, scaleMmPerPixel, filterMode, brightness, contrast });
	}, [patientId, patientName, imageUrl, landmarks, scaleMmPerPixel, filterMode, brightness, contrast]);

	useEffect(() => {
		if (!isOpen) return;
		const unsub = subscribeCephSyncChannel((msg) => {
			if (msg.type === "CEPH_LANDMARKS_UPDATED") {
				const payload = msg.payload as { landmarks?: LandmarkMap; scaleMmPerPixel?: number };
				if (payload?.landmarks) setLandmarks(payload.landmarks);
				if (payload?.scaleMmPerPixel) setScaleMmPerPixel(payload.scaleMmPerPixel);
			} else if (msg.type === "CEPH_INSERT_TO_PROTOCOL") {
				const payload = msg.payload as { protocolText?: string };
				if (payload?.protocolText && onInsertToProtocol) onInsertToProtocol(payload.protocolText);
			}
		});
		return () => unsub();
	}, [isOpen, onInsertToProtocol, setLandmarks, setScaleMmPerPixel]);

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

	return {
		copied,
		handleSaveToEmrOnly,
		handleInsertToChart,
		handleSaveConsultationWithoutCeph,
		handleOpenPopoutStudio,
		handleCopyText,
	};
}
export type { UseCephSyncAndEmrActionsProps } from "./cephSyncActionTypes";
