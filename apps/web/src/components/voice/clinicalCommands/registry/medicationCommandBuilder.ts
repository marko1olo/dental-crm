/**
 * medicationCommandBuilder.ts — Формирование команд анестезии и материалов.
 */

import type {
	AnesthesiaParsedInfo,
	ConsumableParsedInfo,
	ParsedClinicalVoiceCommand,
} from "../types";

export function buildMedicationCommands(
	transcript: string,
	anesthesia: AnesthesiaParsedInfo | null,
	consumables: ConsumableParsedInfo[],
	nextSeq: () => number,
): ParsedClinicalVoiceCommand[] {
	const commands: ParsedClinicalVoiceCommand[] = [];

	if (anesthesia) {
		commands.push({
			id: `anes_${Date.now()}_${nextSeq()}`,
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
			id: `cons_${Date.now()}_${nextSeq()}`,
			rawSpeech: transcript,
			category: "consumable",
			confidence: 0.9,
			confidenceLevel: "high",
			summary: `Материал: ${cons.name}`,
			consumableDetails: cons,
		});
	}

	return commands;
}
