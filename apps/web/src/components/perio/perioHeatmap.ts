/**
 * apps/web/src/components/perio/perioHeatmap.ts
 *
 * Heatmap colour and tone mapping for periodontal pocket probing depth.
 * Adapted from DentalPin (usePerioHeatmap.ts) for DENTE CRM design system.
 *
 * Discrete clinical scale (SEPA / AAP / EFP standard):
 * - null / undefined -> 'neutral' (unmeasured)
 * - <= 3 mm          -> 'success' (normal gingival sulcus, pale pink / emerald)
 * - == 4 mm          -> 'warning-low' (mild periodontitis / early pocket, amber)
 * - <= 6 mm          -> 'warning-high' (moderate periodontitis, orange)
 * - > 6 mm           -> 'error' (severe deep pocket, rose / red)
 */

export type HeatmapTone =
	| "neutral"
	| "success"
	| "warning-low"
	| "warning-high"
	| "error";

export const TONE_TO_CLASS: Record<HeatmapTone, string> = {
	neutral:
		"bg-gray-100 ring-gray-300 text-gray-500 dark:bg-gray-700/70 dark:ring-gray-500 dark:text-gray-300 border-gray-300 dark:border-gray-600",
	success:
		"bg-emerald-50 ring-emerald-400 text-emerald-700 dark:bg-emerald-900/50 dark:ring-emerald-500 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",
	"warning-low":
		"bg-amber-50 ring-amber-400 text-amber-700 dark:bg-amber-900/50 dark:ring-amber-500 dark:text-amber-200 border-amber-300 dark:border-amber-700",
	"warning-high":
		"bg-orange-50 ring-orange-500 text-orange-700 dark:bg-orange-900/50 dark:ring-orange-500 dark:text-orange-200 border-orange-300 dark:border-orange-700",
	error:
		"bg-rose-50 ring-rose-400 text-rose-700 dark:bg-rose-900/50 dark:ring-rose-500 dark:text-rose-200 border-rose-300 dark:border-rose-700",
};

export const TONE_TO_HEX: Record<HeatmapTone, string> = {
	neutral: "#d1d5db", // gray-300
	success: "#34d399", // emerald-400
	"warning-low": "#fbbf24", // amber-400
	"warning-high": "#f97316", // orange-500
	error: "#fb7185", // rose-400
};

/**
 * Maps probing depth in mm to discrete clinical heatmap tone.
 */
export function probingDepthTone(pd: number | null | undefined): HeatmapTone {
	if (pd === null || pd === undefined) return "neutral";
	if (pd <= 3) return "success";
	if (pd === 4) return "warning-low";
	if (pd <= 6) return "warning-high";
	return "error";
}

/**
 * Returns Tailwind class names matching DENTE design system in Light and Dark themes.
 */
export function probingDepthClasses(pd: number | null | undefined): string {
	return TONE_TO_CLASS[probingDepthTone(pd)];
}

/**
 * Returns hex color code for SVG and Canvas rendering.
 */
export function probingDepthHex(pd: number | null | undefined): string {
	return TONE_TO_HEX[probingDepthTone(pd)];
}
