/**
 * persistenceApi.ts — HTTP API сохранения и загрузки разметки планирования (Мандат 8b <= 120 строк).
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	type CtPlanningMarkup,
	type CtPlanningSaveOutcome,
	type CtPlanningLoadOutcome,
	CT_PLANNING_SAVE_URL,
	ctPlanningLoadUrl,
	ctPlanningMarkupIsEmpty,
} from "./types";
import { ctPlanningSaveBody } from "./geometryParsers";
import { parseCtPlanningMarkup } from "./markupParsers";
import { ctPlanningSaveRefusalText, ctPlanningLoadRefusalText } from "./refusalMessages";

async function jsonBodyOf(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

export async function saveCtPlanningMarkup(
	patientId: string,
	studyInstanceUid: string,
	markup: CtPlanningMarkup,
): Promise<CtPlanningSaveOutcome> {
	if (ctPlanningMarkupIsEmpty(markup)) {
		return {
			status: "refused",
			message: "Разметка пуста: нечего сохранять. Обведите зубную дугу или добавьте имплантат перед сохранением.",
		};
	}

	let response: Response;
	try {
		response = await fetch(CT_PLANNING_SAVE_URL, {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify(ctPlanningSaveBody(patientId, studyInstanceUid, markup)),
		});
	} catch {
		return { status: "refused", message: ctPlanningSaveRefusalText(null, null) };
	}
	if (!response.ok) {
		const body = await jsonBodyOf(response);
		return { status: "refused", message: ctPlanningSaveRefusalText(response.status, body) };
	}
	return { status: "saved" };
}

export async function loadCtPlanningMarkup(
	patientId: string,
	studyInstanceUid: string,
): Promise<CtPlanningLoadOutcome> {
	let response: Response;
	try {
		response = await fetch(ctPlanningLoadUrl(patientId, studyInstanceUid), {
			headers: denteAdminSecretRequestHeaders(),
		});
	} catch {
		return { status: "refused", message: ctPlanningLoadRefusalText(null, null) };
	}
	const body = await jsonBodyOf(response);
	if (!response.ok) {
		return { status: "refused", message: ctPlanningLoadRefusalText(response.status, body) };
	}
	const planning = (body as { planning?: unknown } | null)?.planning ?? null;
	return {
		status: "loaded",
		markup: parseCtPlanningMarkup(planning),
		hadRow: planning !== null,
	};
}
