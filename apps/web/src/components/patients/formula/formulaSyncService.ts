/**
 * apps/web/src/components/patients/formula/formulaSyncService.ts
 *
 * Сервис синхронизации зубной формулы с Fastify API и шиной событий (Мандаты 8e, 8b)
 */

import type { ToothData, ToothState } from "../../odontogram/ToothChart";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	generateSoapFromOdontogramFinding,
	type OdontogramFindingInput,
} from "../../../lib/clinicalProtocols";
import { useVisitStore } from "../../../store/visitStore";

export async function fetchPatientToothStates(
	patientId: string,
	signal?: AbortSignal,
): Promise<ToothData[] | null> {
	try {
		const init: RequestInit = { headers: denteAdminSecretRequestHeaders() };
		if (signal) init.signal = signal;
		const res = await fetch(`/api/patients/${patientId}/tooth-states`, init);
		if (!res.ok) return null;
		const data = await res.json();
		if (!data?.success || !Array.isArray(data.states) || data.states.length === 0) return null;
		return data.states.map((s: any) => ({
			toothNumber: s.toothNumber,
			state: s.state as ToothState,
			surfaces: Array.isArray(s.surfaces) ? s.surfaces : undefined,
			notes: s.notes || undefined,
			updatedAt: s.updatedAt || undefined,
		}));
	} catch {
		return null;
	}
}

export async function savePatientToothStatesBatch(
	patientId: string,
	targets: readonly number[],
	nextState: ToothState,
	nextSurfaces: readonly string[] | undefined,
	nowIso: string,
): Promise<void> {
	try {
		await fetch(`/api/patients/${patientId}/tooth-states/batch`, {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({
				toothNumbers: targets,
				state: nextState,
				surfaces: nextSurfaces && nextSurfaces.length > 0 ? nextSurfaces : undefined,
				updatedAt: nowIso,
			}),
		});
	} catch {
		// Non-blocking: local cache preserves state
	}
}

export function broadcastToothEvents(
	patientId: string,
	updated: readonly ToothData[],
	targets: readonly number[],
	nextState: ToothState,
	nextSurfaces?: readonly string[] | undefined,
	onApplyFindingToDiary?: ((toothNumber: number, state: ToothState, surfaces?: readonly string[]) => void) | undefined,
): void {
	if (typeof window === "undefined") return;

	window.dispatchEvent(
		new CustomEvent("dente-odontogram-update", {
			detail: { patientId, teethData: updated, updatedToothNumbers: targets, state: nextState, surfaces: nextSurfaces },
		}),
	);

	const normState = String(nextState || "").toLowerCase();
	if (normState !== "healthy" && normState !== "" && normState !== "0") {
		for (const num of targets) {
			const finding: OdontogramFindingInput = {
				toothNumber: num,
				state: nextState,
				surfaces: nextSurfaces && nextSurfaces.length > 0 ? nextSurfaces : undefined,
			};
			const soap = generateSoapFromOdontogramFinding(finding);
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: { finding, soap, mode: "smart_append", immediate: true },
				}),
			);
			const uiState = normState.includes("missing") || normState.includes("extract") ? "missing" : "treatment";
			useVisitStore.getState().setVisitToothRecord(String(num), {
				toothNumber: num,
				state: uiState,
				diagnosis: soap.diagnosisIcd10Label || soap.diagnosisTooth,
				diagnosisIcd10: soap.diagnosisIcd10,
				treatmentPlan: soap.treatmentDescription,
			});
		}
	}

	if (targets.length === 1 && onApplyFindingToDiary) {
		onApplyFindingToDiary(targets[0]!, nextState, nextSurfaces);
	}
}
