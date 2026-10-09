/**
 * Medical Service Code Classification & Expense Filtering (Layer 1)
 * Compliance with Decree of the Government of the Russian Federation № 458 and Order № 804n
 */

/**
 * Классификация медицинской услуги для социального налогового вычета (Приказ № 804н / ПП РФ № 458):
 * - Код "02" (дорогостоящее лечение):
 *   * Дентальная имплантация (A16.07.054)
 *   * Синус-лифтинг (A16.07.055)
 *   * Костная пластика / остеопластика (A16.07.041)
 *   * Аугментация альвеолярного отростка (A16.07.006.002)
 *   * Скуловые имплантаты Zygoma (A16.07.056)
 *   * Сложное челюстно-лицевое протезирование на имплантатах (A16.07.023)
 * - Код "01" (обычное лечение): терапия, эндодонтия, ортодонтия, профгигиена, стандартная диагностика.
 */
export function classifyNdflServiceCode(serviceName?: string, code804n?: string): "1" | "2" {
	const codeNorm = (code804n || "").trim().toUpperCase();
	if (
		codeNorm.startsWith("A16.07.054") ||
		codeNorm.startsWith("A16.07.055") ||
		codeNorm.startsWith("A16.07.041") ||
		codeNorm.startsWith("A16.07.056") ||
		codeNorm.startsWith("A16.07.023") ||
		codeNorm.startsWith("A16.07.006.002")
	) {
		return "2";
	}

	const nameNorm = (serviceName || "").toLowerCase();
	const expensiveKeywords = [
		"имплант",
		"имплантац",
		"синус-лифтинг",
		"синуслифтинг",
		"костная пластика",
		"остеопластик",
		"аугментаци",
		"расщепление альвеоляр",
		"зигома",
		"zygoma",
		"all-on-4",
		"all-on-6",
		"all on 4",
		"all on 6",
		"bio-oss",
		"bio-gide",
		"био-осс",
		"био-гайд",
	];

	if (expensiveKeywords.some((kw) => nameNorm.includes(kw))) {
		return "2";
	}

	return "1";
}

/**
 * Проверка, является ли позиция сопутствующим товаром (зубные щетки, пасты, ирригаторы).
 * По ст. 219 НК РФ вычет предоставляется ТОЛЬКО на медицинские услуги.
 * Сопутствующие товары исключаются из справки.
 */
export function isNonMedicalGood(name?: string, category?: string): boolean {
	const catNorm = (category || "").toLowerCase();
	if (
		[
			"goods",
			"retail",
			"merchandise",
			"hygiene_products",
			"non_medical",
			"товары",
			"сопутствующие",
			"сопутствующие товары",
		].includes(catNorm)
	) {
		return true;
	}

	const nameNorm = (name || "").toLowerCase();
	const retailKeywords = [
		"щетк",
		"паст",
		"ирригатор",
		"нить",
		"флосс",
		"ополаскивател",
		"ершик",
		"ёршик",
		"косметик",
		"набор гигиен",
		"набор для отбеливан",
		"пенка для полост",
		"домашн",
		"гель для отбеливан",
		"бокс для капп",
		"футляр",
		"жвачка",
		"леденц",
		"товар",
		"сувенир",
	];

	return retailKeywords.some((kw) => nameNorm.includes(kw));
}

/**
 * Проверка, является ли платеж оплатой по ДМС страховой компанией.
 * По ст. 219 НК РФ суммы, оплаченные страховой компанией по договору ДМС,
 * НЕ включаются в налоговый вычет пациента (включается только личная франшиза/доплата).
 */
export function isDmsInsurancePayment(method?: string, note?: string): boolean {
	const methodNorm = (method || "").toLowerCase();
	if (["insurance", "dms", "страховая", "страхование"].includes(methodNorm)) {
		return true;
	}

	const noteNorm = (note || "").toLowerCase();
	if (
		noteNorm.includes("дмс") ||
		noteNorm.includes("страховая выплата") ||
		noteNorm.includes("страховая компания") ||
		noteNorm.includes("полис дмс")
	) {
		return true;
	}

	return false;
}
