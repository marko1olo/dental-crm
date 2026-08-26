/**
 * DENTAL IMPLANT EMERGENCE PROFILE & BIOMECHANICAL MATH ENGINE
 *
 * Implements scientific algorithms for:
 * 1. Emergence Profile Angle (alpha) calculation & Katafuchi/Souza peri-implantitis risk evaluation.
 * 2. Platform Switching delta & biological width preservation score.
 * 3. Subgingival collar depth, gingival cuff geometry, and soft-tissue adherence volume.
 * 4. Cement-associated peri-implantitis risk detection (> 1.0 mm subgingival margin).
 * 5. Angled Screw Channel (ASC) feasibility & trajectory analysis (up to 25°).
 * 6. Structured Dental Lab (ЗТЛ) Work Order generation.
 *
 * Clinical Scientific References:
 * - Katafuchi et al. (2017): Restoration emergence angle > 30° is associated with 3.7x higher peri-implantitis prevalence.
 * - Souza et al. (2018): Convex emergence profile combined with > 30° angle exhibits maximum crestal bone loss.
 * - Lazzara & Porter (2006): Platform switching >= 0.4 mm shifts inflammatory cell zone away from alveolar crest.
 * - Tarnow et al. (2000): Inter-implant papilla preservation & 3 mm rule.
 * - Wilson (2009) / Pauletto et al. (1999): Undetected subgingival cement (> 1.0 mm) is a primary etiological factor in peri-implant disease.
 */

export type EmergenceProfileShape = "concave" | "straight" | "convex";
export type FixationType = "screw_retained" | "cement_retained" | "multi_unit";
export type CrownMaterial =
	| "zirconia_multilayer"
	| "zirconia_monolithic"
	| "emax_cad"
	| "cocr_ceramic"
	| "pmma_temporary"
	| "titanium_custom";

export type AngleRiskLevel = "safe" | "warning" | "danger";
export type PlatformSwitchStatus = "optimal_switch" | "platform_matching" | "inverted_risk";
export type CementRiskLevel = "none_screw" | "safe_equigingival" | "critical_subgingival";

export interface ToothEmergenceDefaults {
	readonly toothNumberFdi: number;
	readonly toothNameRu: string;
	readonly defaultCervicalDiameterMm: number;
	readonly typicalMucosalThicknessMm: number;
	readonly isAestheticZone: boolean;
}

export interface EmergenceProfileInput {
	readonly toothNumberFdi: number;
	readonly implantBrand: string;
	readonly implantLine: string;
	readonly platformDiameterMm: number;
	readonly crownMarginDiameterMm: number;
	readonly gingivalCuffHeightMm: number;
	readonly profileShape: EmergenceProfileShape;
	readonly fixationType: FixationType;
	readonly subgingivalMarginDepthMm: number;
	readonly screwChannelAngulationDeg?: number | undefined;
	readonly crownMaterial?: CrownMaterial | undefined;
	readonly abutmentPlatformDiameterMm?: number | undefined;
}

export interface EmergenceProfileAnalysis {
	readonly emergenceAngleDeg: number;
	readonly angleRiskLevel: AngleRiskLevel;
	readonly platformSwitchMm: number;
	readonly platformSwitchStatus: PlatformSwitchStatus;
	readonly cementRiskLevel: CementRiskLevel;
	readonly cementRiskDescription: string;
	readonly softTissueVolumeIndex: number;
	readonly katafuchiRiskMultiplier: number;
	readonly isAscFeasible: boolean;
	readonly ascWarning?: string | undefined;
	readonly biologicWidthAssessment: {
		readonly totalBiologicWidthMm: number;
		readonly connectiveTissueBandMm: number;
		readonly junctionalEpitheliumMm: number;
		readonly sulcusDepthMm: number;
		readonly isAdequate: boolean;
	};
	readonly clinicalMessages: readonly string[];
	readonly isSafeToProceed: boolean;
}

export interface ZtlWorkOrderSpecification {
	readonly orderId: string;
	readonly createdAtIso: string;
	readonly toothNumberFdi: number;
	readonly toothNameRu: string;
	readonly implantBrand: string;
	readonly implantLine: string;
	readonly platformDiameterMm: number;
	readonly abutmentType: string;
	readonly tiBaseArticle: string;
	readonly gingivalCuffHeightMm: number;
	readonly chimneyPostHeightMm: number;
	readonly fixationType: FixationType;
	readonly fixationTypeRu: string;
	readonly crownMaterial: CrownMaterial;
	readonly crownMaterialRu: string;
	readonly emergenceAngleDeg: number;
	readonly profileShape: EmergenceProfileShape;
	readonly profileShapeRu: string;
	readonly recommendedTorqueNcm: number;
	readonly screwdriverType: string;
	readonly screwChannelAngulationDeg: number;
	readonly technicalNotes: string;
	readonly isSubgingivalCementAlert: boolean;
}

// ─── FDI TOOTH ANATOMICAL EMERGENCE CONSTANTS ────────────────────────────────

export const TOOTH_EMERGENCE_DEFAULTS: Record<number, ToothEmergenceDefaults> = {
	// Upper Anterior (Aesthetic Smile Zone)
	11: { toothNumberFdi: 11, toothNameRu: "Центральный резец в/ч (1.1)", defaultCervicalDiameterMm: 7.0, typicalMucosalThicknessMm: 2.5, isAestheticZone: true },
	12: { toothNumberFdi: 12, toothNameRu: "Боковой резец в/ч (1.2)", defaultCervicalDiameterMm: 5.5, typicalMucosalThicknessMm: 2.5, isAestheticZone: true },
	13: { toothNumberFdi: 13, toothNameRu: "Клык в/ч (1.3)", defaultCervicalDiameterMm: 6.5, typicalMucosalThicknessMm: 3.0, isAestheticZone: true },
	21: { toothNumberFdi: 21, toothNameRu: "Центральный резец в/ч (2.1)", defaultCervicalDiameterMm: 7.0, typicalMucosalThicknessMm: 2.5, isAestheticZone: true },
	22: { toothNumberFdi: 22, toothNameRu: "Боковой резец в/ч (2.2)", defaultCervicalDiameterMm: 5.5, typicalMucosalThicknessMm: 2.5, isAestheticZone: true },
	23: { toothNumberFdi: 23, toothNameRu: "Клык в/ч (2.3)", defaultCervicalDiameterMm: 6.5, typicalMucosalThicknessMm: 3.0, isAestheticZone: true },

	// Upper Premolars & Molars
	14: { toothNumberFdi: 14, toothNameRu: "Первый премоляр в/ч (1.4)", defaultCervicalDiameterMm: 6.0, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
	15: { toothNumberFdi: 15, toothNameRu: "Второй премоляр в/ч (1.5)", defaultCervicalDiameterMm: 6.0, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
	16: { toothNumberFdi: 16, toothNameRu: "Первый моляр в/ч (1.6)", defaultCervicalDiameterMm: 9.0, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
	17: { toothNumberFdi: 17, toothNameRu: "Второй моляр в/ч (1.7)", defaultCervicalDiameterMm: 8.5, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
	24: { toothNumberFdi: 24, toothNameRu: "Первый премоляр в/ч (2.4)", defaultCervicalDiameterMm: 6.0, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
	25: { toothNumberFdi: 25, toothNameRu: "Второй премоляр в/ч (2.5)", defaultCervicalDiameterMm: 6.0, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
	26: { toothNumberFdi: 26, toothNameRu: "Первый моляр в/ч (2.6)", defaultCervicalDiameterMm: 9.0, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
	27: { toothNumberFdi: 27, toothNameRu: "Второй моляр в/ч (2.7)", defaultCervicalDiameterMm: 8.5, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },

	// Lower Anterior
	31: { toothNumberFdi: 31, toothNameRu: "Центральный резец н/ч (3.1)", defaultCervicalDiameterMm: 4.5, typicalMucosalThicknessMm: 2.0, isAestheticZone: true },
	32: { toothNumberFdi: 32, toothNameRu: "Боковой резец н/ч (3.2)", defaultCervicalDiameterMm: 5.0, typicalMucosalThicknessMm: 2.0, isAestheticZone: true },
	33: { toothNumberFdi: 33, toothNameRu: "Клык н/ч (3.3)", defaultCervicalDiameterMm: 6.0, typicalMucosalThicknessMm: 2.5, isAestheticZone: true },
	41: { toothNumberFdi: 41, toothNameRu: "Центральный резец н/ч (4.1)", defaultCervicalDiameterMm: 4.5, typicalMucosalThicknessMm: 2.0, isAestheticZone: true },
	42: { toothNumberFdi: 42, toothNameRu: "Боковой резец н/ч (4.2)", defaultCervicalDiameterMm: 5.0, typicalMucosalThicknessMm: 2.0, isAestheticZone: true },
	43: { toothNumberFdi: 43, toothNameRu: "Клык н/ч (4.3)", defaultCervicalDiameterMm: 6.0, typicalMucosalThicknessMm: 2.5, isAestheticZone: true },

	// Lower Premolars & Molars
	34: { toothNumberFdi: 34, toothNameRu: "Первый премоляр н/ч (3.4)", defaultCervicalDiameterMm: 6.0, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
	35: { toothNumberFdi: 35, toothNameRu: "Второй премоляр н/ч (3.5)", defaultCervicalDiameterMm: 6.5, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
	36: { toothNumberFdi: 36, toothNameRu: "Первый моляр н/ч (3.6)", defaultCervicalDiameterMm: 9.5, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
	37: { toothNumberFdi: 37, toothNameRu: "Второй моляр н/ч (3.7)", defaultCervicalDiameterMm: 9.0, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
	44: { toothNumberFdi: 44, toothNameRu: "Первый премоляр н/ч (4.4)", defaultCervicalDiameterMm: 6.0, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
	45: { toothNumberFdi: 45, toothNameRu: "Второй премоляр н/ч (4.5)", defaultCervicalDiameterMm: 6.5, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
	46: { toothNumberFdi: 46, toothNameRu: "Первый моляр н/ч (4.6)", defaultCervicalDiameterMm: 9.5, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
	47: { toothNumberFdi: 47, toothNameRu: "Второй моляр н/ч (4.7)", defaultCervicalDiameterMm: 9.0, typicalMucosalThicknessMm: 2.0, isAestheticZone: false },
};

/**
 * Returns default anatomical parameters for given FDI tooth code, with safe fallback.
 */
export function getToothEmergenceDefaults(toothNumberFdi: number): ToothEmergenceDefaults {
	if (TOOTH_EMERGENCE_DEFAULTS[toothNumberFdi]) {
		return TOOTH_EMERGENCE_DEFAULTS[toothNumberFdi];
	}
	return {
		toothNumberFdi,
		toothNameRu: "Зуб FDI " + toothNumberFdi,
		defaultCervicalDiameterMm: 6.5,
		typicalMucosalThicknessMm: 2.0,
		isAestheticZone: [11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 42, 43].includes(toothNumberFdi),
	};
}

// ─── CORE MATHEMATICAL CALCULATIONS ──────────────────────────────────────────

/**
 * Calculates Emergence Angle (alpha) in degrees.
 *
 * Formula:
 * alpha = arctan( (D_margin - D_platform) / (2 * H_cuff) ) * (180 / PI)
 *
 * Special handling:
 * - If H_cuff <= 0, returns 90 degrees (infinite flare / impossible cuff).
 * - If D_margin <= D_platform, returns 0 degrees (cylindrical emergence).
 */
export function calculateEmergenceAngleDeg(
	platformDiameterMm: number,
	crownMarginDiameterMm: number,
	gingivalCuffHeightMm: number,
): number {
	if (gingivalCuffHeightMm <= 0.001) {
		return 90.0;
	}

	const deltaRadius = (crownMarginDiameterMm - platformDiameterMm) / 2.0;
	if (deltaRadius <= 0) {
		return 0.0;
	}

	const angleRad = Math.atan2(deltaRadius, gingivalCuffHeightMm);
	const angleDeg = (angleRad * 180.0) / Math.PI;

	return Math.round(angleDeg * 10) / 10;
}

/**
 * Calculates Platform Switching step difference (delta) in mm.
 * Delta = (D_implant - D_abutment) / 2
 * When abutment platform is not provided, defaults to 0 (matching).
 */
export function calculatePlatformSwitchStepMm(
	implantPlatformDiameterMm: number,
	abutmentPlatformDiameterMm?: number,
): number {
	if (!abutmentPlatformDiameterMm || abutmentPlatformDiameterMm >= implantPlatformDiameterMm) {
		const delta = (implantPlatformDiameterMm - (abutmentPlatformDiameterMm ?? implantPlatformDiameterMm)) / 2.0;
		return Math.round(delta * 100) / 100;
	}
	const delta = (implantPlatformDiameterMm - abutmentPlatformDiameterMm) / 2.0;
	return Math.round(delta * 100) / 100;
}

/**
 * Determines biological width preservation status based on platform switching step.
 */
export function evaluatePlatformSwitchStatus(platformSwitchMm: number): PlatformSwitchStatus {
	if (platformSwitchMm >= 0.38) {
		// Standard 0.4 mm threshold (Lazzara & Porter 2006)
		return "optimal_switch";
	}
	if (platformSwitchMm >= -0.05 && platformSwitchMm < 0.38) {
		return "platform_matching";
	}
	return "inverted_risk";
}

/**
 * Evaluates risk level of emergence angle based on Katafuchi et al. (2017) and Souza et al. (2018).
 */
export function evaluateEmergenceAngleRisk(
	angleDeg: number,
	shape: EmergenceProfileShape,
): { riskLevel: AngleRiskLevel; katafuchiMultiplier: number } {
	// Katafuchi et al. (2017): > 30 degrees is 3.7x higher risk of peri-implantitis
	if (angleDeg <= 30.0) {
		return { riskLevel: "safe", katafuchiMultiplier: 1.0 };
	}

	// Souza et al. (2018): Convex profile combined with > 30 deg has severe bone loss
	if (angleDeg > 40.0 || (angleDeg > 30.0 && shape === "convex")) {
		return { riskLevel: "danger", katafuchiMultiplier: 3.7 };
	}

	return { riskLevel: "warning", katafuchiMultiplier: 2.4 };
}

/**
 * Evaluates cement-retained peri-implantitis risk based on subgingival margin depth (Wilson 2009).
 */
export function evaluateCementationRisk(
	fixationType: FixationType,
	subgingivalMarginDepthMm: number,
): { level: CementRiskLevel; description: string } {
	if (fixationType === "screw_retained" || fixationType === "multi_unit") {
		return {
			level: "none_screw",
			description: "Винтовая фиксация: риск цементного периимплантита 0% (отсутствие цемента). 100% ремонтопригодность.",
		};
	}

	// Cement retained
	if (subgingivalMarginDepthMm <= 1.0) {
		return {
			level: "safe_equigingival",
			description: "Цементная фиксация с поддесневым уступом " + subgingivalMarginDepthMm.toFixed(1) + " мм (<= 1.0 мм). Допустимо, контролируемое удаление излишков цемента.",
		};
	}

	return {
		level: "critical_subgingival",
		description: "КРИТИЧЕСКИЙ РИСК: Поддесневой край цементировки " + subgingivalMarginDepthMm.toFixed(1) + " мм (> 1.0 мм). Высокая вероятность неизвлекаемого цемента и цементного периимплантита (Wilson 2009). Рекомендуется винтовая шахта или индивидуальный абатмент с выносом уступа!",
	};
}

/**
 * Evaluates biological width parameters around implant transmucosal zone.
 */
export function evaluateBiologicWidth(gingivalCuffHeightMm: number) {
	const connectiveTissueBandMm = 1.5;
	const junctionalEpitheliumMm = 1.5;
	const totalRequired = connectiveTissueBandMm + junctionalEpitheliumMm;
	const isAdequate = gingivalCuffHeightMm >= 2.0;

	return {
		totalBiologicWidthMm: totalRequired,
		connectiveTissueBandMm,
		junctionalEpitheliumMm,
		sulcusDepthMm: Math.max(0, Math.round((gingivalCuffHeightMm - totalRequired) * 10) / 10),
		isAdequate,
	};
}

/**
 * Performs full clinical and biomechanical analysis of the emergence profile.
 */
export function analyzeEmergenceProfile(input: EmergenceProfileInput): EmergenceProfileAnalysis {
	const angleDeg = calculateEmergenceAngleDeg(
		input.platformDiameterMm,
		input.crownMarginDiameterMm,
		input.gingivalCuffHeightMm,
	);

	const { riskLevel, katafuchiMultiplier } = evaluateEmergenceAngleRisk(angleDeg, input.profileShape);
	const platformSwitchMm = calculatePlatformSwitchStepMm(
		input.platformDiameterMm,
		input.abutmentPlatformDiameterMm,
	);
	const platformSwitchStatus = evaluatePlatformSwitchStatus(platformSwitchMm);
	const cementRisk = evaluateCementationRisk(input.fixationType, input.subgingivalMarginDepthMm);
	const biologicWidth = evaluateBiologicWidth(input.gingivalCuffHeightMm);

	const ascAngulation = input.screwChannelAngulationDeg ?? 0;
	const isAscFeasible = ascAngulation >= 0 && ascAngulation <= 25.0;
	let ascWarning: string | undefined = undefined;
	if (ascAngulation > 25.0) {
		ascWarning = "Угол шахты винта " + ascAngulation + "° превышает предел 25° для систем с угловым доступом (ASC). Риск среза резьбы и поломки отвертки.";
	}

	let softTissueVolumeIndex = 1.0;
	if (input.profileShape === "concave") {
		softTissueVolumeIndex = 1.28;
	} else if (input.profileShape === "convex") {
		softTissueVolumeIndex = 0.75;
	}

	const messages: string[] = [];

	if (riskLevel === "danger") {
		messages.push(
			"⚠️ Угол прорезывания " + angleDeg + "° > 30° с профилем " + input.profileShape + ": риск периимплантита увеличен в " + katafuchiMultiplier + "x (Katafuchi et al. 2017, Souza et al. 2018). Увеличьте высоту десневой манжеты или выберите вогнутый контур.",
		);
	} else if (riskLevel === "warning") {
		messages.push(
			"ℹ️ Угол прорезывания " + angleDeg + "° находится в пограничной зоне (30°-40°). Рекомендуется вогнутый поддесневой профиль (concave) для поддержки мягких тканей.",
		);
	} else {
		messages.push(
			"✅ Угол прорезывания " + angleDeg + "° оптимален (< 30°). Минимальный риск краевой резорбции кости и ретенции налета.",
		);
	}

	if (platformSwitchStatus === "optimal_switch") {
		messages.push(
			"✅ Platform Switching ступень " + platformSwitchMm.toFixed(2) + " мм (>= 0.4 мм): эффективное смещение воспалительного инфильтрата от костного гребня.",
		);
	} else if (platformSwitchStatus === "platform_matching") {
		messages.push(
			"ℹ️ Platform Matching (ступень " + platformSwitchMm.toFixed(2) + " мм): стандартное прилегание без выраженного платформопереключения.",
		);
	} else {
		messages.push(
			"⚠️ Отрицательный уступ платформы (" + platformSwitchMm.toFixed(2) + " мм): абатмент шире платформы имплантата. Высокий риск компрессии кости.",
		);
	}

	if (cementRisk.level === "critical_subgingival") {
		messages.push("⛔ " + cementRisk.description);
	}

	if (ascWarning) {
		messages.push("⚠️ " + ascWarning);
	}

	const isSafeToProceed = riskLevel !== "danger" && cementRisk.level !== "critical_subgingival" && isAscFeasible;

	return {
		emergenceAngleDeg: angleDeg,
		angleRiskLevel: riskLevel,
		platformSwitchMm,
		platformSwitchStatus,
		cementRiskLevel: cementRisk.level,
		cementRiskDescription: cementRisk.description,
		softTissueVolumeIndex,
		katafuchiRiskMultiplier: katafuchiMultiplier,
		isAscFeasible,
		ascWarning,
		biologicWidthAssessment: biologicWidth,
		clinicalMessages: messages,
		isSafeToProceed,
	};
}

// ─── LAB WORK ORDER BUILDER ──────────────────────────────────────────────────

export interface BuildWorkOrderOptions {
	readonly toothNumberFdi: number;
	readonly implantBrand: string;
	readonly implantLine: string;
	readonly platformDiameterMm: number;
	readonly tiBaseArticle: string;
	readonly abutmentType: string;
	readonly gingivalCuffHeightMm: number;
	readonly chimneyPostHeightMm: number;
	readonly fixationType: FixationType;
	readonly crownMaterial: CrownMaterial;
	readonly emergenceAngleDeg: number;
	readonly profileShape: EmergenceProfileShape;
	readonly recommendedTorqueNcm: number;
	readonly screwdriverType: string;
	readonly screwChannelAngulationDeg?: number;
	readonly notes?: string;
}

const MATERIAL_RU_MAP: Record<CrownMaterial, string> = {
	zirconia_multilayer: "Диоксид циркония Multi-Layer (высокая эстетика)",
	zirconia_monolithic: "Диоксид циркония Monolithic (высокая прочность)",
	emax_cad: "Дисиликат лития E.max CAD",
	cocr_ceramic: "Металлокерамика на CoCr каркасе",
	pmma_temporary: "PMMA фрезерованная временная коронка",
	titanium_custom: "Цельнотитановый индивидуальный абатмент",
};

const FIXATION_RU_MAP: Record<FixationType, string> = {
	screw_retained: "Винтовая фиксация (Screw-Retained / ASC шахта)",
	cement_retained: "Цементная фиксация (Cement-Retained на абатменте)",
	multi_unit: "Multi-Unit балочная/винтовая фиксация",
};

const SHAPE_RU_MAP: Record<EmergenceProfileShape, string> = {
	concave: "Вогнутый (Concave — максимальный объем десны)",
	straight: "Прямой (Straight — стандартный переход)",
	convex: "Выпуклый (Convex — осторожно при угле > 30°)",
};

/**
 * Builds structured specification for Dental Laboratory (ЗТЛ).
 */
export function buildZtlWorkOrder(options: BuildWorkOrderOptions): ZtlWorkOrderSpecification {
	const toothDefaults = getToothEmergenceDefaults(options.toothNumberFdi);
	const orderId = "ZTL-" + options.toothNumberFdi + "-" + Date.now().toString(36).toUpperCase().slice(-6);
	const angulation = options.screwChannelAngulationDeg ?? 0;
	const isSubgingivalCementAlert = options.fixationType === "cement_retained" && options.gingivalCuffHeightMm > 1.0;

	return {
		orderId,
		createdAtIso: new Date().toISOString(),
		toothNumberFdi: options.toothNumberFdi,
		toothNameRu: toothDefaults.toothNameRu,
		implantBrand: options.implantBrand,
		implantLine: options.implantLine,
		platformDiameterMm: options.platformDiameterMm,
		abutmentType: options.abutmentType,
		tiBaseArticle: options.tiBaseArticle,
		gingivalCuffHeightMm: options.gingivalCuffHeightMm,
		chimneyPostHeightMm: options.chimneyPostHeightMm,
		fixationType: options.fixationType,
		fixationTypeRu: FIXATION_RU_MAP[options.fixationType],
		crownMaterial: options.crownMaterial,
		crownMaterialRu: MATERIAL_RU_MAP[options.crownMaterial],
		emergenceAngleDeg: options.emergenceAngleDeg,
		profileShape: options.profileShape,
		profileShapeRu: SHAPE_RU_MAP[options.profileShape],
		recommendedTorqueNcm: options.recommendedTorqueNcm,
		screwdriverType: options.screwdriverType,
		screwChannelAngulationDeg: angulation,
		technicalNotes: options.notes || "Изготовить коронку с анатомическим профилем прорезывания и шахтой винта согласно спецификации.",
		isSubgingivalCementAlert,
	};
}

/**
 * Formats a structured ZTL work order into human-readable text for clipboard or printing.
 */
export function formatZtlWorkOrderToText(spec: ZtlWorkOrderSpecification): string {
	const lines = [
		"============================================================",
		"🏥 ЗАКАЗ-НАРЯД В ЗУБОТЕХНИЧЕСКУЮ ЛАБОРАТОРИЮ (ЗТЛ)",
		"Номер наряда: " + spec.orderId + " | Дата: " + new Date(spec.createdAtIso).toLocaleDateString("ru-RU"),
		"============================================================",
		"1. ЛОКАЛИЗАЦИЯ И ИМПЛАНТАТ:",
		"   - Зуб: FDI #" + spec.toothNumberFdi + " (" + spec.toothNameRu + ")",
		"   - Система имплантата: " + spec.implantBrand + " - " + spec.implantLine,
		"   - Диаметр платформы: Ø " + spec.platformDiameterMm.toFixed(1) + " мм",
		"",
		"2. ПРОТЕЗНЫЕ КОМПОНЕНТЫ И ФИКСАЦИЯ:",
		"   - Тип фиксации: " + spec.fixationTypeRu,
		"   - Абатмент / Основание: " + spec.abutmentType + " [Арт: " + spec.tiBaseArticle + "]",
		"   - Высота десневой части (Cuff): " + spec.gingivalCuffHeightMm.toFixed(1) + " мм",
		"   - Высота шахты склейки (Chimney): " + spec.chimneyPostHeightMm.toFixed(1) + " мм",
		"   - Материал коронки: " + spec.crownMaterialRu,
		"",
		"3. БИОМЕХАНИКА ПРОФИЛЯ ПРОРЕЗЫВАНИЯ (EMERGENCE PROFILE):",
		"   - Угол профиля (Emergence Angle alpha): " + spec.emergenceAngleDeg.toFixed(1) + "°",
		"   - Форма поддесневого контура: " + spec.profileShapeRu,
		"   - Угол шахты винта (ASC): " + spec.screwChannelAngulationDeg + "° (шахта выведена на оральную поверхность)",
		"",
		"4. КЛИНИЧЕСКИЙ ПРОТОКОЛ ФИКСАЦИИ (ДЛЯ ВРАЧА):",
		"   - Рекомендованный момент затяжки: " + spec.recommendedTorqueNcm + " N·cm (динамометрический ключ)",
		"   - Тип отвертки: " + spec.screwdriverType,
		spec.isSubgingivalCementAlert
			? "   ⚠️ ВНИМАНИЕ: При цементной фиксации вынести уступ на уровень десны для контроля излишков!"
			: "   - Профиль безопасен, цементный риск исключен.",
		"",
		"5. ОСОБЫЕ УКАЗАНИЯ ДЛЯ ТЕХНИКА:",
		"   " + spec.technicalNotes,
		"============================================================",
	];

	return lines.join("\n");
}
