/**
 * prostheticsDictionary.ts — Клинический словарь ортопедической стоматологии.
 */

import type { DiagnosisDefinition } from "../types";

export const PROSTHETICS_DIAGNOSES: DiagnosisDefinition[] = [
	{
		code: "CROWN",
		title: "Коронка (диоксид циркония / E.max / металлокерамика)",
		status: "CROWN",
		patterns: [
			"коронка диоксид циркония",
			"коронка цирконий",
			"коронка",
			"металлокерамика",
			"металлокерамическая коронка",
			"циркониевая коронка",
			"e.max",
			"емакс",
			"керамическая коронка",
			"ортопедическая коронка",
		],
		confidence: 0.95,
	},
	{
		code: "INLAY",
		title: "Культевая вкладка / Микропротез",
		status: "INLAY",
		patterns: [
			"культевая вкладка",
			"вкладка",
			"керамическая вкладка",
			"онлей",
			"инлей",
			"оверлей",
		],
		confidence: 0.9,
	},
];
