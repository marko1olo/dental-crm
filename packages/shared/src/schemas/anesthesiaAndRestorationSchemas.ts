import { z } from "zod";
import { type AnestheticDrug, type AnestheticSafetyCalculation, type AsaClassification, type VasoconstrictorRatio } from "./imagingSessionAndAnesthesiaSchemas.js";

export function calculateAnestheticSafety(params: {
	drug: AnestheticDrug;
	concentrationPct: number;
	vasoconstrictor: VasoconstrictorRatio;
	carpuleVolumeMl: number;
	carpulesAdministered: number;
	patientWeightKg: number;
	patientAgeYears?: number;
	asaClass?: AsaClassification;
	hasCardiovascularDisease?: boolean;
}): AnestheticSafetyCalculation {
	const {
		drug,
		concentrationPct,
		vasoconstrictor,
		carpuleVolumeMl,
		carpulesAdministered,
		patientWeightKg,
		patientAgeYears,
		asaClass = "ASA_I",
		hasCardiovascularDisease = false,
	} = params;

	const warnings: string[] = [];
	const isPediatric =
		typeof patientAgeYears === "number" && patientAgeYears > 0 && patientAgeYears < 18;
	const hasValidWeight =
		typeof patientWeightKg === "number" &&
		Number.isFinite(patientWeightKg) &&
		patientWeightKg > 0;

	if (!hasValidWeight || (isPediatric && (!patientWeightKg || patientWeightKg <= 0))) {
		warnings.push(
			isPediatric
				? "Укажите фактический вес ребенка для расчета анестезии! Расчет заблокирован."
				: "Укажите фактический вес пациента для расчета анестезии! Расчет заблокирован.",
		);
		return {
			totalAnestheticMg: 0,
			maxRecommendedAnestheticMg: 0,
			anestheticUtilizationPct: 100,
			totalEpinephrineMg: 0,
			maxRecommendedEpinephrineMg: 0,
			epinephrineUtilizationPct: 100,
			isAnestheticOverdose: false,
			isEpinephrineOverdose: false,
			maxSafeCarpules: 0,
			remainingSafeCarpules: 0,
			clinicalWarnings: warnings,
		};
	}

	const weight = Math.max(5, Math.min(250, patientWeightKg));

	// 1. Определение предельной дозы на 1 кг массы тела (MRD) и абсолютного максимума
	let mrdPerKg = 7.0; // мг/кг
	let absoluteMaxMg = 500; // мг

	if (drug === "articaine") {
		mrdPerKg = 7.0;
		absoluteMaxMg = 500;
		if (typeof patientAgeYears === "number" && patientAgeYears < 4) {
			warnings.push("Артикаин противопоказан детям в возрасте до 4 лет.");
		} else if (typeof patientAgeYears === "number" && patientAgeYears < 12) {
			mrdPerKg = 5.0; // консервативный педиатрический предел
		}
	} else if (drug === "mepivacaine") {
		mrdPerKg = 6.6;
		absoluteMaxMg = 400;
	} else if (drug === "lidocaine") {
		mrdPerKg = vasoconstrictor === "none" ? 4.4 : 7.0;
		absoluteMaxMg = vasoconstrictor === "none" ? 300 : 500;
	} else if (drug === "bupivacaine") {
		mrdPerKg = 2.0;
		absoluteMaxMg = 90;
	}

	const maxRecommendedAnestheticMg = Number(
		Math.min(absoluteMaxMg, weight * mrdPerKg).toFixed(1),
	);

	// 2. Расчет содержания анестетика в 1 карпуле
	const mgPerMl = concentrationPct * 10;
	const mgPerCarpule = mgPerMl * carpuleVolumeMl;
	const totalAnestheticMg = Number((carpulesAdministered * mgPerCarpule).toFixed(1));

	// 3. Расчет вазоконстриктора (Адреналин / Эпинефрин)
	let epiMgPerMl = 0;
	if (vasoconstrictor === "1:100000") epiMgPerMl = 0.01;
	else if (vasoconstrictor === "1:200000") epiMgPerMl = 0.005;
	else if (vasoconstrictor === "1:50000") epiMgPerMl = 0.02;

	const totalEpinephrineMg = Number(
		(carpulesAdministered * carpuleVolumeMl * epiMgPerMl).toFixed(4),
	);

	// Кардиальный предел адреналина: 0.04 мг при сердечно-сосудистой патологии (ASA III/IV), иначе 0.2 мг
	const isCardiacRisk =
		hasCardiovascularDisease || asaClass === "ASA_III" || asaClass === "ASA_IV";
	const maxRecommendedEpinephrineMg = isCardiacRisk ? 0.04 : 0.2;

	if (isCardiacRisk && vasoconstrictor !== "none") {
		warnings.push(
			"Кардиальный риск (ASA III/IV): лимит адреналина снижен до 0.04 мг (макс. 2 карпулы 1:100k или 4 карпулы 1:200k).",
		);
	}

	// 4. Расчет максимального безопасного количества карпул
	const maxCarpulesByDrug = mgPerCarpule > 0 ? maxRecommendedAnestheticMg / mgPerCarpule : 0;
	const maxCarpulesByEpi =
		epiMgPerMl > 0
			? maxRecommendedEpinephrineMg / (carpuleVolumeMl * epiMgPerMl)
			: 999;

	const maxSafeCarpules = Number(
		Math.min(maxCarpulesByDrug, maxCarpulesByEpi).toFixed(1),
	);
	const remainingSafeCarpules = Number(
		Math.max(0, maxSafeCarpules - carpulesAdministered).toFixed(1),
	);

	const anestheticUtilizationPct = Number(
		((totalAnestheticMg / (maxRecommendedAnestheticMg || 1)) * 100).toFixed(1),
	);
	const epinephrineUtilizationPct =
		maxRecommendedEpinephrineMg > 0
			? Number(
					(
						(totalEpinephrineMg / maxRecommendedEpinephrineMg) *
						100
					).toFixed(1),
				)
			: 0;

	const isAnestheticOverdose = totalAnestheticMg > maxRecommendedAnestheticMg;
	const isEpinephrineOverdose =
		vasoconstrictor !== "none" &&
		totalEpinephrineMg > maxRecommendedEpinephrineMg;

	if (isAnestheticOverdose) {
		warnings.push(
			`ПРЕВЫШЕНА ТОКСИЧЕСКАЯ ДОЗА АНЕСТЕТИКА: ${totalAnestheticMg} мг при допустимом максимуме ${maxRecommendedAnestheticMg} мг!`,
		);
	}
	if (isEpinephrineOverdose) {
		warnings.push(
			`ПРЕВЫШЕНА ДОЗА АДРЕНАЛИНА: ${totalEpinephrineMg} мг при максимуме ${maxRecommendedEpinephrineMg} мг!`,
		);
	}

	return {
		totalAnestheticMg,
		maxRecommendedAnestheticMg,
		anestheticUtilizationPct,
		totalEpinephrineMg,
		maxRecommendedEpinephrineMg,
		epinephrineUtilizationPct,
		isAnestheticOverdose,
		isEpinephrineOverdose,
		maxSafeCarpules,
		remainingSafeCarpules,
		clinicalWarnings: warnings,
	};
}

export const restorationTypeSchema = z.enum([
	"crown_monolithic",
	"crown_layered_cutback",
	"inlay",
	"onlay",
	"overlay",
	"veneer_laminate",
	"endocrown",
	"bridge_retainer",
	"bridge_pontic",
	"custom_abutment_tibase",
	"screw_retained_crown",
	"surgical_guide",
	"occlusal_splint_nightguard",
	"clear_aligner_stage",
	"digital_waxup_mockup",
]);

export type RestorationType = z.infer<typeof restorationTypeSchema>;

export const restorationMaterialSchema = z.enum([
	"zirconia_3y_high_strength",
	"zirconia_4y_high_translucent",
	"zirconia_5y_ultra_translucent",
	"zirconia_multilayer_gradient",
	"emax_lithium_disilicate_cad",
	"emax_lithium_disilicate_press",
	"pmma_cad_provisional",
	"composite_lab_nanohybrid",
	"titanium_grade_5",
	"cocr_milled_cast",
	"peek_biohpp",
	"resin_3d_surgical_guide",
	"resin_3d_splint_biocompatible",
]);

export type RestorationMaterial = z.infer<typeof restorationMaterialSchema>;

export const stumpPreparationShadeSchema = z.enum([
	"ND1",
	"ND2",
	"ND3",
	"ND4",
	"ND5",
	"ND6",
	"ND7",
	"ND8",
	"ND9",
]);

export type StumpPreparationShade = z.infer<typeof stumpPreparationShadeSchema>;

export const zonalShadeSpecificationSchema = z.object({
	cervical: z.string().trim().default("A3.5"),
	body: z.string().trim().default("A3"),
	incisal: z.string().trim().default("A2"),
	stumpPreparation: stumpPreparationShadeSchema.optional().nullable(),
	translucency: z.enum(["UTML", "STML", "HT", "MT", "LT", "MO", "HO"]).default("HT"),
	mamelons: z.boolean().default(false),
	calcifications: z.boolean().default(false),
});

export type ZonalShadeSpecification = z.infer<typeof zonalShadeSpecificationSchema>;

export const labOrderMilestoneSchema = z.enum([
	"draft",
	"submitted",
	"cad_intake_verified",
	"digital_design_cad",
	"doctor_preview_pending",
	"design_revision",
	"cam_production",
	"sintering_crystallization",
	"ceramic_glaze_finish",
	"quality_control_passed",
	"shipped_courier",
	"clinic_received",
	"clinical_try_in",
	"refitting_remake",
	"final_cementation",
	"closed_warranty",
	"cancelled",
]);

export type LabOrderMilestone = z.infer<typeof labOrderMilestoneSchema>;

export const implantSystemBrandSchema = z.enum([
	"internal_hex",
	"conical_connection",
	"external_hex",
	"tissue_level_synocta",
	"multi_unit",
	"custom_tibase",
	"other",
]);

export type ImplantSystemBrand = z.infer<typeof implantSystemBrandSchema>;

export const boneDensityClassSchema = z.enum(["D1", "D2", "D3", "D4"]);

export type BoneDensityClass = z.infer<typeof boneDensityClassSchema>;

export const surgicalImplantProtocolSchema = z.enum([
	"submerged_two_stage",
	"transgingival_one_stage",
	"immediate_provisionalization",
	"immediate_functional_loading",
	"delayed_loading",
]);

export type SurgicalImplantProtocol = z.infer<typeof surgicalImplantProtocolSchema>;

export const stabilityEvaluationStatusSchema = z.enum([
	"primary_mechanical_high",
	"primary_mechanical_adequate",
	"biological_dip_phase",
	"secondary_osseointegrated",
	"fibrous_encapsulation_failing",
	"integrated_stable",
]);

export type StabilityEvaluationStatus = z.infer<typeof stabilityEvaluationStatusSchema>;

export const torqueCurveSampleSchema = z.object({
	depthMm: z.number().min(0).max(25),
	torqueNcm: z.number().min(0).max(120),
});

export type TorqueCurveSample = z.infer<typeof torqueCurveSampleSchema>;
