/**
 * surgeryDictionary.ts — Клинический словарь хирургической стоматологии и имплантологии.
 */

import type { DiagnosisDefinition } from "../types";

export const SURGERY_DIAGNOSES: DiagnosisDefinition[] = [
	{
		code: "K08.1",
		title: "Потеря зубов вследствие удаления или травмы (Отсутствует)",
		status: "MISSING",
		patterns: [
			"удален",
			"удалён",
			"отсутствует",
			"отсутствующий",
			"удаление",
			"адентия",
			"экстракция",
			"зуб удален",
			"ранее удален",
		],
		confidence: 0.95,
	},
	{
		code: "IMPLANT",
		title: "Дентальный имплантат установлен",
		status: "IMPLANT",
		patterns: [
			"имплантат установлен",
			"имплантат",
			"имплант",
			"имплантант",
			"дентальный имплантат",
			"установка имплантата",
			"имплантация",
		],
		confidence: 0.95,
	},
];
