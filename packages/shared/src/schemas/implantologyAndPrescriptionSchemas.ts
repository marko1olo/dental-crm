import { z } from "zod";
import { boneDensityClassSchema, implantSystemBrandSchema, type StabilityEvaluationStatus, type SurgicalImplantProtocol, torqueCurveSampleSchema } from "./anesthesiaAndRestorationSchemas.js";

export const createImplantInstallationSchema = z.object({
	patientId: z.string().uuid(),
	toothNumberFdi: z.number().int().min(11).max(85),
	catalogItemId: z.string().uuid().optional().nullable(),
	visitId: z.string().uuid().optional().nullable(),
	implantBrand: implantSystemBrandSchema.default("osstem"),
	implantDiameterMm: z.number().min(2.0).max(7.0),
	implantLengthMm: z.number().min(4.0).max(20.0),
	lotNumber: z.string().trim().max(80).optional().nullable(),
	serialNumber: z.string().trim().max(80).optional().nullable(),
	boneDensityClass: boneDensityClassSchema.default("D2"),
	averageHounsfieldUnits: z.number().min(-1000).max(3000).optional().nullable(),
	finalInsertionTorqueNcm: z.number().min(5).max(100),
	baselineIsqMesiodistal: z.number().int().min(1).max(100).optional().nullable(),
	baselineIsqBuccolingual: z.number().int().min(1).max(100).optional().nullable(),
	baselineIsqDistopalatal: z.number().int().min(1).max(100).optional().nullable(),
	corticalTapUsed: z.boolean().default(false),
	underdrillingUsed: z.boolean().default(false),
	boneGraftMaterial: z.string().trim().max(200).optional().nullable(),
	membraneUsed: z.string().trim().max(200).optional().nullable(),
	torqueCurveSamples: z.array(torqueCurveSampleSchema).default([]),
	notes: z.string().trim().max(1000).optional().nullable(),
});

export type CreateImplantInstallationInput = z.infer<
	typeof createImplantInstallationSchema
>;

export const recordIsqMeasurementSchema = z.object({
	installationId: z.string().uuid(),
	visitId: z.string().uuid().optional().nullable(),
	daysPostOp: z.number().int().min(0).max(1825),
	isqMesiodistal: z.number().int().min(1).max(100),
	isqBuccolingual: z.number().int().min(1).max(100),
	isqDistopalatal: z.number().int().min(1).max(100).optional().nullable(),
	smartpegCode: z.string().trim().max(40).optional().nullable(),
	notes: z.string().trim().max(1000).optional().nullable(),
});

export type RecordIsqMeasurementInput = z.infer<
	typeof recordIsqMeasurementSchema
>;

export class ImplantStabilityCalculator {
	static calculateMeanIsq(
		md?: number | null,
		bl?: number | null,
		dp?: number | null,
	): { isqMean: number | null; isqAnisotropyDelta: number | null } {
		const values: number[] = [];
		if (md !== undefined && md !== null) values.push(md);
		if (bl !== undefined && bl !== null) values.push(bl);
		if (dp !== undefined && dp !== null) values.push(dp);
		if (values.length === 0) {
			return { isqMean: null, isqAnisotropyDelta: null };
		}
		const sum = values.reduce((acc, v) => acc + v, 0);
		const isqMean = Number((sum / values.length).toFixed(2));
		const isqAnisotropyDelta = Math.max(...values) - Math.min(...values);
		return { isqMean, isqAnisotropyDelta };
	}

	static evaluateLoadingProtocol(
		isqMean: number | null,
		insertionTorqueNcm: number,
		daysPostOp: number,
	): {
		protocol: SurgicalImplantProtocol;
		status: StabilityEvaluationStatus;
		decisionRationale: string;
		isBiologicalDip: boolean;
	} {
		if (isqMean === null) {
			if (insertionTorqueNcm >= 35 && insertionTorqueNcm <= 55) {
				return {
					protocol: "immediate_functional_loading",
					status: "primary_mechanical_high",
					decisionRationale: `Высокая первичная стабильность по торку (Torque=${insertionTorqueNcm} Н·см). Разрешена немедленная нагрузка (Immediate Provisionalization) при отсутствии парафункций.`,
					isBiologicalDip: false,
				};
			}
			if (insertionTorqueNcm >= 30) {
				return {
					protocol: "transgingival_one_stage",
					status: "primary_mechanical_adequate",
					decisionRationale: `Умеренная первичная стабильность по торку (Torque=${insertionTorqueNcm} Н·см). Одноэтапный протокол с формирователем десны. Ранняя нагрузка через 6-8 недель.`,
					isBiologicalDip: false,
				};
			}
			if (insertionTorqueNcm >= 20) {
				return {
					protocol: "delayed_loading",
					status: "primary_mechanical_adequate",
					decisionRationale: `Стандартная первичная стабильность по торку (Torque=${insertionTorqueNcm} Н·см). Стандартный протокол нагрузки через 8-12 недель.`,
					isBiologicalDip: false,
				};
			}
			return {
				protocol: "submerged_two_stage",
				status: "primary_mechanical_adequate",
				decisionRationale: `Низкая первичная стабильность (Torque=${insertionTorqueNcm} < 20 Н·см). Двухэтапный протокол с глухим ушиванием на 3-6 месяцев.`,
				isBiologicalDip: false,
			};
		}

		const isBiologicalDip =
			daysPostOp >= 14 && daysPostOp <= 30 && isqMean < 68;

		if (daysPostOp === 0) {
			if (
				isqMean >= 70 &&
				insertionTorqueNcm >= 35 &&
				insertionTorqueNcm <= 55
			) {
				return {
					protocol: "immediate_functional_loading",
					status: "primary_mechanical_high",
					decisionRationale: `Высокая первичная стабильность (ISQ=${isqMean}, Torque=${insertionTorqueNcm} Н·см). Разрешена немедленная нагрузка (Immediate Provisionalization) при отсутствии парафункций.`,
					isBiologicalDip: false,
				};
			}
			if (isqMean >= 65 && insertionTorqueNcm >= 30) {
				return {
					protocol: "transgingival_one_stage",
					status: "primary_mechanical_adequate",
					decisionRationale: `Умеренная первичная стабильность (ISQ=${isqMean}, Torque=${insertionTorqueNcm} Н·см). Одноэтапный протокол с формирователем десны. Ранняя нагрузка через 6-8 недель.`,
					isBiologicalDip: false,
				};
			}
			if (isqMean >= 60) {
				return {
					protocol: "delayed_loading",
					status: "primary_mechanical_adequate",
					decisionRationale: `Стандартная первичная стабильность (ISQ=${isqMean}). Стандартный протокол нагрузки через 8-12 недель.`,
					isBiologicalDip: false,
				};
			}
			return {
				protocol: "submerged_two_stage",
				status: "primary_mechanical_adequate",
				decisionRationale: `Низкая первичная стабильность (ISQ=${isqMean} < 60 или Torque < 25 Н·см). Двухэтапный протокол с глухим ушиванием на 3-6 месяцев.`,
				isBiologicalDip: false,
			};
		}

		if (isBiologicalDip) {
			return {
				protocol: "delayed_loading",
				status: "biological_dip_phase",
				decisionRationale: `Период биологического проседания стабильности (2-4 недели, остеокластическая резорбция). Не допускать окклюзионных перегрузок и микроподвижности >100мкм.`,
				isBiologicalDip: true,
			};
		}

		if (isqMean >= 70 && daysPostOp >= 42) {
			return {
				protocol: "immediate_functional_loading",
				status: "secondary_osseointegrated",
				decisionRationale: `Вторичная биологическая остеоинтеграция сформирована (ISQ=${isqMean} >= 70). Имплантат готов к постоянному протезированию.`,
				isBiologicalDip: false,
			};
		}

		if (isqMean < 55 && daysPostOp >= 60) {
			return {
				protocol: "submerged_two_stage",
				status: "fibrous_encapsulation_failing",
				decisionRationale: `Критическое снижение стабильности (ISQ=${isqMean} < 55 на ${daysPostOp} день). Риск фиброзной инкапсуляции и дезинтеграции. Требуется рентген-контроль КЛКТ.`,
				isBiologicalDip: false,
			};
		}

		return {
			protocol: "delayed_loading",
			status: "integrated_stable",
			decisionRationale: `Текущая стабильность ISQ=${isqMean}. Рекомендован контрольный замер через 4 недели перед постоянным протезированием.`,
			isBiologicalDip: false,
		};
	}

}

export const psoTestTypeSchema = z.enum([
	"azopyram",
	"phenolphthalein",
	"both",
]);

export type PsoTestType = z.infer<typeof psoTestTypeSchema>;

export const autoclaveDailyTestTypeSchema = z.enum([
	"bowie_dick",
	"helix_pcd",
	"vacuum_leak",
]);

export type AutoclaveDailyTestType = z.infer<
	typeof autoclaveDailyTestTypeSchema
>;

export const createPsoCleaningLogSchema = z.object({
	testType: psoTestTypeSchema.default("both"),
	batchItemCount: z.number().int().min(1).max(5000),
	testedSampleCount: z.number().int().min(1).max(1000),
	isAzopyramNegative: z.boolean().default(true),
	isPhenolphthaleinNegative: z.boolean().default(true),
	detergentBrand: z.string().trim().max(120).optional().nullable(),
	operatorId: z.string().uuid().optional().nullable(),
	notes: z.string().trim().max(500).optional().nullable(),
});

export type CreatePsoCleaningLogInput = z.infer<
	typeof createPsoCleaningLogSchema
>;

export const createAutoclaveDailyTestSchema = z.object({
	autoclaveId: z.string().trim().min(1).max(80),
	testType: autoclaveDailyTestTypeSchema,
	cycleTemperatureCelsius: z.number().min(100).max(140),
	cyclePressureBar: z.number().min(0.5).max(3.5),
	vacuumLeakRateMbarPerMin: z.number().min(0).max(10).optional().nullable(),
	colorChangeVerified: z.boolean().default(true),
	operatorId: z.string().uuid().optional().nullable(),
	notes: z.string().trim().max(500).optional().nullable(),
});

export type CreateAutoclaveDailyTestInput = z.infer<
	typeof createAutoclaveDailyTestSchema
>;

export class SanPiNSterilizationEngine {
	/**
	 * Минимальный объем выборки для контроля ПСО по СанПиН 3.3686-21:
	 * 1% от обработанной партии, но не менее 3-5 изделий каждого наименования
	 */
	static computeMinimumPsoSampleSize(batchItemCount: number): number {
		const onePercent = Math.ceil(batchItemCount * 0.01);
		return Math.max(3, onePercent);
	}

	static evaluatePsoCleaningBatch(
		batchItemCount: number,
		testedSampleCount: number,
		isAzopyramNegative: boolean,
		isPhenolphthaleinNegative: boolean,
	): {
		isBatchApproved: boolean;
		minSampleRequired: number;
		rejectionReason: string | null;
	} {
		const minSampleRequired = this.computeMinimumPsoSampleSize(batchItemCount);
		if (testedSampleCount < minSampleRequired) {
			return {
				isBatchApproved: false,
				minSampleRequired,
				rejectionReason: `Недостаточный объем выборки ПСО: проверено ${testedSampleCount} из минимум ${minSampleRequired} изделий (1% партии).`,
			};
		}
		if (!isAzopyramNegative) {
			return {
				isBatchApproved: false,
				minSampleRequired,
				rejectionReason:
					"Положительная азопирамовая проба (следы крови/гемоглобина). Вся партия подлежит повторной дезинфекции и ПСО.",
			};
		}
		if (!isPhenolphthaleinNegative) {
			return {
				isBatchApproved: false,
				minSampleRequired,
				rejectionReason:
					"Положительная фенолфталеиновая проба (остатки щелочных моющих средств). Вся партия подлежит повторному обессоливанию и промывке.",
			};
		}
		return {
			isBatchApproved: true,
			minSampleRequired,
			rejectionReason: null,
		};
	}

	static validateAutoclaveCycle(params: {
		cycleMode: string;
		temperatureCelsius: number;
		pressureBar?: number | null;
		durationMin: number;
		passedIndicator: boolean;
	}): {
		isValid: boolean;
		status: "passed" | "failed" | "quarantined";
		reasons: string[];
	} {
		const reasons: string[] = [];
		const {
			cycleMode,
			temperatureCelsius,
			pressureBar,
			durationMin,
			passedIndicator,
		} = params;

		if (!passedIndicator) {
			reasons.push("Химический индикатор не изменил цвет на эталонный.");
		}

		if (cycleMode === "B" || cycleMode === "S" || cycleMode === "N") {
			if (temperatureCelsius >= 132 && temperatureCelsius <= 138) {
				if (
					pressureBar !== undefined &&
					pressureBar !== null &&
					pressureBar < 2.0
				) {
					reasons.push(
						`Недостаточное давление пара: ${pressureBar} бар (требуется >= 2.0 бар для 134°C).`,
					);
				}
				if (durationMin < 5) {
					reasons.push(
						`Недостаточная стерилизационная выдержка: ${durationMin} мин (требуется >= 5 мин для 134°C).`,
					);
				}
			} else if (temperatureCelsius >= 120 && temperatureCelsius <= 126) {
				if (
					pressureBar !== undefined &&
					pressureBar !== null &&
					pressureBar < 1.1
				) {
					reasons.push(
						`Недостаточное давление пара: ${pressureBar} бар (требуется >= 1.1 бар для 121°C).`,
					);
				}
				if (durationMin < 20) {
					reasons.push(
						`Недостаточная стерилизационная выдержка: ${durationMin} мин (требуется >= 20 мин для 121°C).`,
					);
				}
			} else {
				reasons.push(
					`Недопустимая температура для парового автоклава: ${temperatureCelsius}°C.`,
				);
			}
		} else if (cycleMode === "dry_heat_180") {
			if (temperatureCelsius < 178 || temperatureCelsius > 185) {
				reasons.push(
					`Температура сухожара ${temperatureCelsius}°C вне диапазона 180°C ± 3°C.`,
				);
			}
			if (durationMin < 60) {
				reasons.push(
					`Выдержка в сухожаре ${durationMin} мин недостаточна (требуется >= 60 мин при 180°C).`,
				);
			}
		} else if (cycleMode === "dry_heat_160") {
			if (temperatureCelsius < 158 || temperatureCelsius > 165) {
				reasons.push(
					`Температура сухожара ${temperatureCelsius}°C вне диапазона 160°C ± 3°C.`,
				);
			}
			if (durationMin < 150) {
				reasons.push(
					`Выдержка в сухожаре ${durationMin} мин недостаточна (требуется >= 150 мин при 160°C).`,
				);
			}
		}

		const isValid = reasons.length === 0;
		return {
			isValid,
			status: isValid ? "passed" : "failed",
			reasons,
		};
	}

	static generateSterilizationBarcode(params: {
		cycleId: string | number;
		trayCode: string;
		expiryDate: Date;
	}): string {
		const yyyy = params.expiryDate.getFullYear();
		const mm = String(params.expiryDate.getMonth() + 1).padStart(2, "0");
		const dd = String(params.expiryDate.getDate()).padStart(2, "0");
		const cleanTray = params.trayCode
			.toUpperCase()
			.replace(/[^A-Z0-9_-]/g, "");
		const cleanCycle = String(params.cycleId).replace(/[^A-Za-z0-9_-]/g, "");
		return `DNT-STER-${cleanCycle}-${cleanTray}-${yyyy}${mm}${dd}`;
	}
}

export const prescriptionFormTypeSchema = z.enum([
	"form_107_1_u",
	"form_148_1_u_88",
	"form_148_1_u_04_l",
	"consultation_order",
]);

export type PrescriptionFormType = z.infer<typeof prescriptionFormTypeSchema>;

export const prescriptionValidityPeriodSchema = z.enum([
	"days_15",
	"days_30",
	"days_60",
	"year_1",
]);

export type PrescriptionValidityPeriod = z.infer<typeof prescriptionValidityPeriodSchema>;

export const prescriptionStatusSchema = z.enum([
	"draft",
	"issued",
	"dispensed",
	"cancelled",
	"expired",
]);

export type PrescriptionStatus = z.infer<typeof prescriptionStatusSchema>;

export const prescriptionItemInputSchema = z.object({
	catalogDrugId: z.string().uuid().optional().nullable(),
	innLatin: z.string().trim().min(2).max(200),
	dosageFormLatin: z.string().trim().min(2).max(100),
	dosageDoseConcentration: z.string().trim().min(1).max(100),
	dispenseInstructionLatin: z.string().trim().min(2).max(150),
	signatureDirectionRussian: z.string().trim().min(5).max(500),
	quantityPackages: z.number().int().min(1).max(50).default(1),
	durationDays: z.number().int().min(1).max(365).default(5),
	frequencyTimesPerDay: z.number().int().min(1).max(12).default(2),
	mealRelation: z
		.enum(["before_meal", "with_meal", "after_meal", "independent"])
		.default("after_meal"),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemInputSchema>;

export const checkInteractionsRequestSchema = z.object({
	patientId: z.string().uuid(),
	prescribedInnList: z.array(z.string().trim().min(2)).min(1),
	currentMedications: z.array(z.string().trim()).default([]),
	chronicDiseases: z.array(z.string().trim()).default([]),
	localAnestheticPlanned: z.string().optional().nullable(),
	vasoconstrictorPlanned: z
		.enum(["none", "1:100000", "1:200000", "1:50000"])
		.default("1:200000"),
	patientAgeYears: z.number().int().min(0).max(130).default(35),
	isPregnant: z.boolean().default(false),
	isLactating: z.boolean().default(false),
});

export type CheckInteractionsRequest = z.infer<typeof checkInteractionsRequestSchema>;

export const interactionConflictItemSchema = z.object({
	id: z.string(),
	severity: z.enum(["info", "warning", "blocker"]),
	agentA: z.string(),
	agentB: z.string(),
	conflictCategory: z.enum([
		"drug_drug",
		"drug_allergy_cross",
		"drug_disease",
		"anesthetic_vasoconstrictor",
		"pregnancy_lactation",
		"age_contraindication",
	]),
	title: z.string(),
	clinicalRisk: z.string(),
	mechanism: z.string(),
	actionRequired: z.string(),
});

export type InteractionConflictItem = z.infer<typeof interactionConflictItemSchema>;

export const checkInteractionsResponseSchema = z.object({
	patientId: z.string().uuid(),
	isPrescriptionSafe: z.boolean(),
	blockersCount: z.number().int().nonnegative(),
	warningsCount: z.number().int().nonnegative(),
	conflicts: z.array(interactionConflictItemSchema),
	suggestedModifications: z.array(z.string()),
	evaluatedAt: z.string(),
});

export type CheckInteractionsResponse = z.infer<typeof checkInteractionsResponseSchema>;

export const createPrescription107RequestSchema = z.object({
	patientId: z.string().uuid(),
	visitId: z.string().uuid().optional().nullable(),
	prescribingDoctorId: z.string().uuid(),
	validityPeriod: z
		.enum(["days_15", "days_30", "days_60", "year_1"])
		.default("days_60"),
	isSpecialChronicIndication: z.boolean().default(false),
	chronicDispenseFrequencyNotes: z
		.string()
		.trim()
		.max(300)
		.optional()
		.nullable(),
	clinicalDiagnosisMkb10: z.string().trim().max(16).optional().nullable(),
	clinicalDiagnosisDescription: z
		.string()
		.trim()
		.max(500)
		.optional()
		.nullable(),
	items: z.array(prescriptionItemInputSchema).min(1).max(3),
	currentMedications: z.array(z.string()).default([]),
});
