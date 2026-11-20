/**
 * DENTE Dental CRM — Pediatric SOAP Protocol Dispatch Bridge
 * apps/web/src/components/pediatric/pediatricSoapBridge.ts
 *
 * Dispatches clinical protocols (ICD-10, status localis, treatment description)
 * into active clinical diaries via standard DOM CustomEvent.
 */

export interface PediatricSoapProtocolPayload {
	diagnosisIcd10: string;
	statusLocalis: string;
	treatmentDescription: string;
	summary?: string;
	mode?: string;
}

export function dispatchPediatricSoapProtocol(protocol: PediatricSoapProtocolPayload): boolean {
	try {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							diagnosisIcd10: protocol.diagnosisIcd10,
							statusLocalis: protocol.statusLocalis,
							treatmentDescription: protocol.treatmentDescription,
						},
						immediate: true,
						mode: "smart_append",
					},
				}),
			);
			return true;
		}
	} catch {
		// Ignore if running in non-browser environment
	}
	return false;
}
