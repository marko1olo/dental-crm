import { z } from "zod";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ФОРМЫ РЕЦЕПТУРНЫХ БЛАНКОВ МИНЗДРАВА РФ (ПРИКАЗ МЗ РФ № 1094н)
 * 
 * 1. Форма № 107-1/у — Рецептурный бланк на лекарственные препараты общего назначения
 * 2. Форма № 148-1/у-88 — Рецептурный бланк строгой отчетности (ПКУ / сильнодействующие / психотропные)
 * 3. Форма № 148-1/у-04(л) — Рецептурный бланк для льготного отпуска (бесплатно / со скидкой 50%)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Допустимые типы бланков рецептов */
export const prescriptionFormTypeSchema = z.enum(["107-1u", "148-1u-88", "148-1u-04l"]);
export type PrescriptionFormType = z.infer<typeof prescriptionFormTypeSchema>;

/** Сроки действия рецептов согласно Приказу Минздрава России № 1094н */
export const prescriptionValidityPeriodSchema = z.enum([
	"days_15", // 15 дней — бланки 148-1/у-88 (ПКУ), наркотические/психотропные
	"days_30", // 30 дней — льготные рецепты 148-1/у-04(л) стандартные
	"days_60", // 60 дней — бланки 107-1/у стандартные (2 месяца)
	"year_1",  // До 1 года — хронические больные с пометкой «По специальному назначению»
]);
export type PrescriptionValidityPeriod = z.infer<typeof prescriptionValidityPeriodSchema>;

/** Категории льготных граждан (для формы 148-1/у-04(л)) */
export const PREFERENTIAL_BENEFIT_CATEGORIES = [
	{ code: "010", nameRu: "Инвалиды войны", discountPercent: 100 },
	{ code: "020", nameRu: "Участники Великой Отечественной войны", discountPercent: 100 },
	{ code: "030", nameRu: "Ветераны боевых действий", discountPercent: 100 },
	{ code: "081", nameRu: "Инвалиды I группы", discountPercent: 100 },
	{ code: "082", nameRu: "Инвалиды II группы", discountPercent: 100 },
	{ code: "083", nameRu: "Инвалиды III группы (безработные)", discountPercent: 50 },
	{ code: "084", nameRu: "Дети-инвалиды", discountPercent: 100 },
	{ code: "701", nameRu: "Лица, подвергшиеся воздействию радиации (ЧАЭС)", discountPercent: 100 },
	{ code: "801", nameRu: "Дети первых трех лет жизни (из многодетных семей — до 6 лет)", discountPercent: 100 },
	{ code: "802", nameRu: "Пенсионеры, получающие пенсию по старости в минимальном размере", discountPercent: 50 },
	{ code: "901", nameRu: "Хронические заболевания (диабет, бронхиальная астма, онкология)", discountPercent: 100 },
] as const;

/** ═══════════════════════════════════════════════════════════════════════════
 * СПРАВОЧНИКИ ФОРМ ВЫПУСКА, ДОЗИРОВОК И СПОСОБОВ ПРИМЕНЕНИЯ (РУС / ЛАТ)
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface PrescriptionDosageFormMeta {
	readonly code: string;
	readonly nameRu: string;
	readonly nameLatin: string;
	readonly latinAbbr: string;
	readonly dispensePatternLatin: string; // e.g. "D.t.d. N {count} in tab."
	readonly defaultUnitRu: string;
}

export const PRESCRIPTION_DOSAGE_FORMS_CATALOG: readonly PrescriptionDosageFormMeta[] = [
	{
		code: "tablets",
		nameRu: "таблетки",
		nameLatin: "Tabulettae",
		latinAbbr: "tab.",
		dispensePatternLatin: "D.t.d. N {count} in tab.",
		defaultUnitRu: "таб.",
	},
	{
		code: "tablets_coated",
		nameRu: "таблетки, покрытые пленочной оболочкой",
		nameLatin: "Tabulettae obductae",
		latinAbbr: "tab. obd.",
		dispensePatternLatin: "D.t.d. N {count} in tab.",
		defaultUnitRu: "таб.",
	},
	{
		code: "tablets_dispersible",
		nameRu: "таблетки диспергируемые (растворимые)",
		nameLatin: "Tabulettae dispersibiles",
		latinAbbr: "tab. dispers.",
		dispensePatternLatin: "D.t.d. N {count} in tab.",
		defaultUnitRu: "таб.",
	},
	{
		code: "capsules",
		nameRu: "капсулы",
		nameLatin: "Capsulae",
		latinAbbr: "caps.",
		dispensePatternLatin: "D.t.d. N {count} in caps.",
		defaultUnitRu: "капс.",
	},
	{
		code: "granules_suspension",
		nameRu: "гранулы для приготовления суспензии для приема внутрь",
		nameLatin: "Granulae pro suspensionis oralis",
		latinAbbr: "gran.",
		dispensePatternLatin: "D.t.d. N {count} in gran.",
		defaultUnitRu: "пакет.",
	},
	{
		code: "powder_oral",
		nameRu: "порошок для приготовления раствора для приема внутрь",
		nameLatin: "Pulvis pro solutione orali",
		latinAbbr: "pulv.",
		dispensePatternLatin: "D.t.d. N {count} in chart.",
		defaultUnitRu: "пакет.",
	},
	{
		code: "solution_injection",
		nameRu: "раствор для инъекций (в/м, в/в)",
		nameLatin: "Solutio pro injectionibus",
		latinAbbr: "sol.",
		dispensePatternLatin: "D.t.d. N {count} in amp.",
		defaultUnitRu: "амп.",
	},
	{
		code: "solution_oral_topical",
		nameRu: "раствор для местного применения / ротовых ванночек",
		nameLatin: "Solutio ad usum externum / localem",
		latinAbbr: "sol.",
		dispensePatternLatin: "D.t.d. N {count} in flac.",
		defaultUnitRu: "флак.",
	},
	{
		code: "dental_gel",
		nameRu: "гель стоматологический / для местного применения",
		nameLatin: "Gelum dentale",
		latinAbbr: "gel.",
		dispensePatternLatin: "D.t.d. N {count} in tuba",
		defaultUnitRu: "туба",
	},
	{
		code: "dental_paste",
		nameRu: "дентальная адгезивная паста",
		nameLatin: "Pasta dentalis adhesiva",
		latinAbbr: "past.",
		dispensePatternLatin: "D.t.d. N {count} in tuba",
		defaultUnitRu: "туба",
	},
	{
		code: "spray_topical",
		nameRu: "спрей для местного применения дозированный",
		nameLatin: "Aerosolum / Spray",
		latinAbbr: "aeros.",
		dispensePatternLatin: "D.t.d. N {count} in flac.",
		defaultUnitRu: "флак.",
	},
	{
		code: "suppositories",
		nameRu: "суппозитории ректальные",
		nameLatin: "Suppositoria rectalia",
		latinAbbr: "supp.",
		dispensePatternLatin: "D.t.d. N {count} in supp.",
		defaultUnitRu: "супп.",
	},
];

export interface PrescriptionAdministrationRouteMeta {
	readonly code: string;
	readonly nameRu: string;
	readonly nameLatin: string;
	readonly signaPrefixRu: string;
	readonly commonInstructionsRu: readonly string[];
}

export const PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG: readonly PrescriptionAdministrationRouteMeta[] = [
	{
		code: "per_os",
		nameRu: "Внутрь (перорально)",
		nameLatin: "Per os",
		signaPrefixRu: "Внутрь",
		commonInstructionsRu: [
			"по 1 таб. 2 раза в день после еды, запивая водой",
			"по 1 таб. 3 раза в день во время еды",
			"по 1 пакетику 2 раза в день после еды, предварительно растворив в 100 мл теплой воды",
			"по 1 капсуле 1 раз в сутки утром натощак за 30 мин до еды",
			"по 1 таб. при выраженном болевом синдроме (не более 4 таб./сутки)",
		],
	},
	{
		code: "sublingual",
		nameRu: "Под язык (сублингвально)",
		nameLatin: "Sublingualiter",
		signaPrefixRu: "Под язык",
		commonInstructionsRu: [
			"по 1 таб. под язык до полного рассасывания при приступе боли",
			"по 1 таб. под язык 3 раза в день за 15 минут до еды",
		],
	},
	{
		code: "in_cavum_oris",
		nameRu: "Местно / В полость рта (ротовые ванночки, аппликации)",
		nameLatin: "In cavum oris / Localiter",
		signaPrefixRu: "Местно",
		commonInstructionsRu: [
			"ротовые ванночки по 10-15 мл неразведенного раствора 2-3 раза в день по 1 минуте после еды (не полоскать активно!)",
			"наносить полоской 1 см на пораженный участок десны 2-3 раза в день после чистки зубов (не принимать пищу 30 мин)",
			"аппликации на область послеоперационной раны 2 раза в сутки по 15 минут",
		],
	},
	{
		code: "intramuscular",
		nameRu: "Внутримышечно (в/м)",
		nameLatin: "Intramusculariter (i.m.)",
		signaPrefixRu: "Внутримышечно",
		commonInstructionsRu: [
			"в/м по 1 ампуле (1-2 мл) 1-2 раза в сутки при остром болевом синдроме",
			"в/м по 1 ампуле 1 раз в сутки глубоко в ягодичную мышцу, курс 3 дня",
		],
	},
	{
		code: "intravenous",
		nameRu: "Внутривенно (в/в)",
		nameLatin: "Intravenose (i.v.)",
		signaPrefixRu: "Внутривенно",
		commonInstructionsRu: [
			"в/в струйно медленно по 1 ампуле, разведенной в 10 мл 0.9% раствора натрия хлорида",
			"в/в капельно в 100-200 мл физиологического раствора со скоростью 40-60 кап/мин",
		],
	},
];

/** ═══════════════════════════════════════════════════════════════════════════
 * ZOD SCHEMAS ДЛЯ ВАЛИДАЦИИ РЕЦЕПТУРНЫХ БЛАНКОВ
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Отдельная пропись лекарственного препарата в рецепте */
export const prescriptionDrugItemSchema = z.object({
	id: z.string().trim().min(1).default(() => `drug-item-${Date.now()}`),
	latinName: z.string().trim().min(1).max(240), // "Rp.: Nimesulidi 100 mg"
	tradeName: z.string().trim().min(1).max(120), // "Нимесил"
	form: z.string().trim().min(1).max(120),      // "гранулы для приготовления суспензии"
	dosage: z.string().trim().min(1).max(80),    // "100 мг"
	quantity: z.string().trim().min(1).max(80),  // "N. 10"
	dispenseLatin: z.string().trim().min(1).max(200), // "D.t.d. N 10 in gran."
	signaRussian: z.string().trim().min(1).max(500),  // "S. Внутрь по 1 пакетику..."
	category: z.enum([
		"nsaid",
		"antibiotic",
		"controlled_pku",
		"antihistamine",
		"antiseptic",
		"corticosteroid",
		"hemostatic",
		"gastroprotective",
		"preferential_somatic",
		"other",
	]).default("nsaid"),
});
export type PrescriptionDrugItem = z.infer<typeof prescriptionDrugItemSchema>;

/** Реквизиты штампа медицинской организации */
export const prescriptionClinicStampSchema = z.object({
	clinicLegalName: z.string().trim().min(1).max(240),
	clinicAddress: z.string().trim().max(240).nullable().optional(),
	clinicPhone: z.string().trim().max(64).nullable().optional(),
	clinicOgrn: z.string().trim().max(32).nullable().optional(),
	clinicInn: z.string().trim().max(16).nullable().optional(),
	medicalLicenseNumber: z.string().trim().max(64).nullable().optional(),
	medicalLicenseDate: z.string().trim().max(32).nullable().optional(),
});
export type PrescriptionClinicStamp = z.infer<typeof prescriptionClinicStampSchema>;

/** Электронная подпись врача (УКЭП) */
export const prescriptionDoctorUkepSchema = z.object({
	doctorFullName: z.string().trim().min(1).max(160),
	doctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог"),
	doctorSnils: z.string().trim().max(32).nullable().optional(),
	certificateSerialNumber: z.string().trim().max(64).nullable().optional(),
	certificateThumbprint: z.string().trim().max(64).nullable().optional(),
	certificateIssuer: z.string().trim().max(160).nullable().optional(),
	certificateValidFrom: z.string().trim().max(32).nullable().optional(),
	certificateValidTo: z.string().trim().max(32).nullable().optional(),
	signedAt: z.string().trim().max(32).nullable().optional(),
	cryptoSignaturePkcs7: z.string().trim().min(1).nullable().optional(),
	signatureAlgorithm: z.string().trim().max(64).default("ГОСТ Р 34.10-2012 (256 бит)"),
	egiszDocumentId: z.string().trim().max(64).nullable().optional(),
	qrVerificationUrl: z.string().trim().max(256).nullable().optional(),
});
export type PrescriptionDoctorUkep = z.infer<typeof prescriptionDoctorUkepSchema>;

/** Реквизиты льготы (для формы 148-1/у-04(л)) */
export const prescriptionPreferentialDetailsSchema = z.object({
	preferentialBenefitCode: z.string().trim().min(1).max(16).default("081"), // Код категории (e.g. 081 - Инвалид I группы)
	preferentialBenefitNameRu: z.string().trim().max(160).default("Инвалиды I группы"),
	preferentialDiscountPercent: z.number().int().min(0).max(100).default(100), // 100% бесплатно / 50%
	patientSnils: z.string().trim().min(11).max(20), // 11-значный СНИЛС
	patientOmsPolicy: z.string().trim().min(16).max(20), // 16-значный полис ОМС
	fundingSource: z.enum(["federal", "regional", "municipal"]).default("federal"),
	medicalCardNumber: z.string().trim().min(1).max(64),
});
export type PrescriptionPreferentialDetails = z.infer<typeof prescriptionPreferentialDetailsSchema>;

/** Универсальный структурированный Payload рецептурного бланка (Формы 107-1/у, 148-1/у-88, 148-1/у-04(л)) */
export const form107_1uPayloadSchema = z.object({
	formNumber: z.literal("107-1/у").default("107-1/у"),
	clinicLegalName: z.string().trim().min(1).max(240),
	clinicAddress: z.string().trim().max(240).nullable().optional(),
	clinicPhone: z.string().trim().max(64).nullable().optional(),
	clinicOgrn: z.string().trim().max(32).nullable().optional(),
	clinicInn: z.string().trim().max(16).nullable().optional(),
	medicalLicenseNumber: z.string().trim().max(64).nullable().optional(),
	prescriptionSeriesNumber: z.string().trim().min(1).max(64),
	prescriptionDate: z.string().trim().min(10).max(32),
	patientFullName: z.string().trim().min(1).max(160),
	patientBirthDate: z.string().trim().min(10).max(32),
	patientAgeYears: z.number().int().min(0).max(130).nullable().optional(),
	medicalCardNumber: z.string().trim().min(1).max(64),
	doctorFullName: z.string().trim().min(1).max(160),
	doctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог"),
	validityDays: z.enum(["15", "30", "60", "365"]).default("60"),
	isChronicSpecialCare: z.boolean().default(false),
	chronicPeriodicity: z.string().trim().max(120).nullable().optional(),
	items: z.array(prescriptionDrugItemSchema).min(1).max(3),
	diagnosisIcd10Code: z.string().trim().max(32).nullable().optional(),
	notes: z.string().trim().max(500).nullable().optional(),
	ukepSignature: prescriptionDoctorUkepSchema.nullable().optional(),
	withStampAndSignature: z.boolean().default(true).optional(),
});
export type Form107_1uPayload = z.infer<typeof form107_1uPayloadSchema>;

/** Payload рецептурного бланка строгой отчетности № 148-1/у-88 (ПКУ) */
export const form148_1u88PayloadSchema = z.object({
	formNumber: z.literal("148-1/у-88").default("148-1/у-88"),
	clinicLegalName: z.string().trim().min(1).max(240),
	clinicAddress: z.string().trim().max(240).nullable().optional(),
	clinicPhone: z.string().trim().max(64).nullable().optional(),
	clinicOgrn: z.string().trim().max(32).nullable().optional(),
	clinicInn: z.string().trim().max(16).nullable().optional(),
	medicalLicenseNumber: z.string().trim().max(64).nullable().optional(),
	prescriptionSeriesNumber: z.string().trim().min(1).max(64),
	prescriptionDate: z.string().trim().min(10).max(32),
	patientFullName: z.string().trim().min(1).max(160),
	patientBirthDate: z.string().trim().min(10).max(32),
	patientAddress: z.string().trim().min(5).max(240), // Обязательно для 148-1/у-88
	medicalCardNumber: z.string().trim().min(1).max(64),
	doctorFullName: z.string().trim().min(1).max(160),
	doctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог"),
	headOfDepartmentFullName: z.string().trim().max(160).nullable().optional(),
	validityDays: z.literal("15").default("15"), // Строго 15 дней для ПКУ
	items: z.array(prescriptionDrugItemSchema).min(1).max(1), // Строго 1 препарат на бланк
	diagnosisIcd10Code: z.string().trim().max(32).nullable().optional(),
	notes: z.string().trim().max(500).nullable().optional(),
	ukepSignature: prescriptionDoctorUkepSchema.nullable().optional(),
});
export type Form148_1u88Payload = z.infer<typeof form148_1u88PayloadSchema>;

/** Payload льготного рецептурного бланка № 148-1/у-04(л) */
export const form148_1u04lPayloadSchema = z.object({
	formNumber: z.literal("148-1/у-04(л)").default("148-1/у-04(л)"),
	clinicLegalName: z.string().trim().min(1).max(240),
	clinicAddress: z.string().trim().max(240).nullable().optional(),
	clinicPhone: z.string().trim().max(64).nullable().optional(),
	clinicOgrn: z.string().trim().max(32).nullable().optional(),
	clinicInn: z.string().trim().max(16).nullable().optional(),
	medicalLicenseNumber: z.string().trim().max(64).nullable().optional(),
	prescriptionSeriesNumber: z.string().trim().min(1).max(64),
	prescriptionDate: z.string().trim().min(10).max(32),
	patientFullName: z.string().trim().min(1).max(160),
	patientBirthDate: z.string().trim().min(10).max(32),
	patientAddress: z.string().trim().max(240).nullable().optional(),
	medicalCardNumber: z.string().trim().min(1).max(64),
	preferentialDetails: prescriptionPreferentialDetailsSchema,
	doctorFullName: z.string().trim().min(1).max(160),
	doctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог"),
	validityDays: z.enum(["15", "30", "60", "365"]).default("30"), // 30 дней стандарт, 15 дней наркотики, 365 хроники
	isChronicSpecialCare: z.boolean().default(false),
	chronicPeriodicity: z.string().trim().max(120).nullable().optional(),
	items: z.array(prescriptionDrugItemSchema).min(1).max(3),
	diagnosisIcd10Code: z.string().trim().max(32).nullable().optional(),
	notes: z.string().trim().max(500).nullable().optional(),
	ukepSignature: prescriptionDoctorUkepSchema.nullable().optional(),
});
export type Form148_1u04lPayload = z.infer<typeof form148_1u04lPayloadSchema>;

/** ═══════════════════════════════════════════════════════════════════════════
 * СПРАВОЧНИК СТОМАТОЛОГИЧЕСКИХ И МЕДИЦИНСКИХ ПРЕПАРАТОВ
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface DentalPrescriptionDrugPreset {
	readonly id: string;
	readonly tradeNameRu: string;
	readonly activeSubstanceRu: string;
	readonly category: "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic" | "other";
	readonly categoryLabel: string;
	readonly latinRp: string;
	readonly formRu: string;
	readonly dosageRu: string;
	readonly quantityLabel: string;
	readonly dispenseLatin: string;
	readonly signaRu: string;
	readonly recommendedForIcd10: readonly string[];
	readonly defaultValidityDays?: "15" | "30" | "60" | "365";
	readonly isPkuStrictAccounting?: boolean;
}

export const DENTAL_PRESCRIPTION_DRUG_CATALOG: readonly DentalPrescriptionDrugPreset[] = [
	// ── НПВС и анальгетики ──
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
		recommendedForIcd10: ["K04.0", "K04.4", "K04.5", "K08.1", "K05.3", "K05.2"],
		defaultValidityDays: "60",
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
		signaRu: "S. Внутрь по 1 таблетке (400 мг) 2-3 раза в день после еды, запивая водой. Не более 1200 мг в сутки, курс 3-5 дней.",
		recommendedForIcd10: ["K02.1", "K04.0", "K04.5", "K08.1"],
		defaultValidityDays: "60",
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
		defaultValidityDays: "60",
	},
	{
		id: "dexketoprofen_25",
		tradeNameRu: "Декскетопрофен (Дексалгин)",
		activeSubstanceRu: "Декскетопрофен трометамол",
		category: "nsaid",
		categoryLabel: "НПВС быстрого действия",
		latinRp: "Rp.: Dexketoprofeni 25 mg",
		formRu: "таблетки, покрытые пленочной оболочкой",
		dosageRu: "25 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (25 мг) каждые 8 часов при болях (максимум 75 мг в сутки, курс до 3-5 дней).",
		recommendedForIcd10: ["K04.0", "K08.1"],
		defaultValidityDays: "60",
	},
	{
		id: "ketoprofen_150",
		tradeNameRu: "Кетонал Дуо (Кетопрофен)",
		activeSubstanceRu: "Кетопрофен",
		category: "nsaid",
		categoryLabel: "НПВС пролонгированного действия",
		latinRp: "Rp.: Caps. Ketoprofeni 150 mg",
		formRu: "капсулы с модифицированным высвобождением",
		dosageRu: "150 мг",
		quantityLabel: "N. 10 (капсулы)",
		dispenseLatin: "D.t.d. N 10 in caps.",
		signaRu: "S. Внутрь по 1 капсуле (150 мг) 1 раз в сутки после еды, запивая достаточным количеством воды, 3-5 дней.",
		recommendedForIcd10: ["K04.4", "K08.1"],
		defaultValidityDays: "60",
	},

	// ── Антибиотики и противомикробные средства ──
	{
		id: "amoxiclav_875_125",
		tradeNameRu: "Амоксиклав (Амоксициллин + Клавулановая кислота)",
		activeSubstanceRu: "Амоксициллин + [Клавулановая кислота]",
		category: "antibiotic",
		categoryLabel: "Антибиотик широкого спектра (защищенный пенициллин)",
		latinRp: "Rp.: Amoxicillini 875 mg + Acidi clavulanici 125 mg",
		formRu: "таблетки, покрытые пленочной оболочкой",
		dosageRu: "875 мг + 125 мг (1000 мг)",
		quantityLabel: "N. 14 (таблетки)",
		dispenseLatin: "D.t.d. N 14 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (875/125 мг) 2 раза в сутки в начале приема пищи через равные интервалы (12 ч) в течение 5-7 дней.",
		recommendedForIcd10: ["K04.4", "K04.5", "K08.1", "K05.3", "K05.2"],
		defaultValidityDays: "60",
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
		signaRu: "S. Внутрь по 1 таблетке 3 раза в сутки в начале приема пищи через каждые 8 часов в течение 5-7 дней.",
		recommendedForIcd10: ["K04.4", "K04.5", "K08.1", "K05.3"],
		defaultValidityDays: "60",
	},
	{
		id: "amoxicillin_500",
		tradeNameRu: "Амоксициллин (Флемоксин Солютаб)",
		activeSubstanceRu: "Амоксициллин",
		category: "antibiotic",
		categoryLabel: "Антибиотик (Пенициллин полусинтетический)",
		latinRp: "Rp.: Amoxicillini 500 mg",
		formRu: "капсулы / таблетки диспергируемые",
		dosageRu: "500 мг",
		quantityLabel: "N. 20 (капсулы)",
		dispenseLatin: "D.t.d. N 20 in caps.",
		signaRu: "S. Внутрь по 1 капсуле (500 мг) 3 раза в день через каждые 8 часов, курс 5-7 дней.",
		recommendedForIcd10: ["K04.4", "K04.5", "K08.1", "K05.3"],
		defaultValidityDays: "60",
	},
	{
		id: "azithromycin_500",
		tradeNameRu: "Сумамед (Азитромицин)",
		activeSubstanceRu: "Азитромицин",
		category: "antibiotic",
		categoryLabel: "Антибиотик-макролид (3-дневный курс)",
		latinRp: "Rp.: Azithromycini 500 mg",
		formRu: "капсулы / таблетки",
		dosageRu: "500 мг",
		quantityLabel: "N. 3 (капсулы)",
		dispenseLatin: "D.t.d. N 3 in caps.",
		signaRu: "S. Внутрь по 1 капсуле (500 мг) 1 раз в сутки за 1 час до еды или через 2 часа после еды, строго 3 дня (курсовая доза 1.5 г).",
		recommendedForIcd10: ["K04.4", "K05.3", "K08.1"],
		defaultValidityDays: "60",
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
		signaRu: "S. Внутрь по 1 таблетке (500 мг) 2 раза в сутки за 1 час до еды или через 2 часа после еды, запивая стаканом воды, 5-7 дней.",
		recommendedForIcd10: ["K04.4", "K08.1", "K05.3"],
		defaultValidityDays: "60",
	},
	{
		id: "metronidazole_500",
		tradeNameRu: "Метронидазол (Трихопол)",
		activeSubstanceRu: "Метронидазол",
		category: "antibiotic",
		categoryLabel: "Противомикробное (антианаэробное)",
		latinRp: "Rp.: Metronidazoli 500 mg",
		formRu: "таблетки",
		dosageRu: "500 мг",
		quantityLabel: "N. 20 (таблетки)",
		dispenseLatin: "D.t.d. N 20 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (500 мг) 2 раза в день во время или после еды, не разжевывая, в течение 7 дней (при пародонтите / перикороните).",
		recommendedForIcd10: ["K05.3", "K05.2", "K04.4"],
		defaultValidityDays: "60",
	},
	{
		id: "lincomycin_500",
		tradeNameRu: "Линкомицин",
		activeSubstanceRu: "Линкомицин",
		category: "antibiotic",
		categoryLabel: "Антибиотик остеотропный",
		latinRp: "Rp.: Caps. Lincomycini hydrochloridi 0.5",
		formRu: "капсулы",
		dosageRu: "500 мг",
		quantityLabel: "N. 20 (капсулы)",
		dispenseLatin: "D.t.d. N 20 in caps.",
		signaRu: "S. Внутрь по 1 капсуле (500 мг) 3-4 раза в день за 1-2 часа до еды, запивая водой, 7-10 дней (при остеомиелите / периодонтите).",
		recommendedForIcd10: ["K04.4", "K04.5", "K10.2"],
		defaultValidityDays: "60",
	},

	// ── Препараты строгой отчетности (ПКУ) — Форма № 148-1/у-88 ──
	{
		id: "tramadol_50",
		tradeNameRu: "Трамадол (Трамал)",
		activeSubstanceRu: "Трамадол",
		category: "controlled_pku",
		categoryLabel: "Опиоидный анальгетик (ПКУ)",
		latinRp: "Rp.: Tramadoli 50 mg",
		formRu: "капсулы",
		dosageRu: "50 мг",
		quantityLabel: "N. 10 (капсулы)",
		dispenseLatin: "D.t.d. N 10 in caps.",
		signaRu: "S. Внутрь по 1 капсуле (50 мг) при некупируемом выраженном болевом синдроме после травматичной операции, не более 400 мг в сутки.",
		recommendedForIcd10: ["K08.1", "K04.4", "K10.2"],
		defaultValidityDays: "15",
		isPkuStrictAccounting: true,
	},
	{
		id: "zaldiar_375",
		tradeNameRu: "Залдиар (Трамадол + Парацетамол)",
		activeSubstanceRu: "Трамадол + Парацетамол",
		category: "controlled_pku",
		categoryLabel: "Комбинированный анальгетик (ПКУ)",
		latinRp: "Rp.: Tab. Tramadoli 37.5 mg + Paracetamoli 325 mg",
		formRu: "таблетки, покрытые оболочкой",
		dosageRu: "37.5 мг + 325 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu: "S. Внутрь по 1-2 таблетки при сильной боли после челюстно-лицевой операции, интервал между приемами не менее 6 часов.",
		recommendedForIcd10: ["K08.1", "K10.2"],
		defaultValidityDays: "15",
		isPkuStrictAccounting: true,
	},
	{
		id: "diazepam_5",
		tradeNameRu: "Диазепам (Реланиум / Сибазон)",
		activeSubstanceRu: "Диазепам",
		category: "controlled_pku",
		categoryLabel: "Анксиолитик / Седативное (ПКУ)",
		latinRp: "Rp.: Tab. Diazepami 0.005",
		formRu: "таблетки",
		dosageRu: "5 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (5 мг) на ночь накануне сложной костно-пластической операции при выраженной дентофобии.",
		recommendedForIcd10: ["Z01.2", "F40.2"],
		defaultValidityDays: "15",
		isPkuStrictAccounting: true,
	},
	{
		id: "pregabalin_75",
		tradeNameRu: "Прегабалин (Лирика)",
		activeSubstanceRu: "Прегабалин",
		category: "controlled_pku",
		categoryLabel: "Нейропатическая боль (ПКУ)",
		latinRp: "Rp.: Caps. Pregabalini 75 mg",
		formRu: "капсулы",
		dosageRu: "75 мг",
		quantityLabel: "N. 14 (капсулы)",
		dispenseLatin: "D.t.d. N 14 in caps.",
		signaRu: "S. Внутрь по 1 капсуле (75 мг) 2 раза в сутки при стойкой тригеминальной невралгии / посттравматической нейропатии нижнеальвеолярного нерва.",
		recommendedForIcd10: ["G50.0", "K08.1"],
		defaultValidityDays: "15",
		isPkuStrictAccounting: true,
	},

	// ── Антисептики и стоматологические топические средства ──
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
		recommendedForIcd10: ["K05.1", "K05.3", "K08.1", "Z01.2", "K05.2"],
		defaultValidityDays: "60",
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
		recommendedForIcd10: ["K05.1", "K05.3", "K05.2"],
		defaultValidityDays: "60",
	},
	{
		id: "cholisal_gel",
		tradeNameRu: "Холисал гель",
		activeSubstanceRu: "Холина салицилат + Цеталкония хлорид",
		category: "antiseptic",
		categoryLabel: "Стоматологический противовоспалительный гель",
		latinRp: "Rp.: Gel. 'Cholisal' 10.0",
		formRu: "гель стоматологический",
		dosageRu: "10 г",
		quantityLabel: "1 туба (10 г)",
		dispenseLatin: "D.t.d. N 1 in tuba",
		signaRu: "S. Наносить полоской 1 см на пораженную слизистую/десну чистым пальцем 2-3 раза в день за 15 мин до еды или на ночь.",
		recommendedForIcd10: ["K05.1", "K12.0", "K12.1"],
		defaultValidityDays: "60",
	},
	{
		id: "miramistin_001",
		tradeNameRu: "Мирамистин 0.01%",
		activeSubstanceRu: "Бензилдиметил-миристоиламино-пропиламмоний",
		category: "antiseptic",
		categoryLabel: "Антисептик широкого спектра",
		latinRp: "Rp.: Sol. 'Miramistin' 0.01% - 150 ml",
		formRu: "раствор для местного применения",
		dosageRu: "0.01%",
		quantityLabel: "1 флакон (150 мл)",
		dispenseLatin: "D.t.d. N 1 in flac.",
		signaRu: "S. Орошать полость рта 3-4 раза в сутки путем 3-4 нажатий на насадку-распылитель после еды, 7 дней.",
		recommendedForIcd10: ["K05.1", "K12.0", "K08.1"],
		defaultValidityDays: "60",
	},
	{
		id: "stomatophyt_100",
		tradeNameRu: "Стоматофит",
		activeSubstanceRu: "Экстракт растительный (ромашка, кора дуба, шалфей, арника, аир, мята, тимьян)",
		category: "antiseptic",
		categoryLabel: "Фитопрепарат противовоспалительный / антисептик",
		latinRp: "Rp.: Extracti 'Stomatophyt' 100 ml",
		formRu: "экстракт для приготовления раствора для местного применения",
		dosageRu: "100 мл",
		quantityLabel: "1 флакон (100 мл)",
		dispenseLatin: "D.t.d. N 1 in flac.",
		signaRu: "S. Для полоскания полости рта: развести 7.5 мл (1/2 мерного стаканчика) в 1/4 стакана теплой воды, полоскать 3-4 раза в день после еды, 7-10 дней.",
		recommendedForIcd10: ["K05.1", "K05.3", "K12.0", "K08.1"],
		defaultValidityDays: "60",
	},

	// ── Антигистаминные / Противоотечные средства ──
	{
		id: "suprastin_25",
		tradeNameRu: "Супрастин (Хлоропирамин)",
		activeSubstanceRu: "Хлоропирамин",
		category: "antihistamine",
		categoryLabel: "Антигистаминное / Противоотечное",
		latinRp: "Rp.: Tab. Chloropyramini 25 mg",
		formRu: "таблетки",
		dosageRu: "25 мг",
		quantityLabel: "N. 20 (таблетки)",
		dispenseLatin: "D.t.d. N 20 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (25 мг) 2-3 раза в день во время еды, курс 3-5 дней для снижения послеоперационного отека.",
		recommendedForIcd10: ["K08.1", "K04.4", "K10.2"],
		defaultValidityDays: "60",
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
		defaultValidityDays: "60",
	},
	{
		id: "cetirizine_10",
		tradeNameRu: "Цетрин (Цетиризин)",
		activeSubstanceRu: "Цетиризин",
		category: "antihistamine",
		categoryLabel: "Антигистаминное 2-го поколения",
		latinRp: "Rp.: Tab. Cetirizini 10 mg",
		formRu: "таблетки",
		dosageRu: "10 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (10 мг) 1 раз в сутки вечером, запивая стаканом воды, 3-5 дней после имплантации / удаления.",
		recommendedForIcd10: ["K08.1", "K04.4"],
		defaultValidityDays: "60",
	},

	// ── Гемостатики ──
	{
		id: "tranexamic_acid_500",
		tradeNameRu: "Транексам (Транексамовая кислота)",
		activeSubstanceRu: "Транексамовая кислота",
		category: "hemostatic",
		categoryLabel: "Гемостатик (ингибитор фибринолиза)",
		latinRp: "Rp.: Acidi tranexamici 500 mg",
		formRu: "таблетки, покрытые пленочной оболочкой",
		dosageRu: "500 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (500 мг) 3 раза в день при склонности к луночковому кровотечению после экстракции зуба, 2-3 дня.",
		recommendedForIcd10: ["K08.1", "T81.0"],
		defaultValidityDays: "60",
	},

	// ── Гастропротекторы (прикрытие НПВС) ──
	{
		id: "omeprazole_20",
		tradeNameRu: "Омепразол (Омез)",
		activeSubstanceRu: "Омепразол",
		category: "gastroprotective",
		categoryLabel: "Ингибитор протонной помпы (гастропротекция)",
		latinRp: "Rp.: Caps. Omeprazoli 20 mg",
		formRu: "капсулы кишечнорастворимые",
		dosageRu: "20 мг",
		quantityLabel: "N. 14 (капсулы)",
		dispenseLatin: "D.t.d. N 14 in caps.",
		signaRu: "S. Внутрь по 1 капсуле (20 мг) 1 раз в сутки утром за 30 минут до завтрака на весь период приема НПВС.",
		recommendedForIcd10: ["K04.0", "K04.4", "K08.1"],
		defaultValidityDays: "60",
	},

	// ── Льготные препараты (Форма № 148-1/у-04(л)) ──
	{
		id: "metformin_1000",
		tradeNameRu: "Метформин (Глюкофаж)",
		activeSubstanceRu: "Метформин",
		category: "preferential_somatic",
		categoryLabel: "Гипогликемическое средство (Льгота)",
		latinRp: "Rp.: Tab. Metformini 1000 mg",
		formRu: "таблетки, покрытые пленочной оболочкой",
		dosageRu: "1000 мг",
		quantityLabel: "N. 60 (таблетки)",
		dispenseLatin: "D.t.d. N 60 in tab.",
		signaRu: "S. Внутрь по 1 таблетке 2 раза в день во время или после еды, длительно.",
		recommendedForIcd10: ["E11.9"],
		defaultValidityDays: "365",
	},
	{
		id: "salbutamol_spray",
		tradeNameRu: "Сальбутамол (Вентолин)",
		activeSubstanceRu: "Сальбутамол",
		category: "preferential_somatic",
		categoryLabel: "Бронходилататор (Льгота)",
		latinRp: "Rp.: Aeros. Salbutamoli 100 mcg/dose - 200 doses",
		formRu: "аэрозоль для ингаляций дозированный",
		dosageRu: "100 мкг/доза",
		quantityLabel: "1 баллончик (200 доз)",
		dispenseLatin: "D.t.d. N 1 in aeros.",
		signaRu: "S. Ингаляционно по 1-2 дозы при приступах удушья (не более 8 доз в сутки).",
		recommendedForIcd10: ["J45.0"],
		defaultValidityDays: "365",
	},
];

/** Выделенные пресеты для бланков строгой отчетности 148-1/у-88 */
export const CONTROLLED_DRUG_PRESETS = DENTAL_PRESCRIPTION_DRUG_CATALOG.filter(
	(d) => d.category === "controlled_pku",
);

/** Выделенные пресеты для льготных бланков 148-1/у-04(л) */
export const PREFERENTIAL_DRUG_PRESETS = DENTAL_PRESCRIPTION_DRUG_CATALOG.filter(
	(d) => d.category === "preferential_somatic" || d.category === "antibiotic" || d.category === "nsaid",
);

/** ═══════════════════════════════════════════════════════════════════════════
 * ФАРМАКОЛОГИЧЕСКИЙ ДВИЖОК БЕЗОПАСНОСТИ: ВРД, ВСД И МАТРИЦА МЕЖЛЕКАРСТВЕННЫХ ВЗАИМОДЕЙСТВИЙ (DDI)
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface DrugDosageLimit {
	readonly drugId: string;
	readonly activeSubstance: string;
	readonly maxSingleDoseMg: number; // ВРД (Высшая разовая доза)
	readonly maxDailyDoseMg: number; // ВСД (Высшая суточная доза)
	readonly unit: string;
	readonly pediatricMinAgeYears?: number;
	readonly maxCourseDays?: number;
	readonly notesRu?: string;
}

export const DENTAL_DRUG_DOSAGE_LIMITS: Readonly<Record<string, DrugDosageLimit>> = {
	nimesulide_100: {
		drugId: "nimesulide_100",
		activeSubstance: "Нимесулид",
		maxSingleDoseMg: 100,
		maxDailyDoseMg: 200,
		unit: "мг",
		pediatricMinAgeYears: 12,
		maxCourseDays: 15,
		notesRu: "Противопоказан детям до 12 лет. Принимать строго после еды.",
	},
	ibuprofen_400: {
		drugId: "ibuprofen_400",
		activeSubstance: "Ибупрофен",
		maxSingleDoseMg: 800,
		maxDailyDoseMg: 2400,
		unit: "мг",
		pediatricMinAgeYears: 3,
		maxCourseDays: 5,
		notesRu: "Максимальная суточная доза без рецепта 1200 мг, по назначению врача до 2400 мг.",
	},
	ketorolac_10: {
		drugId: "ketorolac_10",
		activeSubstance: "Кеторолак",
		maxSingleDoseMg: 10,
		maxDailyDoseMg: 40,
		unit: "мг",
		pediatricMinAgeYears: 16,
		maxCourseDays: 5,
		notesRu: "Курс приема внутрь строго не более 5 дней из-за риска ЖКТ-кровотечений.",
	},
	dexketoprofen_25: {
		drugId: "dexketoprofen_25",
		activeSubstance: "Декскетопрофен",
		maxSingleDoseMg: 25,
		maxDailyDoseMg: 75,
		unit: "мг",
		pediatricMinAgeYears: 18,
		maxCourseDays: 5,
		notesRu: "Интервал между приемами не менее 8 часов.",
	},
	ketoprofen_150: {
		drugId: "ketoprofen_150",
		activeSubstance: "Кетопрофен",
		maxSingleDoseMg: 150,
		maxDailyDoseMg: 300,
		unit: "мг",
		pediatricMinAgeYears: 15,
		maxCourseDays: 5,
		notesRu: "Капсулы ретард: 1 раз в сутки после еды.",
	},
	amoxiclav_875_125: {
		drugId: "amoxiclav_875_125",
		activeSubstance: "Амоксициллин + Клавулановая кислота",
		maxSingleDoseMg: 1000,
		maxDailyDoseMg: 2000,
		unit: "мг",
		pediatricMinAgeYears: 12,
		maxCourseDays: 14,
		notesRu: "Принимать в начале приема пищи для снижения диспепсии.",
	},
	amoxiclav_500_125: {
		drugId: "amoxiclav_500_125",
		activeSubstance: "Амоксициллин + Клавулановая кислота",
		maxSingleDoseMg: 625,
		maxDailyDoseMg: 1875,
		unit: "мг",
		pediatricMinAgeYears: 12,
		maxCourseDays: 14,
	},
	amoxicillin_500: {
		drugId: "amoxicillin_500",
		activeSubstance: "Амоксициллин",
		maxSingleDoseMg: 1000,
		maxDailyDoseMg: 3000,
		unit: "мг",
		pediatricMinAgeYears: 5,
		maxCourseDays: 14,
		notesRu: "Детям до 5 лет рекомендована форма суспензии.",
	},
	azithromycin_500: {
		drugId: "azithromycin_500",
		activeSubstance: "Азитромицин",
		maxSingleDoseMg: 500,
		maxDailyDoseMg: 500,
		unit: "мг",
		pediatricMinAgeYears: 12,
		maxCourseDays: 3,
		notesRu: "Курсовая доза 1500 мг за 3 дня (по 500 мг 1 раз в сутки).",
	},
	ciprofloxacin_500: {
		drugId: "ciprofloxacin_500",
		activeSubstance: "Ципрофлоксацин",
		maxSingleDoseMg: 750,
		maxDailyDoseMg: 1500,
		unit: "мг",
		pediatricMinAgeYears: 18,
		maxCourseDays: 14,
		notesRu: "Фторхинолон: противопоказан детям до 18 лет (риск артропатии).",
	},
	metronidazole_500: {
		drugId: "metronidazole_500",
		activeSubstance: "Метронидазол",
		maxSingleDoseMg: 500,
		maxDailyDoseMg: 1500,
		unit: "мг",
		pediatricMinAgeYears: 6,
		maxCourseDays: 10,
		notesRu: "Категорически запрещен алкоголь на время лечения (дисульфирамоподобная реакция).",
	},
	lincomycin_500: {
		drugId: "lincomycin_500",
		activeSubstance: "Линкомицин",
		maxSingleDoseMg: 500,
		maxDailyDoseMg: 2000,
		unit: "мг",
		pediatricMinAgeYears: 6,
		maxCourseDays: 14,
	},
	tramadol_50: {
		drugId: "tramadol_50",
		activeSubstance: "Трамадол",
		maxSingleDoseMg: 100,
		maxDailyDoseMg: 400,
		unit: "мг",
		pediatricMinAgeYears: 14,
		maxCourseDays: 5,
		notesRu: "Опиоидный анальгетик ПКУ: риск зависимости и угнетения дыхания.",
	},
	zaldiar_375: {
		drugId: "zaldiar_375",
		activeSubstance: "Трамадол + Парацетамол",
		maxSingleDoseMg: 75,
		maxDailyDoseMg: 300,
		unit: "мг (по трамадолу)",
		pediatricMinAgeYears: 14,
		maxCourseDays: 5,
	},
	diazepam_5: {
		drugId: "diazepam_5",
		activeSubstance: "Диазепам",
		maxSingleDoseMg: 10,
		maxDailyDoseMg: 30,
		unit: "мг",
		pediatricMinAgeYears: 18,
		maxCourseDays: 7,
		notesRu: "Бензодиазепин ПКУ: выраженная седация, не управлять автомобилем.",
	},
	pregabalin_75: {
		drugId: "pregabalin_75",
		activeSubstance: "Прегабалин",
		maxSingleDoseMg: 300,
		maxDailyDoseMg: 600,
		unit: "мг",
		pediatricMinAgeYears: 18,
		maxCourseDays: 30,
	},
	tranexamic_acid_500: {
		drugId: "tranexamic_acid_500",
		activeSubstance: "Транексамовая кислота",
		maxSingleDoseMg: 1500,
		maxDailyDoseMg: 4000,
		unit: "мг",
		pediatricMinAgeYears: 3,
		maxCourseDays: 5,
	},
	suprastin_25: {
		drugId: "suprastin_25",
		activeSubstance: "Хлоропирамин",
		maxSingleDoseMg: 25,
		maxDailyDoseMg: 100,
		unit: "мг",
		pediatricMinAgeYears: 3,
		maxCourseDays: 7,
		notesRu: "Антигистаминное 1 поколения: вызывает сонливость, не садиться за руль.",
	},
};

export type DrugInteractionSeverity = "contraindicated" | "major" | "moderate" | "minor";

export interface DrugInteractionRule {
	readonly drugA: string;
	readonly drugB: string;
	readonly severity: DrugInteractionSeverity;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly clinicalRecommendationRu: string;
}

export const DENTAL_DRUG_INTERACTION_RULES: readonly DrugInteractionRule[] = [
	{
		drugA: "nsaid",
		drugB: "nsaid",
		severity: "major",
		titleRu: "Дублирование НПВП (Повышенный риск ЖКТ кровотечения)",
		descriptionRu: "Одновременный прием двух и более системных НПВП (например, Нимесулид + Кеторолак или Ибупрофен) не усиливает анальгезию, но многократно повышает риск эрозивно-язвенных поражений ЖКТ и нефротоксичности.",
		clinicalRecommendationRu: "Отмените один из препаратов. Используйте монотерапию НПВП под прикрытием ИПП (Омепразол).",
	},
	{
		drugA: "tramadol_50",
		drugB: "diazepam_5",
		severity: "contraindicated",
		titleRu: "Комбинация опиоида и бензодиазепина (Black Box Warning)",
		descriptionRu: "Одновременное применение трамадола и диазепама вызывает синергическое угнетение ЦНС, тяжелую седацию, дыхательную депрессию, кому и летальный исход.",
		clinicalRecommendationRu: "Избегайте совместного назначения, кроме случаев ИВЛ / стационарного мониторинга.",
	},
	{
		drugA: "ciprofloxacin_500",
		drugB: "nsaid",
		severity: "major",
		titleRu: "Фторхинолон + НПВП (Судорожный синдром)",
		descriptionRu: "Совместный прием ципрофлоксацина с НПВП усиливает возбуждение ЦНС и повышает риск генерализованных судорог.",
		clinicalRecommendationRu: "Замените антибиотик на защищенный пенициллин (Амоксиклав) либо замените НПВП на парацетамол.",
	},
	{
		drugA: "metronidazole_500",
		drugB: "alcohol",
		severity: "contraindicated",
		titleRu: "Метронидазол + Алкоголь / Этанол (Дисульфирамоподобный синдром)",
		descriptionRu: "Метронидазол блокирует ацетальдегиддегидрогеназу, приводя к накоплению ацетальдегида: мучительная тошнота, рвота, падение АД, тахикардия.",
		clinicalRecommendationRu: "Категорический запрет на прием спиртного и спиртосодержащих капель во время курса и 48 ч после.",
	},
	{
		drugA: "tranexamic_acid_500",
		drugB: "preferential_somatic",
		severity: "moderate",
		titleRu: "Транексамовая кислота + Эстрогены / КОК",
		descriptionRu: "Повышенный риск тромбоэмболических осложнений и венозного тромбоза.",
		clinicalRecommendationRu: "Контроль коагулограммы, минимально достаточный курс гемостатика.",
	},
];

export interface PrescriptionPharmacologicalSafetyReport {
	readonly isSafe: boolean;
	readonly hasContraindications: boolean;
	readonly interactions: readonly {
		readonly drugA: string;
		readonly drugB: string;
		readonly severity: DrugInteractionSeverity;
		readonly titleRu: string;
		readonly descriptionRu: string;
		readonly recommendationRu: string;
	}[];
	readonly dosageWarnings: readonly string[];
	readonly ageContraindications: readonly string[];
	readonly duplicateCategories: readonly string[];
}

/**
 * Проверка фармакологической безопасности рецептурного назначения:
 * - Соблюдение ВРД (высшая разовая доза) и ВСД (высшая суточная доза)
 * - Анализ межлекарственных взаимодействий (DDI)
 * - Возрастные противопоказания (педиатрия <12, <18 лет)
 * - Выявление дублирования фармакотерапевтических групп (НПВП + НПВП)
 */
export function evaluatePrescriptionPharmacologicalSafety(params: {
	readonly drugIds?: readonly string[];
	readonly items?: readonly PrescriptionDrugItem[];
	readonly patientAgeYears?: number;
}): PrescriptionPharmacologicalSafetyReport {
	const drugIds = params.drugIds ?? [];
	const items = params.items ?? [];
	const age = params.patientAgeYears ?? 35;

	const identifiedDrugs: DentalPrescriptionDrugPreset[] = [];
	for (const id of drugIds) {
		const d = DENTAL_PRESCRIPTION_DRUG_CATALOG.find((x) => x.id === id);
		if (d) identifiedDrugs.push(d);
	}
	for (const item of items) {
		const match = DENTAL_PRESCRIPTION_DRUG_CATALOG.find(
			(x) => x.tradeNameRu === item.tradeName || x.latinRp === item.latinName || item.id.includes(x.id),
		);
		if (match && !identifiedDrugs.some((d) => d.id === match.id)) {
			identifiedDrugs.push(match);
		}
	}

	const interactions: Array<{
		drugA: string;
		drugB: string;
		severity: DrugInteractionSeverity;
		titleRu: string;
		descriptionRu: string;
		recommendationRu: string;
	}> = [];
	const dosageWarnings: string[] = [];
	const ageContraindications: string[] = [];
	const duplicateCategories: string[] = [];

	// 1. Проверка возрастных ограничений
	for (const drug of identifiedDrugs) {
		const limits = DENTAL_DRUG_DOSAGE_LIMITS[drug.id];
		if (limits?.pediatricMinAgeYears && age < limits.pediatricMinAgeYears) {
			ageContraindications.push(
				`Препарат «${drug.tradeNameRu}» (${drug.activeSubstanceRu}) противопоказан пациентам в возрасте до ${limits.pediatricMinAgeYears} лет (текущий возраст: ${age} лет).`,
			);
		}
	}

	// 2. Проверка дублирования групп (например, 2 НПВП одновременно)
	const categoryCounts = new Map<string, string[]>();
	for (const drug of identifiedDrugs) {
		const list = categoryCounts.get(drug.category) ?? [];
		list.push(drug.tradeNameRu);
		categoryCounts.set(drug.category, list);
	}
	for (const [cat, drugNames] of categoryCounts.entries()) {
		if (drugNames.length > 1 && cat === "nsaid") {
			duplicateCategories.push(`Обнаружено дублирование НПВП: ${drugNames.join(", ")}. Назначение двух системных НПВП не рекомендуется.`);
		}
	}

	// 3. Анализ матрицы межлекарственных взаимодействий (DDI)
	for (let i = 0; i < identifiedDrugs.length; i++) {
		for (let j = i + 1; j < identifiedDrugs.length; j++) {
			const d1 = identifiedDrugs[i]!;
			const d2 = identifiedDrugs[j]!;

			for (const rule of DENTAL_DRUG_INTERACTION_RULES) {
				const matchDirect =
					(rule.drugA === d1.id || rule.drugA === d1.category) &&
					(rule.drugB === d2.id || rule.drugB === d2.category);
				const matchReverse =
					(rule.drugA === d2.id || rule.drugA === d2.category) &&
					(rule.drugB === d1.id || rule.drugB === d1.category);

				if (matchDirect || matchReverse) {
					interactions.push({
						drugA: d1.tradeNameRu,
						drugB: d2.tradeNameRu,
						severity: rule.severity,
						titleRu: rule.titleRu,
						descriptionRu: rule.descriptionRu,
						recommendationRu: rule.clinicalRecommendationRu,
					});
				}
			}
		}
	}

	const hasContraindications =
		ageContraindications.length > 0 ||
		interactions.some((i) => i.severity === "contraindicated");
	const isSafe = !hasContraindications && interactions.filter((i) => i.severity === "major").length === 0;

	return {
		isSafe,
		hasContraindications,
		interactions,
		dosageWarnings,
		ageContraindications,
		duplicateCategories,
	};
}

/** ═══════════════════════════════════════════════════════════════════════════
 * СТАТУТОРНЫЙ ДВИЖОК ПРОВЕРКИ СРОКА ДЕЙСТВИЯ И ПРАВИЛ ВЫПИСКИ (ПРИКАЗ № 1094н)
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface PrescriptionValidityResult {
	readonly isValid: boolean;
	readonly status: "active" | "expiring_soon" | "expired";
	readonly validityDays: number;
	readonly issuedAtIso: string;
	readonly expiresAtIso: string;
	readonly daysRemaining: number;
	readonly isExpired: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}

export const PRESCRIPTION_VALIDITY_RULES = {
	"107-1u": {
		maxItemsCount: 3,
		allowedValidityPeriods: ["15", "60", "365"] as const,
		defaultValidityPeriod: "60",
		chronicCareAllowed: true,
	},
	"148-1u-88": {
		maxItemsCount: 1,
		allowedValidityPeriods: ["15"] as const,
		defaultValidityPeriod: "15",
		chronicCareAllowed: false,
	},
	"148-1u-04l": {
		maxItemsCount: 3,
		allowedValidityPeriods: ["15", "30", "60", "365"] as const,
		defaultValidityPeriod: "30",
		chronicCareAllowed: true,
	},
} as const;

/** Расчет точной даты истечения срока действия рецепта */
export function calculatePrescriptionExpiration(
	issueDateIso: string,
	validityDays: "15" | "30" | "60" | "365" | number,
): string {
	const date = new Date(issueDateIso);
	if (Number.isNaN(date.getTime())) {
		const fallback = new Date();
		fallback.setDate(fallback.getDate() + Number(validityDays));
		return fallback.toISOString().slice(0, 10);
	}
	const daysToAdd = typeof validityDays === "number" ? validityDays : Number.parseInt(validityDays, 10);
	date.setDate(date.getDate() + daysToAdd);
	return date.toISOString().slice(0, 10);
}

/** Проверка соответствия рецепта нормам Приказа Минздрава РФ № 1094н */
export function verifyPrescriptionStatutoryValidity(
	prescription: {
		readonly formNumber?: "107-1/у" | "148-1/у-88" | "148-1/у-04(л)" | string | undefined;
		readonly formType?: PrescriptionFormType | string | undefined;
		readonly prescriptionDate: string;
		readonly validityDays: "15" | "30" | "60" | "365" | string | number;
		readonly isChronicSpecialCare?: boolean | undefined;
		readonly chronicPeriodicity?: string | null | undefined;
		readonly items: readonly { readonly latinName?: string | undefined; readonly tradeName?: string | undefined; readonly category?: string | undefined }[];
		readonly patientAddress?: string | null | undefined;
		readonly preferentialDetails?: { readonly patientSnils?: string | undefined; readonly patientOmsPolicy?: string | undefined } | null | undefined;
	},
	referenceDateIso?: string,
): PrescriptionValidityResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Нормализация типа формы
	let form: PrescriptionFormType = "107-1u";
	if (prescription.formNumber === "148-1/у-88" || prescription.formType === "148-1u-88" || prescription.formType === ("148-1u" as any)) {
		form = "148-1u-88";
	} else if (prescription.formNumber === "148-1/у-04(л)" || prescription.formType === "148-1u-04l") {
		form = "148-1u-04l";
	}

	const rules = PRESCRIPTION_VALIDITY_RULES[form];
	const validityStr = String(prescription.validityDays);
	const validityDaysNum = Number.parseInt(validityStr, 10) || 60;

	// 1. Проверка лимита количества препаратов на один бланк
	if (prescription.items.length === 0) {
		errors.push("Рецептурный бланк не содержит выписанных лекарственных препаратов.");
	} else if (prescription.items.length > rules.maxItemsCount) {
		errors.push(
			`Превышено максимальное количество препаратов для формы ${form === "148-1u-88" ? "№ 148-1/у-88 (максимум 1)" : "№ 107-1/у (максимум 3)"}: выписано ${prescription.items.length}.`,
		);
	}

	// 2. Проверка срока действия в зависимости от формы
	if (form === "148-1u-88") {
		if (validityDaysNum !== 15) {
			errors.push("Срок действия рецептурного бланка № 148-1/у-88 (ПКУ) по закону составляет строго 15 дней.");
		}
		if (!prescription.patientAddress || prescription.patientAddress.trim().length < 5) {
			errors.push("Для рецептурного бланка № 148-1/у-88 обязательно указание полного адреса места жительства (пребывания) пациента.");
		}
	} else if (form === "107-1u") {
		if (validityDaysNum === 365) {
			if (!prescription.isChronicSpecialCare) {
				errors.push("Срок действия 1 год на бланке 107-1/у разрешен только с обязательной пометкой «По специальному назначению».");
			}
			if (!prescription.chronicPeriodicity || prescription.chronicPeriodicity.trim().length === 0) {
				warnings.push("Для рецепта на 1 год рекомендуется указать периодичность отпуска (например, «ежемесячно»).");
			}
		}
	} else if (form === "148-1u-04l") {
		if (!prescription.preferentialDetails?.patientSnils || prescription.preferentialDetails.patientSnils.length < 11) {
			errors.push("Для льготного рецепта № 148-1/у-04(л) обязательно указание страхового номера СНИЛС пациента.");
		}
		if (!prescription.preferentialDetails?.patientOmsPolicy || prescription.preferentialDetails.patientOmsPolicy.length < 16) {
			errors.push("Для льготного рецепта № 148-1/у-04(л) обязательно указание номера полиса ОМС (16 знаков).");
		}
	}

	// 3. Расчет срока истечения и остатка дней
	const issuedAtIso = prescription.prescriptionDate || new Date().toISOString().slice(0, 10);
	const expiresAtIso = calculatePrescriptionExpiration(issuedAtIso, validityDaysNum);
	
	const refDate = referenceDateIso ? new Date(referenceDateIso) : new Date();
	const expDate = new Date(expiresAtIso);
	const diffMs = expDate.getTime() - refDate.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	const isExpired = daysRemaining < 0;

	let status: "active" | "expiring_soon" | "expired" = "active";
	if (isExpired) {
		status = "expired";
	} else if (daysRemaining <= 3) {
		status = "expiring_soon";
		warnings.push(`Срок действия рецепта истекает через ${daysRemaining} дн.`);
	}

	return {
		isValid: errors.length === 0,
		status,
		validityDays: validityDaysNum,
		issuedAtIso,
		expiresAtIso,
		daysRemaining,
		isExpired,
		errors,
		warnings,
	};
}

/** ═══════════════════════════════════════════════════════════════════════════
 * ГЕНЕРАТОРЫ PAYLOAD ДЛЯ БЛАНКОВ
 * ═══════════════════════════════════════════════════════════════════════════ */

export function generatePrescriptionPayloadFromSoap(options: {
	readonly clinic: {
		readonly fullName: string;
		readonly address?: string | null;
		readonly phone?: string | null;
		readonly ogrn?: string | null;
		readonly inn?: string | null;
		readonly medicalLicenseNumber?: string | null;
	};
	readonly patient: {
		readonly fullName: string;
		readonly birthDate: string;
		readonly medicalCardNumber: string;
		readonly address?: string | null;
	};
	readonly doctor: {
		readonly fullName: string;
		readonly specialty?: string | null;
		readonly snils?: string | null;
	};
	readonly diagnosisIcd10?: string | null;
	readonly treatmentText?: string | null;
	readonly drugIds?: readonly string[];
	readonly explicitDrugIds?: readonly string[];
	readonly customSeriesNumber?: string;
	readonly validityDays?: "15" | "30" | "60" | "365";
	readonly isChronicSpecialCare?: boolean;
	readonly chronicPeriodicity?: string | null;
	readonly ukepSignature?: PrescriptionDoctorUkep | null;
	readonly withStampAndSignature?: boolean;
}): Form107_1uPayload {
	const icd = (options.diagnosisIcd10 || "K02.1").toUpperCase().trim();
	const seriesNum =
		options.customSeriesNumber ||
		`РЕЦ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

	let selectedDrugs: DentalPrescriptionDrugPreset[] = [];
	const requestedDrugIds = options.drugIds || options.explicitDrugIds;

	if (requestedDrugIds && requestedDrugIds.length > 0) {
		selectedDrugs = requestedDrugIds
			.map((id) => DENTAL_PRESCRIPTION_DRUG_CATALOG.find((d) => d.id === id))
			.filter((d): d is DentalPrescriptionDrugPreset => Boolean(d));
	} else {
		selectedDrugs = DENTAL_PRESCRIPTION_DRUG_CATALOG.filter((d) =>
			d.recommendedForIcd10.some((code) => icd.startsWith(code)),
		);
		if (selectedDrugs.length === 0) {
			selectedDrugs = [DENTAL_PRESCRIPTION_DRUG_CATALOG[0]!];
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
		medicalLicenseNumber: options.clinic.medicalLicenseNumber || null,
		prescriptionSeriesNumber: seriesNum,
		prescriptionDate: new Date().toISOString().slice(0, 10),
		patientFullName: options.patient.fullName,
		patientBirthDate: options.patient.birthDate,
		medicalCardNumber: options.patient.medicalCardNumber,
		doctorFullName: options.doctor.fullName,
		doctorSpecialty: options.doctor.specialty || "Врач-стоматолог",
		validityDays: options.validityDays || "60",
		isChronicSpecialCare: options.isChronicSpecialCare || false,
		chronicPeriodicity: options.chronicPeriodicity || null,
		items: drugItems,
		diagnosisIcd10Code: icd,
		ukepSignature: options.ukepSignature || null,
		withStampAndSignature: options.withStampAndSignature ?? true,
	};
}

export function generateForm148_1u88Payload(options: {
	readonly clinic: {
		readonly fullName: string;
		readonly address?: string | null;
		readonly phone?: string | null;
		readonly ogrn?: string | null;
		readonly inn?: string | null;
		readonly medicalLicenseNumber?: string | null;
	};
	readonly patient: {
		readonly fullName: string;
		readonly birthDate: string;
		readonly medicalCardNumber: string;
		readonly address: string;
	};
	readonly doctor: {
		readonly fullName: string;
		readonly specialty?: string | null;
	};
	readonly headOfDepartmentFullName?: string | null;
	readonly diagnosisIcd10?: string | null;
	readonly explicitDrugId?: string;
	readonly customSeriesNumber?: string;
	readonly ukepSignature?: PrescriptionDoctorUkep | null;
}): Form148_1u88Payload {
	const seriesNum =
		options.customSeriesNumber ||
		`ПКУ-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

	const drug =
		DENTAL_PRESCRIPTION_DRUG_CATALOG.find((d) => d.id === options.explicitDrugId) ||
		CONTROLLED_DRUG_PRESETS[0]!;

	const item: PrescriptionDrugItem = {
		id: `drug-pku-${drug.id}`,
		latinName: drug.latinRp,
		tradeName: drug.tradeNameRu,
		form: drug.formRu,
		dosage: drug.dosageRu,
		quantity: drug.quantityLabel,
		dispenseLatin: drug.dispenseLatin,
		signaRussian: drug.signaRu,
		category: "controlled_pku",
	};

	return {
		formNumber: "148-1/у-88",
		clinicLegalName: options.clinic.fullName,
		clinicAddress: options.clinic.address || null,
		clinicPhone: options.clinic.phone || null,
		clinicOgrn: options.clinic.ogrn || null,
		clinicInn: options.clinic.inn || null,
		medicalLicenseNumber: options.clinic.medicalLicenseNumber || null,
		prescriptionSeriesNumber: seriesNum,
		prescriptionDate: new Date().toISOString().slice(0, 10),
		patientFullName: options.patient.fullName,
		patientBirthDate: options.patient.birthDate,
		patientAddress: options.patient.address,
		medicalCardNumber: options.patient.medicalCardNumber,
		doctorFullName: options.doctor.fullName,
		doctorSpecialty: options.doctor.specialty || "Врач-стоматолог-хирург",
		headOfDepartmentFullName: options.headOfDepartmentFullName || null,
		validityDays: "15",
		items: [item],
		diagnosisIcd10Code: options.diagnosisIcd10 || "K08.1",
		ukepSignature: options.ukepSignature || null,
	};
}

export { generatePrescriptionPayloadFromSoap as generateForm107_1uPayload };
