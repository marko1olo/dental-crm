/**
 * packages/shared/src/clinical/bundles/surgeryBundles.ts
 * Surgery Diagnosis Bundles: Simple & Complex Extraction, Implantation.
 * Mandates 8b, 8e, 8x, 8ap. Integer kopecks without float drift.
 */

import { type CanonicalDiagnosisBundle, createCanonicalService } from "./bundleTypes.js";

export const EXTRACTION_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "surgery_extraction",
	diagnosisIcd10: "K08.1",
	diagnosisTitle: "Потеря зубов вследствие удаления",
	toothState: "Missing",
	title: "Удаление зуба",
	shortLabel: "Пакет: Удаление зуба (K08.1)",
	badge: "Анестезия + Удаление + Местный гемостаз",
	defaultTotalPriceKopecks: 550000,
	defaultTotalPriceRub: 5500,
	services: [
		createCanonicalService({ id: "extract_anesth", serviceCode: "A11.07.012", title: "Анестезия инфильтрационная (или проводниковая)", defaultPriceKopecks: 120000, defaultPriceRub: 1200, requiredByDefault: true, category: "Анестезия" }),
		createCanonicalService({ id: "extract_tooth", serviceCode: "A16.07.001.001", title: "Удаление постоянного зуба", defaultPriceKopecks: 350000, defaultPriceRub: 3500, requiredByDefault: true, category: "Хирургия" }),
		createCanonicalService({ id: "extract_hemostasis", serviceCode: "A16.07.001.002", title: "Остановка луночного кровотечения / местный гемостаз", defaultPriceKopecks: 80000, defaultPriceRub: 800, requiredByDefault: true, category: "Хирургия" }),
	],
};

export const EXTRACTION_COMPLEX_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "surgery_extraction_complex",
	diagnosisIcd10: "K01.1",
	diagnosisTitle: "Ретинированный или дистопированный зуб",
	toothState: "ExtractionIndicated",
	title: "Сложное удаление зуба",
	shortLabel: "Пакет: Сложное удаление (K01.1)",
	badge: "Анестезия + Сложное удаление с выпиливанием + Наложение швов + Гемостаз",
	defaultTotalPriceKopecks: 850000,
	defaultTotalPriceRub: 8500,
	services: [
		createCanonicalService({ id: "ext_comp_anesth", serviceCode: "A11.07.012", title: "Анестезия проводниковая глубокая", defaultPriceKopecks: 120000, defaultPriceRub: 1200, requiredByDefault: true, category: "Анестезия" }),
		createCanonicalService({ id: "ext_comp_tooth", serviceCode: "A16.07.001.003", title: "Сложное удаление зуба с разъединением корней и фрагментацией", defaultPriceKopecks: 550000, defaultPriceRub: 5500, requiredByDefault: true, category: "Хирургия" }),
		createCanonicalService({ id: "ext_comp_suture", serviceCode: "A16.07.097", title: "Наложение швов на слизистую оболочку полости рта", defaultPriceKopecks: 100000, defaultPriceRub: 1000, requiredByDefault: true, category: "Хирургия" }),
		createCanonicalService({ id: "ext_comp_sponge", serviceCode: "A16.07.001.002", title: "Внесение гемостатической коллагеновой губки в лунку", defaultPriceKopecks: 80000, defaultPriceRub: 800, requiredByDefault: true, category: "Хирургия" }),
	],
};

export const IMPLANT_PLACEMENT_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "implant_stage_1",
	diagnosisIcd10: "K08.1",
	diagnosisTitle: "Вторичная адентия (подготовка к имплантации)",
	toothState: "Missing",
	title: "Дентальная имплантация (хирургический этап)",
	shortLabel: "Пакет: Имплантация 1-й этап (K08.1)",
	badge: "Анестезия + Формирование ложа + Установка имплантата + Швы",
	defaultTotalPriceKopecks: 3800000,
	defaultTotalPriceRub: 38000,
	services: [
		createCanonicalService({ id: "imp_anesth", serviceCode: "A11.07.012", title: "Анестезия инфильтрационная и проводниковая", defaultPriceKopecks: 150000, defaultPriceRub: 1500, requiredByDefault: true, category: "Анестезия" }),
		createCanonicalService({ id: "imp_bed_prep", serviceCode: "A16.07.054.001", title: "Формирование костного ложа под дентальный имплантат", defaultPriceKopecks: 650000, defaultPriceRub: 6500, requiredByDefault: true, category: "Хирургия" }),
		createCanonicalService({ id: "imp_fixture", serviceCode: "A16.07.054", title: "Внутрикостная дентальная имплантация (титановый винт SLA)", defaultPriceKopecks: 2800000, defaultPriceRub: 28000, requiredByDefault: true, category: "Хирургия" }),
		createCanonicalService({ id: "imp_suture", serviceCode: "A16.07.097", title: "Наложение швов нерассасывающейся нитью (Prolene)", defaultPriceKopecks: 200000, defaultPriceRub: 2000, requiredByDefault: true, category: "Хирургия" }),
	],
};
