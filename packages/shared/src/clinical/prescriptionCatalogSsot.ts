/**
 * packages/shared/src/clinical/prescriptionCatalogSsot.ts
 *
 * CANONICAL SSOT: Dental Outpatient Prescription & Pharmacotherapy Formulary.
 * Fully compliant with Order No. 1094n, Russian Dental Association (СтАР), Vidal and GRLS.
 *
 * Covers 5 Core Dental Pharmacological Groups:
 * 1. Broad-Spectrum Antibiotics (Amoxicillin+Clavulanate, Azithromycin, Clindamycin, Cifran ST)
 * 2. NSAIDs / Analgesics (Nimesulide, Ibuprofen, Ketorolac)
 * 3. Antiseptics & Rinses (Chlorhexidine 0.05%, Miramistin 0.01%, Stomatofit)
 * 4. Antihistamines / Anti-edema (Suprastin, Cetirizine)
 * 5. Periodontal & Wound Healing Gels/Pastes (Metrogyl Denta, Solcoseryl/Asepta, Cholisal)
 * + Gastroprotection (Omeprazole)
 */

import {
	type DentalCatalogMedicationItem,
	type DentalDosageFormMeta,
	type DentalDrugTherapeuticClass,
	type DentalMedicationForm,
	formatPrescriptionSignature as baseFormatSignature,
} from "./prescriptionCatalogTypes.js";
import type { DentalRxPreset } from "./prescriptionRxSets.js";

export type {
	DentalCatalogMedicationItem,
	DentalDosageFormMeta,
	DentalDrugTherapeuticClass,
	DentalMedicationForm,
	DentalRxPreset,
};


export interface DentalSsotMedicationItem extends DentalCatalogMedicationItem {
	readonly latinRp: string;
	readonly adultDosageRu: string;
	readonly pediatricDosageRu: string;
	readonly courseDaysRu: string;
	readonly contraindicationsRu: readonly string[];
	readonly criticalIncompatibilitiesRu: readonly string[];
}

export const DENTAL_CANONICAL_SSOT_MEDICATIONS: readonly DentalSsotMedicationItem[] = [
	// ── 1. АНТИБИОТИКИ ШИРОКОГО СПЕКТРА ──
	{
		id: "amoxiclav_875_125",
		tradeNameRu: "Амоксиклав (875+125 мг)",
		activeSubstanceRu: "Амоксициллин + Клавулановая кислота",
		innLatin: "Amoxicillini + Acidi clavulanici",
		category: "antibiotic", categoryLabelRu: "Антибактериальные",
		form: "tablets_coated", formRu: "таблетки, покрытые пленочной оболочкой", dosageRu: "875 мг + 125 мг",
		routeRu: "Внутрь (перорально)", frequencyRu: "По 1 таб. 2 раза в сутки (каждые 12 ч) в начале еды",
		quantityDefault: "N. 14", dispenseLatin: "D.t.d. N 14 in tab.", requiresPrescription: true, validityDays: 60,
		signaRu: "S. Внутрь по 1 таблетке 2 раза в день во время еды, 7 дней.",
		latinRp: "Rp.: Amoxicillini 875 mg + Acidi clavulanici 125 mg",
		adultDosageRu: "По 1 таблетке (875+125 мг) 2 раза в сутки во время еды, 7 дней.",
		pediatricDosageRu: "Детям с массой тела < 40 кг — суспензия 25–45 мг/кг/сут в 2-3 приема.",
		courseDaysRu: "7 дней",
		contraindicationsRu: ["Гиперчувствительность к пенициллинам и бета-лактамам", "Инфекционный мононуклеоз", "Холестатическая желтуха/дисфункция печени"],
		criticalIncompatibilitiesRu: ["Пенициллины при аллергии на бета-лактамы (риск анафилаксии)", "Метотрексат (повышение токсичности)", "Непрямые антикоагулянты (риск кровотечений)"],
	},
	{
		id: "amoxiclav_500_125",
		tradeNameRu: "Амоксиклав (500+125 мг)",
		activeSubstanceRu: "Амоксициллин + Клавулановая кислота",
		innLatin: "Amoxicillini + Acidi clavulanici",
		category: "antibiotic", categoryLabelRu: "Антибактериальные",
		form: "tablets_coated", formRu: "таблетки, покрытые пленочной оболочкой", dosageRu: "500 мг + 125 мг",
		routeRu: "Внутрь (перорально)", frequencyRu: "По 1 таб. 3 раза в сутки (каждые 8 ч) во время еды",
		quantityDefault: "N. 14", dispenseLatin: "D.t.d. N 14 in tab.", requiresPrescription: true, validityDays: 60,
		signaRu: "S. Внутрь по 1 таблетке 3 раза в день во время еды, 5-7 дней.",
		latinRp: "Rp.: Amoxicillini 500 mg + Acidi clavulanici 125 mg",
		adultDosageRu: "По 1 таблетке (500+125 мг) 3 раза в сутки каждые 8 часов, 5-7 дней.",
		pediatricDosageRu: "Детям старше 12 лет (>40 кг) — взрослая доза; до 12 лет — суспензия.",
		courseDaysRu: "5-7 дней",
		contraindicationsRu: ["Гиперчувствительность к пенициллинам", "Инфекционный мононуклеоз", "Печеночная недостаточность"],
		criticalIncompatibilitiesRu: ["Пенициллиновая аллергия", "Аллопуринол (риск кожной экзантемы)"],
	},
	{
		id: "azithromycin_500",
		tradeNameRu: "Азитромицин (Сумамед 500 мг)",
		activeSubstanceRu: "Азитромицин",
		innLatin: "Azithromycini",
		category: "antibiotic", categoryLabelRu: "Антибактериальные (Макролиды)",
		form: "tablets_coated", formRu: "таблетки, покрытые пленочной оболочкой", dosageRu: "500 мг",
		routeRu: "Внутрь (перорально)", frequencyRu: "По 1 таб. 1 раз в сутки за 1 час до еды или через 2 часа после еды",
		quantityDefault: "N. 3", dispenseLatin: "D.t.d. N 3 in tab.", requiresPrescription: true, validityDays: 60,
		signaRu: "S. Внутрь по 1 таблетке 1 раз в день за 1 час до еды, курс 3 дня.",
		latinRp: "Rp.: Azithromycini 500 mg",
		adultDosageRu: "500 мг 1 раз в сутки в течение 3 дней (курсовая доза 1.5 г).",
		pediatricDosageRu: "Детям с массой >45 кг — 500 мг 1 раз в день; от 3 лет — 10 мг/кг 1 раз в день 3 дня.",
		courseDaysRu: "3 дня",
		contraindicationsRu: ["Тяжелая печеночная или почечная недостаточность", "Удлинение интервала QT, аритмии", "Аллергия на макролиды"],
		criticalIncompatibilitiesRu: ["Антиаритмические средства (риск желудочковой тахикардии)", "Эрготамин (эрготизм)", "Антациды с алюминием и магнием"],
	},
	{
		id: "clindamycin_300",
		tradeNameRu: "Клиндамицин (Далацин Ц 300 мг)",
		activeSubstanceRu: "Клиндамицин",
		innLatin: "Clindamycini",
		category: "antibiotic", categoryLabelRu: "Антибактериальные (Линкозамиды)",
		form: "capsules", formRu: "капсулы", dosageRu: "300 мг",
		routeRu: "Внутрь (перорально)", frequencyRu: "По 1 капс. 4 раза в сутки (каждые 6 часов), запивая стаканом воды",
		quantityDefault: "N. 16", dispenseLatin: "D.t.d. N 16 in caps.", requiresPrescription: true, validityDays: 60,
		signaRu: "S. Внутрь по 1 капсуле 4 раза в день через 6 часов, 7 дней.",
		latinRp: "Rp.: Clindamycini 300 mg",
		adultDosageRu: "300 мг каждые 6 часов (1200 мг/сут), запивая стаканом воды, 7 дней.",
		pediatricDosageRu: "Детям старше 8 лет — 10–25 мг/кг/сут в 3-4 приема.",
		courseDaysRu: "7 дней",
		contraindicationsRu: ["Псевдомембранозный колит в анамнезе", "Язвенный колит", "Миастения", "Гиперчувствительность к линкозамидам"],
		criticalIncompatibilitiesRu: ["Эритромицин (антагонизм действия)", "Миорелаксанты периферического действия (потенцирование блокады)"],
	},
	{
		id: "cyfran_st_500_600",
		tradeNameRu: "Цифран СТ (500+600 мг)",
		activeSubstanceRu: "Ципрофлоксацин + Тинидазол",
		innLatin: "Ciprofloxacini + Tinidazoli",
		category: "antibiotic", categoryLabelRu: "Антибактериальные",
		form: "tablets_coated", formRu: "таблетки, покрытые пленочной оболочкой", dosageRu: "500 мг + 600 мг",
		routeRu: "Внутрь (перорально)", frequencyRu: "По 1 таб. 2 раза в сутки (каждые 12 ч) после еды",
		quantityDefault: "N. 10", dispenseLatin: "D.t.d. N 10 in tab.", requiresPrescription: true, validityDays: 60,
		signaRu: "S. Внутрь по 1 таблетке 2 раза в день после еды, 5 дней (алкоголь запрещен!).",
		latinRp: "Rp.: Ciprofloxacini 500 mg + Tinidazoli 600 mg",
		adultDosageRu: "1 таблетка 2 раза в день (каждые 12 часов) после еды, 5 дней.",
		pediatricDosageRu: "Противопоказан детям и подросткам до 18 лет.",
		courseDaysRu: "5 дней",
		contraindicationsRu: ["Возраст до 18 лет", "Беременность и лактация", "Органические поражения ЦНС, эпилепсия", "Патология кроветворения", "Удлинение интервала QT"],
		criticalIncompatibilitiesRu: ["Алкоголь (дисульфирамоподобная реакция тинидазола)", "Теофиллин (риск судорог)", "Антациды с Al/Mg", "Препараты, удлиняющие интервал QT"],
	},

	// ── 2. НПВП И АНАЛЬГЕТИКИ ──
	{
		id: "nimesil_100_sachet",
		tradeNameRu: "Нимесил / Найз (100 мг)",
		activeSubstanceRu: "Нимесулид",
		innLatin: "Nimesulidi",
		category: "nsaid", categoryLabelRu: "НПВП / Анальгетики",
		form: "sachet_granules", formRu: "саше / гранулы для суспензии", dosageRu: "100 мг",
		routeRu: "Внутрь (перорально)", frequencyRu: "По 1 пакетику 2 раза в сутки после еды",
		quantityDefault: "N. 10", dispenseLatin: "D.t.d. N 10 in gran.", requiresPrescription: true, validityDays: 60,
		signaRu: "S. Внутрь по 1 пакетику (100 мг) 2 раза в день после еды, растворив в 100 мл воды, 3-5 дней.",
		latinRp: "Rp.: Nimesulidi 100 mg",
		adultDosageRu: "100 мг 2 раза в сутки после еды. Максимальная суточная доза — 200 мг.",
		pediatricDosageRu: "Противопоказан детям до 12 лет.",
		courseDaysRu: "3-5 дней",
		contraindicationsRu: ["Язва желудка и 12-перстной кишки в фазе обострения", "ЖК-кровотечения в анамнезе", "Тяжелая печеночная/почечная недостаточность", "Аспириновая триада", "Беременность (III триместр)"],
		criticalIncompatibilitiesRu: ["НПВП при язве желудка (ульцерогенный пробой)", "Антикоагулянты (варфарин) и антиагреганты", "Гепатотоксичные средства и этанол"],
	},
	{
		id: "ibuprofen_400_tab",
		tradeNameRu: "Ибупрофен (Нурофен Форте 400 мг)",
		activeSubstanceRu: "Ибупрофен",
		innLatin: "Ibuprofeni",
		category: "nsaid", categoryLabelRu: "НПВП / Анальгетики",
		form: "tablets_coated", formRu: "таблетки, покрытые оболочкой", dosageRu: "400 мг",
		routeRu: "Внутрь (перорально)", frequencyRu: "По 1 таб. 2-3 раза в сутки после еды при боли",
		quantityDefault: "N. 20", dispenseLatin: "D.t.d. N 20 in tab.", requiresPrescription: false, validityDays: 60,
		signaRu: "S. Внутрь по 1 таблетке (400 мг) 2-3 раза в день после еды при боли, 3-5 дней.",
		latinRp: "Rp.: Ibuprofeni 400 mg",
		adultDosageRu: "400 мг каждые 6-8 часов при боли. Максимум 1200 мг/сут без рецепта.",
		pediatricDosageRu: "Детям от 6 лет (>20 кг) — 200 мг до 3 раз/сут (20-30 мг/кг/сут в суспензии).",
		courseDaysRu: "3-5 дней",
		contraindicationsRu: ["Обострение язвенной болезни ЖКТ", "Непереносимость НПВП (аспириновая астма)", "III триместр беременности", "Тяжелая сердечная недостаточность"],
		criticalIncompatibilitiesRu: ["Ацетилсалициловая кислота (снижение кардиопротекции)", "Метотрексат (повышение токсичности)", "Антикоагулянты"],
	},
	{
		id: "ibuprofen_suspension_100_5ml",
		tradeNameRu: "Ибупрофен (Нурофен для детей) суспензия 100 мг/5 мл",
		activeSubstanceRu: "Ибупрофен",
		innLatin: "Ibuprofeni",
		category: "nsaid", categoryLabelRu: "НПВС / Детский анальгетик",
		form: "suspension", formRu: "суспензия для приема внутрь", dosageRu: "100 мг/5 мл (фл. 100/150/200 мл)",
		routeRu: "Внутрь (перорально)", frequencyRu: "По расчету веса (10 мг/кг до 3 раз в сутки с интервалом не менее 6 часов)",
		quantityDefault: "N. 1", dispenseLatin: "D.t.d. N 1 in flac.", requiresPrescription: false, validityDays: 60,
		signaRu: "S. Внутрь с помощью мерного шприца из расчета 10 мг/кг (до 3 раз в сутки при боли/температуре).",
		latinRp: "Rp.: Suspensionis Ibuprofeni 100 mg/5 ml - 100 ml",
		adultDosageRu: "Для взрослых применяется таблетированная форма 400 мг.",
		pediatricDosageRu: "Разовая доза 10 мг/кг (0.5 мл на 1 кг массы тела) 3 раза в сутки с интервалом не менее 6 часов.",
		courseDaysRu: "3 дня",
		contraindicationsRu: ["Обострение язвенной болезни ЖКТ", "Непереносимость НПВП (аспириновая астма)", "Тяжелая почечная или печеночная недостаточность", "Возраст до 3 месяцев (<5 кг)"],
		criticalIncompatibilitiesRu: ["Другие НПВП (риск ульцерогенного эффекта)", "Антикоагулянты"],
	},
	{
		id: "ketorol_10_tab",
		tradeNameRu: "Кеторол (Кеторолак 10 мг)",
		activeSubstanceRu: "Кеторолак",
		innLatin: "Ketorolaci",
		category: "nsaid", categoryLabelRu: "НПВП / Анальгетики (Острая боль)",
		form: "tablets_coated", formRu: "таблетки, покрытые пленочной оболочкой", dosageRu: "10 мг",
		routeRu: "Внутрь (перорально)", frequencyRu: "По 1 таб. при выраженной боли (не более 4 таб./сутки)",
		quantityDefault: "N. 10", dispenseLatin: "D.t.d. N 10 in tab.", requiresPrescription: true, validityDays: 60,
		signaRu: "S. Внутрь по 1 таблетке при острой боли (не более 4 таб./сутки), не более 5 дней.",
		latinRp: "Rp.: Ketorolaci 10 mg",
		adultDosageRu: "10 мг каждые 4-6 часов при острой боли. Максимум 40 мг/сутки. Строго до 5 дней.",
		pediatricDosageRu: "Противопоказан детям до 16 лет.",
		courseDaysRu: "До 5 дней (максимум)",
		contraindicationsRu: ["Высокий риск ЖК-кровотечения", "Язвенная болезнь ЖКТ", "Гиповолемия и дегидратация", "Нарушения гемостаза", "Совместный прием других НПВП"],
		criticalIncompatibilitiesRu: ["Другие НПВП (категорически запрещено — резкий рост перфораций ЖКТ)", "Антикоагулянты (гепарин, варфарин)", "Пентоксифиллин, литий"],
	},

	// ── 3. АНТИСЕПТИКИ И ПОЛОСКАНИЯ ──
	{
		id: "chlorhexidine_005_sol",
		tradeNameRu: "Хлоргексидина биглюконат 0.05%",
		activeSubstanceRu: "Хлоргексидин",
		innLatin: "Chlorhexidini bigluconatis",
		category: "antiseptic", categoryLabelRu: "Антисептики и полоскания",
		form: "solution_oral_topical", formRu: "раствор для местного применения / ротовых ванночек", dosageRu: "0.05% 100 мл",
		routeRu: "Местно / В полость рта (ротовые ванночки)", frequencyRu: "Ротовые ванночки по 10-15 мл 2-3 раза в день по 1 минуте",
		quantityDefault: "N. 1", dispenseLatin: "D.t.d. N 1 in flac.", requiresPrescription: false, validityDays: 60,
		signaRu: "S. Ротовые ванночки по 15 мл 2-3 раза в день после еды по 1 минуте, 5-7 дней.",
		latinRp: "Rp.: Solutionis Chlorhexidini bigluconatis 0.05% 100 ml",
		adultDosageRu: "10-15 мл неразведенного раствора 2-3 раза в сутки по 1 минуте, 5-7 дней.",
		pediatricDosageRu: "Детям от 7 лет — ванночки под контролем взрослых (не глотать!).",
		courseDaysRu: "5-7 дней",
		contraindicationsRu: ["Гиперчувствительность к хлоргексидину", "Дерматиты"],
		criticalIncompatibilitiesRu: ["Мыло и ПАВ зубных паст (деактивируют хлоргексидин — применять через 30 мин)", "Препараты йода"],
	},
	{
		id: "miramistin_001_sol",
		tradeNameRu: "Мирамистин 0.01%",
		activeSubstanceRu: "Бензилдиметил-миристоиламино-пропиламмоний",
		innLatin: "Benzyldimethyl-myristoylamino-propylammonii",
		category: "antiseptic", categoryLabelRu: "Антисептики и полоскания",
		form: "solution_oral_topical", formRu: "раствор для местного применения с насадкой-распылителем", dosageRu: "0.01% 150 мл",
		routeRu: "Местно / В полость рта (орошения и полоскания)", frequencyRu: "Орошать 3-4 нажатиями распылителя или полоскать 3-4 раза в день",
		quantityDefault: "N. 1", dispenseLatin: "D.t.d. N 1 in flac.", requiresPrescription: false, validityDays: 60,
		signaRu: "S. Орошать полость рта 3-4 нажатиями распылителя 3-4 раза в день, 7-10 дней.",
		latinRp: "Rp.: Solutionis Miramistini 0.01% 150 ml",
		adultDosageRu: "10-15 мл раствора для полоскания или 3-4 распыления 3-4 раза в сутки, 7-10 дней.",
		pediatricDosageRu: "Детям от 3 лет — 1 нажатие (3-5 мл) 3 раза в день.",
		courseDaysRu: "7-10 дней",
		contraindicationsRu: ["Индивидуальная непереносимость мирамистина"],
		criticalIncompatibilitiesRu: ["Не выявлены (синергизм с антибиотиками)"],
	},
	{
		id: "stomatophyt_100_sol",
		tradeNameRu: "Стоматофит (100 мл)",
		activeSubstanceRu: "Экстракт лекарственных растений (кора дуба, ромашка, шалфей)",
		innLatin: "Extracti Stomatophyt",
		category: "antiseptic", categoryLabelRu: "Антисептики растительные",
		form: "solution_oral_topical", formRu: "экстракт жидкий для приготовления раствора для полоскания", dosageRu: "100 мл",
		routeRu: "Местно / В полость рта (полоскания в разведении)", frequencyRu: "10 мл развести в 50 мл теплой воды, полоскать 3-4 раза в день",
		quantityDefault: "N. 1", dispenseLatin: "D.t.d. N 1 in flac.", requiresPrescription: false, validityDays: 60,
		signaRu: "S. 10 мл развести в 50 мл теплой воды. Полоскать 3 раза в день, 10-15 дней.",
		latinRp: "Rp.: Extracti \"Stomatophyt\" 100 ml",
		adultDosageRu: "10 мл экстракта на 50 мл теплой воды 3-4 раза в день, 10-15 дней.",
		pediatricDosageRu: "Противопоказан детям до 12 лет (содержит этанол до 70%).",
		courseDaysRu: "10-15 дней",
		contraindicationsRu: ["Аллергия на сложноцветные растения (арника, ромашка)", "Детский возраст до 12 лет", "Беременность (содержит этанол)"],
		criticalIncompatibilitiesRu: ["Не установлены"],
	},

	// ── 4. АНТИГИСТАМИННЫЕ И ПРОТИВООТЕЧНЫЕ ──
	{
		id: "suprastin_25_tab",
		tradeNameRu: "Супрастин (25 мг)",
		activeSubstanceRu: "Хлоропирамин",
		innLatin: "Chloropyramini",
		category: "antihistamine", categoryLabelRu: "Антигистаминные (Противоотечные)",
		form: "tablets", formRu: "таблетки", dosageRu: "25 мг",
		routeRu: "Внутрь (перорально)", frequencyRu: "По 1 таб. 1 раз в сутки на ночь во время еды",
		quantityDefault: "N. 20", dispenseLatin: "D.t.d. N 20 in tab.", requiresPrescription: false, validityDays: 60,
		signaRu: "S. Внутрь по 1 таблетке 1 раз в день на ночь во время еды, 3-5 дней.",
		latinRp: "Rp.: Chloropyramini 25 mg",
		adultDosageRu: "25 мг (1 таб.) 1-2 раза в сутки во время еды (купирование отека).",
		pediatricDosageRu: "Детям 3-6 лет — 1/2 таб. (12.5 мг) 2 раза/сут; 6-14 лет — 1/2 таб. 2-3 раза/сут.",
		courseDaysRu: "3-5 дней",
		contraindicationsRu: ["Острый приступ бронхиальной астмы", "Закрытоугольная глаукома", "Аденома простаты", "Аритмии"],
		criticalIncompatibilitiesRu: ["Снотворные, седативные средства и алкоголь (угроза резкого угнетения ЦНС)", "Ингибиторы МАО"],
	},
	{
		id: "cetirizine_10_tab",
		tradeNameRu: "Цетиризин / Зиртек (10 мг)",
		activeSubstanceRu: "Цетиризин",
		innLatin: "Cetirizini",
		category: "antihistamine", categoryLabelRu: "Антигистаминные (II поколение)",
		form: "tablets_coated", formRu: "таблетки, покрытые оболочкой", dosageRu: "10 мг",
		routeRu: "Внутрь (перорально)", frequencyRu: "По 1 таб. 1 раз в сутки вечером",
		quantityDefault: "N. 20", dispenseLatin: "D.t.d. N 20 in tab.", requiresPrescription: false, validityDays: 60,
		signaRu: "S. Внутрь по 1 таблетке (10 мг) 1 раз в день вечером, 5-7 дней.",
		latinRp: "Rp.: Cetirizini 10 mg",
		adultDosageRu: "10 мг (1 таб.) 1 раз в сутки вечером, запивая водой, 5-7 дней.",
		pediatricDosageRu: "Детям от 6 лет — 5 мг 2 раза в день или 10 мг 1 раз в день; капли с 6 месяцев.",
		courseDaysRu: "5-7 дней",
		contraindicationsRu: ["Терминальная почечная недостаточность (КК < 10 мл/мин)", "Непереносимость галактозы", "Беременность и лактация"],
		criticalIncompatibilitiesRu: ["Этанол и седативные препараты (потенцирование сонливости)"],
	},

	// ── 5. РАНОЗАЖИВЛЯЮЩИЕ И ПАРОДОНТАЛЬНЫЕ ГЕЛИ ──
	{
		id: "metrogyl_denta_20_gel",
		tradeNameRu: "Метрогил Дента (20 г)",
		activeSubstanceRu: "Метронидазол + Хлоргексидин",
		innLatin: "Metronidazoli + Chlorhexidini",
		category: "topical_dental", categoryLabelRu: "Пародонтальные противомикробные гели",
		form: "dental_gel", formRu: "гель стоматологический", dosageRu: "20 г",
		routeRu: "Местно на десны", frequencyRu: "Наносить 2 раза в сутки после чистки зубов, не смывать 30 мин",
		quantityDefault: "N. 1", dispenseLatin: "D.t.d. N 1 in tuba", requiresPrescription: false, validityDays: 60,
		signaRu: "S. Наносить на область десен тонким слоем 2 раза в день после еды, 7-10 дней.",
		latinRp: "Rp.: Gelum dentale \"Metrogyl Denta\" 20.0",
		adultDosageRu: "Аппликации 2 раза в сутки утром и вечером после гигиены, курс 7-10 дней.",
		pediatricDosageRu: "Противопоказан детям до 6 лет. Детям с 6 лет — под контролем врача.",
		courseDaysRu: "7-10 дней",
		contraindicationsRu: ["Гиперчувствительность к метронидазолу, хлоргексидину, производным нитроимидазола", "I триместр беременности"],
		criticalIncompatibilitiesRu: ["Алкоголь (дисульфирамоподобный эффект)", "Варфарин (усиление антикоагулянтного действия)"],
	},
	{
		id: "solcoseryl_dental_5_paste",
		tradeNameRu: "Солкосерил / Асепта дентальная адгезивная паста (5 г)",
		activeSubstanceRu: "Депротеинизированный диализат крови телят + Полидоканол",
		innLatin: "Dialysati de sanguine vitulorum deproteinisati + Polidocanoli",
		category: "topical_dental", categoryLabelRu: "Ранозаживляющие и адгезивные пасты",
		form: "dental_paste", formRu: "дентальная адгезивная паста", dosageRu: "5 г",
		routeRu: "Местно на слизистую оболочку / лунку", frequencyRu: "Наносить полоску 0.5 см на высушенную рану 3-5 раз в сутки",
		quantityDefault: "N. 1", dispenseLatin: "D.t.d. N 1 in tuba", requiresPrescription: false, validityDays: 60,
		signaRu: "S. Полоску пасты 0.5 см наносить на высушенную рану 3-5 раз в день (не втирать!).",
		latinRp: "Rp.: Pastae dentalis adhesivae \"Solcoseryl\" 5.0",
		adultDosageRu: "Полоску пасты 0.5 см наносить тонким слоем на высушенный дефект 3-5 раз в сутки.",
		pediatricDosageRu: "Применяется у детей без возрастных ограничений под контролем взрослых.",
		courseDaysRu: "До заживления (3-14 дней)",
		contraindicationsRu: ["Гиперчувствительность к диализату крови телят или парабенам", "Инфицированные раны без дренирования"],
		criticalIncompatibilitiesRu: ["Не смешивать в одной аппликации с другими лекарствами"],
	},
	{
		id: "cholisal_10_gel",
		tradeNameRu: "Холисал стоматологический гель (10 г)",
		activeSubstanceRu: "Холина салицилат + Цеталкония хлорид",
		innLatin: "Cholini salicylatis + Cetalkonii chloridi",
		category: "topical_dental", categoryLabelRu: "Обезболивающие гели",
		form: "dental_gel", formRu: "гель стоматологический для местного применения", dosageRu: "10 г",
		routeRu: "Местно на слизистую оболочку и десну", frequencyRu: "Полоску геля 1 см наносить 2-3 раза в сутки до еды или после чистки",
		quantityDefault: "N. 1", dispenseLatin: "D.t.d. N 1 in tuba", requiresPrescription: false, validityDays: 60,
		signaRu: "S. Полоску геля 1 см наносить на десну чистым пальцем 2-3 раза в день, 5-7 дней.",
		latinRp: "Rp.: Geli dentalis \"Cholisal\" 10.0",
		adultDosageRu: "Полоска 1 см 2-3 раза в день, слегка втирая в пораженный участок.",
		pediatricDosageRu: "Детям с 1 года: полоска 0.5 см 2-3 раза в день.",
		courseDaysRu: "3-10 дней",
		contraindicationsRu: ["Гиперчувствительность к салицилатам и цеталконию хлориду", "Возраст до 1 года (относительное)"],
		criticalIncompatibilitiesRu: ["Усиливает действие других противовоспалительных средств при системном всасывании"],
	},

	// ── 6. ГАСТРОПРОТЕКТОРЫ ──
	{
		id: "omeprazole_20_caps",
		tradeNameRu: "Омепразол / Омез (20 мг)",
		activeSubstanceRu: "Омепразол",
		innLatin: "Omeprazoli",
		category: "gastroprotective", categoryLabelRu: "Гастропротекторы",
		form: "capsules", formRu: "капсулы кишечнорастворимые", dosageRu: "20 мг",
		routeRu: "Внутрь (перорально)", frequencyRu: "По 1 капс. утром за 30 мин до еды 1 раз в сутки",
		quantityDefault: "N. 20", dispenseLatin: "D.t.d. N 20 in caps.", requiresPrescription: false, validityDays: 60,
		signaRu: "S. Внутрь по 1 капсуле утром за 30 мин до еды 1 раз в день на весь курс НПВП.",
		latinRp: "Rp.: Omeprazoli 20 mg",
		adultDosageRu: "20 мг (1 капсула) утром за 30 минут до завтрака 1 раз в сутки на весь период приема НПВП.",
		pediatricDosageRu: "Детям от 2 лет (>20 кг) — 20 мг 1 раз в сутки.",
		courseDaysRu: "На период курса НПВП (5-14 дней)",
		contraindicationsRu: ["Гиперчувствительность к омепразолу", "Одновременный прием с кларитромицином при тяжелой печеночной недостаточности"],
		criticalIncompatibilitiesRu: ["Клопидогрел (снижение антиагрегантного эффекта)", "Позаконазол и кетоконазол (нарушение всасывания)"],
	},
] as const;

/** Карта алиасов идентификаторов для бесшовной интеграции легаси и веб-модулей */
export const DENTAL_DRUG_ID_ALIASES: Readonly<Record<string, string>> = Object.freeze({
	nimesulide_100: "nimesil_100_sachet",
	nimesil_100: "nimesil_100_sachet",
	ibuprofen_400: "ibuprofen_400_tab",
	ketorolac_10: "ketorol_10_tab",
	chlorhexidine_005: "chlorhexidine_005_sol",
	miramistin_001: "miramistin_001_sol",
	stomatophyt_100: "stomatophyt_100_sol",
	suprastin_25: "suprastin_25_tab",
	cetirizine_10: "cetirizine_10_tab",
	metrogyl_denta: "metrogyl_denta_20_gel",
	metrogyl_denta_gel: "metrogyl_denta_20_gel",
	solcoseryl_dental: "solcoseryl_dental_5_paste",
	cholisal_gel: "cholisal_10_gel",
	omeprazole_20: "omeprazole_20_caps",
	cyfran_st: "cyfran_st_500_600",
	cifran_st: "cyfran_st_500_600",
	cifran_st_tab: "cyfran_st_500_600",
	cyfran_st_tab: "cyfran_st_500_600",
	lincomycin_500: "clindamycin_300",
	ciprofloxacin_500: "ciprofloxacin_500",
	ciprolet_500: "ciprofloxacin_500",
	ibuprofen_suspension_100_5ml: "ibuprofen_suspension_100_5ml",
	ibuprofen_suspension: "ibuprofen_suspension_100_5ml",
	nurofen_children_susp: "ibuprofen_suspension_100_5ml",
});

/** Находит медикамент по каноническому ID или алиасу */
export function getDentalSsotMedicationById(id: string): DentalSsotMedicationItem | undefined {
	const canonicalId = DENTAL_DRUG_ID_ALIASES[id] || id;
	return DENTAL_CANONICAL_SSOT_MEDICATIONS.find((m) => m.id === canonicalId || m.id === id);
}

/** Фильтрует медикаменты по терапевтическому классу */
export function getDentalSsotMedicationsByCategory(category: string): DentalSsotMedicationItem[] {
	return DENTAL_CANONICAL_SSOT_MEDICATIONS.filter((m) => m.category === category);
}

/** Быстрый поиск препаратов по русскому названию, МНН или латинской формуле */
export function searchDentalSsotMedications(query: string): DentalSsotMedicationItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return [...DENTAL_CANONICAL_SSOT_MEDICATIONS];
	return DENTAL_CANONICAL_SSOT_MEDICATIONS.filter((m) =>
		m.tradeNameRu.toLowerCase().includes(q) ||
		m.activeSubstanceRu.toLowerCase().includes(q) ||
		m.innLatin.toLowerCase().includes(q) ||
		m.latinRp.toLowerCase().includes(q) ||
		m.categoryLabelRu.toLowerCase().includes(q),
	);
}

function hasConflictMatch(ruleText: string, conditions: readonly string[]): boolean {
	const lowerRule = ruleText.toLowerCase();
	for (const cond of conditions) {
		const lowerCond = cond.toLowerCase().trim();
		if (!lowerCond) continue;
		if (lowerRule.includes(lowerCond) || lowerCond.includes(lowerRule)) return true;
		const words = lowerCond.split(/[\s,.;:()/-]+/).filter((w) => w.length >= 4);
		for (const w of words) {
			const stem = w.length > 5 ? w.slice(0, w.length - 2) : w.slice(0, 4);
			if (lowerRule.includes(stem)) return true;
		}
	}
	return false;
}

/** Проверка противопоказаний и несовместимостей препарата с анамнезом пациента */
export function checkMedicationSafetyContraindications(
	medicationId: string,
	patientConditionsOrAllergies: readonly string[],
): { readonly hasConflict: boolean; readonly warnings: readonly string[] } {
	const med = getDentalSsotMedicationById(medicationId);
	if (!med || !patientConditionsOrAllergies || patientConditionsOrAllergies.length === 0) {
		return { hasConflict: false, warnings: [] };
	}

	const warnings: string[] = [];

	for (const contra of med.contraindicationsRu) {
		if (hasConflictMatch(contra, patientConditionsOrAllergies)) {
			warnings.push(`Противопоказание: ${contra}`);
		}
	}

	for (const incomp of med.criticalIncompatibilitiesRu) {
		if (hasConflictMatch(incomp, patientConditionsOrAllergies)) {
			warnings.push(`Критическая несовместимость: ${incomp}`);
		}
	}

	return { hasConflict: warnings.length > 0, warnings };
}

export const checkDrugContraindications = checkMedicationSafetyContraindications;

/** Форматирует латинскую пропись по стандартам формы 107-1/у и Приказа № 1094н */
export function formatPrescriptionSignatureSsot(
	item: DentalCatalogMedicationItem | DentalSsotMedicationItem,
	options?: { readonly count?: number; readonly customSigna?: string },
): { readonly latinRp: string; readonly dispenseLatin: string; readonly signaRu: string } {
	const base = baseFormatSignature(item, options);
	const ssotItem = item as Partial<DentalSsotMedicationItem>;
	return {
		latinRp: ssotItem.latinRp || base.latinRp,
		dispenseLatin: base.dispenseLatin,
		signaRu: options?.customSigna || item.signaRu,
	};
}
