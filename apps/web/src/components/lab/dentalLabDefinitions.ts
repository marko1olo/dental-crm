/**
 * dentalLabDefinitions.ts — Канонические типы, справочники и константы ЗТЛ.
 *
 * Mandate 8b: Декомпозиция монолита (строго <= 120 строк).
 * Mandate 8s: Single Source of Truth для конструкций, статусов, расцветок VITA и формулы FDI.
 */

export {
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	type Canonical5LabStatus,
	type Canonical5LabStatusItem,
	CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES,
	mapTo6StageOrthopedicLifecycle,
	type CanonicalOrthopedic6StageId,
	type CanonicalOrthopedic6StageItem,
	type DentalLabOrderData,
} from "./labMath";

export type { CanonicalOrthopedic6StageId as Orthopedic6StageKey } from "./labMath";

export {
	CANONICAL_LAB_WORK_TYPES,
	LAB_WORK_TYPES_BY_ID,
	getLabWorkTypeById,
	type LabWorkTypeCatalogItem,
	VITA_CLASSICAL_PLUS_BLEACH_PALETTE,
	VITA_SHADE_HEX_MAP,
	getVitaShadeHex,
	type VitaShadePaletteItem,
	DENTAL_LAB_CONSTRUCTIONS,
	type DentalLabConstructionType,
	type DentalLabConstructionDef,
} from "@dental/shared";

export * from "./definitions/dentalLabStatusData";
export * from "./definitions/dentalLabStatusMapping";
export * from "./definitions/dentalLabShadeConstants";
export * from "./definitions/dentalLabFdiTeeth";
export * from "./definitions/dentalLabOrderHelpers";
