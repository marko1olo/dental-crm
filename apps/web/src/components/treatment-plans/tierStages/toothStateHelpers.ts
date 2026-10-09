/**
 * toothStateHelpers.ts — Layer 1: Функции нормализации состояния зуба и выявления дефектов.
 */

import type { ToothData, ToothState } from "../../odontogram/ToothChart";

export function normalizeToothState(state: unknown): ToothState {
	if (!state || typeof state !== "string") return "Healthy";
	const trimmed = state.trim().toLowerCase();
	switch (trimmed) {
		case "caries":
		case "кариес":
			return "Caries";
		case "pulpitis":
		case "пульпит":
			return "Pulpitis";
		case "periodontitis":
		case "периодонтит":
			return "Periodontitis";
		case "missing":
		case "отсутствует":
		case "удален":
		case "удалён":
			return "Missing";
		case "crown":
		case "коронка":
			return "Crown";
		case "implant":
		case "имплант":
		case "имплантат":
			return "Implant";
		case "root":
		case "корень":
			return "Root";
		case "impacted":
		case "retained":
		case "дистопирован":
		case "дистопия":
		case "ретинирован":
		case "ретенция":
			return "Retained";
		case "filled":
		case "пломба":
			return "Filled";
		default:
			return "Healthy";
	}
}

export function hasToothDefect(t: ToothData): boolean {
	const normState = normalizeToothState(t.state);
	if (normState !== "Healthy" && normState !== "Filled") return true;
	if (Boolean(t.boneLossLevel && t.boneLossLevel > 0)) return true;
	if (Boolean(t.mobility && t.mobility > 0)) return true;
	if (Boolean(t.furcationGrade && t.furcationGrade > 0)) return true;
	return false;
}
