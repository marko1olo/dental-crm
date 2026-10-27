/**
 * soapNotesGrammar.ts — Распознавание разделов SOAP-дневника и манипуляций лечения
 */

import type { Procedure804nVoiceItem, SoapSectionsVoiceNote } from "../types";
import { KNOWN_MANIPULATIONS_804N, SOAP_HEADERS } from "../constants";

export function extractProcedures804n(text: string, primaryTooth?: number): Procedure804nVoiceItem[] {
	if (!text) return [];
	const norm = text.toLowerCase().replace(/ё/g, "е");
	const results: Procedure804nVoiceItem[] = [];

	let shade: string | undefined;
	if (norm.includes("а два") || norm.includes("а2") || norm.includes("a2")) shade = "A2";
	else if (norm.includes("а три") || norm.includes("а3") || norm.includes("a3")) shade = "A3";
	else if (norm.includes("а один") || norm.includes("а1") || norm.includes("a1")) shade = "A1";
	else if (norm.includes("б два") || norm.includes("b2")) shade = "B2";

	for (const rule of KNOWN_MANIPULATIONS_804N) {
		const matched = rule.patterns.some((p) => norm.includes(p));
		if (matched) {
			let name = rule.name;
			if (shade && rule.category === "therapy") {
				name += ` (оттенок ${shade})`;
			}
			results.push({
				code804n: rule.code804n,
				name,
				category: rule.category,
				quantity: 1,
				toothNumber: primaryTooth,
				priceRub: rule.priceRub,
				shade,
			});
		}
	}

	return results;
}

export function extractSoapNotes(text: string): SoapSectionsVoiceNote {
	const result: Record<string, string> = {};
	if (!text) return result;

	const norm = text.trim();
	const lower = norm.toLowerCase().replace(/ё/g, "е");

	const markersWithSection: Array<{ section: keyof SoapSectionsVoiceNote; marker: string }> = [];
	for (const [sec, markers] of Object.entries(SOAP_HEADERS)) {
		for (const marker of markers) {
			markersWithSection.push({ section: sec as keyof SoapSectionsVoiceNote, marker });
		}
	}
	markersWithSection.sort((a, b) => b.marker.length - a.marker.length);

	const spans: Array<{ section: keyof SoapSectionsVoiceNote; index: number; markerLength: number }> = [];

	for (const { section, marker } of markersWithSection) {
		let pos = lower.indexOf(marker);
		while (pos !== -1) {
			const overlaps = spans.some((s) => pos >= s.index && pos < s.index + s.markerLength);
			if (!overlaps) {
				spans.push({ section, index: pos, markerLength: marker.length });
			}
			pos = lower.indexOf(marker, pos + 1);
		}
	}

	spans.sort((a, b) => a.index - b.index);

	for (let i = 0; i < spans.length; i++) {
		const current = spans[i];
		if (!current) continue;
		const start = current.index + current.markerLength;
		const next = spans[i + 1];
		const end = next ? next.index : norm.length;

		let content = norm.slice(start, end).trim();
		content = content.replace(/^[:\-–—\s]+/, "").replace(/[.\s]+$/, "").trim();

		if (content) {
			const existing = result[current.section];
			result[current.section] = existing ? `${existing}; ${content}` : content;
		}
	}

	return result;
}
