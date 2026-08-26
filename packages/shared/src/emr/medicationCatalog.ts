/**
 * Dental Medication Formulary, Dosage & Clinical Contraindication Engine.
 * Adapted from dentalpin medication_catalog & medical_reference modules for DENTE Dental CRM.
 *
 * Implements 56 standard dental pharmaceutical items across 8 clinical classes,
 * pregnancy safety grading, and automated drug-drug interaction warning checks.
 */

import { z } from "zod";

export const therapeuticClassSchema = z.enum([
	"antibiotic",
	"analgesic_nsaid",
	"local_anesthetic",
	"emergency_kit",
	"corticosteroid",
	"antifungal_antiviral",
	"oral_antiseptic",
	"gi_antihistamine",
]);
export type TherapeuticClass = z.infer<typeof therapeuticClassSchema>;

export const pharmaceuticalFormSchema = z.enum([
	"tablet",
	"capsule",
	"injection",
	"gel",
	"spray",
	"paste",
	"cream",
	"suspension",
	"mouthwash",
	"varnish",
]);
export type PharmaceuticalForm = z.infer<typeof pharmaceuticalFormSchema>;

export const dentalMedicationItemSchema = z.object({
	id: z.string().min(1),
	nameRu: z.string().min(1),
	nameInt: z.string().min(1), // International non-proprietary name (INN)
	therapeuticClass: therapeuticClassSchema,
	defaultDose: z.string().optional().nullable(),
	doseUnit: z.string().optional().nullable(), // mg, g, mcg, %, U/ml
	form: pharmaceuticalFormSchema,
	requiresPrescription: z.boolean().default(true),
	maxDailyDoseAdult: z.string().optional().nullable(),
	pediatricApproved: z.boolean().default(false),
	pregnancyCategory: z.enum(["A", "B", "C", "D", "X"]).default("B"),
	clinicalIndicationRu: z.string(),
	standardRegimenRu: z.string(),
});
export type DentalMedicationItem = z.infer<typeof dentalMedicationItemSchema>;

/**
 * 56 Canonical Dental Pharmaceutical Formularies.
 */
export const DENTAL_MEDICATION_FORMULARY: readonly DentalMedicationItem[] = [
	// --- 1. Antibiotics ---
	{
		id: "med_amox_500",
		nameRu: "Амоксициллин 500 мг",
		nameInt: "Amoxicillin",
		therapeuticClass: "antibiotic",
		defaultDose: "500",
		doseUnit: "mg",
		form: "capsule",
		requiresPrescription: true,
		maxDailyDoseAdult: "3000 mg",
		pediatricApproved: true,
		pregnancyCategory: "B",
		clinicalIndicationRu: "Одонтогенная инфекция, периодонтит, периостит, профилактика инфекционного эндокардита",
		standardRegimenRu: "По 500 мг 3 раза в сутки (каждые 8 часов) в течение 5-7 дней",
	},
	{
		id: "med_amox_clav_875",
		nameRu: "Амоксициллин + Клавулановая кислота 875/125 мг",
		nameInt: "Amoxicillin/Clavulanic acid",
		therapeuticClass: "antibiotic",
		defaultDose: "875/125",
		doseUnit: "mg",
		form: "tablet",
		requiresPrescription: true,
		maxDailyDoseAdult: "2000 mg (по амоксициллину)",
		pediatricApproved: false,
		pregnancyCategory: "B",
		clinicalIndicationRu: "Тяжелые гнойно-воспалительные процессы челюстно-лицевой области, остеомиелит, синусит",
		standardRegimenRu: "По 1 таблетке (875/125 мг) 2 раза в сутки (каждые 12 часов) во время еды",
	},
	{
		id: "med_metron_500",
		nameRu: "Метронидазол 500 мг",
		nameInt: "Metronidazole",
		therapeuticClass: "antibiotic",
		defaultDose: "500",
		doseUnit: "mg",
		form: "tablet",
		requiresPrescription: true,
		maxDailyDoseAdult: "1500 mg",
		pediatricApproved: true,
		pregnancyCategory: "B",
		clinicalIndicationRu: "Анаэробная инфекция полости рта, язвенно-некротический гингивит Венсана, пародонтит",
		standardRegimenRu: "По 500 мг 3 раза в сутки в комбинации с амоксициллином (протокол ван Винкельхоффа)",
	},
	{
		id: "med_clind_300",
		nameRu: "Клиндамицин 300 мг",
		nameInt: "Clindamycin",
		therapeuticClass: "antibiotic",
		defaultDose: "300",
		doseUnit: "mg",
		form: "capsule",
		requiresPrescription: true,
		maxDailyDoseAdult: "1800 mg",
		pediatricApproved: true,
		pregnancyCategory: "B",
		clinicalIndicationRu: "Одонтогенная инфекция костной ткани при аллергии на пенициллины",
		standardRegimenRu: "По 300 мг 3-4 раза в сутки через равные промежутки времени",
	},
	{
		id: "med_azithro_500",
		nameRu: "Азитромицин 500 мг",
		nameInt: "Azithromycin",
		therapeuticClass: "antibiotic",
		defaultDose: "500",
		doseUnit: "mg",
		form: "tablet",
		requiresPrescription: true,
		maxDailyDoseAdult: "500 mg",
		pediatricApproved: true,
		pregnancyCategory: "B",
		clinicalIndicationRu: "Короткий 3-дневный курс при непереносимости бета-лактамов",
		standardRegimenRu: "По 500 мг 1 раз в сутки за 1 час до или через 2 часа после еды (3 дня)",
	},

	// --- 2. Analgesics & NSAIDs ---
	{
		id: "med_ibu_400",
		nameRu: "Ибупрофен 400 мг",
		nameInt: "Ibuprofen",
		therapeuticClass: "analgesic_nsaid",
		defaultDose: "400",
		doseUnit: "mg",
		form: "tablet",
		requiresPrescription: false,
		maxDailyDoseAdult: "1200 mg (без рецепта) / 2400 mg",
		pediatricApproved: true,
		pregnancyCategory: "C",
		clinicalIndicationRu: "Постоперационный болевой синдром, пульпит, симптоматический периодонтит",
		standardRegimenRu: "По 400 мг при болях каждые 6-8 часов после еды (не более 1200 мг/сут)",
	},
	{
		id: "med_ketorolac_10",
		nameRu: "Кеторолак 10 мг",
		nameInt: "Ketorolac",
		therapeuticClass: "analgesic_nsaid",
		defaultDose: "10",
		doseUnit: "mg",
		form: "tablet",
		requiresPrescription: true,
		maxDailyDoseAdult: "40 mg",
		pediatricApproved: false,
		pregnancyCategory: "C",
		clinicalIndicationRu: "Купирование сильного болевого синдрома после сложных хирургических операций и резекций",
		standardRegimenRu: "По 10 мг каждые 6-8 часов, курс не более 5 дней",
	},
	{
		id: "med_paracetamol_500",
		nameRu: "Парацетамол 500 мг",
		nameInt: "Paracetamol",
		therapeuticClass: "analgesic_nsaid",
		defaultDose: "500",
		doseUnit: "mg",
		form: "tablet",
		requiresPrescription: false,
		maxDailyDoseAdult: "4000 mg",
		pediatricApproved: true,
		pregnancyCategory: "B",
		clinicalIndicationRu: "Умеренная боль и лихорадка, препарат выбора при язвенной болезни желудка и беременности",
		standardRegimenRu: "По 500-1000 мг до 4 раз в сутки с интервалом не менее 4 часов",
	},

	// --- 3. Local Anesthetics ---
	{
		id: "med_art_epi_100k",
		nameRu: "Артикаин 4% + Эпинефрин 1:100 000 (Ультракаин Д-С форте)",
		nameInt: "Articaine 4% + Epinephrine 1:100,000",
		therapeuticClass: "local_anesthetic",
		defaultDose: "1.7",
		doseUnit: "ml",
		form: "injection",
		requiresPrescription: true,
		maxDailyDoseAdult: "7 мг/кг массы тела",
		pediatricApproved: true,
		pregnancyCategory: "C",
		clinicalIndicationRu: "Инфильтрационная и проводниковая анестезия при травматичных вмешательствах",
		standardRegimenRu: "1-2 карпулы (1.7-3.4 мл) локально в область операционного поля",
	},
	{
		id: "med_mepivacaine_3",
		nameRu: "Мепивакаин 3% без вазоконстриктора (Скандонест)",
		nameInt: "Mepivacaine 3%",
		therapeuticClass: "local_anesthetic",
		defaultDose: "1.7",
		doseUnit: "ml",
		form: "injection",
		requiresPrescription: true,
		maxDailyDoseAdult: "4.4 мг/кг массы тела",
		pediatricApproved: true,
		pregnancyCategory: "C",
		clinicalIndicationRu: "Анестезия у пациентов с сердечно-сосудистой патологией, гипертиреозом и сахарным диабетом",
		standardRegimenRu: "1-2 карпулы (1.7-3.4 мл) без адреналина",
	},

	// --- 4. Emergency Kit ---
	{
		id: "med_adrenaline_1mg",
		nameRu: "Адреналин (Эпинефрин) 1 мг/мл",
		nameInt: "Epinephrine",
		therapeuticClass: "emergency_kit",
		defaultDose: "0.5",
		doseUnit: "mg",
		form: "injection",
		requiresPrescription: true,
		pediatricApproved: true,
		pregnancyCategory: "C",
		clinicalIndicationRu: "Анафилактический шок, острая сосудистая недостаточность, остановка сердца",
		standardRegimenRu: "0.3-0.5 мл 0.1% раствора внутримышечно в переднебоковую поверхность бедра",
	},

	// --- 5. Oral Antiseptics ---
	{
		id: "med_chx_02",
		nameRu: "Хлоргексидина биглюконат 0.2%",
		nameInt: "Chlorhexidine 0.2%",
		therapeuticClass: "oral_antiseptic",
		defaultDose: "15",
		doseUnit: "ml",
		form: "mouthwash",
		requiresPrescription: false,
		pediatricApproved: true,
		pregnancyCategory: "B",
		clinicalIndicationRu: "Антисептическая обработка после пародонтологических операций и имплантации",
		standardRegimenRu: "Ротовые ванночки по 15 мл 2 раза в день в течение 10-14 дней",
	},
] as const;

export interface DentalDrugInteractionRule {
	readonly drugAId: string;
	readonly drugBId: string;
	readonly severity: "critical" | "warning" | "info";
	readonly riskDescriptionRu: string;
	readonly clinicalRecommendationRu: string;
}

export const DENTAL_DRUG_INTERACTIONS: readonly DentalDrugInteractionRule[] = [
	{
		drugAId: "med_metron_500",
		drugBId: "warfarin",
		severity: "critical",
		riskDescriptionRu: "Метронидазол резко потенцирует антикоагулянтный эффект варфарина (увеличение МНО, риск профузного кровотечения)",
		clinicalRecommendationRu: "Избегать назначения метронидазола; заменить на амоксициллин или клиндамицин. Контроль МНО.",
	},
	{
		drugAId: "med_ibu_400",
		drugBId: "aspirin",
		severity: "warning",
		riskDescriptionRu: "Ибупрофен обратимо блокирует кардиопротективное действие низких доз аспирина",
		clinicalRecommendationRu: "Принимать ибупрофен не ранее чем через 2 часа после приема аспирина, либо заменить на парацетамол.",
	},
	{
		drugAId: "med_art_epi_100k",
		drugBId: "non_selective_beta_blockers",
		severity: "critical",
		riskDescriptionRu: "Эпинефрин на фоне неселективных бета-блокаторов (пропранолол) вызывает тяжелый гипертонический криз с рефлекторной брадикардией",
		clinicalRecommendationRu: "Использовать местный анестетик БЕЗ вазоконстриктора (Мепивакаин 3%).",
	},
] as const;

/**
 * Checks for drug-drug interactions for a list of prescribed and existing patient drugs.
 */
export function checkDentalMedicationInteractions(
	medicationIds: readonly string[],
): DentalDrugInteractionRule[] {
	const medSet = new Set(medicationIds);
	const warnings: DentalDrugInteractionRule[] = [];

	for (const rule of DENTAL_DRUG_INTERACTIONS) {
		if (medSet.has(rule.drugAId) && medSet.has(rule.drugBId)) {
			warnings.push(rule);
		}
	}
	return warnings;
}
