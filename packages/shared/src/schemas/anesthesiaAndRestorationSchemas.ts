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

export interface Vector3D {
	x: number;
	y: number;
	z: number;
}

export interface Triangle3D {
	v1: Vector3D;
	v2: Vector3D;
	v3: Vector3D;
}

export interface MeshGeometryMetrics {
	triangleCount: number;
	surfaceAreaMm2: number;
	volumeMm3: number;
	volumeCm3: number;
	boundingBoxMm: {
		min: Vector3D;
		max: Vector3D;
		dimensions: Vector3D;
	};
	materialMassGrams: {
		zirconia: number;
		emax: number;
		pmma: number;
		titanium: number;
	};
	isManifold: boolean;
	boundaryEdgeCount: number;
	nonManifoldEdgeCount: number;
}

export function calculateMeshGeometryMetrics(
	triangles: Triangle3D[],
): MeshGeometryMetrics {
	if (triangles.length === 0) {
		return {
			triangleCount: 0,
			surfaceAreaMm2: 0,
			volumeMm3: 0,
			volumeCm3: 0,
			boundingBoxMm: {
				min: { x: 0, y: 0, z: 0 },
				max: { x: 0, y: 0, z: 0 },
				dimensions: { x: 0, y: 0, z: 0 },
			},
			materialMassGrams: { zirconia: 0, emax: 0, pmma: 0, titanium: 0 },
			isManifold: true,
			boundaryEdgeCount: 0,
			nonManifoldEdgeCount: 0,
		};
	}

	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let minZ = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	let maxZ = Number.NEGATIVE_INFINITY;

	let totalSurfaceArea = 0;
	let signedVolumeSum = 0;

	// Edge occurrence map for 2-manifold check
	const edgeMap = new Map<string, number>();

	const quantize = (v: Vector3D): string =>
		`${Math.round(v.x * 1000)},${Math.round(v.y * 1000)},${Math.round(v.z * 1000)}`;

	const addEdge = (p1: string, p2: string) => {
		const edgeKey = p1 < p2 ? `${p1}|${p2}` : `${p2}|${p1}`;
		edgeMap.set(edgeKey, (edgeMap.get(edgeKey) || 0) + 1);
	};

	for (const tri of triangles) {
		const { v1, v2, v3 } = tri;

		// 1. AABB Bounding Box
		if (v1.x < minX) minX = v1.x;
		if (v1.y < minY) minY = v1.y;
		if (v1.z < minZ) minZ = v1.z;
		if (v1.x > maxX) maxX = v1.x;
		if (v1.y > maxY) maxY = v1.y;
		if (v1.z > maxZ) maxZ = v1.z;

		if (v2.x < minX) minX = v2.x;
		if (v2.y < minY) minY = v2.y;
		if (v2.z < minZ) minZ = v2.z;
		if (v2.x > maxX) maxX = v2.x;
		if (v2.y > maxY) maxY = v2.y;
		if (v2.z > maxZ) maxZ = v2.z;

		if (v3.x < minX) minX = v3.x;
		if (v3.y < minY) minY = v3.y;
		if (v3.z < minZ) minZ = v3.z;
		if (v3.x > maxX) maxX = v3.x;
		if (v3.y > maxY) maxY = v3.y;
		if (v3.z > maxZ) maxZ = v3.z;

		// 2. Triangle Surface Area (Cross product norm / 2)
		const ax = v2.x - v1.x;
		const ay = v2.y - v1.y;
		const az = v2.z - v1.z;

		const bx = v3.x - v1.x;
		const by = v3.y - v1.y;
		const bz = v3.z - v1.z;

		const cx = ay * bz - az * by;
		const cy = az * bx - ax * bz;
		const cz = ax * by - ay * bx;

		const area = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
		totalSurfaceArea += area;

		// 3. Signed Tetrahedron Volume (Divergence theorem: v1 . (v2 x v3) / 6)
		const det =
			v1.x * (v2.y * v3.z - v2.z * v3.y) -
			v1.y * (v2.x * v3.z - v2.z * v3.x) +
			v1.z * (v2.x * v3.y - v2.y * v3.x);

		signedVolumeSum += det / 6.0;

		// 4. Edges for manifold validation
		const q1 = quantize(v1);
		const q2 = quantize(v2);
		const q3 = quantize(v3);
		addEdge(q1, q2);
		addEdge(q2, q3);
		addEdge(q3, q1);
	}

	const volumeMm3 = Number(Math.abs(signedVolumeSum).toFixed(3));
	const volumeCm3 = Number((volumeMm3 * 0.001).toFixed(4));
	const surfaceAreaMm2 = Number(totalSurfaceArea.toFixed(2));

	// Densities in g/cm3
	const DENSITY_ZIRCONIA = 6.05;
	const DENSITY_EMAX = 2.50;
	const DENSITY_PMMA = 1.18;
	const DENSITY_TITANIUM = 4.43;

	const materialMassGrams = {
		zirconia: Number((volumeCm3 * DENSITY_ZIRCONIA).toFixed(3)),
		emax: Number((volumeCm3 * DENSITY_EMAX).toFixed(3)),
		pmma: Number((volumeCm3 * DENSITY_PMMA).toFixed(3)),
		titanium: Number((volumeCm3 * DENSITY_TITANIUM).toFixed(3)),
	};

	let boundaryEdges = 0;
	let nonManifoldEdges = 0;

	for (const count of edgeMap.values()) {
		if (count === 1) boundaryEdges++;
		else if (count > 2) nonManifoldEdges++;
	}

	const isManifold = boundaryEdges === 0 && nonManifoldEdges === 0;

	return {
		triangleCount: triangles.length,
		surfaceAreaMm2,
		volumeMm3,
		volumeCm3,
		boundingBoxMm: {
			min: {
				x: Number(minX.toFixed(2)),
				y: Number(minY.toFixed(2)),
				z: Number(minZ.toFixed(2)),
			},
			max: {
				x: Number(maxX.toFixed(2)),
				y: Number(maxY.toFixed(2)),
				z: Number(maxZ.toFixed(2)),
			},
			dimensions: {
				x: Number((maxX - minX).toFixed(2)),
				y: Number((maxY - minY).toFixed(2)),
				z: Number((maxZ - minZ).toFixed(2)),
			},
		},
		materialMassGrams,
		isManifold,
		boundaryEdgeCount: boundaryEdges,
		nonManifoldEdgeCount: nonManifoldEdges,
	};
}

export const implantSystemBrandSchema = z.enum([
	"osstem",
	"straumann",
	"nobel_biocare",
	"bredent",
	"astra_tech",
	"dentium",
	"ankylos",
	"mis",
	"megagen",
	"neodent",
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
