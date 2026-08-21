import { z } from "zod";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ФОРМА РЕЦЕПТУРНОГО БЛАНКА № 107-1/у
 * Приказ Минздрава России от 24 ноября 2021 г. № 1094н
 * «Об утверждении порядка назначения лекарственных препаратов, форм рецептурных
 * бланков на лекарственные препараты, порядка оформления указанных бланков...»
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Отдельная пропись лекарственного препарата в рецепте */
export const prescriptionDrugItemSchema = z.object({
	id: z.string().trim().min(1).default(() => "drug-item-1"),
	// Международное непатентованное наименование (МНН) на латинском языке
	latinName: z.string().trim().min(1).max(240), // Например: "Rp.: Nimesulidi 100 mg"
	// Торговое наименование на русском (для подсказки/пациента)
	tradeName: z.string().trim().min(1).max(120), // Например: "Нимесил"
	// Лекарственная форма
	form: z.string().trim().min(1).max(120), // Например: "гранулы для приготовления суспензии", "таблетки", "капсулы"
	// Дозировка / концентрация
	dosage: z.string().trim().min(1).max(80), // Например: "100 мг", "875 мг + 125 мг"
	// Количество / расфасовка
	quantity: z.string().trim().min(1).max(80), // Например: "N. 10", "1 флакон"
	// Латинское предписание (D.t.d. N ...)
	dispenseLatin: z.string().trim().min(1).max(200), // Например: "D.t.d. N 10 in gran."
	// Сигнатура (Способ применения на русском/национальном языке)
	signaRussian: z.string().trim().min(1).max(500), // Например: "S. Внутрь по 1 пакетику 2 раза в сутки после еды, растворив в 100 мл воды, при болях."
	// Фармакотерапевтическая группа
	category: z.enum(["nsaid", "antibiotic", "antihistamine", "antiseptic", "corticosteroid", "hemostatic", "other"]).default("nsaid"),
});
export type PrescriptionDrugItem = z.infer<typeof prescriptionDrugItemSchema>;

/** Срок действия рецепта по Приказу 1094н */
export const prescriptionValidityDaysSchema = z.enum(["15", "60", "365"]).default("60");
export type PrescriptionValidityDays = z.infer<typeof prescriptionValidityDaysSchema>;

/** Структурированный Payload рецептурного бланка № 107-1/у */
export const form107_1uPayloadSchema = z.object({
	formNumber: z.literal("107-1/у").default("107-1/у"),
	// Реквизиты клиники (штамп медицинской организации)
	clinicLegalName: z.string().trim().min(1).max(240),
	clinicAddress: z.string().trim().max(240).nullable().optional(),
	clinicPhone: z.string().trim().max(64).nullable().optional(),
	clinicOgrn: z.string().trim().max(32).nullable().optional(),
	clinicInn: z.string().trim().max(16).nullable().optional(),
	// Серия и номер рецепта
	prescriptionSeriesNumber: z.string().trim().min(1).max(64),
	prescriptionDate: z.string().trim().min(10).max(32),
	// Данные пациента
	patientFullName: z.string().trim().min(1).max(160),
	patientBirthDate: z.string().trim().min(10).max(32),
	patientAgeYears: z.number().int().min(0).max(130).nullable().optional(), // Обязательно для детей до 18 лет
	medicalCardNumber: z.string().trim().min(1).max(64),
	// Назначивший врач
	doctorFullName: z.string().trim().min(1).max(160),
	doctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог"),
	// Срок действия
	validityDays: prescriptionValidityDaysSchema,
	isChronicSpecialCare: z.boolean().default(false), // Отметка «По специальному назначению» (для хроников на 1 год)
	chronicPeriodicity: z.string().trim().max(120).nullable().optional(), // «ежемесячно», «1 раз в 2 месяца»
	// Выписанные препараты (не более 3 наименований на один бланк 107-1/у по Приказу 1094н)
	items: z.array(prescriptionDrugItemSchema).min(1).max(3),
	// Дополнительные отметки / диагноз
	diagnosisIcd10Code: z.string().trim().max(32).nullable().optional(),
	notes: z.string().trim().max(500).nullable().optional(),
});
export type Form107_1uPayload = z.infer<typeof form107_1uPayloadSchema>;

/** Справочник эталонных стоматологических рецептурных прописей */
export interface DentalPrescriptionDrugPreset {
	readonly id: string;
	readonly tradeNameRu: string;
	readonly activeSubstanceRu: string;
	readonly category: "nsaid" | "antibiotic" | "antihistamine" | "antiseptic" | "hemostatic" | "other";
	readonly categoryLabel: string;
	readonly latinRp: string;
	readonly formRu: string;
	readonly dosageRu: string;
	readonly quantityLabel: string;
	readonly dispenseLatin: string;
	readonly signaRu: string;
	readonly recommendedForIcd10: readonly string[];
}

export const DENTAL_PRESCRIPTION_DRUG_CATALOG: readonly DentalPrescriptionDrugPreset[] = [
	{
		id: "nimesulide_100",
		tradeNameRu: "Нимесил (Нимесулид)",
		activeSubstanceRu: "Нимесулид",
		category: "nsaid",
		categoryLabel: "НПВС / Анальгетик",
		latinRp: "Rp.: Nimesulidi 100 mg",
		formRu: "гранулы для приготовления суспензии для приема внутрь",
		dosageRu: "100 мг",
		quantityLabel: "N. 10 (пакетики)",
		dispenseLatin: "D.t.d. N 10 in gran.",
		signaRu: "S. Внутрь по 1 пакетику (100 мг) 2 раза в день после еды, предварительно растворив содержимое пакетика в 100 мл теплой воды, 3-5 дней при боли.",
		recommendedForIcd10: ["K04.0", "K04.4", "K04.5", "K08.1", "K05.3"],
	},
	{
		id: "ibuprofen_400",
		tradeNameRu: "Ибупрофен (Нурофен Форте)",
		activeSubstanceRu: "Ибупрофен",
		category: "nsaid",
		categoryLabel: "НПВС / Анальгетик",
		latinRp: "Rp.: Ibuprofeni 400 mg",
		formRu: "таблетки, покрытые пленочной оболочкой",
		dosageRu: "400 мг",
		quantityLabel: "N. 20 (таблетки)",
		dispenseLatin: "D.t.d. N 20 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (400 мг) 2-3 раза в день после еды, запивая водой. Не более 1200 мг в сутки.",
		recommendedForIcd10: ["K02.1", "K04.0", "K04.5", "K08.1"],
	},
	{
		id: "ketorolac_10",
		tradeNameRu: "Кеторолак (Кетанов)",
		activeSubstanceRu: "Кеторолак трометамин",
		category: "nsaid",
		categoryLabel: "НПВС (сильный анальгетик)",
		latinRp: "Rp.: Ketorolaci 10 mg",
		formRu: "таблетки, покрытые пленочной оболочкой",
		dosageRu: "10 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (10 мг) при выраженном болевом синдроме (не более 4 таб./сутки, курс не более 3-5 дней).",
		recommendedForIcd10: ["K04.0", "K04.4", "K08.1"],
	},
	{
		id: "amoxiclav_875_125",
		tradeNameRu: "Амоксиклав (Амоксициллин + Клавулановая кислота)",
		activeSubstanceRu: "Амоксициллин + [Клавулановая кислота]",
		category: "antibiotic",
		categoryLabel: "Антибиотик широкого спектра",
		latinRp: "Rp.: Amoxicillini 875 mg + Acidi clavulanici 125 mg",
		formRu: "таблетки, покрытые пленочной оболочкой",
		dosageRu: "875 мг + 125 мг (1000 мг)",
		quantityLabel: "N. 14 (таблетки)",
		dispenseLatin: "D.t.d. N 14 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (875/125 мг) 2 раза в сутки в начале приема пищи через равные интервалы (12 ч) в течение 5-7 дней.",
		recommendedForIcd10: ["K04.4", "K04.5", "K08.1", "K05.3"],
	},
	{
		id: "amoxiclav_500_125",
		tradeNameRu: "Амоксиклав 500/125",
		activeSubstanceRu: "Амоксициллин + [Клавулановая кислота]",
		category: "antibiotic",
		categoryLabel: "Антибиотик",
		latinRp: "Rp.: Amoxicillini 500 mg + Acidi clavulanici 125 mg",
		formRu: "таблетки, покрытые пленочной оболочкой",
		dosageRu: "500 мг + 125 мг",
		quantityLabel: "N. 15 (таблетки)",
		dispenseLatin: "D.t.d. N 15 in tab.",
		signaRu: "S. Внутрь по 1 таблетке 3 раза в сутки в начале приема пищи в течение 5-7 дней.",
		recommendedForIcd10: ["K04.4", "K04.5", "K08.1", "K05.3"],
	},
	{
		id: "ciprofloxacin_500",
		tradeNameRu: "Ципрофлоксацин (Цифран)",
		activeSubstanceRu: "Ципрофлоксацин",
		category: "antibiotic",
		categoryLabel: "Антибиотик (фторхинолон)",
		latinRp: "Rp.: Ciprofloxacini 500 mg",
		formRu: "таблетки, покрытые пленочной оболочкой",
		dosageRu: "500 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (500 мг) 2 раза в сутки за 1 час до еды или через 2 часа после еды, 5-7 дней.",
		recommendedForIcd10: ["K04.4", "K08.1", "K05.3"],
	},
	{
		id: "metronidazole_500",
		tradeNameRu: "Метронидазол (Трихопол)",
		activeSubstanceRu: "Метронидазол",
		category: "antibiotic",
		categoryLabel: "Противомикробное / Противопротозойное",
		latinRp: "Rp.: Metronidazoli 500 mg",
		formRu: "таблетки",
		dosageRu: "500 мг",
		quantityLabel: "N. 20 (таблетки)",
		dispenseLatin: "D.t.d. N 20 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (500 мг) 2 раза в день во время или после еды, 7 дней (при анаэробной инфекции/пародонтите).",
		recommendedForIcd10: ["K05.3", "K04.4"],
	},
	{
		id: "loratadine_10",
		tradeNameRu: "Лоратадин (Кларитин)",
		activeSubstanceRu: "Лоратадин",
		category: "antihistamine",
		categoryLabel: "Антигистаминное / Противоотечное",
		latinRp: "Rp.: Loratadini 10 mg",
		formRu: "таблетки",
		dosageRu: "10 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (10 мг) 1 раз в сутки независимо от приема пищи в течение 5 дней для уменьшения постоперационного отека.",
		recommendedForIcd10: ["K08.1", "K04.4"],
	},
	{
		id: "chlorhexidine_005",
		tradeNameRu: "Хлоргексидина биглюконат 0.05%",
		activeSubstanceRu: "Хлоргексидин",
		category: "antiseptic",
		categoryLabel: "Антисептик для полости рта",
		latinRp: "Rp.: Sol. Chlorhexidini bigluconatis 0.05% - 100 ml",
		formRu: "раствор для местного и наружного применения 0.05%",
		dosageRu: "0.05%",
		quantityLabel: "1 флакон (100 мл)",
		dispenseLatin: "D.t.d. N 1",
		signaRu: "S. Ротовые ванночки по 10-15 мл неразведенного раствора 2-3 раза в день по 1 минуте после еды (не полоскать активно!) в течение 5-7 дней.",
		recommendedForIcd10: ["K05.1", "K05.3", "K08.1", "Z01.2"],
	},
	{
		id: "metrogyl_denta",
		tradeNameRu: "Метрогил Дента",
		activeSubstanceRu: "Метронидазол + Хлоргексидин",
		category: "antiseptic",
		categoryLabel: "Стоматологический антибактериальный гель",
		latinRp: "Rp.: Gel. 'Metrogyl Denta' 20.0",
		formRu: "гель стоматологический",
		dosageRu: "20 г",
		quantityLabel: "1 туба (20 г)",
		dispenseLatin: "D.t.d. N 1 in tuba",
		signaRu: "S. Наносить на область десен 2 раза в день после чистки зубов в течение 7-10 дней. После нанесения не пить и не принимать пищу 30 минут.",
		recommendedForIcd10: ["K05.1", "K05.3"],
	},
];

/**
 * Автоматическая генерация Payload рецептурного бланка № 107-1/у из данных визита (SOAP).
 */
export function generatePrescriptionPayloadFromSoap(options: {
	readonly clinic: {
		readonly fullName: string;
		readonly address?: string | null;
		readonly phone?: string | null;
		readonly ogrn?: string | null;
		readonly inn?: string | null;
	};
	readonly patient: {
		readonly fullName: string;
		readonly birthDate: string;
		readonly medicalCardNumber: string;
	};
	readonly doctor: {
		readonly fullName: string;
		readonly specialty?: string | null;
	};
	readonly diagnosisIcd10?: string | null;
	readonly treatmentText?: string | null;
	readonly explicitDrugIds?: readonly string[];
	readonly customSeriesNumber?: string;
}): Form107_1uPayload {
	const icd = (options.diagnosisIcd10 || "K02.1").toUpperCase().trim();
	const seriesNum =
		options.customSeriesNumber ||
		`РЕЦ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

	// Выбираем подходящие лекарственные препараты
	let selectedDrugs: DentalPrescriptionDrugPreset[] = [];

	if (options.explicitDrugIds && options.explicitDrugIds.length > 0) {
		selectedDrugs = DENTAL_PRESCRIPTION_DRUG_CATALOG.filter((d) =>
			options.explicitDrugIds!.includes(d.id),
		);
	} else {
		// Автоподбор по коду МКБ-10
		selectedDrugs = DENTAL_PRESCRIPTION_DRUG_CATALOG.filter((d) =>
			d.recommendedForIcd10.some((code) => icd.startsWith(code)),
		);
		// Ограничение максимум 2-3 препарата на один бланк
		if (selectedDrugs.length === 0) {
			selectedDrugs = [DENTAL_PRESCRIPTION_DRUG_CATALOG[0]!]; // fallback to Nimesulide
		} else if (selectedDrugs.length > 3) {
			selectedDrugs = selectedDrugs.slice(0, 3);
		}
	}

	const drugItems: PrescriptionDrugItem[] = selectedDrugs.map((d, index) => ({
		id: `drug-${index + 1}-${d.id}`,
		latinName: d.latinRp,
		tradeName: d.tradeNameRu,
		form: d.formRu,
		dosage: d.dosageRu,
		quantity: d.quantityLabel,
		dispenseLatin: d.dispenseLatin,
		signaRussian: d.signaRu,
		category: d.category,
	}));

	return {
		formNumber: "107-1/у",
		clinicLegalName: options.clinic.fullName,
		clinicAddress: options.clinic.address || null,
		clinicPhone: options.clinic.phone || null,
		clinicOgrn: options.clinic.ogrn || null,
		clinicInn: options.clinic.inn || null,
		prescriptionSeriesNumber: seriesNum,
		prescriptionDate: new Date().toISOString().slice(0, 10),
		patientFullName: options.patient.fullName,
		patientBirthDate: options.patient.birthDate,
		medicalCardNumber: options.patient.medicalCardNumber,
		doctorFullName: options.doctor.fullName,
		doctorSpecialty: options.doctor.specialty || "Врач-стоматолог",
		validityDays: "60",
		isChronicSpecialCare: false,
		items: drugItems,
		diagnosisIcd10Code: icd,
	};
}
