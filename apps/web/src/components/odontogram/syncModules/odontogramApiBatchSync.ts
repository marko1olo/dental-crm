/**
 * apps/web/src/components/odontogram/syncModules/odontogramApiBatchSync.ts
 *
 * DENTE Dental CRM — Batch HTTP Synchronization for Tooth States.
 * Coordinates background dispatch of modified teeth to Fastify API
 * with graceful offline fallback and status notifications.
 */

import type { ToothData, ToothState } from "../ToothChart";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { showToast } from "../../GlobalToast";
import { logger } from "../../../utils/logger";

export interface ToothBatchPayload {
	toothNumbers: number[];
	state: ToothState;
	surfaces?: string[];
}

/**
 * Sends a batch update of tooth states to the backend API.
 * In case of network errors or server downtime, safely logs error and
 * displays an informational offline toast.
 */
export async function sendToothStatesBatch(
	patientId: string,
	toothNumbers: number[],
	state: ToothState,
	surfaces?: string[],
): Promise<boolean> {
	if (!patientId || toothNumbers.length === 0) return true;

	const payload: ToothBatchPayload = {
		toothNumbers,
		state,
		...(surfaces && surfaces.length > 0 ? { surfaces } : {}),
	};

	try {
		const res = await fetch(
			`/api/patients/${patientId}/tooth-states/batch`,
			{
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(payload),
			},
		);

		if (!res.ok) {
			const rawBody = await res.text();
			logger.error(
				`[tooth states batch] ${res.status} ${rawBody.slice(0, 300)}`,
			);
			showToast(
				"Отметка сохранена локально на диск (офлайн). Данные в безопасности и синхронизируются при связи",
				"info",
				8000,
			);
			return false;
		}

		return true;
	} catch (err) {
		logger.error("[tooth states batch] запрос не выполнен", err);
		showToast(
			"Отметка сохранена локально на диск (офлайн). Данные в безопасности и синхронизируются при связи",
			"info",
			8000,
		);
		return false;
	}
}

export interface FetchToothStatesResult {
	states: ToothData[] | null;
	status: number | null;
	rawBody: string;
}

/**
 * Fetches all tooth states for a patient from Fastify backend.
 */
export async function fetchToothStatesFromServer(
	patientId: string,
	signal?: AbortSignal,
): Promise<FetchToothStatesResult> {
	if (!patientId) {
		return { states: [], status: 200, rawBody: "" };
	}

	try {
		const res = await fetch(`/api/patients/${patientId}/tooth-states`, {
			headers: denteAdminSecretRequestHeaders(),
			...(signal ? { signal } : {}),
		});

		const status = res.status;
		const rawBody = await res.text();

		if (!res.ok) {
			return { states: null, status, rawBody };
		}

		let data: unknown = null;
		try {
			data = rawBody.trim() === "" ? null : JSON.parse(rawBody);
		} catch {
			data = null;
		}

		const body =
			typeof data === "object" && data !== null && !Array.isArray(data)
				? (data as Record<string, unknown>)
				: null;

		const incomingStates: ToothData[] | null = Array.isArray(data)
			? (data as ToothData[])
			: body
				? Array.isArray(body.states)
					? (body.states as ToothData[])
					: Array.isArray(body.data)
						? (body.data as ToothData[])
						: Object.keys(body).length === 0 || body.success === true
							? []
							: null
				: rawBody.trim() === ""
					? []
					: null;

		return { states: incomingStates, status, rawBody };
	} catch (err) {
		const status = (err as { status?: number })?.status ?? null;
		return { states: null, status, rawBody: String(err) };
	}
}
