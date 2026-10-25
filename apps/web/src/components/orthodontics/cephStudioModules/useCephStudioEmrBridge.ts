import { useState, useCallback } from "react";
import { publishCephSyncEvent } from "../cephStudioSyncChannel";
import { saveCephalometricAnalysisToEmr } from "../cephalometricPersistence";
import { showToast } from "../../GlobalToast";
import { SoundFeedbackService } from "../../../services/audio/SoundFeedbackService";
import type { CephalometricAnalysisResult, LandmarkMap } from "../cephalometric/types";

export interface UseCephStudioEmrBridgeProps {
	readonly patientId: string;
	readonly patientName: string;
	readonly imageUrl: string | null;
	readonly landmarks: LandmarkMap;
	readonly scaleMmPerPixel: number;
	readonly analysis: CephalometricAnalysisResult;
	readonly initialStudioMode?: "doctor" | "patient" | undefined;
}

export function useCephStudioEmrBridge(props: UseCephStudioEmrBridgeProps) {
	const { patientId, patientName, imageUrl, landmarks, scaleMmPerPixel, analysis, initialStudioMode } = props;
	const [isPatientDemoMode, setIsPatientDemoMode] = useState<boolean>(initialStudioMode === "patient");
	const [copiedProtocol, setCopiedProtocol] = useState<boolean>(false);

	const toggleDemoMode = useCallback(() => {
		setIsPatientDemoMode((prev) => {
			const next = !prev;
			publishCephSyncEvent("CEPH_DEMO_MODE_TOGGLED", { isPatientDemoMode: next }, { patientId });
			showToast(
				next
					? "Включен режим демонстрации пациенту (эстетический профиль)"
					: "Возврат в экспертный диагностический режим ТРГ",
				"info",
				2500,
			);
			return next;
		});
	}, [patientId]);

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

	return {
		isPatientDemoMode,
		toggleDemoMode,
		copiedProtocol,
		handleInsertToChart,
		handleCopyProtocol,
		handleCloseWindow,
	};
}
