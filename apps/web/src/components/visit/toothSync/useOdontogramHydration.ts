import { useEffect, useRef, type MutableRefObject } from "react";
import {
	generateSoapFromOdontogramFinding,
	generateSoapFromOdontogramStates,
} from "../../../lib/clinicalProtocols";
import {
	mergeMultiToothObjective,
	mergeMultiToothTreatmentPlan,
} from "../../../utils/clinicalTextSanitizer";
import { useVisitStore, type VisitToothUiState } from "../../../store/visitStore";
import {
	loadStoredTeethData,
	saveStoredTeethData,
} from "../../odontogram/odontogramStorage";
import type { ToothData } from "../../odontogram/ToothChart";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { toVisitToothUiState } from "./toothStateConverters.js";

interface UseOdontogramHydrationParams {
	patientId: string | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: dynamic form
	visitNoteFormRef: MutableRefObject<any>;
	updateVisitNoteFieldRef: MutableRefObject<(field: string, value: string) => void>;
}

export function useOdontogramHydration({
	patientId,
	visitNoteFormRef,
	updateVisitNoteFieldRef,
}: UseOdontogramHydrationParams): void {
	const lastHydratedPatientRef = useRef<string | null>(null);

	useEffect(() => {
		if (!patientId || lastHydratedPatientRef.current === patientId) return;
		const previousPatientId = lastHydratedPatientRef.current;
		lastHydratedPatientRef.current = patientId;
		if (previousPatientId !== null && previousPatientId !== patientId) {
			useVisitStore.getState().resetVisitToothState();
			useVisitStore.getState().setCompletedServices([]);
		}

		const syncStateMap = (teeth: readonly ToothData[]) => {
			const stateMap: Record<string, VisitToothUiState> = {};
			for (const t of teeth) {
				const uiState = toVisitToothUiState(t.state);
				if (uiState !== "idle") stateMap[String(t.toothNumber)] = uiState;
			}
			useVisitStore.getState().setVisitToothStateByCode((prev) =>
				previousPatientId !== null && previousPatientId !== patientId ? stateMap : { ...prev, ...stateMap },
			);

			const diseasedTeeth = teeth.filter((t) => {
				const s = String(t.state || "").toLowerCase();
				return s !== "healthy" && s !== "" && s !== "0";
			});
			if (diseasedTeeth.length === 0) return;

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
				!currentDiag || currentDiag === "Z01.2" || currentDiag.includes("патологий не выявлено") || currentDiag.includes("Осмотр полости рта, патологий не выявлено");

			if (isDiagBlankOrNorm) {
				const gen = generateSoapFromOdontogramStates(
					diseasedTeeth.map((dt) => ({ toothNumber: dt.toothNumber, state: dt.state, surfaces: dt.surfaces ? [...dt.surfaces] : undefined })),
				);
				if (gen.diagnosisIcd10) updateVisitNoteFieldRef.current("diagnosis", gen.diagnosisIcd10);
				if (gen.statusLocalis) {
					const curObj = String(visitNoteFormRef.current?.objectiveStatus || "");
					updateVisitNoteFieldRef.current("objectiveStatus", mergeMultiToothObjective(curObj, gen.statusLocalis));
				}
				if (gen.treatmentDescription) {
					const curPlan = String(visitNoteFormRef.current?.treatmentPlan || "");
					updateVisitNoteFieldRef.current("treatmentPlan", mergeMultiToothTreatmentPlan(curPlan, gen.treatmentDescription));
				}
				if (gen.anamnesis) {
					const curComp = String(visitNoteFormRef.current?.complaint || visitNoteFormRef.current?.complaints || "").trim();
					if (!curComp || curComp.includes("активно не предъявляет")) updateVisitNoteFieldRef.current("complaint", gen.anamnesis);
				}
			}
		};

		const storedTeeth = loadStoredTeethData(patientId);
		if (storedTeeth && storedTeeth.length > 0) {
			syncStateMap(storedTeeth);
			lastHydratedPatientRef.current = patientId;
		} else {
			const controller = new AbortController();
			fetch(`/api/patients/${patientId}/tooth-states`, { headers: denteAdminSecretRequestHeaders(), signal: controller.signal })
				.then(async (res) => {
					if (!res.ok) return;
					const data = (await res.json().catch(() => null)) as { success?: boolean; states?: ToothData[] } | null;
					if (data?.success && Array.isArray(data.states) && data.states.length > 0) {
						saveStoredTeethData(patientId, data.states);
						syncStateMap(data.states);
					}
				})
				.catch(() => {})
				.finally(() => { lastHydratedPatientRef.current = patientId; });
			return () => { controller.abort(); };
		}
	}, [patientId, visitNoteFormRef, updateVisitNoteFieldRef]);
}
