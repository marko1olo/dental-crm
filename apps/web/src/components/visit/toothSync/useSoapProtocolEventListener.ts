import { useEffect, type MutableRefObject } from "react";
import {
	generateSoapFromOdontogramFinding,
	type ClinicalProtocolSoap,
	type DiaryState,
	type OdontogramFindingInput,
} from "../../../lib/clinicalProtocols";
import {
	mergeMultiToothDiagnoses,
	mergeMultiToothObjective,
	mergeMultiToothTreatmentPlan,
} from "../../../utils/clinicalTextSanitizer";
import { appendClinicalText } from "../emk";
import { useVisitStore } from "../../../store/visitStore";
import { toVisitToothUiState } from "./toothStateConverters.js";

interface UseSoapProtocolEventListenerParams {
	// biome-ignore lint/suspicious/noExplicitAny: dynamic form
	visitNoteFormRef: MutableRefObject<any>;
	updateVisitNoteFieldRef: MutableRefObject<(field: string, value: string) => void>;
}

export function useSoapProtocolEventListener({
	visitNoteFormRef,
	updateVisitNoteFieldRef,
}: UseSoapProtocolEventListenerParams): void {
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleExternalSoapProtocol = (e: Event) => {
			const customEvt = e as CustomEvent<{
				finding?: OdontogramFindingInput;
				soap?: Partial<DiaryState> & { complaint?: string; complaints?: string; diagnosis?: string; objectiveStatus?: string; treatmentPlan?: string; recommendations?: string };
				mode?: string; immediate?: boolean; complaint?: string; complaints?: string; anamnesis?: string; objectiveStatus?: string;
				statusLocalis?: string; diagnosis?: string; diagnosisIcd10?: string; treatmentPlan?: string; treatmentDescription?: string; recommendations?: string;
			}>;
			if (!customEvt.detail) return;
			const detail = customEvt.detail;

			let soapFromFinding: ClinicalProtocolSoap | null = null;
			if (detail.finding) soapFromFinding = generateSoapFromOdontogramFinding(detail.finding);

			const incomingSoap = detail.soap || {};
			const toothNum = detail.finding?.toothNumber;
			const incomingDiag = detail.diagnosis || detail.diagnosisIcd10 || incomingSoap.diagnosis || incomingSoap.diagnosisIcd10 || soapFromFinding?.diagnosisIcd10Label || soapFromFinding?.diagnosisIcd10 || "";
			const incomingObj = detail.objectiveStatus || detail.statusLocalis || incomingSoap.objectiveStatus || incomingSoap.statusLocalis || soapFromFinding?.statusLocalis || "";
			const incomingPlan = detail.treatmentPlan || detail.treatmentDescription || incomingSoap.treatmentPlan || incomingSoap.treatmentDescription || soapFromFinding?.treatmentDescription || "";
			const incomingComplaints = detail.complaint || detail.complaints || incomingSoap.complaint || incomingSoap.complaints || soapFromFinding?.anamnesis || "";
			const incomingAnamnesis = detail.anamnesis || incomingSoap.anamnesis || "";
			const incomingRecs = detail.recommendations || incomingSoap.recommendations || soapFromFinding?.recommendations || "";

			if (incomingDiag) {
				const currentDiag = String(visitNoteFormRef.current?.diagnosis || "");
				updateVisitNoteFieldRef.current("diagnosis", mergeMultiToothDiagnoses(currentDiag, toothNum ? { toothNumber: toothNum, diagnosis: incomingDiag } : incomingDiag));
			}
			if (incomingObj) {
				const currentObj = String(visitNoteFormRef.current?.objectiveStatus || "");
				updateVisitNoteFieldRef.current("objectiveStatus", mergeMultiToothObjective(currentObj, incomingObj, toothNum));
			}
			if (incomingPlan) {
				const currentPlan = String(visitNoteFormRef.current?.treatmentPlan || "");
				updateVisitNoteFieldRef.current("treatmentPlan", mergeMultiToothTreatmentPlan(currentPlan, incomingPlan, toothNum));
			}
			if (incomingComplaints) {
				const currentComp = String(visitNoteFormRef.current?.complaint || visitNoteFormRef.current?.complaints || "").trim();
				if (!currentComp || currentComp.includes("активно не предъявляет")) updateVisitNoteFieldRef.current("complaint", incomingComplaints);
			}
			if (incomingAnamnesis) {
				const currentAnamnesis = String(visitNoteFormRef.current?.anamnesis || "").trim();
				if (!currentAnamnesis || currentAnamnesis.includes("Соматически здоров")) updateVisitNoteFieldRef.current("anamnesis", incomingAnamnesis);
			}
			if (incomingRecs) {
				const currentRecs = String(visitNoteFormRef.current?.recommendations || "");
				updateVisitNoteFieldRef.current("recommendations", appendClinicalText(currentRecs, incomingRecs, "\n"));
			}
			if (toothNum && detail.finding) {
				const icd = detail.finding.icd10Override || soapFromFinding?.diagnosisIcd10;
				useVisitStore.getState().setVisitToothRecord(String(toothNum), {
					toothNumber: toothNum, state: toVisitToothUiState(detail.finding.state),
					diagnosis: incomingDiag, treatmentPlan: incomingPlan, ...(icd ? { diagnosisIcd10: icd } : {}),
				});
			}
		};

		window.addEventListener("dente-apply-soap-protocol", handleExternalSoapProtocol);
		return () => { window.removeEventListener("dente-apply-soap-protocol", handleExternalSoapProtocol); };
	}, [visitNoteFormRef, updateVisitNoteFieldRef]);
}
