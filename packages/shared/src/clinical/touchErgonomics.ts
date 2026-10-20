/**
 * packages/shared/src/clinical/touchErgonomics.ts
 *
 * Canonical Single Source of Truth (SSOT) for Clinical UI Ergonomics & Touch Targets.
 * Governed by:
 * - Apple HIG / Android Touch-First standards (coarse pointers >= 44-52px)
 * - Mandate 8c: Desktop dense ergonomics (mouse grid 28-36px, pilot cockpit style)
 * - Mandate 8e: Doctor & Cashier Autonomy (Touch targets accessible in medical gloves)
 */

export const CLINICAL_TOUCH_TARGETS = {
	/** Minimum touch target size for standard interactive elements (WCAG / iOS / Material) */
	MIN_TOUCH_SIZE_PX: 44,
	/** Minimum height for primary action buttons (Save, Print, Pay, Scan, Remind) */
	PRIMARY_ACTION_MIN_HEIGHT_PX: 48,
	/** Touch-first operatory monoblock / mobile primary action height */
	MOBILE_ACTION_MIN_HEIGHT_PX: 52,
	/** Minimum typography font size for primary action labels */
	PRIMARY_ACTION_FONT_SIZE_PX: 14,
	/** Tooth formula anatomical element minimum touch height */
	TOOTH_FORMULA_MIN_HEIGHT_PX: 140,
	/** Desktop dense ergonomics (Mandate 8c: mouse grid 28-36px, pilot cockpit style) */
	DESKTOP_DENSE_ACTION_MIN_HEIGHT_PX: 28,
	DESKTOP_DENSE_ACTION_MAX_HEIGHT_PX: 36,
	DESKTOP_DENSE_FONT_SIZE_PX: 12,
} as const;

export type ClinicalTouchTargets = typeof CLINICAL_TOUCH_TARGETS;

/**
 * Validates whether an action button layout conforms to clinical ergonomics:
 * - pointerType: "fine" (Desktop mouse): enforces dense 28-36px grid without mobile bloat (Mandate 8c).
 * - pointerType: "coarse" (Touch / Tablet): enforces >= 48px gloved touch targets.
 */
export function validateClinicalActionButtonErgonomics(params: {
	heightPx: number;
	fontSizePx: number;
	hasVisibleRussianLabel: boolean;
	pointerType?: "coarse" | "fine" | undefined;
}): { isValid: boolean; issues: string[] } {
	const issues: string[] = [];
	const isFine = params.pointerType === "fine";

	if (isFine) {
		if (params.heightPx < CLINICAL_TOUCH_TARGETS.DESKTOP_DENSE_ACTION_MIN_HEIGHT_PX) {
			issues.push(
				`Высота кнопки (${params.heightPx}px) меньше десктопного норматива ${CLINICAL_TOUCH_TARGETS.DESKTOP_DENSE_ACTION_MIN_HEIGHT_PX}px`,
			);
		}
		if (params.fontSizePx < CLINICAL_TOUCH_TARGETS.DESKTOP_DENSE_FONT_SIZE_PX) {
			issues.push(
				`Размер шрифта (${params.fontSizePx}px) меньше десктопного норматива ${CLINICAL_TOUCH_TARGETS.DESKTOP_DENSE_FONT_SIZE_PX}px`,
			);
		}
	} else {
		if (params.heightPx < CLINICAL_TOUCH_TARGETS.PRIMARY_ACTION_MIN_HEIGHT_PX) {
			issues.push(
				`Высота кнопки (${params.heightPx}px) меньше клинического тач-норматива ${CLINICAL_TOUCH_TARGETS.PRIMARY_ACTION_MIN_HEIGHT_PX}px`,
			);
		}
		if (params.fontSizePx < CLINICAL_TOUCH_TARGETS.PRIMARY_ACTION_FONT_SIZE_PX) {
			issues.push(
				`Размер шрифта (${params.fontSizePx}px) меньше норматива ${CLINICAL_TOUCH_TARGETS.PRIMARY_ACTION_FONT_SIZE_PX}px`,
			);
		}
	}

	if (!params.hasVisibleRussianLabel) {
		issues.push("Запрет на изолированные иконки без поясняющего русского текста в главных клинических действиях");
	}
	return {
		isValid: issues.length === 0,
		issues,
	};
}
