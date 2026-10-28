import { useEffect } from "react";
import { generateSoapFromOdontogramFinding } from "../../../lib/clinicalProtocols";
import { useVisitStore, type VisitToothUiState } from "../../../store/visitStore";
import {
	inferProcedureServiceFromStamp,
	toVisitToothUiState,
} from "./toothStateConverters.js";

export function useOdontogramEventsListener(patientId: string | null | undefined): void {
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleOdontogramUpdate = (e: Event) => {
			const detail = (e as CustomEvent<{
				patientId?: string;
				states?: Array<{ toothNumber: number; state: string; surfaces?: string[] }>;
			}>).detail;
			if (!detail || !Array.isArray(detail.states)) return;
			if (detail.patientId && patientId && detail.patientId !== patientId) return;

			const nextStates: Record<string, VisitToothUiState> = {};
			for (const t of detail.states) {
				const uiState = toVisitToothUiState(t.state);
				nextStates[String(t.toothNumber)] = uiState;
				if (uiState !== "idle") {
					const soap = generateSoapFromOdontogramFinding({ toothNumber: t.toothNumber, state: t.state, surfaces: t.surfaces });
					useVisitStore.getState().setVisitToothRecord(String(t.toothNumber), {
						toothNumber: t.toothNumber, state: uiState,
						diagnosis: soap.diagnosisIcd10Label || soap.diagnosisTooth,
						diagnosisIcd10: soap.diagnosisIcd10, treatmentPlan: soap.treatmentDescription,
					});
				} else {
					useVisitStore.getState().clearVisitToothRecord(String(t.toothNumber));
				}
			}
			if (Object.keys(nextStates).length > 0) {
				useVisitStore.getState().setVisitToothStateByCode((prev) => ({ ...prev, ...nextStates }));
			}
		};

		window.addEventListener("dente-odontogram-update", handleOdontogramUpdate);
		return () => { window.removeEventListener("dente-odontogram-update", handleOdontogramUpdate); };
	}, [patientId]);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleSingleToothUpdate = (e: Event) => {
			const detail = (e as CustomEvent<{
				toothNumber: number | string; state: string; surfaces?: string[];
			}>).detail;
			if (!detail?.toothNumber || !detail?.state) return;
			const code = String(detail.toothNumber);
			const num = Number(code);
			const uiState = toVisitToothUiState(detail.state);
			useVisitStore.getState().setToothState(code, uiState);

			if (uiState !== "idle") {
				const soap = generateSoapFromOdontogramFinding({ toothNumber: num, state: detail.state, surfaces: detail.surfaces });
				useVisitStore.getState().setVisitToothRecord(code, {
					toothNumber: num, state: uiState,
					diagnosis: soap.diagnosisIcd10Label || soap.diagnosisTooth,
					diagnosisIcd10: soap.diagnosisIcd10, treatmentPlan: soap.treatmentDescription,
				});

				const matching = inferProcedureServiceFromStamp(detail.state, num);
				if (matching) {
					window.dispatchEvent(
						new CustomEvent("dente-add-services-to-invoice", {
							detail: {
								services: [{
									id: matching.id, name: matching.title, title: matching.title,
									code: matching.code804n, code804n: matching.code804n,
									price: matching.priceRub, priceRub: matching.priceRub,
									toothNumber: num, toothCode: String(num),
								}],
							},
						}),
					);
				}
			} else {
				useVisitStore.getState().clearVisitToothRecord(code);
			}
		};

		window.addEventListener("dente-update-tooth-state", handleSingleToothUpdate);
		return () => { window.removeEventListener("dente-update-tooth-state", handleSingleToothUpdate); };
	}, []);
}
