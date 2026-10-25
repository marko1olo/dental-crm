import { useVisitStore } from "../../../store/visitStore";
import type { CephalometricAnalysisResult } from "../cephalometricMath";

export function saveCephToVisitStoreAndDom(
	currentEffectiveProtocolText: string,
	analysis: CephalometricAnalysisResult,
): void {
	try {
		const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
		if (setVisitNoteForm) {
			setVisitNoteForm((prev) => ({
				...prev,
				complaint: prev.complaint
					? `${prev.complaint}\n\n[Ортодонтия] Ортодонтический прием (ТРГ)`
					: "Ортодонтический приём. Жалобы на скученность зубов и прикус.",
				objectiveStatus: prev.objectiveStatus
					? `${prev.objectiveStatus}\n\n${currentEffectiveProtocolText}`
					: currentEffectiveProtocolText,
				treatmentPlan: prev.treatmentPlan
					? `${prev.treatmentPlan}\n\n[Ортодонтия] Диагностический протокол ТРГ сохранен: ${analysis.diagnosis.skeletalClassRu}.`
					: `Ортодонтическое лечение: протокол ТРГ сохранен (${analysis.diagnosis.skeletalClassRu}), согласование аппаратуры.`,
			}));
		}
	} catch {}

	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						protocolText: currentEffectiveProtocolText,
						title: "Протокол ТРГ (Медицинская карта)",
						soap: { treatmentDescription: currentEffectiveProtocolText },
						mode: "smart_append",
					},
				}),
			);
		} catch {}
	}
}
