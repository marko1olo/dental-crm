/**
 * packages/shared/src/clinical/bundles/hygieneAndPerioBundles.ts
 * Hygiene & Periodontology Diagnosis Bundles: Scaling & Air-Flow (K05.3), Periodontitis (K04.7).
 * Mandates 8b, 8e, 8x, 8ap. Integer kopecks without float drift.
 */

import { type CanonicalDiagnosisBundle, createCanonicalService } from "./bundleTypes.js";

export const HYGIENE_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "hygiene",
	diagnosisIcd10: "K05.3",
	diagnosisTitle: "Хронический пародонтит / Зубные отложения",
	toothState: "Healthy",
	title: "Профгигиена полости рта",
	shortLabel: "Пакет: Профгигиена (K05.3)",
	badge: "УЗ-скейлинг + AirFlow + Полировка + Фторирование",
	defaultTotalPriceKopecks: 650000,
	defaultTotalPriceRub: 6500,
	services: [
		createCanonicalService({ id: "hyg_ultrasound", serviceCode: "A16.07.050.001", title: "Ультразвуковое удаление зубных отложений (скейлинг)", defaultPriceKopecks: 250000, defaultPriceRub: 2500, requiredByDefault: true, category: "Гигиена" }),
		createCanonicalService({ id: "hyg_airflow", serviceCode: "A16.07.050.002", title: "Удаление пигментированного налета аппаратом Air-Flow", defaultPriceKopecks: 220000, defaultPriceRub: 2200, requiredByDefault: true, category: "Гигиена" }),
		createCanonicalService({ id: "hyg_polish", serviceCode: "A16.07.050.003", title: "Полировка всех зубов профессиональными абразивными пастами", defaultPriceKopecks: 80000, defaultPriceRub: 800, requiredByDefault: true, category: "Гигиена" }),
		createCanonicalService({ id: "hyg_fluoride", serviceCode: "A11.07.012", title: "Глубокое фторирование эмали (реминерализация)", defaultPriceKopecks: 100000, defaultPriceRub: 1000, requiredByDefault: true, category: "Гигиена" }),
	],
};

export const PERIODONTITIS_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "periodontitis",
	diagnosisIcd10: "K04.7",
	diagnosisTitle: "Хронический апикальный периодонтит",
	toothState: "Periodontitis",
	title: "Лечение периодонтита",
	shortLabel: "Пакет: Лечение периодонтита (K04.7)",
	badge: "Анестезия + Коффердам + Распломбирование + Обработка + Ca(OH)2",
	defaultTotalPriceKopecks: 960000,
	defaultTotalPriceRub: 9600,
	services: [
		createCanonicalService({ id: "perio_anesth", serviceCode: "A11.07.012", title: "Анестезия инфильтрационная (или проводниковая)", defaultPriceKopecks: 120000, defaultPriceRub: 1200, requiredByDefault: true, category: "Анестезия" }),
		createCanonicalService({ id: "perio_cofferdam", serviceCode: "A16.07.002.001", title: "Наложение коффердама", defaultPriceKopecks: 80000, defaultPriceRub: 800, requiredByDefault: true, category: "Терапия" }),
		createCanonicalService({ id: "perio_unsealing", serviceCode: "A16.07.082", title: "Распломбирование корневого канала", defaultPriceKopecks: 250000, defaultPriceRub: 2500, requiredByDefault: true, category: "Эндодонтия" }),
		createCanonicalService({ id: "perio_prep_canals", serviceCode: "A16.07.030.002", title: "Механическая и медикаментозная обработка корневого канала", defaultPriceKopecks: 330000, defaultPriceRub: 3300, requiredByDefault: true, category: "Эндодонтия" }),
		createCanonicalService({ id: "perio_caoh2", serviceCode: "A16.07.091", title: "Временная обтурация корневого канала гидроксидом кальция (Ca(OH)2)", defaultPriceKopecks: 180000, defaultPriceRub: 1800, requiredByDefault: true, category: "Эндодонтия" }),
	],
};
