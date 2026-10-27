/**
 * soapCommandBuilder.ts — Формирование команд для секций дневника приёма (SOAP).
 */

import type { ParsedClinicalVoiceCommand, SoapAggregatedNote, SoapSectionType } from "../types";

export function buildSoapCommands(
	soapNote: SoapAggregatedNote,
	nextSeq: () => number,
): ParsedClinicalVoiceCommand[] {
	const commands: ParsedClinicalVoiceCommand[] = [];

	for (const [secKey, secText] of Object.entries(soapNote)) {
		if (!secText) continue;
		const secType = secKey as SoapSectionType;
		let titleRu = "Запись в карту";
		if (secType === "subjective") titleRu = "Жалобы пациента";
		else if (secType === "objective") titleRu = "Объективный осмотр";
		else if (secType === "assessment") titleRu = "Диагноз";
		else if (secType === "plan") titleRu = "Лечебные манипуляции";
		else if (secType === "recommendations") titleRu = "Рекомендации пациенту";

		commands.push({
			id: `soap_${secType}_${Date.now()}_${nextSeq()}`,
			rawSpeech: secText,
			category: "soap",
			confidence: 0.92,
			confidenceLevel: "high",
			summary: `${titleRu}: ${secText.slice(0, 60)}${secText.length > 60 ? "..." : ""}`,
			soapSection: secType,
			soapText: secText,
		});
	}

	return commands;
}
