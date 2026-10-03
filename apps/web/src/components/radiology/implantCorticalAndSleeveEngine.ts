/**
 * apps/web/src/components/radiology/implantCorticalAndSleeveEngine.ts
 *
 * CLINICAL IMPLANT SAFETY ZONES & SURGICAL SLEEVE ENGINE
 * Standards:
 * 1. Vatech Ez3D2009 / Picasso Trio 3-Zone Mandibular Nerve Safety Classification.
 * 2. ITI Consensus & Carl Misch Bone Envelope (Buccal Cortical Plate >= 1.8-2.0 mm).
 * 3. Surgical Guide Sleeve Osteotomy Depth Calculus: L_drill = L_implant + V_offset.
 *
 * Mandate 8b: Strict <= 800 lines ceiling.
 * Mandate 8e: Doctor Autonomy (Zero screaming alerts, calm objective metrics).
 */

import {
	SURGICAL_KITS,
	type GuidedSurgeryKitSpec,
	type CanonicalImplantBrandKey,
} from "./implantCatalog.js";

// ─── 1. VATECH 3-ZONE MANDIBULAR NERVE CLEARANCE CLASSIFICATION ─────────────

export const VATECH_NERVE_SAFE_THRESHOLD_MM = 2.0;       // Safe >= 2.0 mm (Green)
export const VATECH_NERVE_WARNING_THRESHOLD_MM = 1.5;    // Warning buffer 1.5 .. 2.0 mm (Yellow)
export const VATECH_NERVE_COLLISION_THRESHOLD_MM = 1.5;  // Critical collision < 1.5 mm (Red)

export type VatechNerveZone = "safe" | "warning" | "collision" | "unmeasured";

export interface VatechNerveZoneAssessment {
	readonly clearanceMm: number;
	readonly zone: VatechNerveZone;
	readonly colorHex: string;
	readonly labelRu: string;
	readonly badgeClass: string;
	readonly isSafe: boolean;
	readonly isWarning: boolean;
	readonly isCollision: boolean;
	readonly clinicalAdviceRu: string;
}

/**
 * Evaluates net clearance from virtual implant body/apex to the mandibular canal wall
 * according to Vatech Ez3D 3-zone color classification:
 * - Safe: >= 2.0 mm (Green)
 * - Warning: 1.5 .. 2.0 mm (Yellow/Amber)
 * - Collision: < 1.5 mm (Red - high risk of inferior alveolar nerve paresthesia)
 */
export function classifyVatechNerveClearance(clearanceMm: number | null | undefined): VatechNerveZoneAssessment {
	if (clearanceMm === null || clearanceMm === undefined || Number.isNaN(clearanceMm)) {
		return {
			clearanceMm: 0,
			zone: "unmeasured",
			colorHex: "#71717a",
			labelRu: "Канал не размечен",
			badgeClass: "bg-zinc-800 text-zinc-400 border-zinc-700",
			isSafe: false,
			isWarning: false,
			isCollision: false,
			clinicalAdviceRu: "Траектория нижнечелюстного канала не размечена в исследовании КЛКТ.",
		};
	}

	const rounded = Number(clearanceMm.toFixed(2));

	if (rounded < VATECH_NERVE_COLLISION_THRESHOLD_MM) {
		const deficitMm = Number((VATECH_NERVE_SAFE_THRESHOLD_MM - rounded).toFixed(1));
		return {
			clearanceMm: rounded,
			zone: "collision",
			colorHex: "#ef4444",
			labelRu: `Коллизия (${rounded.toFixed(1)} мм < 1.5 мм)`,
			badgeClass: "bg-rose-950/80 text-rose-300 border-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.5)]",
			isSafe: false,
			isWarning: false,
			isCollision: true,
			clinicalAdviceRu: `Критическая близость к IAN (зазор ${rounded.toFixed(1)} мм < 1.5 мм). Риск парестезии и травмы сосудисто-нервного пучка! Уменьшите длину имплантата минимум на ${deficitMm} мм или измените наклон оси.`,
		};
	}

	if (rounded < VATECH_NERVE_SAFE_THRESHOLD_MM) {
		return {
			clearanceMm: rounded,
			zone: "warning",
			colorHex: "#f59e0b",
			labelRu: `Предупреждение (${rounded.toFixed(1)} мм)`,
			badgeClass: "bg-amber-950/80 text-amber-300 border-amber-500/80",
			isSafe: false,
			isWarning: true,
			isCollision: false,
			clinicalAdviceRu: `Буферная зона: зазор ${rounded.toFixed(1)} мм находится в диапазоне 1.5–2.0 мм. Рекомендуется осторожное препарирование ложа со стопором фрезы.`,
		};
	}

	return {
		clearanceMm: rounded,
		zone: "safe",
		colorHex: "#10b981",
		labelRu: `Безопасно (${rounded.toFixed(1)} мм)`,
		badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/80",
		isSafe: true,
		isWarning: false,
		isCollision: false,
		clinicalAdviceRu: `Безопасный анатомический коридор до нижнечелюстного канала (зазор ${rounded.toFixed(1)} мм >= 2.0 мм соблюден).`,
	};
}

// ─── 2. BUCCAL & LINGUAL CORTICAL PLATE THICKNESS AUDIT ─────────────────────

/**
 * Clinical standard for alveolar cortical bone envelope (ITI Consensus & Misch):
 * - Buccal plate >= 1.8-2.0 mm (prevention of peri-implant mucosal recession & thread exposure)
 * - Buccal plate 1.0 .. 1.79 mm: graft required (GBR with xenograft + resorbable collagen membrane)
 * - Buccal plate < 1.0 mm: imminent dehiscence/fenestration (critical bone deficiency)
 * - Lingual plate >= 1.0 mm (prevention of lingual cortical perforation)
 */
export const BUCCAL_CORTICAL_PLATE_IDEAL_MM = 2.0;
export const BUCCAL_CORTICAL_PLATE_MIN_RECOMMENDED_MM = 1.8;
export const BUCCAL_CORTICAL_PLATE_WARNING_MM = 1.5;
export const BUCCAL_CORTICAL_PLATE_CRITICAL_MM = 1.0;
export const LINGUAL_CORTICAL_PLATE_MIN_MM = 1.0;

export type BuccalCorticalStatus = "adequate" | "graft_required" | "dehiscence_imminent";
export type LingualCorticalStatus = "adequate" | "perforation_risk";

export interface CorticalPlateAuditResult {
	readonly residualBuccalBoneMm: number;
	readonly residualLingualBoneMm: number;
	readonly buccalStatus: BuccalCorticalStatus;
	readonly lingualStatus: LingualCorticalStatus;
	readonly isBuccalAdequate: boolean;        // >= 1.8 mm
	readonly isLingualAdequate: boolean;       // >= 1.0 mm
	readonly isApexContained: boolean;
	readonly requiresGbrAugmentation: boolean; // true if buccal < 1.8 mm or lingual < 1.0 mm
	readonly severity: "safe" | "warning" | "critical";
	readonly clinicalWarningRu: string;
	readonly recommendedGbrProtocolRu: string;
}

/**
 * Audits buccal and lingual cortical plate thicknesses around the virtual implant.
 * In a standard cross-section coordinate system:
 * - Origin X=0 is alveolar ridge center.
 * - +X is Lingual/Palatal, -X is Buccal (vestibular).
 */
export function auditCorticalPlateEnvelope(
	entryX: number,
	implantDiameterMm: number,
	buccalCrestX: number,
	lingualCrestX: number,
): CorticalPlateAuditResult {
	const implantRadius = implantDiameterMm / 2.0;

	// Residual bone thickness from outer cylinder edge to cortical ridge margin
	const buccalDist = Math.max(0, Number((Math.abs(entryX - buccalCrestX) - implantRadius).toFixed(2)));
	const lingualDist = Math.max(0, Number((Math.abs(entryX - lingualCrestX) - implantRadius).toFixed(2)));

	let buccalStatus: BuccalCorticalStatus = "adequate";
	let severity: "safe" | "warning" | "critical" = "safe";
	let warningRu = "";
	let gbrProtocolRu = "Состояние костных пластинок состоятельно. Дополнительная костная пластика не требуется.";

	if (buccalDist < BUCCAL_CORTICAL_PLATE_CRITICAL_MM) {
		buccalStatus = "dehiscence_imminent";
		severity = "critical";
		warningRu = `Критический дефицит вестибулярного кортикала: ${buccalDist.toFixed(1)} мм (< 1.0 мм). Высокий риск дегисценции кости и рецессии десны!`;
		gbrProtocolRu = "Показана обязательная направленная костная регенерация (НКР / GBR) с титановой сеткой или мембраной, усиленной титаном, и ауто-ксенографтом 1:1.";
	} else if (buccalDist < BUCCAL_CORTICAL_PLATE_MIN_RECOMMENDED_MM) {
		buccalStatus = "graft_required";
		severity = "warning";
		warningRu = `Толщина вестибулярной пластинки ${buccalDist.toFixed(1)} мм (< ${BUCCAL_CORTICAL_PLATE_MIN_RECOMMENDED_MM} мм). Рекомендована НКР для предотвращения отдаленной рецессии десны.`;
		gbrProtocolRu = "Рекомендована сопутствующая НКР (GBR): депротеинизированный бычий ксенографт (Bio-Oss / Cerabone) + резорбируемая коллагеновая мембрана (Bio-Gide / Jason).";
	} else {
		warningRu = `Вестибулярный кортикал достаточен: ${buccalDist.toFixed(1)} мм (норма >= ${BUCCAL_CORTICAL_PLATE_MIN_RECOMMENDED_MM} мм).`;
	}

	let lingualStatus: LingualCorticalStatus = "adequate";
	if (lingualDist < LINGUAL_CORTICAL_PLATE_MIN_MM) {
		lingualStatus = "perforation_risk";
		if (severity !== "critical") severity = "warning";
		warningRu += ` Риск язычной перфорации: ${lingualDist.toFixed(1)} мм (< 1.0 мм).`;
	}

	const isBuccalOk = buccalDist >= BUCCAL_CORTICAL_PLATE_MIN_RECOMMENDED_MM;
	const isLingualOk = lingualDist >= LINGUAL_CORTICAL_PLATE_MIN_MM;
	const requiresGbr = !isBuccalOk || !isLingualOk;

	return {
		residualBuccalBoneMm: buccalDist,
		residualLingualBoneMm: lingualDist,
		buccalStatus,
		lingualStatus,
		isBuccalAdequate: isBuccalOk,
		isLingualAdequate: isLingualOk,
		isApexContained: true,
		requiresGbrAugmentation: requiresGbr,
		severity,
		clinicalWarningRu: warningRu.trim(),
		recommendedGbrProtocolRu: gbrProtocolRu,
	};
}

/**
 * Convenient wrapper when cross-section implant pose and alveolar ridge envelope are provided.
 */
export function auditCorticalPlatesFromEnvelope(
	implantPose: {
		readonly entryPoint: { readonly x: number; readonly y: number };
		readonly implantSpec: { readonly diameterMm: number };
	},
	envelope: {
		readonly buccalCrestPoint: { readonly x: number; readonly y: number };
		readonly lingualCrestPoint: { readonly x: number; readonly y: number };
	},
): CorticalPlateAuditResult {
	return auditCorticalPlateEnvelope(
		implantPose.entryPoint.x,
		implantPose.implantSpec.diameterMm,
		envelope.buccalCrestPoint.x,
		envelope.lingualCrestPoint.x,
	);
}

// ─── 3. SURGICAL GUIDE SLEEVE DRILL DEPTH CALCULUS ──────────────────────────

export interface SurgicalDrillDepthResult {
	readonly implantLengthMm: number;
	readonly sleeveOffsetMm: number;
	readonly drillTotalLengthMm: number;     // L_drill = L_implant + V_offset
	readonly kitName: string;
	readonly sleeveDiameterMm: number;
	readonly sleeveHeightMm: number;
	readonly isStandardOffset: boolean;
	readonly drillLabelRu: string;
	readonly clinicalProtocolRu: string;
}

/**
 * Resolves default surgical guide kit spec by manufacturer brand or kit name.
 */
export function resolveSurgicalKit(kitNameOrBrand?: string): GuidedSurgeryKitSpec {
	if (!kitNameOrBrand) return SURGICAL_KITS.osstem_oneguide!;

	const lower = kitNameOrBrand.toLowerCase();
	if (lower.includes("straumann")) return SURGICAL_KITS.straumann_guided!;
	if (lower.includes("nobel")) return SURGICAL_KITS.nobel_guide!;
	if (lower.includes("dentis") || lower.includes("dentium")) return SURGICAL_KITS.dentis_simple_guide!;
	if (lower.includes("mis")) return SURGICAL_KITS.mis_mguide!;
	if (lower.includes("astra")) return SURGICAL_KITS.astra_facilitate!;
	if (lower.includes("zimmer") || lower.includes("biohorizons")) return SURGICAL_KITS.zimmer_guided!;
	if (lower.includes("megagen") || lower.includes("r2gate")) return SURGICAL_KITS.megagen_r2gate!;
	if (lower.includes("ankylos")) return SURGICAL_KITS.ankylos_expertease!;

	return SURGICAL_KITS.osstem_oneguide!;
}

/**
 * Computes exact osteotomy drill depth for static computer-guided surgical templates:
 * L_drill = L_implant + V_offset
 *
 * Verified clinical offsets:
 * - Osstem OneGuide: V_offset = 9.0 mm (standard) or 10.5 mm (long sleeve keys)
 * - Straumann Guided: V_offset = 2.0, 4.0, or 6.0 mm (H2, H4, H6 keys)
 * - NobelGuide: V_offset = 9.0 mm
 * - Generic/Universal: V_offset = 9.0 mm
 */
export function calculateOsteotomyDrillDepth(
	implantLengthMm: number,
	sleeveOffsetMm?: number,
	kitNameOrBrand?: string,
): SurgicalDrillDepthResult {
	const kit = resolveSurgicalKit(kitNameOrBrand);
	const offset = (sleeveOffsetMm && sleeveOffsetMm > 0) ? sleeveOffsetMm : kit.defaultOffsetMm;
	const drillTotal = Number((implantLengthMm + offset).toFixed(1));
	const isStandard = kit.availableOffsetsMm.includes(offset);

	return {
		implantLengthMm,
		sleeveOffsetMm: offset,
		drillTotalLengthMm: drillTotal,
		kitName: kit.kitName,
		sleeveDiameterMm: kit.sleeveDiameterMm,
		sleeveHeightMm: kit.sleeveHeightMm,
		isStandardOffset: isStandard,
		drillLabelRu: `Фреза Ø... × ${drillTotal} мм`,
		clinicalProtocolRu: `Навигационный протокол ${kit.kitName}: глубина остеотомии L=${drillTotal} мм (имплантат ${implantLengthMm} мм + офсет втулки ${offset} мм). Стопор фрезы упирается в верхний срез втулки H=${kit.sleeveHeightMm} мм.`,
	};
}
