/**
 * packages/shared/src/clinical/bundles/hygieneAndPerioBundles.ts
 * Hygiene & Periodontology Diagnosis Bundles: Scaling & Air-Flow (K05.3), Periodontitis (K04.7).
 * Mandates 8b, 8e, 8x, 8ap. Integer kopecks without float drift.
 */

import { type CanonicalDiagnosisBundle, createCanonicalService } from "./bundleTypes.js";
import type { DoctorAutopilotPreset } from "../presets/types.js";

export const AUTOPILOT_HYGIENE_AIRFLOW: DoctorAutopilotPreset = {
	id: "autopilot_hygiene_airflow",
	title: "Профгигиена / Air-Flow — УЗ-скейлинг EMS/Piezon, Air-Flow порошок на основе глицина, полировочная паста Cleanic, фторлак",
	shortBadge: "Гигиена",
	category: "hygiene",
	icd10: "K03.6",
	icd10Label: "Отложения (наросты) на зубах / Зубной камень",
	toothState: "Healthy",
	is1ClickAutopilot: true,
	complaint: "Жалобы на пигментированный налет от кофе/чая, зубной камень, кровоточивость десен при чистке. Плановая профессиональная гигиена полости рта.",
	anamnesis: "Последняя профгигиена проводилась более 6 месяцев назад. Аллергии нет, соматически здоров. Информированное согласие (ИДС) оформлено.",
	statusLocalis: "Минерализованный над- и поддесневой зубной камень, пигментированный налет. Десна гиперемирована, отечна, кровоточивость при зондировании (BOP+). Пародонтальных карманов нет.",
	treatmentDescription:
		"1. Индикация зубных отложений раствором фуксина, аппликационное обезболивание десны гелем (Лидокаин 2%).\n" +
		"2. Ультразвуковой скейлинг скейлером EMS Piezon Master с водяным охлаждением (A16.07.051).\n" +
		"3. Воздушно-абразивная обработка Air-Flow мелкодисперсным порошком глицина 25 мкм (щадящая для эмали и поддесневых зон).\n" +
		"4. Полировка поверхностей зубов пастой Cleanic с циркулярными щеточками до зеркального блеска, межзубный флосс и штрипсы.\n" +
		"5. Антисептическая обработка десневого края 0.05% хлоргексидином.\n" +
		"6. Реминерализующая терапия: аппликация защитного фторлака (Clinpro White Varnish / Bifluorid 12).\n" +
		"7. Обучение индивидуальной гигиене, подбор зубных щеток, ершиков и ирригатора.",
	service804n: {
		code804n: "A16.07.051",
		title: "Комплексная профессиональная гигиена полости рта (УЗ-скейлинг EMS/Piezon, Air-Flow порошок глицин, полировочная паста Cleanic, фторлак)",
		basePriceRub: 5000,
		category: "hygiene",
	},
	informedConsent: "Информированное добровольное согласие (ИДС) на проведение профессиональной гигиены полости рта подписано.",
	materialsToDeduct: [
		{ name: "Air-Flow порошок на основе глицина EMS Plus", category: "hygiene", unit: "г", quantity: 25, unitCostRub: 18 },
		{ name: "Полировочная паста Cleanic", category: "hygiene", unit: "г", quantity: 3, unitCostRub: 40 },
		{ name: "Защитный фторлак Clinpro White Varnish / Bifluorid 12", category: "hygiene", unit: "мл", quantity: 0.5, unitCostRub: 640 },
		{ name: "Ретрактор мягкий для губ OptraGate", category: "hygiene", unit: "шт.", quantity: 1, unitCostRub: 210 },
		{ name: "Раствор хлоргексидина биглюконата 0.05%", category: "hygiene", unit: "мл", quantity: 15, unitCostRub: 3 },
	],
	recommendations: "«Белая диета» 24 часа (без кофе, чая, ягод, курения). Замена зубной щетки. Плановый осмотр и гигиена через 6 месяцев.",
};

export const AUTOPILOT_HYGIENE_K051: DoctorAutopilotPreset = {
	...AUTOPILOT_HYGIENE_AIRFLOW,
	id: "autopilot_hygiene_k051",
	title: "Профгигиена полости рта (K05.1) — УЗ-скейлинг EMS/Piezon, Air-Flow глицин, полировка Cleanic, глубокое фторирование",
	shortBadge: "Профгигиена",
	category: "hygiene",
	icd10: "K05.1",
	icd10Label: "Хронический катаральный гингивит / Профгигиена",
	service804n: {
		code804n: "A16.07.051",
		title: "Комплексная профессиональная гигиена полости рта (УЗ-скейлинг EMS/Piezon, Air-Flow глицин, паста Cleanic, фторирование)",
		basePriceRub: 5000,
		category: "hygiene",
	},
};

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
