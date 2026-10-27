/**
 * packages/shared/src/clinical/bundles/orthoAndProstheticBundles.ts
 * Orthodontic & Prosthetic Bundles: Ceramic/Zirconia Crown (K08.2), Braces Fixation (K07.2).
 * Mandates 8b, 8e, 8x, 8ap. Integer kopecks without float drift.
 */

import { type CanonicalDiagnosisBundle, createCanonicalService } from "./bundleTypes.js";

export const CROWN_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "crown",
	diagnosisIcd10: "K08.2",
	diagnosisTitle: "Потеря коронковой части зуба",
	toothState: "Crown",
	title: "Коронка постоянная",
	shortLabel: "Пакет: Коронка постоянная (K08.2)",
	badge: "Анестезия + Препарирование + Слепки + Фиксация коронки",
	defaultTotalPriceKopecks: 2400000,
	defaultTotalPriceRub: 24000,
	services: [
		createCanonicalService({ id: "crown_anesth", serviceCode: "A11.07.012", title: "Анестезия инфильтрационная (или проводниковая)", defaultPriceKopecks: 120000, defaultPriceRub: 1200, requiredByDefault: true, category: "Анестезия" }),
		createCanonicalService({ id: "crown_prep", serviceCode: "A16.07.004", title: "Препарирование зуба под искусственную коронку", defaultPriceKopecks: 250000, defaultPriceRub: 2500, requiredByDefault: true, category: "Ортопедия" }),
		createCanonicalService({ id: "crown_impression", serviceCode: "A02.07.010", title: "Снятие двухслойного слепка силиконовой массой", defaultPriceKopecks: 180000, defaultPriceRub: 1800, requiredByDefault: true, category: "Ортопедия" }),
		createCanonicalService({ id: "crown_fixation", serviceCode: "A16.07.004.002", title: "Восстановление зуба коронкой постоянной безметалловой", defaultPriceKopecks: 1850000, defaultPriceRub: 18500, requiredByDefault: true, category: "Ортопедия" }),
	],
};

export const BRACES_FIXATION_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "ortho_braces",
	diagnosisIcd10: "K07.2",
	diagnosisTitle: "Аномалии соотношения зубных дуг",
	toothState: "Orthodontic",
	title: "Фиксация брекет-системы",
	shortLabel: "Пакет: Фиксация брекетов (K07.2)",
	badge: "Подготовка эмали + Фиксация замков и брекетов + Установка первой дуги",
	defaultTotalPriceKopecks: 4500000,
	defaultTotalPriceRub: 45000,
	services: [
		createCanonicalService({ id: "braces_prep", serviceCode: "A16.07.047.001", title: "Профессиональная подготовка эмали перед фиксацией аппаратуры", defaultPriceKopecks: 300000, defaultPriceRub: 3000, requiredByDefault: true, category: "Ортодонтия" }),
		createCanonicalService({ id: "braces_bonding", serviceCode: "A16.07.047", title: "Фиксация несъемного ортодонтического аппарата (брекет-система на 1 челюсть)", defaultPriceKopecks: 3700000, defaultPriceRub: 37000, requiredByDefault: true, category: "Ортодонтия" }),
		createCanonicalService({ id: "braces_archwire", serviceCode: "A16.07.048", title: "Установка и активация начальной никель-титановой дуги (Ni-Ti)", defaultPriceKopecks: 500000, defaultPriceRub: 5000, requiredByDefault: true, category: "Ортодонтия" }),
	],
};

export const TOOTH_804N_PRESETS = {
	cariesFilling: { serviceId: "caries_restoration_804n", serviceCode: "A16.07.002.010", code804n: "A16.07.002.010", name: "Восстановление зуба пломбой световой", priceRub: 4500, priceKopecks: 450000, quantity: 1, category: "Терапия" },
	endoCanals: { serviceId: "endo_canals_804n", serviceCode: "A16.07.030", code804n: "A16.07.030", name: "Пульпотомия / Лечение каналов", priceRub: 3500, priceKopecks: 350000, quantity: 1, category: "Эндодонтия" },
	crownZirconia: { serviceId: "crown_zirconia_804n", serviceCode: "A16.07.004", code804n: "A16.07.004", name: "Коронка металлокерамическая / диоксид циркония", priceRub: 24000, priceKopecks: 2400000, quantity: 1, category: "Ортопедия" },
	extractionPermanent: { serviceId: "extraction_permanent_804n", serviceCode: "A16.07.001", code804n: "A16.07.001", name: "Удаление постоянного зуба (простое)", priceRub: 3500, priceKopecks: 350000, quantity: 1, category: "Хирургия" },
	extractionSimple: { serviceId: "extraction_simple_804n", serviceCode: "A16.07.001", code804n: "A16.07.001", name: "Удаление постоянного зуба (простое)", priceRub: 3500, priceKopecks: 350000, quantity: 1, category: "Хирургия" },
	extractionComplex: { serviceId: "extraction_complex_804n", serviceCode: "A16.07.001.001", code804n: "A16.07.001.001", name: "Удаление зуба сложное с разъединением корней", priceRub: 6000, priceKopecks: 600000, quantity: 1, category: "Хирургия" },
	extractionImpacted: { serviceId: "extraction_impacted_804n", serviceCode: "A16.07.001.002", code804n: "A16.07.001.002", name: "Удаление ретинированного / дистопированного зуба", priceRub: 9500, priceKopecks: 950000, quantity: 1, category: "Хирургия" },
	sinusLift: { serviceId: "sinus_lift_804n", serviceCode: "A16.07.041.001", code804n: "A16.07.041.001", name: "Синус-лифтинг закрытый / открытый", priceRub: 18000, priceKopecks: 1800000, quantity: 1, category: "Хирургия" },
	boneGraft: { serviceId: "bone_graft_804n", serviceCode: "A16.07.041", code804n: "A16.07.041", name: "Костная пластика альвеолярного отростка", priceRub: 35000, priceKopecks: 3500000, quantity: 1, category: "Хирургия" },
	anesthesiaInfiltration: { serviceId: "anesthesia_infilt_804n", serviceCode: "A11.07.012", code804n: "A11.07.012", name: "Анестезия инфильтрационная", priceRub: 1200, priceKopecks: 120000, quantity: 1, category: "Анестезия" },
} as const;

export const TOOTH_SERVICE_PRESETS = TOOTH_804N_PRESETS;
