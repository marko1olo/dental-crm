/**
 * prescriptionSignaValidator.ts — Latin Rx Signa Components & Frequency Validator
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

import type { LatinRxSignaValidationResult } from "./prescriptionMnnTypes";

/**
 * Валидация способа применения и латинской прописи по Приказу 1094н (Rp, Dtd, Signa).
 */
export function validateLatinRxSigna(params: {
	latinRp?: string;
	latinName?: string;
	dispenseLatin?: string;
	dispenseFormula?: string;
	signaRu?: string;
}): LatinRxSignaValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	const rp = (params.latinRp || params.latinName || "").trim();
	const dtd = (params.dispenseLatin || params.dispenseFormula || "").trim();
	const signa = (params.signaRu || "").trim();

	const hasRpPrefix = /^Rp\s*[.:]/i.test(rp);
	if (!hasRpPrefix) {
		errors.push("Латинская часть прописи обязана начинаться с 'Rp.:' (Recipe — Возьми).");
	}

	const hasDispenseDtd = /^D\.?\s*t\.?\s*d\.?/i.test(dtd);
	if (!hasDispenseDtd) {
		errors.push("Указание отпуска препарата обязано содержать формулу 'D.t.d.' (Da tales doses — Выдай такие дозы).");
	}

	const hasSignaPrefix = /^(?:D\.?\s*)?S[.:]?\s*/i.test(signa);
	const cleanedSignaRu = signa.replace(/^(?:D\.?\s*)?S[.:]?\s*/i, "").trim();

	if (!cleanedSignaRu) {
		errors.push("Сигнатура (способ применения) не может быть пустой (Приказ Минздрава РФ № 1094н).");
	}

	if (
		/^(?:известно|внутреннее|наружное|по указанию|по назначению|как обычно|по схеме|по назначению врача|употреблять по указанию|внутрь как обычно)$/i.test(
			cleanedSignaRu,
		) ||
		/по назначению врача/i.test(cleanedSignaRu) ||
		/употреблять по указанию/i.test(cleanedSignaRu) ||
		/по схеме/i.test(cleanedSignaRu) ||
		/^известно$/i.test(cleanedSignaRu) ||
		/^внутреннее$/i.test(cleanedSignaRu) ||
		/^наружное$/i.test(cleanedSignaRu)
	) {
		errors.push(
			"По Приказу № 1094н запрещается ограничиваться неопределенными общими указаниями: «Внутреннее», «Известно», «По схеме», «По назначению врача». Укажите точную дозу, кратность и курс.",
		);
	}

	const hasFrequency =
		/(?:раз[а-я]*\s+в\s+(?:день|сутки)|каждые|утром|вечером|после еды|до еды|во время еды|при болях|ванночки|полоска|анестези)/i.test(
			cleanedSignaRu,
		);
	if (!hasFrequency && cleanedSignaRu.length > 0) {
		warnings.push("В сигнатуре рекомендуется указать кратность приёма или взаимосвязь с приёмом пищи/манипуляцией.");
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		parsedComponents: {
			hasRpPrefix,
			hasDispenseDtd,
			hasSignaPrefix,
			cleanedSignaRu,
		},
	};
}
