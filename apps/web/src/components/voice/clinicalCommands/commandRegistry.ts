/**
 * commandRegistry.ts — Главный диспетчер и конвейер разбора клинической речи врача.
 * Layer 3: Оркестрация токенизации, извлечения номеров зубов, диагнозов, SOAP и материалов.
 */

import type {
	ClinicalVoiceParseResult,
	ParsedClinicalVoiceCommand,
	SoapSectionType,
} from "./types";
import { parseRussianSpokenToothNumber } from "./toothGrammarParser";
import {
	extractAnesthesiaAndConsumables,
	extractClinicalDiagnoses,
	extractSoapSections,
} from "./clinicalKeywords";

/**
 * Разбивает большой клинический текст на логические предложения/фразы.
 */
function splitIntoClinicalClauses(text: string): string[] {
	if (!text) return [];
	return text
		.split(/(?:[.;\n]+|\b(?:затем|далее|после этого)\b)/i)
		.map((s) => s.trim())
		.filter((s) => s.length > 2);
}

let voiceCommandSeq = 0;

/**
 * Выполняет полный разбор клинической речи врача:
 * выделяет команды зубной формулы, диагнозы, SOAP заметки, анестезию и материалы.
 */
export function parseClinicalVoiceSpeech(
	rawTranscript: string,
): ClinicalVoiceParseResult {
	const transcript = (rawTranscript || "").trim();
	const commands: ParsedClinicalVoiceCommand[] = [];
	const detectedTeethSet = new Set<number>();

	if (!transcript) {
		return {
			transcript: "",
			commands: [],
			soapNote: {},
			detectedTeeth: [],
			summary: "Речь не распознана",
		};
	}

	// 1. Извлекаем SOAP секции
	const soapNote = extractSoapSections(transcript);
	for (const [secKey, secText] of Object.entries(soapNote)) {
		if (secText) {
			const secType = secKey as SoapSectionType;
			let titleRu = "Запись в карту";
			if (secType === "subjective") titleRu = "Жалобы пациента";
			else if (secType === "objective") titleRu = "Объективный осмотр";
			else if (secType === "assessment") titleRu = "Диагноз";
			else if (secType === "plan") titleRu = "Лечебные манипуляции";
			else if (secType === "recommendations") titleRu = "Рекомендации пациенту";

			commands.push({
				id: `soap_${secType}_${Date.now()}_${++voiceCommandSeq}`,
				rawSpeech: secText,
				category: "soap",
				confidence: 0.92,
				confidenceLevel: "high",
				summary: `${titleRu}: ${secText.slice(0, 60)}${secText.length > 60 ? "..." : ""}`,
				soapSection: secType,
				soapText: secText,
			});
		}
	}

	// 2. Извлекаем анестезию и материалы
	const { anesthesia, consumables } = extractAnesthesiaAndConsumables(transcript);
	if (anesthesia) {
		commands.push({
			id: `anes_${Date.now()}_${++voiceCommandSeq}`,
			rawSpeech: transcript,
			category: "anesthesia",
			confidence: 0.95,
			confidenceLevel: "high",
			summary: `Анестезия: ${anesthesia.drug} ${anesthesia.volumeMl} мл (${anesthesia.cartridgeCount} карп.)`,
			anesthesiaDetails: anesthesia,
		});
	}

	for (const cons of consumables) {
		commands.push({
			id: `cons_${Date.now()}_${++voiceCommandSeq}`,
			rawSpeech: transcript,
			category: "consumable",
			confidence: 0.9,
			confidenceLevel: "high",
			summary: `Материал: ${cons.name}`,
			consumableDetails: cons,
		});
	}

	// 3. Разбираем по отдельным клиническим высказываниям для зубной формулы
	const clauses = splitIntoClinicalClauses(transcript);

	for (const clause of clauses) {
		const toothNumber = parseRussianSpokenToothNumber(clause);
		const diagnosis = extractClinicalDiagnoses(clause);

		if (toothNumber) {
			detectedTeethSet.add(toothNumber);
		}

		if (toothNumber && diagnosis) {
			commands.push({
				id: `tooth_${toothNumber}_${Date.now()}_${++voiceCommandSeq}`,
				rawSpeech: clause,
				category: "odontogram",
				confidence: diagnosis.confidence,
				confidenceLevel: diagnosis.confidence >= 0.85 ? "high" : "review",
				summary: `Зуб ${toothNumber}: ${diagnosis.title} [${diagnosis.code}]`,
				toothNumber,
				icd10Code: diagnosis.code,
				icd10Title: diagnosis.title,
				clinicalStatus: diagnosis.status,
			});
		} else if (toothNumber && !diagnosis) {
			// Упомянут только номер зуба без диагноза в этой фразе
			commands.push({
				id: `tooth_sel_${toothNumber}_${Date.now()}_${++voiceCommandSeq}`,
				rawSpeech: clause,
				category: "odontogram",
				confidence: 0.8,
				confidenceLevel: "review",
				summary: `Выбор зуба ${toothNumber} (требуется диагноз/действие)`,
				toothNumber,
			});
		} else if (!toothNumber && diagnosis && !soapNote.assessment) {
			// Упомянут диагноз без явного номера зуба
			commands.push({
				id: `diag_notooth_${Date.now()}_${++voiceCommandSeq}`,
				rawSpeech: clause,
				category: "odontogram",
				confidence: 0.7,
				confidenceLevel: "review",
				summary: `Диагноз: ${diagnosis.title} (укажите номер зуба)`,
				icd10Code: diagnosis.code,
				icd10Title: diagnosis.title,
				clinicalStatus: diagnosis.status,
			});
		}
	}

	// Формируем краткий сводный заголовок
	const summaryParts: string[] = [];
	if (detectedTeethSet.size > 0) {
		summaryParts.push(
			`Зубы: ${Array.from(detectedTeethSet).sort((a, b) => a - b).join(", ")}`,
		);
	}
	if (anesthesia) {
		summaryParts.push(anesthesia.drug);
	}
	if (Object.keys(soapNote).length > 0) {
		summaryParts.push(`Медкарта: ${Object.keys(soapNote).length} секц.`);
	}

	const summary =
		summaryParts.length > 0
			? summaryParts.join(" | ")
			: `Распознано команд: ${commands.length}`;

	return {
		transcript,
		commands,
		soapNote,
		detectedTeeth: Array.from(detectedTeethSet).sort((a, b) => a - b),
		summary,
	};
}
