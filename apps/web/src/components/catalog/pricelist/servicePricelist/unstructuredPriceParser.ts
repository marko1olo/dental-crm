import {
	STATUTORY_ORDER_804N_PRESETS,
	type DoctorSpecialty,
	type Order804nCategory,
	type ServicePricelistItem,
} from '../servicePricelistPresets';
import { rublesToKopecks } from './currencyMath';
import { detectCategoryFrom804nCode } from './serviceCodesAndSynonyms';
import type { ParsedPriceProposal } from './types';

// =============================================================================
// LAYER 2: UNSTRUCTURED TEXT / LEGACY SCAN & DOCUMENT PRICE LIST PARSER
// =============================================================================

/**
 * Intelligent parser for unstructured text copied from legacy price lists,
 * Word documents, scanned PDFs, or messy spreadsheets.
 */
export function parseUnstructuredPriceText(rawText: string): readonly ParsedPriceProposal[] {
	if (!rawText || typeof rawText !== 'string') return [];

	const lines = rawText.split(/\r?\n/);
	const results: ParsedPriceProposal[] = [];

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || line.length < 3) continue;

		// Skip obvious header, company info, or separator lines (avoid \b due to Cyrillic non-ASCII boundary)
		if (/^(?:прейскурант|прайс|каталог|утверждаю|главный\s*врач|лицензия|ооо|зао|ип)(?:\s|$|:)/i.test(line)) {
			continue;
		}
		if (/(?:202\d|199\d)\s*(?:г|года|г\.)(?:\s|$|[.,;])/i.test(line)) {
			continue;
		}
		if (/^(?:наименование|услуга|цена|стоимость|код|№|разделы?|раздел|стр\.?|-+|\=+|\*+)$/i.test(line)) {
			continue;
		}

		// 1. Detect statutory Order 804n code if present in line
		const codeMatch = line.match(/\b([AB]\d{2}\.\d{2}\.\d{3}(?:\.\d{3})?|[AB]\d{2}\.\d{3}(?:\.\d{3})?)\b/i);
		const detectedCode = (codeMatch && codeMatch[1]) ? codeMatch[1].toUpperCase() : null;

		// 2. Extract price from line
		// Handles formats: "4 500 руб", "3500 р", "12500,00 ₽", " - 4500", "	4500"
		let priceRub = 0;
		let lineWithoutPrice = line;

		const priceRegexEnd = /(?:[-:=–—\t]|\s+)(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(?:руб|р|₽|rub)?\.?\s*$/i;
		const priceRegexMid = /\b(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(?:руб|р|₽)\b/i;

		const endMatch = line.match(priceRegexEnd);
		if (endMatch && endMatch[1]) {
			const cleanDigits = endMatch[1].replace(/\s+/g, '').replace(',', '.');
			const parsed = parseFloat(cleanDigits);
			if (Number.isFinite(parsed) && parsed > 0 && parsed <= 5000000) {
				priceRub = Math.round(parsed);
				lineWithoutPrice = line.slice(0, endMatch.index).trim();
			}
		} else {
			const midMatch = line.match(priceRegexMid);
			if (midMatch && midMatch[1]) {
				const cleanDigits = midMatch[1].replace(/\s+/g, '').replace(',', '.');
				const parsed = parseFloat(cleanDigits);
				if (Number.isFinite(parsed) && parsed > 0 && parsed <= 5000000) {
					priceRub = Math.round(parsed);
					lineWithoutPrice = line.replace(midMatch[0], ' ').trim();
				}
			}
		}

		// If no price found, check if line ends with a plain number >= 50
		if (priceRub === 0) {
			const fallbackNumMatch = line.match(/\s+(\d{2,7})\s*$/);
			if (fallbackNumMatch && fallbackNumMatch[1]) {
				const parsed = parseInt(fallbackNumMatch[1], 10);
				if (parsed >= 50 && parsed <= 5000000) {
					priceRub = parsed;
					lineWithoutPrice = line.slice(0, fallbackNumMatch.index).trim();
				}
			}
		}

		// 3. Clean commercial title
		let title = lineWithoutPrice;
		if (detectedCode) {
			title = title.replace(new RegExp(`\\b${detectedCode.replace('.', '\\.')}\\b`, 'i'), ' ');
		}

		// Strip leading enumerations like "1.", "1.2.", "3)", "- "
		title = title.replace(/^[\d\.\)\-\–\—\s]+/, '').replace(/[\-–—:=]+$/, '').trim();
		if (!title || title.length < 2) continue;

		// 4. Clinical Heuristic Classification & 804n Mapping
		let finalCode = detectedCode;
		let category: Order804nCategory = 'other';
		let specialty: DoctorSpecialty = 'therapist';
		let confidence: 'exact_code' | 'keyword_match' | 'fallback' = 'fallback';

		if (detectedCode) {
			finalCode = detectedCode;
			category = detectCategoryFrom804nCode(detectedCode);
			confidence = 'exact_code';
			if (category === 'surgery') specialty = 'surgeon';
			else if (category === 'orthopedics') specialty = 'orthopedist';
			else if (category === 'orthodontics') specialty = 'orthodontist';
			else if (category === 'hygiene') specialty = 'hygienist';
			else if (category === 'pediatric') specialty = 'pediatric';
		} else {
			const lowerTitle = title.toLowerCase();

			if (/пульпит|периодонтит|каналы?|эндодонт|депульпир|гуттаперч/i.test(lowerTitle)) {
				category = 'therapy';
				specialty = 'therapist';
				finalCode = 'A16.07.008';
				confidence = 'keyword_match';
			} else if (/кариес|пломб|реставрац|эмаль|герметизац|композит/i.test(lowerTitle)) {
				category = 'therapy';
				specialty = 'therapist';
				finalCode = 'A16.07.002';
				confidence = 'keyword_match';
			} else if (/имплант|синус|аугментац|остеотоми|формировател/i.test(lowerTitle)) {
				category = 'surgery';
				specialty = 'surgeon';
				finalCode = 'A16.07.054';
				confidence = 'keyword_match';
			} else if (/удалени|экстракц|резекц|альвеол|зуб\s*мудрости/i.test(lowerTitle)) {
				category = 'surgery';
				specialty = 'surgeon';
				finalCode = 'A16.07.001';
				confidence = 'keyword_match';
			} else if (/коронк|мостовид|протез|винир|слепок|оттиск|вкладк|бюгел/i.test(lowerTitle)) {
				category = 'orthopedics';
				specialty = 'orthopedist';
				finalCode = 'A16.07.004';
				confidence = 'keyword_match';
			} else if (/брекет|дуг|элайнер|активаци|ретейнер|ортодонт/i.test(lowerTitle)) {
				category = 'orthodontics';
				specialty = 'orthodontist';
				finalCode = 'A16.07.048';
				confidence = 'keyword_match';
			} else if (/анестези|инфильтрац|проводников|убистезин|септанест/i.test(lowerTitle)) {
				category = 'anesthesia';
				specialty = 'therapist';
				finalCode = 'A11.07.012';
				confidence = 'keyword_match';
			} else if (/гигиен|чистк|air\s*flow|ультразвук|паст|камен|налет/i.test(lowerTitle)) {
				category = 'hygiene';
				specialty = 'hygienist';
				finalCode = 'A16.07.051';
				confidence = 'keyword_match';
			} else if (/снимок|кт|клкт|оптг|прицельн|радиовизиограф/i.test(lowerTitle)) {
				category = 'radiology';
				specialty = 'therapist';
				finalCode = 'A06.07.003';
				confidence = 'keyword_match';
			} else if (/консультаци|осмотр|прием\s*первичн/i.test(lowerTitle)) {
				category = 'consultation';
				specialty = 'therapist';
				finalCode = 'B01.065.001';
				confidence = 'keyword_match';
			} else {
				category = 'therapy';
				specialty = 'therapist';
				finalCode = 'A16.07.002';
				confidence = 'fallback';
			}
		}

		const matchedPreset = finalCode
			? STATUTORY_ORDER_804N_PRESETS.find(
					(p) => p.code804n.toUpperCase() === finalCode.toUpperCase(),
				)
			: undefined;

		results.push({
			rawLine: line,
			commercialTitle: title,
			detectedCode804n: finalCode,
			statutoryTitle804n: matchedPreset?.statutoryTitle804n,
			suggestedCategory: category,
			suggestedSpecialty: specialty,
			priceRub,
			confidence,
		});
	}

	return results;
}

/**
 * Converts a parsed proposal into a complete ServicePricelistItem.
 */
export function proposalToPricelistItem(proposal: ParsedPriceProposal): ServicePricelistItem {
	const idSuffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID().slice(0, 8)
		: Date.now().toString(36);
	return {
		id: `srv-imp-${Date.now()}-${idSuffix}`,
		code804n: proposal.detectedCode804n,
		commercialTitle: proposal.commercialTitle,
		statutoryTitle804n: proposal.statutoryTitle804n || proposal.commercialTitle,
		category: proposal.suggestedCategory,
		specialty: proposal.suggestedSpecialty,
		basePriceRub: proposal.priceRub,
		basePriceKopecks: rublesToKopecks(proposal.priceRub),
		estimatedDurationMin: 30,
		icd10Indications: [],
		vatRate: 0,
		vatExemptionArticle: 'пп. 2 п. 2 ст. 149 НК РФ',
		isActive: true,
		isArchived: false,
		tags: ['умный_импорт'],
	};
}
