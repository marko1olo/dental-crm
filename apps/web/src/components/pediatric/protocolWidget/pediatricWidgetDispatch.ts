import { useVisitStore } from "../../../store/visitStore";
import type { ClinicalCalculationResult } from "./protocolCalculation";
import type { PediatricServiceItem } from "./types";

export function updateVisitNoteStore(textToApply: string) {
	try {
		useVisitStore.getState().setVisitNoteForm((prev) => {
			const existing = prev.objectiveStatus?.trim() || "";
			return {
				...prev,
				objectiveStatus: existing ? `${existing}\n\n${textToApply}` : textToApply,
			};
		});
	} catch (err) {
		console.warn("useVisitStore update fallback:", err);
	}
}

export function dispatchApplySoapProtocol(
	clinicalCalculation: ClinicalCalculationResult,
	currentTooth: number,
	selectedSurfaces: readonly string[],
) {
	try {
		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: {
						diagnosisIcd10: clinicalCalculation.diagnosisIcd10,
						treatmentDescription: clinicalCalculation.treatmentDescription,
						statusLocalis: clinicalCalculation.statusLocalis,
						recommendations: clinicalCalculation.recommendations,
					},
					finding: {
						toothNumber: currentTooth,
						state: clinicalCalculation.toothFindingState,
						surfaces: [...selectedSurfaces],
					},
					mode: "smart_append",
					immediate: true,
				},
			}),
		);
	} catch (err) {
		console.warn("dente-apply-soap-protocol dispatch fallback:", err);
	}
}

export function dispatchAddServicesToInvoice(
	currentTooth: number,
	services: readonly PediatricServiceItem[],
) {
	try {
		window.dispatchEvent(
			new CustomEvent("dente-add-services-to-invoice", {
				detail: { toothNumber: currentTooth, services },
			}),
		);
	} catch (err) {
		console.warn("dente-add-services-to-invoice dispatch fallback:", err);
	}
}
