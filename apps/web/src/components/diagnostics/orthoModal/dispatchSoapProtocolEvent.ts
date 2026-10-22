import type { OrthodonticClinicalPreset } from "../orthodonticPresets";

export function dispatchSoapProtocolEvent(fullProtocolText: string, targetPreset: OrthodonticClinicalPreset) {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent("dente-apply-soap-protocol", {
			detail: {
				protocolText: fullProtocolText,
				title: `Ортодонтия: ${targetPreset.shortLabel}`,
				soap: {
					complaint: targetPreset.complaint,
					objective: fullProtocolText,
					treatmentPlan: targetPreset.treatment,
					recommendations: targetPreset.recommendations,
					diagnosisIcd10: targetPreset.diagnosisRu,
				},
				mode: "smart_append",
				immediate: true,
			},
		}),
	);
}
