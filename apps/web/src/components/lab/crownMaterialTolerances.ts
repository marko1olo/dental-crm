/**
 * crownMaterialTolerances.ts — Mathematical Catalog of CAD/CAM Dental Restorative Material
 * Preparation Tolerances, Minimum Thicknesses, and Biomechanical Specs.
 *
 * Grounded in clinical prosthodontic guidelines (Rosenstiel, Shillinburg, Ivoclar Vivadent IPS e.max,
 * Kuraray Noritake Katana Zirconia, Vita Zahnfabrik, and Dentsply Sirona).
 */

export type CrownMaterialId =
	| "zirconia_ultra_translucent"
	| "zirconia_high_strength"
	| "emax_lithium_disilicate"
	| "pfm_cocr"
	| "feldspathic_veneer"
	| "pmma_temporary"
	| "peek_biohpp";

export type PreparationZoneType =
	| "functional_cusp"
	| "non_functional_cusp"
	| "central_fossa"
	| "axial_wall"
	| "margin_chamfer";

export interface ZoneThicknessGuide {
	/** Minimum permissible thickness in millimeters before fracture/perforation risk (критический порог) */
	readonly minMm: number;
	/** Ideal anatomical thickness in millimeters for maximum longevity and aesthetics */
	readonly idealMm: number;
	/** Maximum recommended thickness in millimeters to prevent thermal/firing stresses or excessive bulk */
	readonly maxRecommendedMm?: number;
}

export type CementationProtocolType =
	| "adhesive_resin"
	| "self_adhesive_resin"
	| "resin_modified_glass_ionomer"
	| "conventional_glass_ionomer"
	| "zinc_phosphate"
	| "temporary_noneugenol";

export interface CrownMaterialSpec {
	readonly id: CrownMaterialId;
	readonly name: string;
	readonly nameRu: string;
	readonly tradeExamplesRu: string;
	readonly category: "Цирконий" | "Стеклокерамика" | "Металлокерамика" | "Полевошпатная керамика" | "Временные" | "Биополимер";
	readonly tag: string;
	readonly flexuralStrengthMpa: number;
	readonly modulusOfElasticityGpa: number;
	readonly translucencyPercent: number;
	readonly antagonistWearRiskRu: "Минимальный (при полировке)" | "Низкий" | "Умеренный" | "Высокий (абразивный)";
	readonly marginTypeRu: string;
	readonly cementationProtocol: CementationProtocolType;
	readonly cementationProtocolRu: string;
	readonly indicationsRu: string;
	readonly zones: Record<PreparationZoneType, ZoneThicknessGuide>;
	readonly clinicalAdviceRu: string;
}

export const CROWN_MATERIAL_SPECS: Record<CrownMaterialId, CrownMaterialSpec> = {
	zirconia_ultra_translucent: {
		id: "zirconia_ultra_translucent",
		name: "Zirconia Ultra-Translucent (5Y-PSZ / Multi-layer)",
		nameRu: "Монолитный цирконий Ultra-Translucent (Katana STML / Prettau 5Y)",
		tradeExamplesRu: "Katana UTML/STML, IPS e.max ZirCAD Prime, Prettau 2 Dispersive",
		category: "Цирконий",
		tag: "Премиум Эстетика",
		flexuralStrengthMpa: 750,
		modulusOfElasticityGpa: 210,
		translucencyPercent: 49,
		antagonistWearRiskRu: "Минимальный (при полировке)",
		marginTypeRu: "Закругленный желобок (Deep Chamfer) 0.5–0.6 мм",
		cementationProtocol: "self_adhesive_resin",
		cementationProtocolRu: "Пескоструйная обработка Al2O3 (50 мкм, 1.5 бар) + MDP-праймер (Z-Prime Plus) + композитный самоадгезивный цемент (RelyX U200 / Panavia V5)",
		indicationsRu: "Одиночные коронки во фронтальном и боковом отделах, мосты до 3 единиц в премолярной зоне",
		zones: {
			functional_cusp: { minMm: 1.0, idealMm: 1.2, maxRecommendedMm: 2.5 },
			non_functional_cusp: { minMm: 0.8, idealMm: 1.0, maxRecommendedMm: 2.5 },
			central_fossa: { minMm: 0.8, idealMm: 1.0, maxRecommendedMm: 2.2 },
			axial_wall: { minMm: 0.6, idealMm: 0.8, maxRecommendedMm: 2.0 },
			margin_chamfer: { minMm: 0.5, idealMm: 0.6, maxRecommendedMm: 1.5 },
		},
		clinicalAdviceRu: "Высокая эстетика при достаточной прочности. Требует обязательной зеркальной полировки окклюзионных контактов перед глазурованием для защиты зуба-антагониста.",
	},
	zirconia_high_strength: {
		id: "zirconia_high_strength",
		name: "Monolithic Zirconia High-Strength (3Y-TZP / 4Y-TZP)",
		nameRu: "Монолитный цирконий высокой прочности (3Y/4Y-TZP)",
		tradeExamplesRu: "Prettau Solid, Wieland Zenostar, Cercon ht",
		category: "Цирконий",
		tag: "Максимальная Прочность",
		flexuralStrengthMpa: 1200,
		modulusOfElasticityGpa: 210,
		translucencyPercent: 41,
		antagonistWearRiskRu: "Минимальный (при полировке)",
		marginTypeRu: "Тонкий желобок (Chamfer) или перовидный край (Knife-edge) 0.4–0.5 мм",
		cementationProtocol: "conventional_glass_ionomer",
		cementationProtocolRu: "Пескоструйная обработка + фиксация на СИЦ (Fuji I / Ketac Cem) или самоадгезивный композит (RelyX)",
		indicationsRu: "Боковые коронки в условиях экстремального дефицита места, бруксизм, протяженные мостовидные протезы",
		zones: {
			functional_cusp: { minMm: 0.8, idealMm: 1.0, maxRecommendedMm: 2.5 },
			non_functional_cusp: { minMm: 0.6, idealMm: 0.8, maxRecommendedMm: 2.5 },
			central_fossa: { minMm: 0.6, idealMm: 0.8, maxRecommendedMm: 2.2 },
			axial_wall: { minMm: 0.5, idealMm: 0.7, maxRecommendedMm: 2.0 },
			margin_chamfer: { minMm: 0.4, idealMm: 0.5, maxRecommendedMm: 1.2 },
		},
		clinicalAdviceRu: "Абсолютный чемпион по прочности на изгиб (1200 МПа). Идеален при бруксизме и низкой клинической коронке.",
	},
	emax_lithium_disilicate: {
		id: "emax_lithium_disilicate",
		name: "IPS e.max Lithium Disilicate (CAD / Press)",
		nameRu: "Дисиликат лития IPS e.max (CAD / Press)",
		tradeExamplesRu: "IPS e.max CAD / Press (Ivoclar Vivadent), Rosetta SM",
		category: "Стеклокерамика",
		tag: "Золотой Стандарт Эстетики",
		flexuralStrengthMpa: 500,
		modulusOfElasticityGpa: 95,
		translucencyPercent: 52,
		antagonistWearRiskRu: "Низкий",
		marginTypeRu: "Глубокий закругленный уступ (Rounded Shoulder / Deep Chamfer) 0.8–1.0 мм",
		cementationProtocol: "adhesive_resin",
		cementationProtocolRu: "Протравливание плавиковой кислотой HF 4.9% (20 сек) + Силанизация (Monobond Plus) + Адгезивный композитный цемент (Variolink Esthetic / RelyX Ultimate)",
		indicationsRu: "Одиночные коронки во фронтальном и боковом отделах, накладки Onlay/Overlay, виниры, мосты до 3 единиц до второго премоляра",
		zones: {
			functional_cusp: { minMm: 1.5, idealMm: 1.8, maxRecommendedMm: 2.5 },
			non_functional_cusp: { minMm: 1.0, idealMm: 1.2, maxRecommendedMm: 2.5 },
			central_fossa: { minMm: 1.0, idealMm: 1.2, maxRecommendedMm: 2.2 },
			axial_wall: { minMm: 0.8, idealMm: 1.0, maxRecommendedMm: 2.0 },
			margin_chamfer: { minMm: 0.8, idealMm: 1.0, maxRecommendedMm: 1.5 },
		},
		clinicalAdviceRu: "Высочайшая адгезивная сила сцепления с тканями зуба. Требует строгого соблюдения толщины 1.5 мм на функциональных буграх для предотвращения сколов.",
	},
	pfm_cocr: {
		id: "pfm_cocr",
		name: "Porcelain-Fused-to-Metal (PFM CoCr / Titanium)",
		nameRu: "Металлокерамика на каркасе CoCr / Ti",
		tradeExamplesRu: "Ivoclar IPS Style / Vita VMK Master на фрезерованном/литом CoCr",
		category: "Металлокерамика",
		tag: "Классический Стандарт",
		flexuralStrengthMpa: 900,
		modulusOfElasticityGpa: 220,
		translucencyPercent: 32,
		antagonistWearRiskRu: "Высокий (абразивный)",
		marginTypeRu: "Круговой уступ 90° с закруглением или 135° (Shoulder) 1.2–1.5 мм",
		cementationProtocol: "conventional_glass_ionomer",
		cementationProtocolRu: "Традиционная фиксация на стеклоиономерный цемент (Fuji Plus, Ketac Cem, Harvard)",
		indicationsRu: "Одиночные коронки и протяженные мостовидные протезы любой протяженности при классическом препарировании",
		zones: {
			functional_cusp: { minMm: 1.5, idealMm: 2.0, maxRecommendedMm: 3.0 },
			non_functional_cusp: { minMm: 1.5, idealMm: 1.8, maxRecommendedMm: 2.8 },
			central_fossa: { minMm: 1.5, idealMm: 1.8, maxRecommendedMm: 2.6 },
			axial_wall: { minMm: 1.2, idealMm: 1.5, maxRecommendedMm: 2.5 },
			margin_chamfer: { minMm: 1.2, idealMm: 1.5, maxRecommendedMm: 2.0 },
		},
		clinicalAdviceRu: "Требует максимальной редукции тканей (металл 0.4 мм + опак 0.2 мм + дентин/эмаль 1.0 мм = 1.6–2.0 мм). Керамика глазури абразивна к антагонистам.",
	},
	feldspathic_veneer: {
		id: "feldspathic_veneer",
		name: "Feldspathic Porcelain Veneer (Refractory / Foil)",
		nameRu: "Полевошпатный ультратонкий винир (на огнеупоре)",
		tradeExamplesRu: "Vita VM13, Creation CC, Noritake EX-3, GC Initial",
		category: "Полевошпатная керамика",
		tag: "Ультраэстетика",
		flexuralStrengthMpa: 120,
		modulusOfElasticityGpa: 70,
		translucencyPercent: 60,
		antagonistWearRiskRu: "Минимальный (при полировке)",
		marginTypeRu: "Желобок на уровне эмали 0.3–0.4 мм, режущий край 0.5 мм",
		cementationProtocol: "adhesive_resin",
		cementationProtocolRu: "Протравливание HF 9% (90 сек) + Силан + Светоотверждаемый цемент (Variolink Esthetic LC / Choice 2)",
		indicationsRu: "Высокоэстетичные тонкостенные виниры, коррекция цвета и формы резцов и клыков без выраженной окклюзионной нагрузки",
		zones: {
			functional_cusp: { minMm: 0.4, idealMm: 0.6, maxRecommendedMm: 1.5 },
			non_functional_cusp: { minMm: 0.3, idealMm: 0.5, maxRecommendedMm: 1.5 },
			central_fossa: { minMm: 0.3, idealMm: 0.5, maxRecommendedMm: 1.2 },
			axial_wall: { minMm: 0.3, idealMm: 0.4, maxRecommendedMm: 1.0 },
			margin_chamfer: { minMm: 0.3, idealMm: 0.3, maxRecommendedMm: 0.8 },
		},
		clinicalAdviceRu: "Максимальная биомиметика и естественность в пределах эмали. Не предназначен для зон высоких боковых окклюзионных сил без поддержки эмали.",
	},
	pmma_temporary: {
		id: "pmma_temporary",
		name: "PMMA CAD/CAM High-Crosslinked Polymer",
		nameRu: "Фрезерованная временная пластмасса PMMA CAD/CAM",
		tradeExamplesRu: "Telio CAD, Yamahachi PMMA, Merz Dental artVeneer",
		category: "Временные",
		tag: "Провизорный Стандарт",
		flexuralStrengthMpa: 110,
		modulusOfElasticityGpa: 3.5,
		translucencyPercent: 45,
		antagonistWearRiskRu: "Минимальный (при полировке)",
		marginTypeRu: "Желобок (Chamfer) 0.6–0.8 мм",
		cementationProtocol: "temporary_noneugenol",
		cementationProtocolRu: "Безэвгенольный временный цемент (Temp-Bond NE / RelyX Temp NE)",
		indicationsRu: "Временные коронки и мостовидные протезы на период остеоинтеграции, кондиционирования десны и сплинт-терапии",
		zones: {
			functional_cusp: { minMm: 1.2, idealMm: 1.5, maxRecommendedMm: 3.0 },
			non_functional_cusp: { minMm: 1.0, idealMm: 1.2, maxRecommendedMm: 2.8 },
			central_fossa: { minMm: 1.0, idealMm: 1.2, maxRecommendedMm: 2.5 },
			axial_wall: { minMm: 0.8, idealMm: 1.0, maxRecommendedMm: 2.2 },
			margin_chamfer: { minMm: 0.6, idealMm: 0.8, maxRecommendedMm: 1.5 },
		},
		clinicalAdviceRu: "Высокая вязкость разрушения и эластичность. Позволяет безопасно моделировать прикус перед постоянным протезированием.",
	},
	peek_biohpp: {
		id: "peek_biohpp",
		name: "PEEK / BioHPP Biopolymer Framework",
		nameRu: "Биополимер PEEK / BioHPP (Полиэфирэфиркетон)",
		tradeExamplesRu: "Bredent BioHPP, Juvora Dental Disc",
		category: "Биополимер",
		tag: "Амортизация и Импланты",
		flexuralStrengthMpa: 180,
		modulusOfElasticityGpa: 4.2,
		translucencyPercent: 15,
		antagonistWearRiskRu: "Минимальный (при полировке)",
		marginTypeRu: "Круговой уступ или глубокий желобок 0.8–1.0 мм",
		cementationProtocol: "adhesive_resin",
		cementationProtocolRu: "Пескоструйная обработка Al2O3 (110 мкм, 2.5 бар) + Спецпраймер (visio.link) + композитный цемент",
		indicationsRu: "Каркасы All-on-4/6, коронки на имплантатах при патологии ВНЧС, амортизирующие абатменты",
		zones: {
			functional_cusp: { minMm: 1.2, idealMm: 1.5, maxRecommendedMm: 3.0 },
			non_functional_cusp: { minMm: 1.0, idealMm: 1.2, maxRecommendedMm: 2.8 },
			central_fossa: { minMm: 1.0, idealMm: 1.2, maxRecommendedMm: 2.5 },
			axial_wall: { minMm: 0.8, idealMm: 1.0, maxRecommendedMm: 2.2 },
			margin_chamfer: { minMm: 0.7, idealMm: 0.9, maxRecommendedMm: 1.5 },
		},
		clinicalAdviceRu: "Модуль упругости близок к костной ткани (4 ГПа), что снижает пиковые ударные нагрузки на имплантаты и височно-нижнечелюстной сустав.",
	},
};

export const CROWN_MATERIALS_CATALOG: CrownMaterialSpec[] = Object.values(CROWN_MATERIAL_SPECS);

/**
 * Gets a material specification by ID, falling back to Zirconia Ultra-Translucent if missing.
 */
export function getCrownMaterialById(id?: string | null): CrownMaterialSpec {
	if (id && id in CROWN_MATERIAL_SPECS) {
		return CROWN_MATERIAL_SPECS[id as CrownMaterialId];
	}
	return CROWN_MATERIAL_SPECS.zirconia_ultra_translucent;
}

export type MaterialClearanceSafetyLevel = "critical_shortage" | "borderline_tight" | "optimal" | "excessive";

export interface MaterialClearanceEvaluation {
	readonly materialId: CrownMaterialId;
	readonly materialNameRu: string;
	readonly zone: PreparationZoneType;
	readonly measuredClearanceMm: number;
	readonly minAllowedMm: number;
	readonly idealMm: number;
	readonly safetyLevel: MaterialClearanceSafetyLevel;
	readonly deficiencyMm: number;
	readonly isSafe: boolean;
	readonly warningMessageRu: string;
	readonly actionRecommendationRu: string;
}

/**
 * Evaluates whether measured occlusal/axial clearance complies with the specific material tolerance.
 */
export function evaluateMaterialClearance(
	materialId: CrownMaterialId,
	zone: PreparationZoneType,
	measuredClearanceMm: number,
): MaterialClearanceEvaluation {
	const spec = getCrownMaterialById(materialId);
	const zoneGuide = spec.zones[zone] || spec.zones.functional_cusp;
	const safeClearance = Math.max(0, Number.isFinite(measuredClearanceMm) ? measuredClearanceMm : 0);

	const minAllowedMm = zoneGuide.minMm;
	const idealMm = zoneGuide.idealMm;
	const maxRecommendedMm = zoneGuide.maxRecommendedMm || 2.5;

	let safetyLevel: MaterialClearanceSafetyLevel;
	let deficiencyMm = 0;
	let isSafe = false;
	let warningMessageRu = "";
	let actionRecommendationRu = "";

	if (safeClearance < minAllowedMm) {
		safetyLevel = "critical_shortage";
		deficiencyMm = Number((minAllowedMm - safeClearance).toFixed(2));
		isSafe = false;
		warningMessageRu = `Критический дефицит толщины (${safeClearance} мм при минимуме ${minAllowedMm} мм). Риск фрактуры и перфорации!`;
		actionRecommendationRu = `Требуется сошлифовывание культи на ${deficiencyMm} мм или редукция бугра зуба-антагониста на ${deficiencyMm} мм.`;
	} else if (safeClearance < idealMm) {
		safetyLevel = "borderline_tight";
		isSafe = true;
		warningMessageRu = `Толщина допустима, но близка к критическому минимуму (${safeClearance} мм при идеале ${idealMm} мм).`;
		actionRecommendationRu = `Рекомендуется тонкослойный дизайн с обязательной высокоточной CAD/CAM фрезеровкой без редукции анатомии.`;
	} else if (safeClearance <= maxRecommendedMm) {
		safetyLevel = "optimal";
		isSafe = true;
		warningMessageRu = `Идеальное анатомическое пространство (${safeClearance} мм). Полное соответствие прочностным стандартам.`;
		actionRecommendationRu = `Рекомендуется полноценная анатомическая моделировка с выраженными фиссурами и буграми.`;
	} else {
		safetyLevel = "excessive";
		isSafe = true;
		warningMessageRu = `Избыточный окклюзионный зазор (${safeClearance} мм > ${maxRecommendedMm} мм).`;
		actionRecommendationRu = `Избегайте избыточного слоя цемента. Моделируйте реставрацию в полную анатомию или скорректируйте высоту культи.`;
	}

	return {
		materialId: spec.id,
		materialNameRu: spec.nameRu,
		zone,
		measuredClearanceMm: safeClearance,
		minAllowedMm,
		idealMm,
		safetyLevel,
		deficiencyMm,
		isSafe,
		warningMessageRu,
		actionRecommendationRu,
	};
}

/**
 * Evaluates all catalog materials against measured clearance and returns them ranked by clinical suitability.
 */
export function rankMaterialsByClearance(
	zone: PreparationZoneType,
	measuredClearanceMm: number,
): Array<MaterialClearanceEvaluation & { isRecommended: boolean }> {
	return CROWN_MATERIALS_CATALOG.map((mat) => {
		const evalResult = evaluateMaterialClearance(mat.id, zone, measuredClearanceMm);
		const isRecommended = evalResult.isSafe && evalResult.safetyLevel !== "critical_shortage";
		return {
			...evalResult,
			isRecommended,
		};
	}).sort((a, b) => {
		// Prefer optimal > borderline > excessive > critical
		const score = (level: MaterialClearanceSafetyLevel) => {
			switch (level) {
				case "optimal": return 3;
				case "borderline_tight": return 2;
				case "excessive": return 1;
				case "critical_shortage": return 0;
			}
		};
		return score(b.safetyLevel) - score(a.safetyLevel);
	});
}
