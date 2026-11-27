/**
 * apps/web/src/components/patients/formula/formulaSyncService.ts
 *
 * Сервис синхронизации зубной формулы с Fastify API и шиной событий (Мандаты 8e, 8b)
 */

import { generateUuidV7 } from "@dental/shared";
import type { ToothData, ToothState } from "../../odontogram/ToothChart";
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from "../../../lib/denteRequestHeaders";
import {
	generateSoapFromOdontogramFinding,
	type OdontogramFindingInput,
} from "../../../lib/clinicalProtocols";
import { clientLogger } from "../../../services/logging/clientLogger";
import { enqueueOfflineMutation } from "../../../utils/offlineMutationQueue";
import { useVisitStore } from "../../../store/visitStore";

interface PatientToothStateDto {
	toothNumber: number;
	state: ToothState;
	surfaces?: string[] | undefined;
	notes?: string | undefined;
	updatedAt?: string | undefined;
}

export async function fetchPatientToothStates(
	patientId: string,
	signal?: AbortSignal,
): Promise<ToothData[] | null> {
	try {
		const init: RequestInit = { headers: denteClinicalReadHeaders() };
		if (signal) init.signal = signal;
		const res = await fetch(`/api/patients/${patientId}/tooth-states`, init);
		if (!res.ok) return null;
		const data = (await res.json()) as { success?: boolean; states?: PatientToothStateDto[] } | null;
		if (!data?.success || !Array.isArray(data.states) || data.states.length === 0) return null;
		return data.states.map((s: PatientToothStateDto) => ({
			toothNumber: s.toothNumber,
			state: s.state,
			surfaces: Array.isArray(s.surfaces) ? s.surfaces : undefined,
			notes: s.notes || undefined,
			updatedAt: s.updatedAt || undefined,
		}));
	} catch (err) {
		if (!(err instanceof DOMException && err.name === "AbortError")) {
			clientLogger.debug("[formulaSyncService] Failed to fetch tooth states", err, {
				module: "Odontogram",
			});
		}
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
	const idempotencyKey = generateUuidV7();
	const endpoint = `/api/patients/${patientId}/tooth-states/batch`;
	const payload = {
		toothNumbers: targets,
		state: nextState,
		surfaces: nextSurfaces && nextSurfaces.length > 0 ? nextSurfaces : undefined,
		updatedAt: nowIso,
	};
	try {
		const res = await fetch(endpoint, {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": idempotencyKey,
			}),
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			if (res.status >= 500 || res.status === 429 || res.status === 408) {
				await enqueueOfflineMutation({
					entityType: "odontogram_state",
					entityId: patientId,
					action: "update",
					endpoint,
					idempotencyKey,
					payload,
				});
			}
			clientLogger.warn(
				`[formulaSyncService] Tooth batch sync failed with HTTP ${res.status}`,
				{ patientId, status: res.status },
				{ module: "Odontogram" },
			);
		}
	} catch (err) {
		clientLogger.warn(
			"[formulaSyncService] Network failure saving tooth states batch; enqueuing offline outbox",
			err,
			{ module: "Odontogram" },
		);
		await enqueueOfflineMutation({
			entityType: "odontogram_state",
			entityId: patientId,
			action: "update",
			endpoint,
			idempotencyKey,
			payload,
		});
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

	const singleTarget = targets[0];
	if (targets.length === 1 && singleTarget !== undefined && onApplyFindingToDiary) {
		onApplyFindingToDiary(singleTarget, nextState, nextSurfaces);
	}
}
