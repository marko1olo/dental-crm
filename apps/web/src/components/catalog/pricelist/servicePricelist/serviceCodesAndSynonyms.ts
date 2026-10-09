import type { Order804nCategory } from '../servicePricelistPresets';

// =============================================================================
// LAYER 1: STATUTORY ORDER 804N CODES & CLINICAL SYNONYM DICTIONARY
// =============================================================================

/**
 * Clinical synonyms dictionary connecting common colloquial/clinical terms
 * with Minzdrav Order 804n statutory categories, tags and prefixes.
 *
 * Mandate 8e: "Врач и администратор не обязаны зубрить 10-значные коды Минздрава".
 * Entering "кариес", "пломба", "удаление", "коронка", "чистка", "гигиена", "нерв", "снимок"
 * will immediately resolve to canonical 804n nomenclature procedures.
 */
export const CLINICAL_SYNONYM_DICT: Record<string, readonly string[]> = {
	кариес: ['кариес', 'пломб', 'реставрац', 'композит', 'a16.07.002', 'fuji', 'estelite', 'filtek', 'сиц'],
	пломба: ['пломб', 'кариес', 'реставрац', 'композит', 'a16.07.002', 'fuji', 'estelite', 'filtek', 'сиц', 'штифт', 'билдап'],
	удаление: ['удален', 'экстракц', 'хирург', 'сепарац', 'элеватор', 'щипц', 'дистопирован', 'ретинирован', 'мудрост', 'a16.07.001', 'a16.07.024'],
	коронка: ['коронк', 'протез', 'ортопед', 'циркони', 'металлокерам', 'e.max', 'emax', 'винир', 'вкладк', 'tibase', 'a16.07.006'],
	чистка: ['чистк', 'гигиен', 'профилактик', 'скейлинг', 'air-flow', 'airflow', 'фторирован', 'ультразвук', 'налет', 'a16.07.051'],
	гигиена: ['гигиен', 'чистк', 'профилактик', 'скейлинг', 'air-flow', 'airflow', 'фторирован', 'ультразвук', 'отбеливан', 'a16.07.051', 'a16.07.050'],
	нерв: [
		'пульпит',
		'периодонтит',
		'канал',
		'эндодонт',
		'обтурац',
		'депульпир',
		'экстирпац',
		'гуттаперч',
		'силер',
		'мышьяк',
		'распломбирован',
		'ревизия',
		'a16.07.030',
		'a16.07.008',
		'a16.07.082',
		'a16.07.091',
	],
	снимок: ['снимок', 'рентген', 'rvg', 'визиограф', 'оптг', 'ортопантомограф', 'панорам', 'кт', 'клкт', 'томограф', 'vatech', 'a06.07'],
	рентген: ['рентген', 'снимок', 'rvg', 'визиограф', 'оптг', 'ортопантомограф', 'панорам', 'кт', 'клкт', 'томограф', 'a06.07'],
	пульпит: ['пульпит', 'нерв', 'канал', 'эндодонт', 'обтурац', 'a16.07.030', 'a16.07.008'],
	укол: ['анестез', 'укол', 'инфильтрац', 'проводников', 'ультракаин', 'скандонест', 'мепивакаин', 'обезболиван', 'a16.07.004', 'a11.07.012'],
	анестезия: ['анестез', 'укол', 'инфильтрац', 'проводников', 'ультракаин', 'скандонест', 'мепивакаин', 'обезболиван', 'a16.07.004', 'a11.07.012'],
	имплант: ['имплант', 'имплантац', 'osstem', 'straumann', 'титан', 'синус-лифтинг', 'аугментац', 'формировател', 'фдм', 'a16.07.054'],
	имплантация: ['имплантац', 'имплант', 'osstem', 'straumann', 'титан', 'синус-лифтинг', 'аугментац', 'формировател', 'фдм', 'a16.07.054'],
	протез: ['протез', 'коронк', 'ортопед', 'циркони', 'металлокерам', 'винир', 'съемн', 'бюгел', 'a16.07.006'],
	протезирование: ['протез', 'коронк', 'ортопед', 'циркони', 'металлокерам', 'винир', 'съемн', 'бюгел', 'a16.07.006'],
	винир: ['винир', 'emax', 'e.max', 'реставрац', 'эстетик', 'a16.07.006.003', 'a16.07.002.003'],
	виниры: ['винир', 'emax', 'e.max', 'реставрац', 'эстетик', 'a16.07.006.003', 'a16.07.002.003'],
	брекеты: ['брекет', 'ортодонт', 'прикус', 'damon', 'дуга', 'a16.07.047'],
	элайнеры: ['элайнер', 'капп', 'ортодонт', 'star smile', 'flexiligner', 'a16.07.047'],
	капа: ['капп', 'капа', 'бруксизм', 'сплинт', 'элайнер', 'защитн', 'clinic.kapa'],
	капы: ['капп', 'капа', 'бруксизм', 'сплинт', 'элайнер', 'защитн', 'clinic.kapa'],
	швы: ['шов', 'швы', 'наложение швов', 'снятие швов', 'лигатур', 'clinic.sut', 'a16.07.017'],
	сертификат: ['сертификат', 'подарочн', 'депозит', 'аванс', 'пакет', 'clinic.gift'],
	пакет: ['пакет', 'комплекс', 'чекап', 'акци', 'программ', 'pkg'],
	десна: ['десн', 'пародонт', 'гингивит', 'кюретаж', 'формировател', 'фдм', 'a16.07.039'],
	отбеливание: ['отбеливан', 'zoom', 'beyond', 'белоснежн', 'a16.07.050'],
};

export function normalizeSearchText(text: string): string {
	return text
		.toLowerCase()
		.replace(/ё/g, 'е')
		.replace(/[^a-zа-я0-9\.]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Returns expanded clinical synonyms including Russian grammatical inflections and stems.
 */
export function getClinicalSynonyms(token: string): readonly string[] {
	const norm = normalizeSearchText(token);
	if (!norm || norm.length === 0) return [];

	const direct = CLINICAL_SYNONYM_DICT[norm];
	if (direct) return direct;

	const synonyms: string[] = [];
	for (const [key, list] of Object.entries(CLINICAL_SYNONYM_DICT)) {
		// Stem / prefix matching for Russian inflections (e.g. "кариеса", "пломбу", "удаления", "нерва", "снимка")
		const minLen = Math.min(norm.length, key.length);
		const stemLen = Math.max(3, Math.min(4, minLen));
		if (norm.slice(0, stemLen) === key.slice(0, stemLen)) {
			synonyms.push(...list);
		}
	}

	return synonyms.length > 0 ? Array.from(new Set(synonyms)) : [];
}

const ORDER_804N_REGEX = /^[AB]\d{2}\.\d{2,3}\.\d{2,3}(?:\.\d{2,3})?$/i;

/**
 * Validates whether a code conforms to Minzdrav Order 804n statutory syntax (e.g. A16.07.002.001 or B01.065.001).
 */
export function isValidOrder804nCode(code: string): boolean {
	if (!code || typeof code !== 'string') return false;
	return ORDER_804N_REGEX.test(code.trim());
}

/**
 * Checks whether a service code is valid for catalog use (either standard 804n code OR custom clinic package identifier).
 *
 * Mandate 8e (Freedom of Clinic): Clinics are never blocked from creating intra-clinic packages or services
 * ("Подарочный сертификат", "Индивидуальная капа", "Снятие швов сторонней клиники") due to non-conformance with 804n regex.
 */
export function isValidCatalogServiceCode(code: string): boolean {
	if (!code || typeof code !== 'string') return false;
	return code.trim().length > 0;
}

/**
 * Checks if a code represents an intra-clinic custom service/package rather than standard statutory 804n.
 */
export function isClinicPackageOrCustomService(code: string): boolean {
	return !isValidOrder804nCode(code);
}

/**
 * Automatically detects the clinical dental category based on Order 804n code prefix or service title.
 */
export function detectCategoryFrom804nCode(code: string, title?: string): Order804nCategory {
	const trimmed = code.trim().toUpperCase();
	const titleLower = title?.toLowerCase() ?? '';

	if (
		trimmed.startsWith('PKG') ||
		trimmed.startsWith('CLINIC.GIFT') ||
		trimmed.startsWith('CLINIC.KAPA') ||
		titleLower.includes('пакет') ||
		titleLower.includes('комплекс') ||
		titleLower.includes('сертификат') ||
		titleLower.includes('капа')
	) {
		return 'package';
	}

	if (trimmed.startsWith('B01.065') || trimmed.startsWith('B01.003')) {
		if (trimmed.startsWith('B01.003')) return 'anesthesia';
		return 'consultation';
	}
	if (trimmed.startsWith('A06.07') || trimmed.startsWith('A02.07')) {
		return 'radiology';
	}
	if (trimmed.startsWith('A16.07.051') || trimmed.startsWith('A11.07.012') || trimmed.startsWith('A16.07.050')) {
		return 'hygiene';
	}
	if (trimmed.startsWith('A16.07.039') || trimmed.startsWith('A16.07.040')) {
		return 'periodontics';
	}
	if (trimmed.startsWith('A16.07.047') || trimmed.startsWith('A16.07.048') || trimmed.startsWith('A16.07.046')) {
		return 'orthodontics';
	}
	if (
		trimmed.startsWith('A16.07.006') ||
		trimmed.startsWith('A16.07.035') ||
		trimmed.startsWith('A16.07.036') ||
		trimmed.startsWith('A16.07.037') ||
		trimmed.startsWith('A16.07.049') ||
		trimmed.startsWith('A16.07.053')
	) {
		return 'orthopedics';
	}
	if (
		trimmed.startsWith('A16.07.001') ||
		trimmed.startsWith('A16.07.024') ||
		trimmed.startsWith('A16.07.054') ||
		trimmed.startsWith('A16.07.007') ||
		trimmed.startsWith('A16.07.041') ||
		trimmed.startsWith('A16.07.055') ||
		trimmed.startsWith('A16.07.017') ||
		trimmed.startsWith('A16.07.016') ||
		trimmed.startsWith('A16.07.011') ||
		trimmed.startsWith('A16.07.012')
	) {
		return 'surgery';
	}
	if (trimmed.startsWith('A16.07.004')) {
		return 'anesthesia';
	}
	if (
		trimmed.startsWith('A16.07.002') ||
		trimmed.startsWith('A16.07.008') ||
		trimmed.startsWith('A16.07.030') ||
		trimmed.startsWith('A16.07.082') ||
		trimmed.startsWith('A16.07.091') ||
		trimmed.startsWith('A16.07.003')
	) {
		return 'therapy';
	}
	return 'other';
}
