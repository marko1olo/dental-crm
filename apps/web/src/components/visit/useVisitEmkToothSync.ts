/**
 * apps/web/src/components/visit/useVisitEmkToothSync.ts
 *
 * Real end-to-end clinical data flow: Odontogram -> Form 043/u EMK Diary.
 * - Listens for 'dente-apply-soap-protocol' CustomEvents from tooth actions, radial menu, and odontogram.
 * - Automatically enriches diagnosis, objective status (status localis), and treatment plan using
 *   clinical text sanitizers (mergeMultiToothDiagnoses, mergeMultiToothObjective, mergeMultiToothTreatmentPlan).
 * - Hydrates unpopulated visit notes from patient's stored odontogram teeth on initial mount / patient switch.
 * - Updates useVisitStore tooth records synchronously.
 * - Mandates 8e, 8k, 8n (Zero Mocks, Real Patient Teeth, Doctor Autonomy).
 */

import { useEffect, useRef } from "react";
import {
	generateSoapFromOdontogramFinding,
	generateSoapFromOdontogramStates,
	type OdontogramFindingInput,
	type ClinicalProtocolSoap,
	type DiaryState,
} from "../../lib/clinicalProtocols043";
import {
	mergeMultiToothDiagnoses,
	mergeMultiToothObjective,
	mergeMultiToothTreatmentPlan,
} from "../../utils/clinicalTextSanitizer";
import { appendClinicalText } from "./emk";
import { useVisitStore, type VisitToothUiState } from "../../store/visitStore";
import { loadStoredTeethData } from "../odontogram/odontogramStorage";

function toVisitToothUiState(state: string): VisitToothUiState {
	const s = String(state || "").toLowerCase();
	if (s.includes("missing") || s.includes("extract")) return "missing";
	if (s.includes("watch")) return "watch";
	if (s.includes("planned")) return "planned";
	if (s.includes("done") || s === "healthy") return "done";
	return "treatment";
}

export interface UseVisitEmkToothSyncParams {
	readonly patientId: string | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: visitNoteForm is dynamic
	readonly visitNoteForm: any;
	readonly updateVisitNoteField: (field: string, value: string) => void;
}

export function useVisitEmkToothSync({
	patientId,
	visitNoteForm,
	updateVisitNoteField,
}: UseVisitEmkToothSyncParams): void {
	const lastHydratedPatientRef = useRef<string | null>(null);

	// 1. Initial hydration from patient's stored odontogram teeth (if diary has no custom pathologies)
	useEffect(() => {
		if (!patientId || lastHydratedPatientRef.current === patientId) return;

		const storedTeeth = loadStoredTeethData(patientId);
		if (!storedTeeth || storedTeeth.length === 0) {
			lastHydratedPatientRef.current = patientId;
			return;
		}

		const diseasedTeeth = storedTeeth.filter((t) => {
			const s = String(t.state || "").toLowerCase();
			return s !== "healthy" && s !== "" && s !== "0";
		});

		if (diseasedTeeth.length === 0) {
			lastHydratedPatientRef.current = patientId;
			return;
		}

		const currentDiag = String(visitNoteForm?.diagnosis || "").trim();
		const isDiagBlankOrNorm =
			!currentDiag ||
			currentDiag === "Z01.2" ||
			currentDiag.includes("патологий не выявлено") ||
			currentDiag.includes("Осмотр полости рта, патологий не выявлено");

		if (isDiagBlankOrNorm) {
			const generated = generateSoapFromOdontogramStates(
				diseasedTeeth.map((dt) => ({
					toothNumber: dt.toothNumber,
					state: dt.state,
					surfaces: dt.surfaces ? [...dt.surfaces] : undefined,
				})),
			);
			if (generated.diagnosisIcd10) {
				updateVisitNoteField("diagnosis", generated.diagnosisIcd10);
			}
			if (generated.statusLocalis) {
				const currentObj = String(visitNoteForm?.objectiveStatus || "");
				updateVisitNoteField(
					"objectiveStatus",
					mergeMultiToothObjective(currentObj, generated.statusLocalis),
				);
			}
			if (generated.treatmentDescription) {
				const currentPlan = String(visitNoteForm?.treatmentPlan || "");
				updateVisitNoteField(
					"treatmentPlan",
					mergeMultiToothTreatmentPlan(currentPlan, generated.treatmentDescription),
				);
			}
			if (generated.anamnesis) {
				const currentComp = String(
					visitNoteForm?.complaint || visitNoteForm?.complaints || "",
				).trim();
				if (!currentComp || currentComp.includes("активно не предъявляет")) {
					updateVisitNoteField("complaint", generated.anamnesis);
				}
			}

			// Synchronize structured tooth records in useVisitStore
			for (const dt of diseasedTeeth) {
				const soap = generateSoapFromOdontogramFinding({
					toothNumber: dt.toothNumber,
					state: dt.state,
					surfaces: dt.surfaces,
				});
				useVisitStore.getState().setVisitToothRecord(String(dt.toothNumber), {
					toothNumber: dt.toothNumber,
					state: toVisitToothUiState(dt.state),
					diagnosis: soap.diagnosisIcd10Label || soap.diagnosisTooth,
					diagnosisIcd10: soap.diagnosisIcd10,
					treatmentPlan: soap.treatmentDescription,
				});
			}
		}

		lastHydratedPatientRef.current = patientId;
	}, [patientId, visitNoteForm, updateVisitNoteField]);

	// 2. Global event listener for 'dente-apply-soap-protocol'
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleExternalSoapProtocol = (e: Event) => {
			const customEvt = e as CustomEvent<{
				finding?: OdontogramFindingInput;
				soap?: Partial<DiaryState> & {
					complaint?: string;
					complaints?: string;
					diagnosis?: string;
					objectiveStatus?: string;
					treatmentPlan?: string;
					recommendations?: string;
				};
				mode?: string;
				immediate?: boolean;
				complaint?: string;
				complaints?: string;
				anamnesis?: string;
				objectiveStatus?: string;
				statusLocalis?: string;
				diagnosis?: string;
				diagnosisIcd10?: string;
				treatmentPlan?: string;
				treatmentDescription?: string;
				recommendations?: string;
			}>;

			if (!customEvt.detail) return;
			const detail = customEvt.detail;

			let soapFromFinding: ClinicalProtocolSoap | null = null;
			if (detail.finding) {
				soapFromFinding = generateSoapFromOdontogramFinding(detail.finding);
			}

			const incomingSoap = detail.soap || {};
			const toothNum = detail.finding?.toothNumber;

			const incomingDiag =
				detail.diagnosis ||
				detail.diagnosisIcd10 ||
				incomingSoap.diagnosis ||
				incomingSoap.diagnosisIcd10 ||
				soapFromFinding?.diagnosisIcd10Label ||
				soapFromFinding?.diagnosisIcd10 ||
				"";

			const incomingObj =
				detail.objectiveStatus ||
				detail.statusLocalis ||
				incomingSoap.objectiveStatus ||
				incomingSoap.statusLocalis ||
				soapFromFinding?.statusLocalis ||
				"";

			const incomingPlan =
				detail.treatmentPlan ||
				detail.treatmentDescription ||
				incomingSoap.treatmentPlan ||
				incomingSoap.treatmentDescription ||
				soapFromFinding?.treatmentDescription ||
				"";

			const incomingComplaints =
				detail.complaint ||
				detail.complaints ||
				incomingSoap.complaint ||
				incomingSoap.complaints ||
				soapFromFinding?.anamnesis ||
				"";

			const incomingAnamnesis = detail.anamnesis || incomingSoap.anamnesis || "";
			const incomingRecs =
				detail.recommendations ||
				incomingSoap.recommendations ||
				soapFromFinding?.recommendations ||
				"";

			if (incomingDiag) {
				const currentDiag = String(visitNoteForm?.diagnosis || "");
				const mergedDiag = mergeMultiToothDiagnoses(
					currentDiag,
					toothNum ? { toothNumber: toothNum, diagnosis: incomingDiag } : incomingDiag,
				);
				updateVisitNoteField("diagnosis", mergedDiag);
			}

			if (incomingObj) {
				const currentObj = String(visitNoteForm?.objectiveStatus || "");
				const mergedObj = mergeMultiToothObjective(currentObj, incomingObj, toothNum);
				updateVisitNoteField("objectiveStatus", mergedObj);
			}

			if (incomingPlan) {
				const currentPlan = String(visitNoteForm?.treatmentPlan || "");
				const mergedPlan = mergeMultiToothTreatmentPlan(currentPlan, incomingPlan, toothNum);
				updateVisitNoteField("treatmentPlan", mergedPlan);
			}

			if (incomingComplaints) {
				const currentComp = String(
					visitNoteForm?.complaint || visitNoteForm?.complaints || "",
				).trim();
				if (!currentComp || currentComp.includes("активно не предъявляет")) {
					updateVisitNoteField("complaint", incomingComplaints);
				}
			}

			if (incomingAnamnesis) {
				const currentAnamnesis = String(visitNoteForm?.anamnesis || "").trim();
				if (!currentAnamnesis || currentAnamnesis.includes("Соматически здоров")) {
					updateVisitNoteField("anamnesis", incomingAnamnesis);
				}
			}

			if (incomingRecs) {
				const currentRecs = String(visitNoteForm?.recommendations || "");
				updateVisitNoteField(
					"recommendations",
					appendClinicalText(currentRecs, incomingRecs, "\n"),
				);
			}

			if (toothNum && detail.finding) {
				const icd = detail.finding.icd10Override || soapFromFinding?.diagnosisIcd10;
				useVisitStore.getState().setVisitToothRecord(String(toothNum), {
					toothNumber: toothNum,
					state: toVisitToothUiState(detail.finding.state),
					diagnosis: incomingDiag,
					treatmentPlan: incomingPlan,
					...(icd ? { diagnosisIcd10: icd } : {}),
				});
			}
		};

		window.addEventListener("dente-apply-soap-protocol", handleExternalSoapProtocol);
		return () => {
			window.removeEventListener("dente-apply-soap-protocol", handleExternalSoapProtocol);
		};
	}, [visitNoteForm, updateVisitNoteField]);
}
