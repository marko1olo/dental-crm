/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Layer 2: Domain Search, Normalization & Clinical Preset Matcher Engine
 */

import type {
	DoctorSpecialty,
	Order804nCategory,
	PresetMatchResult,
	PresetMatcherCriteria,
	ServicePricelistItem,
} from './types';

/**
 * Normalizes an Order 804n code removing dots and case variations for fuzzy comparison
 */
export function normalizeCode804n(code: string): string {
	return code.replace(/[.\s-]/g, '').toUpperCase();
}

/**
 * Finds all presets indicated for a specific ICD-10 diagnosis code
 */
export function findPresetsByIcd10(
	presets: readonly ServicePricelistItem[],
	icd10Code: string,
): ServicePricelistItem[] {
	const cleanIcd = icd10Code.trim().toUpperCase();
	if (!cleanIcd) return [];
	return presets.filter(item =>
		item.icd10Indications.some(icd => icd.toUpperCase() === cleanIcd || cleanIcd.startsWith(icd.toUpperCase()))
	);
}

/**
 * Finds presets matching tooth clinical context (canals, temporary teeth, incisor vs molar)
 */
export function findPresetsByToothContext(
	presets: readonly ServicePricelistItem[],
	toothNumber: number,
	options?: { canals?: number; isTemporary?: boolean },
): ServicePricelistItem[] {
	if (toothNumber < 11 || (toothNumber > 48 && toothNumber < 51) || toothNumber > 85) {
		return [];
	}

	const isTemporary = options?.isTemporary ?? (toothNumber >= 51 && toothNumber <= 85);

	if (isTemporary) {
		const pediatrics = presets.filter(p => p.category === 'pediatric');
		if (pediatrics.length > 0) return pediatrics;
	}

	if (options?.canals && options.canals >= 1 && options.canals <= 4) {
		const canalSuffix = `${options.canals} корнево`;
		const canalMatches = presets.filter(p =>
			p.isAnatomicalCanalScalable ||
			p.commercialTitle.toLowerCase().includes(canalSuffix) ||
			p.statutoryTitle804n.toLowerCase().includes(canalSuffix)
		);
		if (canalMatches.length > 0) return canalMatches;
	}

	return presets.filter(p => p.category === 'therapy' || p.category === 'surgery');
}

/**
 * Clinical complaint keyword matching dictionary
 */
const COMPLAINT_KEYWORDS_MAP: Record<string, { category: Order804nCategory; tags: string[] }> = {
	'боль': { category: 'therapy', tags: ['кариес', 'пульпит', 'периодонтит'] },
	'острая боль': { category: 'therapy', tags: ['пульпит', 'эндодонтия', 'анестезия'] },
	'ноет': { category: 'therapy', tags: ['кариес', 'пломба'] },
	'дырка': { category: 'therapy', tags: ['кариес', 'пломба'] },
	'скол': { category: 'therapy', tags: ['реставрация', 'коронка', 'винир'] },
	'откололся': { category: 'therapy', tags: ['реставрация', 'коронка'] },
	'зуб мудрости': { category: 'surgery', tags: ['удаление', 'восьмерка', 'ретинированный'] },
	'удалить': { category: 'surgery', tags: ['удаление', 'хирургия'] },
	'вырвать': { category: 'surgery', tags: ['удаление'] },
	'имплант': { category: 'surgery', tags: ['имплантация', 'имплант'] },
	'кровоточат': { category: 'hygiene', tags: ['гигиена', 'чистка', 'десна'] },
	'камень': { category: 'hygiene', tags: ['уз-чистка', 'зубной камень', 'скейлинг'] },
	'налет': { category: 'hygiene', tags: ['air-flow', 'чистка', 'полировка'] },
	'желтые зубы': { category: 'hygiene', tags: ['отбеливание', 'чистка'] },
	'коронка': { category: 'orthopedics', tags: ['коронка', 'протезирование'] },
	'протез': { category: 'orthopedics', tags: ['протезирование', 'протез'] },
	'виниры': { category: 'orthopedics', tags: ['винир', 'эстетика'] },
	'кривые зубы': { category: 'orthodontics', tags: ['брекеты', 'элайнеры', 'прикус'] },
	'прикус': { category: 'orthodontics', tags: ['ортодонтия', 'прикус'] },
	'снимок': { category: 'radiology', tags: ['снимок', 'визиограф', 'рентген', 'оптг'] },
	'консультация': { category: 'consultation', tags: ['консультация', 'осмотр'] },
};

/**
 * Finds presets matching patient verbal complaints
 */
export function findPresetsByComplaint(
	presets: readonly ServicePricelistItem[],
	complaintText: string,
): ServicePricelistItem[] {
	const query = complaintText.toLowerCase().trim();
	if (!query) return [];

	const matchedCategories = new Set<Order804nCategory>();
	const matchedTags = new Set<string>();

	for (const [kw, meta] of Object.entries(COMPLAINT_KEYWORDS_MAP)) {
		if (query.includes(kw)) {
			matchedCategories.add(meta.category);
			meta.tags.forEach(t => matchedTags.add(t));
		}
	}

	return presets.filter(item => {
		if (matchedCategories.has(item.category)) return true;
		return item.tags.some(tag => matchedTags.has(tag) || query.includes(tag.toLowerCase()));
	});
}

/**
 * Autoselect presets by rich criteria (complaint, ICD-10, tooth, category, specialty)
 */
export function matchPresets(
	presets: readonly ServicePricelistItem[],
	criteria: PresetMatcherCriteria,
): PresetMatchResult[] {
	const results: PresetMatchResult[] = [];

	for (const item of presets) {
		let score = 0;
		let matchedBy: PresetMatchResult['matchedBy'] = 'tag';
		let matchReason = '';

		if (criteria.category && item.category === criteria.category) {
			score += 30;
			matchedBy = 'specialty';
			matchReason = `Категория: ${item.category}`;
		}

		if (criteria.specialty && item.specialty === criteria.specialty) {
			score += 25;
			matchedBy = 'specialty';
			matchReason = `Специальность: ${item.specialty}`;
		}

		if (criteria.icd10Code && item.icd10Indications.some(icd => icd.toUpperCase() === criteria.icd10Code?.toUpperCase())) {
			score += 50;
			matchedBy = 'icd10';
			matchReason = `МКБ-10: ${criteria.icd10Code}`;
		}

		if (criteria.complaintText) {
			const query = criteria.complaintText.toLowerCase();
			for (const tag of item.tags) {
				if (query.includes(tag.toLowerCase())) {
					score += 20;
					matchedBy = 'complaint';
					matchReason = `Жалоба совпала с тегом: ${tag}`;
					break;
				}
			}
		}

		if (criteria.maxPriceRub && item.basePriceRub <= criteria.maxPriceRub) {
			score += 10;
		}

		if (score > 0) {
			results.push({ item, score, matchedBy, matchReason });
		}
	}

	return results.sort((a, b) => b.score - a.score);
}

/**
 * Recommended presets for specialty
 */
export function getRecommendedPresetsForSpecialty(
	presets: readonly ServicePricelistItem[],
	specialty: DoctorSpecialty,
): ServicePricelistItem[] {
	return presets.filter(p => p.specialty === specialty && p.isActive && !p.isArchived);
}
