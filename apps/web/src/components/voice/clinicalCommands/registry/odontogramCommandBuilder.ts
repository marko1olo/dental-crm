/**
 * odontogramCommandBuilder.ts — Формирование команд зубной формулы и статусов.
 */

import type { ParsedClinicalVoiceCommand, SoapAggregatedNote } from "../types";
import {
	extractToothSurfaces,
	parseRussianSpokenToothNumber,
} from "../toothGrammarParser";
import { extractClinicalDiagnoses } from "../dictionaries/diagnosisExtractor";

export function buildOdontogramCommands(
	clauses: string[],
	soapNote: SoapAggregatedNote,
	detectedTeethSet: Set<number>,
	nextSeq: () => number,
): ParsedClinicalVoiceCommand[] {
	const commands: ParsedClinicalVoiceCommand[] = [];

	for (const clause of clauses) {
		const isSomaticNorm =
			/(?:норма\s+по\s+соматике|соматически\s+здоров|соматический\s+статус\s+в\s+норме)/i.test(
				clause,
			);
		if (isSomaticNorm) {
			commands.push({
				id: `somatic_norm_${Date.now()}_${nextSeq()}`,
				rawSpeech: clause,
				category: "soap",
				confidence: 0.98,
				confidenceLevel: "high",
				summary: "Соматический статус: Соматически здоров (норма в 1 клик)",
				soapSection: "objective",
				soapText: "Соматически здоров, сопутствующих соматических патологий не выявлено",
			});
			continue;
		}

		const toothNumber = parseRussianSpokenToothNumber(clause);
		const diagnosis = extractClinicalDiagnoses(clause);
		const surfaces = extractToothSurfaces(clause);
		const surfaceLabel = surfaces.length > 0 ? ` (${surfaces.join(", ")})` : "";

		if (toothNumber) {
			detectedTeethSet.add(toothNumber);
		}

		if (toothNumber && diagnosis) {
			commands.push({
				id: `tooth_${toothNumber}_${Date.now()}_${nextSeq()}`,
				rawSpeech: clause,
				category: "odontogram",
				confidence: diagnosis.confidence,
				confidenceLevel: diagnosis.confidence >= 0.85 ? "high" : "review",
				summary: `Зуб ${toothNumber}${surfaceLabel}: ${diagnosis.title} [${diagnosis.code}]`,
				toothNumber,
				icd10Code: diagnosis.code,
				icd10Title: diagnosis.title,
				clinicalStatus: diagnosis.status,
			});
		} else if (toothNumber && !diagnosis) {
			commands.push({
				id: `tooth_sel_${toothNumber}_${Date.now()}_${nextSeq()}`,
				rawSpeech: clause,
				category: "odontogram",
				confidence: 0.8,
				confidenceLevel: "review",
				summary: `Выбор зуба ${toothNumber}${surfaceLabel} (требуется диагноз/действие)`,
				toothNumber,
			});
		} else if (!toothNumber && diagnosis && !soapNote.assessment) {
			commands.push({
				id: `diag_notooth_${Date.now()}_${nextSeq()}`,
				rawSpeech: clause,
				category: "odontogram",
				confidence: 0.7,
				confidenceLevel: "review",
				summary: `Диагноз: ${diagnosis.title}${surfaceLabel} (укажите номер зуба)`,
				icd10Code: diagnosis.code,
				icd10Title: diagnosis.title,
				clinicalStatus: diagnosis.status,
			});
		}
	}

	return commands;
}
