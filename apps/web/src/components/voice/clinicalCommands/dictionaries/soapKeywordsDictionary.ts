/**
 * soapKeywordsDictionary.ts — Клинический словарь маркеров SOAP-дневника приёма.
 */

import type { SoapAggregatedNote, SoapSectionType } from "../types";

export const SOAP_MARKERS: Record<SoapSectionType, string[]> = {
	subjective: [
		"жалобы:",
		"жалобы пациента:",
		"жалобы",
		"жалуется на",
		"со слов пациента:",
		"пациент отмечает:",
		"анамнез заболевания:",
		"анамнез:",
	],
	objective: [
		"объективно:",
		"при осмотре:",
		"данные осмотра:",
		"статус локалис:",
		"status localis:",
		"объективные данные:",
		"в полости рта:",
		"объективно",
		"при осмотре",
	],
	assessment: [
		"диагноз:",
		"предварительный диагноз:",
		"клинический диагноз:",
		"основное заболевание:",
		"диагноз",
	],
	plan: [
		"лечение:",
		"план лечения:",
		"проведено лечение:",
		"ход лечения:",
		"протокол лечения:",
		"протокол:",
		"манипуляции:",
		"лечение",
	],
	recommendations: [
		"рекомендации:",
		"назначения:",
		"рекомендовано:",
		"пациенту назначено:",
		"советы врача:",
		"рекомендации",
		"назначения",
	],
};

interface FoundSpan {
	section: SoapSectionType;
	index: number;
	markerLength: number;
}

export function extractSoapSections(text: string): SoapAggregatedNote {
	const result: SoapAggregatedNote = {};
	if (!text) return result;

	const norm = text.trim();
	const allMarkersWithKeys: Array<{ section: SoapSectionType; marker: string }> = [];
	for (const [section, markers] of Object.entries(SOAP_MARKERS)) {
		for (const marker of markers) {
			allMarkersWithKeys.push({ section: section as SoapSectionType, marker });
		}
	}
	allMarkersWithKeys.sort((a, b) => b.marker.length - a.marker.length);

	const foundSpans: FoundSpan[] = [];
	const lower = norm.toLowerCase().replace(/ё/g, "е");

	for (const { section, marker } of allMarkersWithKeys) {
		const normMarker = marker.replace(/ё/g, "е");
		let pos = lower.indexOf(normMarker);
		while (pos !== -1) {
			const overlaps = foundSpans.some(
				(s) => pos >= s.index && pos < s.index + s.markerLength,
			);
			if (!overlaps) {
				foundSpans.push({ section, index: pos, markerLength: normMarker.length });
			}
			pos = lower.indexOf(normMarker, pos + 1);
		}
	}

	foundSpans.sort((a, b) => a.index - b.index);

	for (let i = 0; i < foundSpans.length; i++) {
		const current = foundSpans[i];
		if (!current) continue;
		const start = current.index + current.markerLength;
		const next = foundSpans[i + 1];
		const end = next ? next.index : norm.length;

		let content = norm
			.slice(start, end)
			.trim()
			.replace(/^[:\-–—\s]+/, "")
			.replace(/[.\s]+$/, "")
			.trim();

		if (content) {
			const existing = result[current.section];
			result[current.section] = existing ? `${existing}; ${content}` : content;
		}
	}

	return result;
}
