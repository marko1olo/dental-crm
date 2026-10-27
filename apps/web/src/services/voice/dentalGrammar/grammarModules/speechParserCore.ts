/**
 * speechParserCore.ts — Главный процессор сборки клинического намерения DentalVoiceIntent
 */

import type { DentalVoiceIntent } from "../types";
import { extractFdiTeethNumbers } from "../toothNumberParser";
import { extractQuadrantIntent } from "./toothFormulaGrammar";
import { extractPerioVoiceMeasurements } from "./perioGrammar";
import { extractAnesthesiaIntent } from "./anesthesiaGrammar";
import { extractProcedures804n, extractSoapNotes } from "./soapNotesGrammar";
import { extractCephLandmarksVoiceIntent, extractEndoCanalMeasurements } from "./navigationGrammar";
import { extractTeethUpdatesFromSpeech } from "./speechClausesParser";
import { enrichSoapWithProcedures } from "./speechSoapEnricher";

let voiceIntentSeq = 0;

export function parseDentalVoiceSpeech(rawTranscript: string): DentalVoiceIntent {
	const transcript = (rawTranscript || "").trim();
	const now = new Date().toISOString();
	const intentId = `dvi_${Date.now()}_${++voiceIntentSeq}`;

	if (!transcript) {
		return {
			id: intentId,
			timestamp: now,
			rawTranscript: "",
			type: "full_visit_batch",
			confidence: 0,
			confidenceLevel: "review",
			teethUpdates: [],
			detectedTeeth: [],
			anesthesia: null,
			procedures804n: [],
			soapNotes: {},
			summary: "Речь не распознана",
		};
	}

	const allTeeth = extractFdiTeethNumbers(transcript);
	const anesthesia = extractAnesthesiaIntent(transcript);
	const primaryTooth = allTeeth[0];
	const procedures804n = extractProcedures804n(transcript, primaryTooth);
	const soapNotes = extractSoapNotes(transcript);

	const { teethUpdates } = extractTeethUpdatesFromSpeech(transcript, allTeeth);
	const enrichedSoap = enrichSoapWithProcedures(soapNotes, teethUpdates, procedures804n, anesthesia);

	const targetQuadrant = extractQuadrantIntent(transcript) || undefined;
	const endoCanalMeasurements = extractEndoCanalMeasurements(transcript);
	const perioMeasurements = extractPerioVoiceMeasurements(transcript);
	const cephLandmarks = extractCephLandmarksVoiceIntent(transcript);

	let intentType: DentalVoiceIntent["type"] = "full_visit_batch";
	if (targetQuadrant) intentType = "quadrant_switch";
	else if (endoCanalMeasurements.length > 0) intentType = "endo_measurement";
	else if (perioMeasurements.length > 0) intentType = "perio_measurement";
	else if (cephLandmarks.length > 0) intentType = "ceph_landmark";
	else if (teethUpdates.length > 0 && !anesthesia && procedures804n.length === 0) intentType = "odontogram_update";

	const summaryParts: string[] = [];
	if (targetQuadrant) summaryParts.push(`Квадрант: ${targetQuadrant}`);
	if (allTeeth.length > 0) summaryParts.push(`Зубы: ${allTeeth.join(", ")}`);
	if (teethUpdates.length > 0) summaryParts.push(teethUpdates.map((t) => `${t.toothNumber} ${t.icd10Code}`).join(", "));
	if (anesthesia) summaryParts.push(anesthesia.tradeName);
	if (procedures804n.length > 0) summaryParts.push(`${procedures804n.length} манип.`);
	if (endoCanalMeasurements.length > 0) summaryParts.push(`Эндо: ${endoCanalMeasurements.map((c) => c.canalName).join(", ")}`);
	if (perioMeasurements.length > 0) summaryParts.push(`Перио: ${perioMeasurements.map((p) => p.toothNumber).join(", ")}`);
	if (cephLandmarks.length > 0) summaryParts.push(`ТРГ: ${cephLandmarks.map((c) => c.landmarkKey).join(", ")}`);

	const summary = summaryParts.length > 0 ? summaryParts.join(" | ") : "Клинический голосовой ввод";
	const hasClinicalSignals =
		teethUpdates.length > 0 || anesthesia !== null || procedures804n.length > 0 ||
		targetQuadrant !== undefined || endoCanalMeasurements.length > 0 ||
		perioMeasurements.length > 0 || cephLandmarks.length > 0;
	const confidence = hasClinicalSignals ? 0.95 : 0.8;

	return {
		id: intentId,
		timestamp: now,
		rawTranscript: transcript,
		type: intentType,
		confidence,
		confidenceLevel: confidence >= 0.9 ? "high" : "review",
		teethUpdates,
		detectedTeeth: allTeeth,
		anesthesia,
		procedures804n,
		soapNotes: enrichedSoap,
		...(targetQuadrant ? { targetQuadrant } : {}),
		...(endoCanalMeasurements.length > 0 ? { endoCanalMeasurements } : {}),
		...(perioMeasurements.length > 0 ? { perioMeasurements } : {}),
		...(cephLandmarks.length > 0 ? { cephLandmarks } : {}),
		summary,
	};
}
