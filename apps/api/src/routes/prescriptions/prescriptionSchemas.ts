import { isValidSnils, prescriptionDoctorUkepSchema } from "@dental/shared";
import { z } from "zod";

/**
 * Реестр запрещенных к выписке в амбулаторной стоматологии наркотических средств (ПКУ Списки II и III).
 * В частной амбулаторной стоматологии наркотические анальгетики не выписываются (Мандат 8i, 8s).
 * Применяются ненаркотические анальгетики (НПВП: Нимесил/Нимесулид, Кеторолак/Кетанов, Декскетопрофен/Дексалгин).
 */
export const FORBIDDEN_NARCOTIC_INN_PATTERNS = [
	/morphin/i,
	/морфин/i,
	/trimeperidin/i,
	/тримеперидин/i,
	/promedol/i,
	/промедол/i,
	/fentanyl/i,
	/фентанил/i,
	/buprenorphin/i,
	/бупренорфин/i,
	/methadon/i,
	/метадон/i,
	/oxycodon/i,
	/оксикодон/i,
	/omnopon/i,
	/омнопон/i,
];

/** Schema for creating a prescription through the statutory API */
export const createPrescriptionBodySchema = z
	.object({
		patientId: z.string().uuid(),
		visitId: z.string().uuid().optional().nullable(),
		prescribingDoctorId: z.string().uuid(),
		formType: z
			.enum(["form_107_1_u", "form_148_1_u_88", "form_148_1_u_04_l"])
			.default("form_107_1_u"),
		validityPeriod: z
			.enum(["days_15", "days_30", "days_60", "year_1"])
			.default("days_60"),
		isSpecialChronicIndication: z.boolean().default(false),
		chronicDispenseFrequencyNotes: z.string().max(120).optional().nullable(),
		patientAddress: z.string().max(240).optional().nullable(),
		preferentialBenefitCode: z.string().max(16).optional().nullable(),
		preferentialBenefitNameRu: z.string().max(160).optional().nullable(),
		preferentialDiscountPercent: z
			.number()
			.int()
			.min(0)
			.max(100)
			.optional()
			.nullable(),
		patientSnils: z.string().max(32).optional().nullable(),
		patientOmsPolicy: z.string().max(32).optional().nullable(),
		fundingSource: z
			.enum(["federal", "regional", "municipal"])
			.default("federal"),
		clinicalDiagnosisMkb10: z.string().max(32).optional().nullable(),
		clinicalDiagnosisDescription: z.string().max(500).optional().nullable(),
		notes: z.string().max(500).optional().nullable(),
		items: z
			.array(
				z.object({
					catalogDrugId: z.string().max(64).optional().nullable(),
					innLatin: z.string().min(2).max(240),
					dosageFormLatin: z.string().min(2).max(120),
					dosageDoseConcentration: z.string().min(1).max(80),
					dispenseInstructionLatin: z.string().min(2).max(200),
					signatureDirectionRussian: z.string().min(5).max(500),
					tradeName: z.string().max(120).optional().nullable(),
					quantityPackages: z.number().int().min(1).default(1),
					durationDays: z.number().int().min(1).default(7),
					frequencyTimesPerDay: z.number().int().min(1).default(2),
					mealRelation: z
						.enum(["before_meal", "with_meal", "after_meal", "independent"])
						.default("after_meal"),
				}),
			)
			.min(1)
			.max(3),
		ukepSignature: prescriptionDoctorUkepSchema.optional().nullable(),
	})
	.superRefine((data, ctx) => {
		// Мандат 8i / 8s: Запрет выписки наркотических анальгетиков Списка II/III в частной амбулаторной стоматологии
		for (let i = 0; i < data.items.length; i++) {
			const item = data.items[i];
			if (!item) continue;
			const isNarcotic = FORBIDDEN_NARCOTIC_INN_PATTERNS.some(
				(pattern) =>
					pattern.test(item.innLatin) ||
					Boolean(item.tradeName && pattern.test(item.tradeName)),
			);
			if (isNarcotic) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["items", i, "innLatin"],
					message:
						"В частной амбулаторной стоматологии выписка наркотических средств Списка II/III не осуществляется. Назначьте ненаркотические анальгетики (НПВП: Нимесил, Кетанов, Дексалгин).",
				});
			}
		}

		if (data.formType === "form_148_1_u_04_l") {
			if (!data.patientSnils || !isValidSnils(data.patientSnils)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["patientSnils"],
					message:
						"Для льготного рецепта (форма № 148-1/у-04(л)) обязателен валидный СНИЛС пациента с контрольной суммой по алгоритму ПФР № 192п (Приказ Минздрава РФ № 1094н).",
				});
			}
		}
	});

/** Schema for UKEP signing */
export const signUkepBodySchema = z.object({
	pkcs7Signature: z.string().min(1, { message: "pkcs7Signature is required" }),
	certificateSerialNumber: z.string().max(64).optional(),
	certificateThumbprint: z.string().max(64).optional(),
	certificateIssuer: z.string().max(160).optional(),
	certificateValidFrom: z.string().max(32).optional(),
	certificateValidTo: z.string().max(32).optional(),
	doctorSnils: z.string().max(32).optional(),
	signatureAlgorithm: z.string().max(64).default("ГОСТ Р 34.10-2012 (256 бит)"),
	egiszDocumentId: z.string().max(64).optional(),
});
