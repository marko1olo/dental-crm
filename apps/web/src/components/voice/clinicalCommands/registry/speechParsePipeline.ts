/**
 * speechParsePipeline.ts — Главный конвейер разбора клинической речи врача.
 */

import type { ClinicalVoiceParseResult, ParsedClinicalVoiceCommand } from "../types";
import { extractSoapSections } from "../dictionaries/soapKeywordsDictionary";
import { extractAnesthesiaAndConsumables } from "../dictionaries/anesthesiaAndConsumablesDictionary";
import { splitIntoClinicalClauses } from "./splitIntoClinicalClauses";
import { buildSoapCommands } from "./soapCommandBuilder";
import { buildMedicationCommands } from "./medicationCommandBuilder";
import { buildOdontogramCommands } from "./odontogramCommandBuilder";

let voiceCommandSeq = 0;
const nextSeq = () => ++voiceCommandSeq;

export function parseClinicalVoiceSpeech(
	rawTranscript: string,
): ClinicalVoiceParseResult {
	const transcript = (rawTranscript || "").trim();
	if (!transcript) {
		return {
			transcript: "",
			commands: [],
			soapNote: {},
			detectedTeeth: [],
			summary: "Речь не распознана",
		};
	}

	const soapNote = extractSoapSections(transcript);
	const { anesthesia, consumables } = extractAnesthesiaAndConsumables(transcript);
	const detectedTeethSet = new Set<number>();
	const clauses = splitIntoClinicalClauses(transcript);

	const soapCmds = buildSoapCommands(soapNote, nextSeq);
	const medCmds = buildMedicationCommands(transcript, anesthesia, consumables, nextSeq);
	const odontoCmds = buildOdontogramCommands(clauses, soapNote, detectedTeethSet, nextSeq);

	const commands: ParsedClinicalVoiceCommand[] = [
		...soapCmds,
		...medCmds,
		...odontoCmds,
	];

	const summaryParts: string[] = [];
	if (detectedTeethSet.size > 0) {
		summaryParts.push(
			`Зубы: ${Array.from(detectedTeethSet).sort((a, b) => a - b).join(", ")}`,
		);
	}
	if (anesthesia) summaryParts.push(anesthesia.drug);
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
