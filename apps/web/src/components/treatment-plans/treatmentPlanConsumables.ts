/**
 * treatmentPlanConsumables.ts — фильтрация микро-расходников в презентациях планов лечения.
 *
 * Mandate 8e / Section VII: Чистый показ пациенту (скрывать микро-расходники).
 * Re-exports SSOT from @dental/shared for 100% full-stack parity.
 */

import {
	isMicroConsumable as sharedIsMicroConsumable,
	CONSUMABLE_PATTERNS as sharedConsumablePatterns,
	type ConsumableItemLike,
} from "@dental/shared";

export type PlanItemLike = ConsumableItemLike;
export const CONSUMABLE_PATTERNS: readonly RegExp[] = sharedConsumablePatterns;
export const isMicroConsumable: (item: PlanItemLike) => boolean = sharedIsMicroConsumable;
