/**
 * DENTE Dental CRM — Statutory Catalogs Warmup & Instant Offline Snapshot Service
 *
 * Statutory Compliance:
 * - Order of the Ministry of Health of the Russian Federation No. 804n (Medical Services Nomenclature)
 * - ICD-10 (Class XI: Diseases of the digestive system K00–K14, Z01.2)
 * - Order of the Ministry of Health of the Russian Federation No. 834n (Form 043/u EMR protocols)
 * - Order of the Ministry of Health of the Russian Federation No. 1094n (Prescription forms 107-1/u)
 * - Mandate 8e: Doctor Autonomy (1-click templates, zero-barrier prescriptions)
 * - Mandate 8n: Solo Doctor & Low-Spec Hardware (5400 RPM HDD / 4GB RAM)
 * - Mandate 8k: CRM != Reality Simulator (Friction-Killer Law)
 *
 * Invariant:
 * Zero external network calls. When running on an isolated clinic PC without internet,
 * catalog warmup executes in 0 ms from built-in embedded snapshots.
 */

import {
	type Statutory804nItem,
	type StatutoryIcd10Item,
	type StatutoryEmrTemplateItem,
	STATUTORY_804N_CATALOG,
	STATUTORY_DENTAL_ICD10,
	STATUTORY_EMR_TEMPLATES,
	getStatutory804nCatalog,
	getStatutoryIcd10Catalog,
	getStatutoryEmrTemplates,
} from "../clinical/statutoryCatalogs.js";
import {
	DENTAL_ANESTHETICS_CATALOG,
	type DentalAnestheticInfo,
} from "@dental/shared";

// ─────────────────────────────────────────────────────────────────────────────
// 1. PHARMACOLOGY DATA CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

export interface PharmacologyMedicationItem {
	readonly id: string;
	readonly tradeName: string;
	readonly tradeNameLatin: string;
	readonly inn: string;
	readonly innLatin: string;
	readonly category:
		| "anesthetic"
		| "antibiotic"
		| "nsaid"
		| "antiseptic"
		| "hemostatic"
		| "sedative";
	readonly dosageForm: string;
	readonly concentration: string;
	readonly activeSubstance: string;
	readonly vasoconstrictor?: string;
	readonly vasoconstrictorRatio?: string;
	readonly carpuleVolumeMl?: number;
	readonly standardPackaging: string;
	readonly maxDoseAdult?: string;
	readonly clinicalIndications: string;
	readonly contraindications: readonly string[];
	readonly isPrescriptionOnly: boolean;
	readonly atxCode?: string;
	readonly storageConditions?: string;
}

export interface DrugClassInfo {
	readonly classId: string;
	readonly labelRu: string;
	readonly keywords: readonly string[];
}

export interface DdiRuleInfo {
	readonly id: string;
	readonly severity: "blocker" | "warning" | "caution";
	readonly agentA: string;
	readonly agentB: string;
	readonly conflictCategory: string;
	readonly title: string;
	readonly clinicalRisk: string;
	readonly mechanism: string;
	readonly actionRequired: string;
}

export interface AllergenCrossReactivityInfo {
	readonly allergenGroup: string;
	readonly labelRu: string;
	readonly crossReactiveGroups: readonly string[];
	readonly clinicalGuidanceRu: string;
}

export interface PharmacologyReferenceData {
	readonly drugClasses: readonly DrugClassInfo[];
	readonly ddiInteractions: readonly DdiRuleInfo[];
	readonly allergenCrossReactivity: readonly AllergenCrossReactivityInfo[];
	readonly epinephrineCardioLimits: {
		readonly healthyAdultMaxMg: number;
		readonly cardioRiskMaxMg: number;
		readonly absoluteContraindications: readonly string[];
	};
}

export interface WarmupCatalogsResult {
	readonly success: boolean;
	readonly isOfflineReady: boolean;
	readonly durationMs: number;
	readonly counts: {
		readonly nomenclature804n: number;
		readonly pharmacologyMedications: number;
		readonly pharmacologyReferences: number;
		readonly icd10: number;
		readonly emrTemplates: number;
	};
	readonly timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EMBEDDED DENTAL PHARMACOLOGY SNAPSHOT (0 MS OFFLINE AVAILABILITY)
// ─────────────────────────────────────────────────────────────────────────────

export const STATUTORY_PHARMACOLOGY_MEDICATIONS: readonly PharmacologyMedicationItem[] = [
	// 2.1 Местные анестетики (Карпульная анестезия СтАР / Минздрав РФ)
	{
		id: "med-ultracain-ds-forte",
		tradeName: "Ультракаин® Д-С форте",
		tradeNameLatin: "Ultracain D-S forte",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		category: "anesthetic",
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		concentration: "4% (40 мг/мл) + 1:100 000 (0.01 мг/мл)",
		activeSubstance: "Артикаина гидрохлорид 68 мг + Эпинефрин 0.017 мг на карпулу",
		vasoconstrictor: "Эпинефрин (Адреналин) 1:100 000",
		vasoconstrictorRatio: "1:100000",
		carpuleVolumeMl: 1.7,
		standardPackaging: "Карпулы 1.7 мл по 100 шт. в упаковке",
		maxDoseAdult: "7.0 мг/кг массы тела (макс. 500 мг артикаина / ~7 карпул)",
		clinicalIndications:
			"Высокотравматичные вмешательства, экстирпация пульпы, сложное удаление зубов, синус-лифтинг, имплантация.",
		contraindications: [
			"Аллергия на артикаин и амидные анестетики",
			"Бронхиальная астма с гиперчувствительностью к сульфитам (метабисульфит E223)",
			"Прием ингибиторов МАО (ИМАО) и трициклических антидепрессантов",
			"Декомпенсированный тиреотоксикоз, феохромоцитома",
			"Тяжелые нарушения ритма сердца, АД >= 180/110 мм рт. ст.",
		],
		isPrescriptionOnly: true,
		atxCode: "N01BB58",
		storageConditions: "Хранить в защищенном от света месте при температуре не выше 25°C. Не замораживать.",
	},
	{
		id: "med-ultracain-ds",
		tradeName: "Ультракаин® Д-С",
		tradeNameLatin: "Ultracain D-S",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		category: "anesthetic",
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		concentration: "4% (40 мг/мл) + 1:200 000 (0.005 мг/мл)",
		activeSubstance: "Артикаина гидрохлорид 68 мг + Эпинефрин 0.0085 мг на карпулу",
		vasoconstrictor: "Эпинефрин (Адреналин) 1:200 000",
		vasoconstrictorRatio: "1:200000",
		carpuleVolumeMl: 1.7,
		standardPackaging: "Карпулы 1.7 мл по 100 шт. в упаковке",
		maxDoseAdult: "7.0 мг/кг массы тела (макс. 500 мг / ~7 карпул; кардиолимит: макс. 2 карпулы по адреналину)",
		clinicalIndications:
			"Стандартная терапевтическая стоматология, препарирование зубов, эндодонтия, удаление зубов у пациентов группы риска.",
		contraindications: [
			"Аллергия на артикаин и сульфиты",
			"Прием ингибиторов МАО",
			"Тяжелый декомпенсированный тиреотоксикоз",
		],
		isPrescriptionOnly: true,
		atxCode: "N01BB58",
		storageConditions: "Хранить в защищенном от света месте при температуре не выше 25°C.",
	},
	{
		id: "med-ultracain-d",
		tradeName: "Ультракаин® Д",
		tradeNameLatin: "Ultracain D",
		inn: "Артикаин",
		innLatin: "Articaine",
		category: "anesthetic",
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		concentration: "4% (40 мг/мл) без вазоконстриктора",
		activeSubstance: "Артикаина гидрохлорид 68 мг на карпулу (без вазоконстриктора и сульфитов)",
		vasoconstrictor: "Без вазоконстриктора (Адреналин-free)",
		vasoconstrictorRatio: "none",
		carpuleVolumeMl: 1.7,
		standardPackaging: "Карпулы 1.7 мл по 100 шт. в упаковке",
		maxDoseAdult: "4.0 мг/кг массы тела (макс. 300 мг / ~4 карпулы)",
		clinicalIndications:
			"Анестезия у пациентов с тяжелой сердечно-сосудистой патологией, гипертиреозом, глаукомой, аллергией на сульфиты.",
		contraindications: [
			"Аллергия на артикаин",
			"Детский возраст до 4 лет",
		],
		isPrescriptionOnly: true,
		atxCode: "N01BB08",
		storageConditions: "Хранить при температуре не выше 25°C.",
	},
	{
		id: "med-scandonest-3-plain",
		tradeName: "Скандонест 3% (Мепивакаин)",
		tradeNameLatin: "Scandonest 3% plain",
		inn: "Мепивакаин",
		innLatin: "Mepivacaine",
		category: "anesthetic",
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		concentration: "3% (30 мг/мл)",
		activeSubstance: "Мепивакаина гидрохлорид 51 мг на карпулу (без вазоконстриктора)",
		vasoconstrictor: "Без вазоконстриктора",
		vasoconstrictorRatio: "none",
		carpuleVolumeMl: 1.7,
		standardPackaging: "Карпулы 1.7 мл по 50 шт.",
		maxDoseAdult: "4.4 мг/кг (макс. 300 мг / ~5 карпул)",
		clinicalIndications:
			"Препарат выбора при сердечно-сосудистой патологии, сахарном диабете, тиреотоксикозе и бронхиальной астме (нет сульфитов).",
		contraindications: [
			"Аллергия на мепивакаин и амиды",
			"Злокачественная гипертермия в анамнезе",
			"Тяжелая печеночная недостаточность",
		],
		isPrescriptionOnly: true,
		atxCode: "N01BB03",
		storageConditions: "Хранить при температуре 15–25°C.",
	},
	{
		id: "med-lidocaine-spray-10",
		tradeName: "Лидокаин спрей 10%",
		tradeNameLatin: "Lidocaine spray 10%",
		inn: "Лидокаин",
		innLatin: "Lidocaine",
		category: "anesthetic",
		dosageForm: "спрей для местного применения дозированный",
		concentration: "10% (4.8 мг/доза)",
		activeSubstance: "Лидокаин",
		vasoconstrictor: "none",
		standardPackaging: "Флакон 38 г (650 доз)",
		maxDoseAdult: "До 20 доз (не более 200 мг лидокаина)",
		clinicalIndications:
			"Аппликационная анестезия слизистой оболочки полости рта перед инъекцией, снятием швов, фиксацией коронок.",
		contraindications: ["Аллергия на лидокаин", "Судороги в анамнезе"],
		isPrescriptionOnly: false,
		atxCode: "N01BB02",
	},

	// 2.2 Антибиотики (Антибактериальная терапия одонтогенных инфекций)
	{
		id: "med-amoxiclav-875",
		tradeName: "Амоксиклав® (Аугментин / Флемоклав)",
		tradeNameLatin: "Amoxiclav (Amoxicillin + Clavulanic acid)",
		inn: "Амоксициллин + Клавулановая кислота",
		innLatin: "Amoxicillin + Clavulanic acid",
		category: "antibiotic",
		dosageForm: "таблетки диспергируемые / покрытые оболочкой",
		concentration: "875 мг + 125 мг (1000 мг)",
		activeSubstance: "Амоксициллина тригидрат 875 мг + Калия клавуланат 125 мг",
		standardPackaging: "14 таблеток в упаковке (блистер)",
		maxDoseAdult: "1000 мг 2 раза в сутки (каждые 12 часов) во время еды, курс 5–7 дней",
		clinicalIndications:
			"Острый гнойный периодонтит, периостит челюсти, одонтогенный синусит, перикоронит, профилактика после костной пластики.",
		contraindications: [
			"Аллергия на пенициллины, бета-лактамы и клавулановую кислоту",
			"Холестатическая желтуха / нарушение функции печени при приеме амоксиклава в анамнезе",
			"Инфекционный мононуклеоз",
		],
		isPrescriptionOnly: true,
		atxCode: "J01CR02",
		storageConditions: "Хранить в сухом месте при температуре не выше 25°C.",
	},
	{
		id: "med-amoxicillin-500",
		tradeName: "Флемоксин Солютаб® (Амоксициллин)",
		tradeNameLatin: "Flemoxin Solutab (Amoxicillin)",
		inn: "Амоксициллин",
		innLatin: "Amoxicillin",
		category: "antibiotic",
		dosageForm: "таблетки диспергируемые",
		concentration: "500 мг",
		activeSubstance: "Амоксициллин 500 мг",
		standardPackaging: "20 таблеток",
		maxDoseAdult: "500 мг 3 раза в сутки (каждые 8 часов), курс 5–7 дней",
		clinicalIndications:
			"Периодонтит, альвеолит, неосложненные бактериальные инфекции челюстно-лицевой области.",
		contraindications: ["Аллергия на пенициллины"],
		isPrescriptionOnly: true,
		atxCode: "J01CA04",
	},
	{
		id: "med-metronidazole-500",
		tradeName: "Метронидазол (Трихопол®)",
		tradeNameLatin: "Metronidazole (Trichopol)",
		inn: "Метронидазол",
		innLatin: "Metronidazole",
		category: "antibiotic",
		dosageForm: "таблетки",
		concentration: "500 мг",
		activeSubstance: "Метронидазол 500 мг",
		standardPackaging: "20 таблеток",
		maxDoseAdult: "500 мг 2–3 раза в сутки во время еды, курс 5–7 дней",
		clinicalIndications:
			"Анаэробная одонтогенная инфекция, язвенно-некротический гингивит Венсана, тяжелый пародонтит, перикоронит.",
		contraindications: [
			"Категорический запрет приема алкоголя во время курса и 48 ч после (дисульфирамоподобная реакция)",
			"Органические поражения ЦНС, эпилепсия",
			"Печеночная недостаточность",
			"Беременность (I триместр), период лактации",
		],
		isPrescriptionOnly: true,
		atxCode: "J01XD01",
	},
	{
		id: "med-clindamycin-300",
		tradeName: "Клиндамицин (Далацин® Ц)",
		tradeNameLatin: "Clindamycin (Dalacin C)",
		inn: "Клиндамицин",
		innLatin: "Clindamycin",
		category: "antibiotic",
		dosageForm: "капсулы",
		concentration: "300 мг",
		activeSubstance: "Клиндамицина гидрохлорид 300 мг",
		standardPackaging: "16 капсул",
		maxDoseAdult: "300 мг 3–4 раза в сутки, курс 5–7 дней",
		clinicalIndications:
			"Остеотропный антибиотик резерва при аллергии на пенициллины; остеомиелит челюсти, периостит.",
		contraindications: [
			"Аллергия на клиндамицин и линкомицин",
			"Псевдомембранозный колит в анамнезе",
			"Миастения",
		],
		isPrescriptionOnly: true,
		atxCode: "J01FF01",
	},
	{
		id: "med-azithromycin-500",
		tradeName: "Азитромицин (Сумамед®)",
		tradeNameLatin: "Azithromycin (Sumamed)",
		inn: "Азитромицин",
		innLatin: "Azithromycin",
		category: "antibiotic",
		dosageForm: "таблетки",
		concentration: "500 мг",
		activeSubstance: "Азитромицина дигидрат 500 мг",
		standardPackaging: "3 таблетки",
		maxDoseAdult: "500 мг 1 раз в сутки за 1 час до еды, курс 3 дня",
		clinicalIndications:
			"Альтернативная терапия при непереносимости бета-лактамов при одонтогенных инфекциях.",
		contraindications: [
			"Аллергия на макролиды",
			"Тяжелая печеночная / почечная недостаточность",
			"Одновременный прием эрготамина, дигидроэрготамина",
		],
		isPrescriptionOnly: true,
		atxCode: "J01FA10",
	},

	// 2.3 НПВС и анальгетики
	{
		id: "med-ketorolac-10",
		tradeName: "Кеторолак (Кетанов® / Кеторол®)",
		tradeNameLatin: "Ketorolac (Ketanov)",
		inn: "Кеторолак",
		innLatin: "Ketorolac",
		category: "nsaid",
		dosageForm: "таблетки покрытые оболочкой",
		concentration: "10 мг",
		activeSubstance: "Кеторолака трометамин 10 мг",
		standardPackaging: "20 таблеток",
		maxDoseAdult: "10 мг при болях (интервал >= 6 ч), максимум 40 мг/сутки. Курс строго НЕ более 5 дней!",
		clinicalIndications:
			"Купирование острого болевого синдрома после удаления зубов, резекции, дентальной имплантации.",
		contraindications: [
			"Язвенная болезнь желудка и 12-перстной кишки в фазе обострения",
			"Высокий риск кровотечения, гемофилия, одновременный прием антикоагулянтов",
			"Триада Самтера (аспириновая астма)",
			"Беременность, роды, лактация, возраст до 16 лет",
		],
		isPrescriptionOnly: true,
		atxCode: "M01AB15",
	},
	{
		id: "med-nimesulide-100",
		tradeName: "Нимесулид (Нимесил® / Найз®)",
		tradeNameLatin: "Nimesulide (Nimesil)",
		inn: "Нимесулид",
		innLatin: "Nimesulide",
		category: "nsaid",
		dosageForm: "гранулы для приготовления суспензии (пакетики 2 г) / таблетки",
		concentration: "100 мг",
		activeSubstance: "Нимесулид 100 мг",
		standardPackaging: "30 пакетиков",
		maxDoseAdult: "100 мг 2 раза в сутки после еды, макс. курс 15 дней",
		clinicalIndications:
			"Посттравматическое воспаление и боль после стоматологических операций, альвеолит, пульпит.",
		contraindications: [
			"Гепатотоксические реакции на нимесулид в анамнезе",
			"Язва ЖКТ, тяжелые нарушения свертывания",
			"Беременность (III триместр), детский возраст до 12 лет",
		],
		isPrescriptionOnly: true,
		atxCode: "M01AX17",
	},
	{
		id: "med-ibuprofen-400",
		tradeName: "Ибупрофен (Нурофен® Форте)",
		tradeNameLatin: "Ibuprofen (Nurofen Forte)",
		inn: "Ибупрофен",
		innLatin: "Ibuprofen",
		category: "nsaid",
		dosageForm: "таблетки покрытые оболочкой",
		concentration: "400 мг",
		activeSubstance: "Ибупрофен 400 мг",
		standardPackaging: "12 таблеток",
		maxDoseAdult: "400 мг 3 раза в сутки (максимум 1200 мг/сутки)",
		clinicalIndications:
			"Умеренный болевой синдром и отек после лечения периодонтита, ортодонтической активации, чистки.",
		contraindications: [
			"Обострение эрозивно-язвенных заболеваний ЖКТ",
			"Аспириновая астма",
		],
		isPrescriptionOnly: false,
		atxCode: "M01AE01",
	},
	{
		id: "med-paracetamol-500",
		tradeName: "Парацетамол",
		tradeNameLatin: "Paracetamol",
		inn: "Парацетамол",
		innLatin: "Paracetamol",
		category: "nsaid",
		dosageForm: "таблетки",
		concentration: "500 мг",
		activeSubstance: "Парацетамол 500 мг",
		standardPackaging: "20 таблеток",
		maxDoseAdult: "500–1000 мг до 4 раз в сутки (макс. 4 г/сутки)",
		clinicalIndications:
			"Препарат первого выбора при противопоказаниях к НПВС (прием антикоагулянтов, гастрит, язва).",
		contraindications: ["Тяжелая печеночная недостаточность"],
		isPrescriptionOnly: false,
		atxCode: "N02BE01",
	},

	// 2.4 Антисептики и местная терапия
	{
		id: "med-chlorhexidine-005",
		tradeName: "Хлоргексидина биглюконат 0.05%",
		tradeNameLatin: "Chlorhexidine bigluconate 0.05%",
		inn: "Хлоргексидин",
		innLatin: "Chlorhexidine",
		category: "antiseptic",
		dosageForm: "раствор для местного применения",
		concentration: "0.05%",
		activeSubstance: "Хлоргексидина биглюконат 0.5 мг/мл",
		standardPackaging: "Флакон 100 мл",
		clinicalIndications:
			"Антисептические полоскания полости рта после удаления зубов, профгигиены, гингивите, стоматите.",
		contraindications: ["Аллергия на хлоргексидин"],
		isPrescriptionOnly: false,
		atxCode: "A01AB03",
	},
	{
		id: "med-alvogyl",
		tradeName: "Альвожил (Alveogyl)",
		tradeNameLatin: "Alveogyl",
		inn: "Паста с волокнами пенгхавара и эвгенолом",
		innLatin: "Dental surgical dressing paste",
		category: "hemostatic",
		dosageForm: "паста для лунок зубов",
		concentration: "эвгенол + волокна",
		activeSubstance: "Эвгенол, йодоформ, кальция карбонат",
		standardPackaging: "Баночка 12 г",
		clinicalIndications:
			"Антисептическая и обезболивающая повязка при альвеолите (сухая лунка) после удаления зуба.",
		contraindications: ["Аллергия на эвгенол и йод"],
		isPrescriptionOnly: true,
	},
];

export const STATUTORY_PHARMACOLOGY_REFERENCES: PharmacologyReferenceData = {
	drugClasses: [
		{
			classId: "penicillin_beta_lactam",
			labelRu: "Пенициллины и бета-лактамы",
			keywords: ["amoxicillin", "амоксициллин", "amoxiclav", "амоксиклав", "augmentin", "аугментин", "flemoxin", "флемоксин"],
		},
		{
			classId: "nsaid",
			labelRu: "НПВС / Анальгетики",
			keywords: ["ketorolac", "кеторолак", "ketanov", "кетанов", "ibuprofen", "ибупрофен", "nimesulide", "нимесулид", "nimesil", "нимесил"],
		},
		{
			classId: "anticoagulant_antiplatelet",
			labelRu: "Антикоагулянты и дезагреганты",
			keywords: ["warfarin", "варфарин", "xarelto", "ксарелто", "rivaroxaban", "ривароксабан", "eliquis", "эликвис", "apixaban", "апиксабан", "clopidogrel", "клопидогрел", "aspirin", "аспирин"],
		},
		{
			classId: "metronidazole",
			labelRu: "Метронидазол / Нитроимидазолы",
			keywords: ["metronidazole", "метронидазол", "trichopol", "трихопол", "metrogyl", "метрогил"],
		},
		{
			classId: "epinephrine_anesthetic",
			labelRu: "Местные анестетики с эпинефрином",
			keywords: ["эпинефрин", "адреналин", "epinephrine", "1:100000", "1:200000", "ultracain", "ультракаин"],
		},
		{
			classId: "sulfite_preservative",
			labelRu: "Сульфиты / Метабисульфит натрия (E223)",
			keywords: ["сульфит", "метабисульфит", "sulfite", "e223"],
		},
	],
	ddiInteractions: [
		{
			id: "INT-METRO-ALC",
			severity: "blocker",
			agentA: "Метронидазол (Metronidazolum)",
			agentB: "Этанол / Спиртосодержащие растворы",
			conflictCategory: "drug_drug",
			title: "Дисульфирамоподобная реакция (Ингибирование ALDH)",
			clinicalRisk: "Накопление токсического ацетальдегида: резкая гипотония, тахикардия, неукротимая рвота, коллапс.",
			mechanism: "Блокада печеночной альдегиддегидрогеназы. Категорический запрет алкоголя во время курса + 48ч.",
			actionRequired: "Предупредить пациента; исключить любые спиртовые ополаскиватели.",
		},
		{
			id: "INT-NSAID-ANTICOAG",
			severity: "blocker",
			agentA: "НПВП (Кеторолак / Ибупрофен / Нимесулид)",
			agentB: "Антикоагулянты / Антиагреганты (Варфарин, Ксарелто, Эликвис, Клопидогрел)",
			conflictCategory: "drug_drug",
			title: "Высокий риск массивного луночкового кровотечения и язв ЖКТ",
			clinicalRisk: "Синергическое угнетение тромбоцитарного гемостаза (ЦОГ-1) и плазменного свертывания.",
			mechanism: "Подавление TxA2 на фоне системной антикоагуляции.",
			actionRequired: "Заменить НПВП на Парацетамол 500–1000 мг (до 2 г/сут). Провести ревизию лунки и ушивание.",
		},
		{
			id: "INT-EPI-BETA-BLOCKER",
			severity: "blocker",
			agentA: "Эпинефрин (Адреналин в карпуле 1:100 000 / 1:200 000)",
			agentB: "Неселективные бета-блокаторы (Анаприлин / Пропранолол / Соталол)",
			conflictCategory: "drug_drug",
			title: "Резкий гипертонический криз и рефлекторная брадикардия",
			clinicalRisk: "Некомпенсированная стимуляция альфа-1 сосудистых рецепторов вызывает спазм артериол и скачок АД > 200 мм рт. ст.",
			mechanism: "Блокада бета-2 сосудорасширяющих рецепторов оставляет альфа-1 адренорецепторы без противовеса.",
			actionRequired: "Использовать чистый анестетик без вазоконстриктора: Скандонест 3% (Мепивакаин) или Ультракаин Д.",
		},
		{
			id: "INT-NSAID-ACEI",
			severity: "warning",
			agentA: "НПВП (Кеторолак / Нимесулид)",
			agentB: "Ингибиторы АПФ / БРА (Эналаприл, Лизиноприл, Лозартан)",
			conflictCategory: "drug_drug",
			title: "Острая почечная дисфункция и снижение гипотензивного эффекта",
			clinicalRisk: "Сужение приносящей артериолы почечного клубочка с падением скорости клубочковой фильтрации (СКФ).",
			mechanism: "Снижение синтеза почечных вазодилатирующих простагландинов PGE2.",
			actionRequired: "Ограничить курс НПВП до 2–3 дней или заменить на Парацетамол. Контроль артериального давления.",
		},
	],
	allergenCrossReactivity: [
		{
			allergenGroup: "penicillin",
			labelRu: "Аллергия на пенициллины",
			crossReactiveGroups: ["cephalosporins_1_gen", "carbapenems"],
			clinicalGuidanceRu: "Перекрестная аллергия с цефалоспоринами I поколения до 10%. Назначать макролиды (Азитромицин) или линкозамиды (Клиндамицин).",
		},
		{
			allergenGroup: "sulfite",
			labelRu: "Гиперчувствительность к сульфитам (E223)",
			crossReactiveGroups: ["epinephrine_anesthetics"],
			clinicalGuidanceRu: "Все анестетики с адреналином содержат метабисульфит натрия (антиоксидант). Использовать Мепивакаин 3% или Артикаин без адреналина.",
		},
		{
			allergenGroup: "nsaid_samter",
			labelRu: "Аспириновая триада Самтера",
			crossReactiveGroups: ["all_cox1_inhibitors"],
			clinicalGuidanceRu: "Абсолютно противопоказаны все неселективные НПВП (Кеторолак, Ибупрофен, Аспирин). Разрешен Парацетамол до 1000 мг/сут.",
		},
	],
	epinephrineCardioLimits: {
		healthyAdultMaxMg: 0.20,
		cardioRiskMaxMg: 0.04,
		absoluteContraindications: [
			"Инфаркт миокарда или инсульт перенесенный менее 6 месяцев назад",
			"Нестабильная стенокардия (III–IV ФК)",
			"Пароксизмальная тахикардия, частая экстрасистолия, фибрилляция предсердий",
			"Неконтролируемая артериальная гипертензия (АД >= 180/110 мм рт. ст.)",
			"Декомпенсированный тиреотоксикоз",
			"Феохромоцитома",
			"Закрытоугольная глаукома",
		],
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. IN-MEMORY SNAPSHOT CACHE (0 MS ACCESS)
// ─────────────────────────────────────────────────────────────────────────────

let isWarmedUp = false;
let warmupStatusCache: WarmupCatalogsResult | null = null;

let cached804n: readonly Statutory804nItem[] = STATUTORY_804N_CATALOG;
let cachedIcd10: readonly StatutoryIcd10Item[] = STATUTORY_DENTAL_ICD10;
let cachedEmrTemplates: readonly StatutoryEmrTemplateItem[] = STATUTORY_EMR_TEMPLATES;
let cachedMedications: readonly PharmacologyMedicationItem[] = STATUTORY_PHARMACOLOGY_MEDICATIONS;
let cachedReferences: PharmacologyReferenceData = STATUTORY_PHARMACOLOGY_REFERENCES;

/**
 * Разогрев и синхронизация регламентных справочников РФ в оперативную память процесса.
 *
 * Инварианты (Мандаты 8n, 8k, 8e):
 * - Мгновенное выполнение (0–1 мс) без внешних HTTP/DNS вызовов.
 * - Полный суверенитет офлайн-режима: изолированный ПК в клинике стартует мгновенно.
 * - Идемпотентность: повторные вызовы возвращают статус из памяти без нагрузки на процессор.
 */
export function warmupStatutoryCatalogs(options?: {
	forceReload?: boolean;
	logger?: {
		info: (...args: unknown[]) => void;
		debug?: (...args: unknown[]) => void;
		error?: (...args: unknown[]) => void;
	};
}): WarmupCatalogsResult {
	if (isWarmedUp && !options?.forceReload && warmupStatusCache) {
		return warmupStatusCache;
	}

	const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();

	// 1. Инициализация и верификация SSOT массивов в оперативной памяти процесса
	cached804n = STATUTORY_804N_CATALOG;
	cachedIcd10 = STATUTORY_DENTAL_ICD10;
	cachedEmrTemplates = STATUTORY_EMR_TEMPLATES;
	cachedMedications = STATUTORY_PHARMACOLOGY_MEDICATIONS;
	cachedReferences = STATUTORY_PHARMACOLOGY_REFERENCES;

	const endTime = typeof performance !== "undefined" ? performance.now() : Date.now();
	const durationMs = Math.max(0, Math.round(endTime - startTime));

	warmupStatusCache = {
		success: true,
		isOfflineReady: true,
		durationMs,
		counts: {
			nomenclature804n: cached804n.length,
			pharmacologyMedications: cachedMedications.length,
			pharmacologyReferences: cachedReferences.ddiInteractions.length + cachedReferences.drugClasses.length,
			icd10: cachedIcd10.length,
			emrTemplates: cachedEmrTemplates.length,
		},
		timestamp: new Date().toISOString(),
	};

	isWarmedUp = true;

	if (options?.logger?.info) {
		options.logger.info(
			`[StatutoryCatalogs] Warmed up ${cached804n.length} items (804n), ${cachedMedications.length} meds, ${cachedIcd10.length} ICD-10, ${cachedEmrTemplates.length} EMR templates in ${durationMs}ms (0ms offline ready).`,
		);
	}

	return warmupStatusCache;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FAST SYNCHRONOUS ACCESS & SEARCH (0 MS RAM ACCESS)
// ─────────────────────────────────────────────────────────────────────────────

export function isCatalogsWarmedUp(): boolean {
	return isWarmedUp;
}

export function getWarmupCatalogsStatus(): WarmupCatalogsResult {
	if (!warmupStatusCache) {
		return warmupStatutoryCatalogs();
	}
	return warmupStatusCache;
}

export function getStatutory804nSnapshot(options?: {
	q?: string;
	category?: string;
}): readonly Statutory804nItem[] {
	if (!isWarmedUp) warmupStatutoryCatalogs();
	return getStatutory804nCatalog(options);
}

export function getPharmacologyMedicationsSnapshot(options?: {
	q?: string;
	category?: string;
}): readonly PharmacologyMedicationItem[] {
	if (!isWarmedUp) warmupStatutoryCatalogs();

	let list = cachedMedications;
	if (options?.category) {
		const cat = options.category.toLowerCase().trim();
		list = list.filter((m) => m.category.toLowerCase() === cat);
	}
	if (options?.q) {
		const q = options.q.toLowerCase().trim();
		list = list.filter(
			(m) =>
				m.tradeName.toLowerCase().includes(q) ||
				m.tradeNameLatin.toLowerCase().includes(q) ||
				m.inn.toLowerCase().includes(q) ||
				m.innLatin.toLowerCase().includes(q) ||
				m.activeSubstance.toLowerCase().includes(q),
		);
	}
	return list;
}

export function getPharmacologyReferencesSnapshot(): PharmacologyReferenceData {
	if (!isWarmedUp) warmupStatutoryCatalogs();
	return cachedReferences;
}

export function getStatutoryIcd10Snapshot(options?: {
	q?: string;
	group?: string;
}): readonly StatutoryIcd10Item[] {
	if (!isWarmedUp) warmupStatutoryCatalogs();
	return getStatutoryIcd10Catalog(options);
}

export function getStatutoryEmrTemplatesSnapshot(options?: {
	q?: string;
	category?: string;
}): readonly StatutoryEmrTemplateItem[] {
	if (!isWarmedUp) warmupStatutoryCatalogs();
	return getStatutoryEmrTemplates(options);
}

// Автоматический прогрев при первом импорте модуля (0 мс задержки)
warmupStatutoryCatalogs();
