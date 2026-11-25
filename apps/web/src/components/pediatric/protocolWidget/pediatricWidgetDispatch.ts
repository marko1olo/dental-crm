import { useVisitStore } from "../../../store/visitStore";
import { clientLogger } from "../../../services/logging/clientLogger";
import type { ClinicalCalculationResult } from "./protocolCalculation";
import type { PediatricServiceItem } from "./types";

let lastDispatchedSoapSignature = "";
let lastDispatchedSoapTimestamp = 0;

export function updateVisitNoteStore(textToApply: string) {
	try {
		const cleanText = textToApply.trim();
		if (!cleanText) return;

		useVisitStore.getState().setVisitNoteForm((prev) => {
			const existing = prev.objectiveStatus?.trim() || "";
			if (existing.includes(cleanText)) {
				return prev;
			}
			return {
				...prev,
				objectiveStatus: existing ? `${existing}\n\n${cleanText}` : cleanText,
			};
		});
	} catch (err) {
		clientLogger.warn("useVisitStore update fallback", err, { module: "pediatricWidgetDispatch" });
	}
}

export function dispatchApplySoapProtocol(
	clinicalCalculation: ClinicalCalculationResult,
	currentTooth: number,
	selectedSurfaces: readonly string[],
) {
	try {
		const surfacesKey = [...selectedSurfaces].sort().join(",");
		const signature = `${currentTooth}:${clinicalCalculation.diagnosisIcd10 || ""}:${clinicalCalculation.treatmentDescription || ""}:${surfacesKey}`;
		const now = Date.now();
		if (signature === lastDispatchedSoapSignature && now - lastDispatchedSoapTimestamp < 1200) {
			return; // Suppress duplicate event within idempotency window
		}
		lastDispatchedSoapSignature = signature;
		lastDispatchedSoapTimestamp = now;

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
					origin: "pediatric-protocol-widget",
				},
			}),
		);
	} catch (err) {
		clientLogger.warn("dente-apply-soap-protocol dispatch fallback", err, { module: "pediatricWidgetDispatch" });
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
		clientLogger.warn("dente-add-services-to-invoice dispatch fallback", err, { module: "pediatricWidgetDispatch" });
	}
}
