/**
 * apps/web/src/components/visit/useVisitEmkToothSync.ts
 *
 * Real end-to-end clinical data flow: Odontogram -> Form 043/u EMK Diary.
 * - Listens for 'dente-apply-soap-protocol' CustomEvents from tooth actions, radial menu, and odontogram.
 * - Listens for 'dente-odontogram-update' and 'dente-update-tooth-state' CustomEvents for bidirectional
 *   synchronization between OdontogramModule (VisitOdontogramTab) and VisitEmbeddedOdontogram (VisitEmkTab).
 * - Automatically enriches diagnosis, objective status (status localis), and treatment plan using
 *   clinical text sanitizers (mergeMultiToothDiagnoses, mergeMultiToothObjective, mergeMultiToothTreatmentPlan).
 * - Hydrates unpopulated visit notes from patient's stored odontogram teeth on initial mount / patient switch.
 * - Always populates useVisitStore tooth records and visitToothStateByCode synchronously.
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
import {
	loadStoredTeethData,
	saveStoredTeethData,
} from "../odontogram/odontogramStorage";
import type { ToothData } from "../odontogram/ToothChart";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";

/**
 * Converts canonical tooth defect state (from OdontogramModule / ToothChart)
 * to reactive VisitToothUiState for embedded odontogram display.
 */
export function toVisitToothUiState(state: string): VisitToothUiState {
	const s = String(state || "").trim().toLowerCase();
	if (!s || s === "healthy" || s === "idle" || s === "0") return "idle";
	if (s.includes("missing") || s.includes("extract") || s.includes("edentul")) return "missing";
	if (s.includes("caries")) return "caries";
	if (s.includes("pulpitis") || s.includes("pulp")) return "pulpitis";
	if (s.includes("periodontitis") || s.includes("perio") || s.includes("treatment")) return "treatment";
	if (
		s.includes("crown") ||
		s.includes("bridge") ||
		s.includes("inlay") ||
		s.includes("onlay") ||
		s.includes("veneer")
	)
		return "crown";
	if (s.includes("done") || s.includes("fill") || s.includes("restor")) return "done";
	if (s.includes("watch")) return "watch";
	if (s.includes("planned")) return "planned";
	return "treatment";
}

/**
 * Converts visit UI state / stamp to canonical ToothState for persistent storage and OdontogramModule.
 */
export function toOdontogramToothState(visitState: string): string {
	const s = String(visitState || "").trim().toLowerCase();
	if (!s || s === "idle" || s === "healthy") return "Healthy";
	if (s === "caries") return "Caries";
	if (s === "pulpitis") return "Pulpitis";
	if (s === "treatment" || s.includes("perio")) return "Periodontitis";
	if (s === "done" || s.includes("fill")) return "Filled";
	if (s === "crown") return "Crown";
	if (s === "missing") return "Missing";
	if (s === "watch") return "Watch";
	if (s === "planned") return "Planned_Implant";
	return "Healthy";
}

export {
	infer804nServiceFromStamp,
	type Inferred804nService,
} from "./infer804nService";
import { infer804nServiceFromStamp } from "./infer804nService";

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
	const visitNoteFormRef = useRef(visitNoteForm);
	visitNoteFormRef.current = visitNoteForm;
	const updateVisitNoteFieldRef = useRef(updateVisitNoteField);
	updateVisitNoteFieldRef.current = updateVisitNoteField;

	// 1. Initial hydration from patient's stored odontogram teeth (always syncs visitToothStateByCode)
	useEffect(() => {
		if (!patientId || lastHydratedPatientRef.current === patientId) return;
		lastHydratedPatientRef.current = patientId;

		const syncStateMap = (teeth: readonly ToothData[]) => {
			const stateMap: Record<string, VisitToothUiState> = {};
			for (const t of teeth) {
				const uiState = toVisitToothUiState(t.state);
				if (uiState !== "idle") {
					stateMap[String(t.toothNumber)] = uiState;
				}
			}
			if (Object.keys(stateMap).length > 0) {
				useVisitStore.getState().setVisitToothStateByCode((prev) => ({
					...prev,
					...stateMap,
				}));
			}

			const diseasedTeeth = teeth.filter((t) => {
				const s = String(t.state || "").toLowerCase();
				return s !== "healthy" && s !== "" && s !== "0";
			});

			if (diseasedTeeth.length === 0) return;

			// Always populate structured records in useVisitStore
			for (const dt of diseasedTeeth) {
				const soap = generateSoapFromOdontogramFinding({
					toothNumber: dt.toothNumber,
					state: dt.state,
					surfaces: dt.surfaces ? [...dt.surfaces] : undefined,
				});
				useVisitStore.getState().setVisitToothRecord(String(dt.toothNumber), {
					toothNumber: dt.toothNumber,
					state: toVisitToothUiState(dt.state),
					diagnosis: soap.diagnosisIcd10Label || soap.diagnosisTooth,
					diagnosisIcd10: soap.diagnosisIcd10,
					treatmentPlan: soap.treatmentDescription,
				});
			}

			const currentDiag = String(visitNoteFormRef.current?.diagnosis || "").trim();
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
					updateVisitNoteFieldRef.current("diagnosis", generated.diagnosisIcd10);
				}
				if (generated.statusLocalis) {
					const currentObj = String(visitNoteFormRef.current?.objectiveStatus || "");
					updateVisitNoteFieldRef.current(
						"objectiveStatus",
						mergeMultiToothObjective(currentObj, generated.statusLocalis),
					);
				}
				if (generated.treatmentDescription) {
					const currentPlan = String(visitNoteFormRef.current?.treatmentPlan || "");
					updateVisitNoteFieldRef.current(
						"treatmentPlan",
						mergeMultiToothTreatmentPlan(currentPlan, generated.treatmentDescription),
					);
				}
				if (generated.anamnesis) {
					const currentComp = String(
						visitNoteFormRef.current?.complaint || visitNoteFormRef.current?.complaints || "",
					).trim();
					if (!currentComp || currentComp.includes("активно не предъявляет")) {
						updateVisitNoteFieldRef.current("complaint", generated.anamnesis);
					}
				}
			}
		};

		const storedTeeth = loadStoredTeethData(patientId);
		if (storedTeeth && storedTeeth.length > 0) {
			syncStateMap(storedTeeth);
			lastHydratedPatientRef.current = patientId;
		} else {
			// Asynchronous load from server API if local cache is cold
			const controller = new AbortController();
			fetch(`/api/patients/${patientId}/tooth-states`, {
				headers: denteAdminSecretRequestHeaders(),
				signal: controller.signal,
			})
				.then(async (res) => {
					if (!res.ok) return;
					const data = (await res.json().catch(() => null)) as {
						success?: boolean;
						states?: ToothData[];
					} | null;
					if (data?.success && Array.isArray(data.states) && data.states.length > 0) {
						saveStoredTeethData(patientId, data.states);
						syncStateMap(data.states);
					}
				})
				.catch(() => {
					// Safe ignore
				})
				.finally(() => {
					lastHydratedPatientRef.current = patientId;
				});

			return () => {
				controller.abort();
			};
		}
	}, [patientId]);

	// 2. Global event listener for 'dente-odontogram-update' (OdontogramModule <-> VisitEmbeddedOdontogram sync)
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleOdontogramUpdate = (e: Event) => {
			const detail = (
				e as CustomEvent<{
					patientId?: string;
					states?: Array<{
						toothNumber: number;
						state: string;
						surfaces?: string[];
					}>;
				}>
			).detail;

			if (!detail || !Array.isArray(detail.states)) return;
			if (detail.patientId && patientId && detail.patientId !== patientId) return;

			const nextStates: Record<string, VisitToothUiState> = {};
			for (const t of detail.states) {
				const uiState = toVisitToothUiState(t.state);
				nextStates[String(t.toothNumber)] = uiState;
				if (uiState !== "idle") {
					const soap = generateSoapFromOdontogramFinding({
						toothNumber: t.toothNumber,
						state: t.state,
						surfaces: t.surfaces,
					});
					useVisitStore.getState().setVisitToothRecord(String(t.toothNumber), {
						toothNumber: t.toothNumber,
						state: uiState,
						diagnosis: soap.diagnosisIcd10Label || soap.diagnosisTooth,
						diagnosisIcd10: soap.diagnosisIcd10,
						treatmentPlan: soap.treatmentDescription,
					});
				}
			}

			if (Object.keys(nextStates).length > 0) {
				useVisitStore.getState().setVisitToothStateByCode((prev) => ({
					...prev,
					...nextStates,
				}));
			}
		};

		window.addEventListener("dente-odontogram-update", handleOdontogramUpdate);
		return () => {
			window.removeEventListener("dente-odontogram-update", handleOdontogramUpdate);
		};
	}, [patientId]);

	// 3. Single tooth update event listener ('dente-update-tooth-state')
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleSingleToothUpdate = (e: Event) => {
			const detail = (
				e as CustomEvent<{
					toothNumber: number | string;
					state: string;
					surfaces?: string[];
				}>
			).detail;

			if (!detail?.toothNumber || !detail?.state) return;
			const code = String(detail.toothNumber);
			const num = Number(code);
			const uiState = toVisitToothUiState(detail.state);
			useVisitStore.getState().setToothState(code, uiState);

			if (uiState !== "idle") {
				const soap = generateSoapFromOdontogramFinding({
					toothNumber: num,
					state: detail.state,
					surfaces: detail.surfaces,
				});
				useVisitStore.getState().setVisitToothRecord(code, {
					toothNumber: num,
					state: uiState,
					diagnosis: soap.diagnosisIcd10Label || soap.diagnosisTooth,
					diagnosisIcd10: soap.diagnosisIcd10,
					treatmentPlan: soap.treatmentDescription,
				});

				const matchingService = infer804nServiceFromStamp(detail.state, num);
				if (matchingService) {
					window.dispatchEvent(
						new CustomEvent("dente-add-services-to-invoice", {
							detail: {
								services: [
									{
										id: matchingService.id,
										name: matchingService.title,
										title: matchingService.title,
										code: matchingService.code804n,
										code804n: matchingService.code804n,
										price: matchingService.priceRub,
										priceRub: matchingService.priceRub,
										toothNumber: num,
										toothCode: String(num),
									},
								],
							},
						}),
					);
				}
			}
		};

		window.addEventListener("dente-update-tooth-state", handleSingleToothUpdate);
		return () => {
			window.removeEventListener("dente-update-tooth-state", handleSingleToothUpdate);
		};
	}, []);

	// 4. Global event listener for 'dente-apply-soap-protocol'
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
				const currentDiag = String(visitNoteFormRef.current?.diagnosis || "");
				const mergedDiag = mergeMultiToothDiagnoses(
					currentDiag,
					toothNum ? { toothNumber: toothNum, diagnosis: incomingDiag } : incomingDiag,
				);
				updateVisitNoteFieldRef.current("diagnosis", mergedDiag);
			}

			if (incomingObj) {
				const currentObj = String(visitNoteFormRef.current?.objectiveStatus || "");
				const mergedObj = mergeMultiToothObjective(currentObj, incomingObj, toothNum);
				updateVisitNoteFieldRef.current("objectiveStatus", mergedObj);
			}

			if (incomingPlan) {
				const currentPlan = String(visitNoteFormRef.current?.treatmentPlan || "");
				const mergedPlan = mergeMultiToothTreatmentPlan(currentPlan, incomingPlan, toothNum);
				updateVisitNoteFieldRef.current("treatmentPlan", mergedPlan);
			}

			if (incomingComplaints) {
				const currentComp = String(
					visitNoteFormRef.current?.complaint || visitNoteFormRef.current?.complaints || "",
				).trim();
				if (!currentComp || currentComp.includes("активно не предъявляет")) {
					updateVisitNoteFieldRef.current("complaint", incomingComplaints);
				}
			}

			if (incomingAnamnesis) {
				const currentAnamnesis = String(visitNoteFormRef.current?.anamnesis || "").trim();
				if (!currentAnamnesis || currentAnamnesis.includes("Соматически здоров")) {
					updateVisitNoteFieldRef.current("anamnesis", incomingAnamnesis);
				}
			}

			if (incomingRecs) {
				const currentRecs = String(visitNoteFormRef.current?.recommendations || "");
				updateVisitNoteFieldRef.current(
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
	}, []);
}
