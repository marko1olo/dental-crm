/**
 * packages/shared/src/clinical/bundles/therapyBundles.ts
 * Therapy Diagnosis Bundles: Caries (K02.1), Pulpitis 1-channel & 3-channel (K04.0).
 * Mandates 8b, 8e, 8x, 8ap. Integer kopecks without float drift.
 */

import { type CanonicalDiagnosisBundle, createCanonicalService } from "./bundleTypes.js";

export const CARIES_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "caries",
	diagnosisIcd10: "K02.1",
	diagnosisTitle: "Кариес дентина",
	toothState: "Caries",
	title: "Лечение кариеса",
	shortLabel: "Пакет: Лечение кариеса (K02.1)",
	badge: "Анестезия + Коффердам + Препарирование + Пломба + Полировка",
	defaultTotalPriceKopecks: 750000,
	defaultTotalPriceRub: 7500,
	services: [
		createCanonicalService({ id: "caries_anesth", serviceCode: "A11.07.012", title: "Анестезия инфильтрационная (или проводниковая)", defaultPriceKopecks: 120000, defaultPriceRub: 1200, requiredByDefault: true, category: "Анестезия" }),
		createCanonicalService({ id: "caries_cofferdam", serviceCode: "A16.07.002.001", title: "Наложение коффердама", defaultPriceKopecks: 80000, defaultPriceRub: 800, requiredByDefault: true, category: "Терапия" }),
		createCanonicalService({ id: "caries_prep", serviceCode: "A16.07.002", title: "Препарирование кариозной полости", defaultPriceKopecks: 100000, defaultPriceRub: 1000, requiredByDefault: true, category: "Терапия" }),
		createCanonicalService({ id: "caries_restoration", serviceCode: "A16.07.002.010", title: "Восстановление зуба пломбой светового отверждения (I, II, III класс)", defaultPriceKopecks: 400000, defaultPriceRub: 4000, requiredByDefault: true, category: "Терапия" }),
		createCanonicalService({ id: "caries_polishing", serviceCode: "A16.07.002.011", title: "Шлифовка и полировка пломбы", defaultPriceKopecks: 50000, defaultPriceRub: 500, requiredByDefault: true, category: "Терапия" }),
	],
};

export const PULPITIS_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "endo_1",
	diagnosisIcd10: "K04.0",
	diagnosisTitle: "Пульпит",
	toothState: "Pulpitis",
	title: "Эндодонтия (1-й этап)",
	shortLabel: "Пакет: Эндодонтия 1-й этап (K04.0)",
	badge: "Анестезия + Коффердам + Экстирпация + Обработка каналов + Временная пломба",
	defaultTotalPriceKopecks: 880000,
	defaultTotalPriceRub: 8800,
	services: [
		createCanonicalService({ id: "endo_anesth", serviceCode: "A11.07.012", title: "Анестезия инфильтрационная (или проводниковая)", defaultPriceKopecks: 120000, defaultPriceRub: 1200, requiredByDefault: true, category: "Анестезия" }),
		createCanonicalService({ id: "endo_cofferdam", serviceCode: "A16.07.002.001", title: "Наложение коффердама", defaultPriceKopecks: 80000, defaultPriceRub: 800, requiredByDefault: true, category: "Терапия" }),
		createCanonicalService({ id: "endo_extirpation", serviceCode: "A16.07.030.001", title: "Экстирпация пульпы (депульпирование)", defaultPriceKopecks: 200000, defaultPriceRub: 2000, requiredByDefault: true, category: "Эндодонтия" }),
		createCanonicalService({ id: "endo_prep_canals", serviceCode: "A16.07.030.002", title: "Механическая и медикаментозная обработка корневого канала", defaultPriceKopecks: 330000, defaultPriceRub: 3300, requiredByDefault: true, category: "Эндодонтия" }),
		createCanonicalService({ id: "endo_temp_fill", serviceCode: "A16.07.030.004", title: "Временное пломбирование корневого канала лекарственным препаратом / Временная пломба", defaultPriceKopecks: 150000, defaultPriceRub: 1500, requiredByDefault: true, category: "Эндодонтия" }),
	],
};

export const PULPITIS_3CANAL_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "endo_3canals",
	diagnosisIcd10: "K04.0",
	diagnosisTitle: "Пульпит трехканального зуба",
	toothState: "Pulpitis",
	title: "Эндодонтия моляра (3 канала)",
	shortLabel: "Пакет: Эндодонтия 3 канала (K04.0)",
	badge: "Анестезия + Коффердам + Обработка 3 каналов + Обтурация гуттаперчей + Пломба",
	defaultTotalPriceKopecks: 1450000,
	defaultTotalPriceRub: 14500,
	services: [
		createCanonicalService({ id: "endo3_anesth", serviceCode: "A11.07.012", title: "Анестезия проводниковая/инфильтрационная", defaultPriceKopecks: 120000, defaultPriceRub: 1200, requiredByDefault: true, category: "Анестезия" }),
		createCanonicalService({ id: "endo3_cofferdam", serviceCode: "A16.07.002.001", title: "Наложение коффердама", defaultPriceKopecks: 80000, defaultPriceRub: 800, requiredByDefault: true, category: "Терапия" }),
		createCanonicalService({ id: "endo3_prep_3canals", serviceCode: "A16.07.030.003", title: "Механическая и медикаментозная обработка 3 корневых каналов", defaultPriceKopecks: 550000, defaultPriceRub: 5500, requiredByDefault: true, category: "Эндодонтия" }),
		createCanonicalService({ id: "endo3_seal_3canals", serviceCode: "A16.07.008.003", title: "Пломбирование 3 корневых каналов гуттаперчей", defaultPriceKopecks: 350000, defaultPriceRub: 3500, requiredByDefault: true, category: "Эндодонтия" }),
		createCanonicalService({ id: "endo3_restoration", serviceCode: "A16.07.002.010", title: "Восстановление зуба пломбой светового отверждения", defaultPriceKopecks: 350000, defaultPriceRub: 3500, requiredByDefault: true, category: "Терапия" }),
	],
};
